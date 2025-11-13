# PBX-X Database Schema

## 1. Overview

Das Datenbankschema ist für PostgreSQL 15+ optimiert und nutzt moderne Features wie JSONB, Arrays und Partitionierung für große Tabellen (CDR).

## 2. Schema-Konventionen

- **Naming**: snake_case für Tabellen und Spalten
- **Primary Keys**: `id` (UUID v4)
- **Timestamps**: `created_at`, `updated_at` (automatisch via Trigger/ORM)
- **Soft Deletes**: `deleted_at` (NULL = aktiv)
- **Foreign Keys**: ON DELETE CASCADE/SET NULL je nach Beziehung
- **Indexes**: Automatisch für FKs, zusätzlich für häufige Queries

## 3. Core Tables

### 3.1 Users & Authentication

#### `users`
Systembenutzer (Admin, Supervisor, Agents, normale User)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'supervisor', 'agent', 'user')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    language VARCHAR(10) DEFAULT 'de-DE',
    timezone VARCHAR(50) DEFAULT 'Europe/Berlin',
    time_profile_id UUID REFERENCES time_profiles(id) ON DELETE SET NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
```

#### `user_sessions`
JWT-Token-Management & Session-Tracking

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

#### `user_permissions`
Granulare RBAC (optional für Enterprise)

```sql
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL, -- z.B. 'recordings', 'reports', 'trunks'
    action VARCHAR(50) NOT NULL, -- z.B. 'read', 'write', 'delete', 'playback'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, resource, action)
);
```

### 3.2 Extensions & Devices

#### `extensions`
SIP-Nebenstellen

```sql
CREATE TABLE extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    extension_type VARCHAR(50) NOT NULL DEFAULT 'sip' CHECK (extension_type IN ('sip', 'webrtc', 'virtual')),
    sip_password VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),

    -- Voicemail
    voicemail_enabled BOOLEAN DEFAULT TRUE,
    voicemail_pin VARCHAR(20),
    voicemail_email_notification BOOLEAN DEFAULT TRUE,

    -- Call Features
    call_recording_policy VARCHAR(50) DEFAULT 'off' CHECK (call_recording_policy IN ('off', 'on_demand', 'always')),
    can_record_calls BOOLEAN DEFAULT FALSE,
    allow_international BOOLEAN DEFAULT TRUE,
    allow_mobile BOOLEAN DEFAULT TRUE,

    -- Forwarding
    forward_on_busy_enabled BOOLEAN DEFAULT FALSE,
    forward_on_busy_destination VARCHAR(50),
    forward_on_no_answer_enabled BOOLEAN DEFAULT FALSE,
    forward_on_no_answer_destination VARCHAR(50),
    forward_on_no_answer_timeout INT DEFAULT 20,
    forward_unconditional_enabled BOOLEAN DEFAULT FALSE,
    forward_unconditional_destination VARCHAR(50),

    -- DND & Presence
    dnd_enabled BOOLEAN DEFAULT FALSE,
    presence_status VARCHAR(50) DEFAULT 'available',

    -- Codec Preferences
    codec_preferences TEXT[] DEFAULT ARRAY['opus', 'g722', 'pcmu', 'pcma'],

    -- Limits
    max_concurrent_calls INT DEFAULT 2,

    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_extensions_number ON extensions(number) WHERE deleted_at IS NULL;
CREATE INDEX idx_extensions_user_id ON extensions(user_id);
```

#### `extension_registrations`
Aktive SIP-Registrierungen (temporäre Daten, kurze Retention)

```sql
CREATE TABLE extension_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extension_id UUID NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
    contact_uri VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address INET NOT NULL,
    port INT NOT NULL,
    transport VARCHAR(10) NOT NULL CHECK (transport IN ('udp', 'tcp', 'tls', 'wss')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_extension_registrations_extension_id ON extension_registrations(extension_id);
CREATE INDEX idx_extension_registrations_expires_at ON extension_registrations(expires_at);
```

#### `devices`
Provisionierte Endgeräte

```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extension_id UUID NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
    mac_address VARCHAR(17) NOT NULL UNIQUE,
    manufacturer VARCHAR(100), -- z.B. 'Yealink', 'Snom', 'Grandstream'
    model VARCHAR(100),
    firmware_version VARCHAR(50),
    provisioning_template VARCHAR(100), -- Template-Name
    auto_provisioning_enabled BOOLEAN DEFAULT TRUE,

    -- BLF Keys
    blf_keys JSONB, -- [{key: 1, type: 'blf', extension: '200', label: 'Sales'}]

    last_provisioned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_devices_extension_id ON devices(extension_id);
CREATE INDEX idx_devices_mac_address ON devices(mac_address);
```

### 3.3 Trunks & Routing

#### `trunks`
SIP-Trunks zu Carriern

```sql
CREATE TABLE trunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    trunk_type VARCHAR(50) NOT NULL CHECK (trunk_type IN ('register', 'ip_auth', 'static')),

    -- SIP-Konfiguration
    host VARCHAR(255) NOT NULL,
    port INT DEFAULT 5060,
    transport VARCHAR(10) NOT NULL DEFAULT 'udp' CHECK (transport IN ('udp', 'tcp', 'tls')),

    -- Authentifizierung (für 'register')
    username VARCHAR(100),
    password VARCHAR(255),
    auth_username VARCHAR(100),

    -- IP-Auth (für 'ip_auth')
    allowed_ips INET[],

    -- Codecs
    codec_preferences TEXT[] DEFAULT ARRAY['pcmu', 'pcma', 'g722', 'opus'],

    -- DTMF
    dtmf_mode VARCHAR(50) DEFAULT 'rfc2833' CHECK (dtmf_mode IN ('rfc2833', 'inband', 'info')),

    -- Caller-ID
    default_caller_id VARCHAR(50),

    -- DID-Bereiche
    did_ranges JSONB, -- [{"start": "+49301000000", "end": "+49301000099"}]

    -- Limits
    max_concurrent_calls INT DEFAULT 10,

    -- Failover
    backup_trunk_id UUID REFERENCES trunks(id) ON DELETE SET NULL,

    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'testing')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_trunks_name ON trunks(name) WHERE deleted_at IS NULL;
```

#### `inbound_rules`
DID-Routing für eingehende Anrufe

```sql
CREATE TABLE inbound_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    did_pattern VARCHAR(50) NOT NULL, -- z.B. '+4930100000X', '+49301000000'
    trunk_id UUID REFERENCES trunks(id) ON DELETE CASCADE,

    priority INT DEFAULT 100, -- Niedrigere Zahl = höhere Priorität

    -- Zeitsteuerung
    time_profile_id UUID REFERENCES time_profiles(id) ON DELETE SET NULL,

    -- CID-Filter (optional)
    caller_id_pattern VARCHAR(50), -- Regex, z.B. '^\\+49.*' für nur deutsche Anrufer

    -- Ziel
    destination_type VARCHAR(50) NOT NULL CHECK (destination_type IN ('extension', 'queue', 'ivr', 'voicemail', 'conference', 'external')),
    destination_id UUID, -- FK je nach destination_type (polymorphic)
    destination_number VARCHAR(50), -- Für 'external'

    -- Fallback (nach Zeitprofil)
    fallback_destination_type VARCHAR(50),
    fallback_destination_id UUID,
    fallback_destination_number VARCHAR(50),

    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inbound_rules_did_pattern ON inbound_rules(did_pattern);
CREATE INDEX idx_inbound_rules_trunk_id ON inbound_rules(trunk_id);
```

#### `outbound_rules`
Dial-Plan für ausgehende Anrufe

```sql
CREATE TABLE outbound_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    number_pattern VARCHAR(100) NOT NULL, -- Regex, z.B. '^0[1-9]' für nationale Anrufe

    priority INT DEFAULT 100,

    -- Nummer-Manipulation
    strip_digits INT DEFAULT 0,
    prepend VARCHAR(20),

    -- Trunk-Selektion
    trunk_id UUID NOT NULL REFERENCES trunks(id) ON DELETE CASCADE,

    -- Caller-ID-Override
    caller_id_mode VARCHAR(50) DEFAULT 'extension' CHECK (caller_id_mode IN ('extension', 'trunk', 'custom')),
    custom_caller_id VARCHAR(50),

    -- Beschränkungen
    allowed_for_roles TEXT[] DEFAULT ARRAY['admin', 'supervisor', 'agent', 'user'],
    max_duration_seconds INT, -- NULL = unbegrenzt

    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_outbound_rules_number_pattern ON outbound_rules(number_pattern);
CREATE INDEX idx_outbound_rules_trunk_id ON outbound_rules(trunk_id);
```

### 3.4 Time Profiles

#### `time_profiles`
Zeitsteuerungen (Bürozeiten, Feiertage)

```sql
CREATE TABLE time_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    timezone VARCHAR(50) DEFAULT 'Europe/Berlin',

    -- Wochenplan
    schedule JSONB NOT NULL,
    /* Beispiel:
    {
      "monday": [{"start": "09:00", "end": "17:00"}],
      "tuesday": [{"start": "09:00", "end": "17:00"}],
      ...
      "saturday": [],
      "sunday": []
    }
    */

    -- Feiertage (Array von Daten)
    holidays DATE[],

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.5 Calls & CDR

#### `calls`
Aktive Calls (Live-Daten)

```sql
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id VARCHAR(255) NOT NULL UNIQUE, -- SIP Call-ID

    -- Richtung
    direction VARCHAR(50) NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),

    -- Parteien
    caller_number VARCHAR(50) NOT NULL,
    caller_name VARCHAR(100),
    callee_number VARCHAR(50) NOT NULL,
    callee_name VARCHAR(100),

    -- Extension-Referenzen
    caller_extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL,
    callee_extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL,

    -- Trunk (für inbound/outbound)
    trunk_id UUID REFERENCES trunks(id) ON DELETE SET NULL,

    -- State
    state VARCHAR(50) NOT NULL DEFAULT 'initiated' CHECK (state IN ('initiated', 'ringing', 'answered', 'held', 'transferred', 'ended')),

    -- Timestamps
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ringing_at TIMESTAMP WITH TIME ZONE,
    answered_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,

    -- Hangup-Grund
    hangup_cause VARCHAR(100), -- z.B. 'normal_clearing', 'busy', 'no_answer', 'cancel'

    -- Recording
    recording_id UUID REFERENCES recordings(id) ON DELETE SET NULL,

    -- Queue-Info (falls Queue-Call)
    queue_id UUID REFERENCES queues(id) ON DELETE SET NULL,
    agent_extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL,
    queue_wait_time_seconds INT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calls_call_id ON calls(call_id);
CREATE INDEX idx_calls_state ON calls(state);
CREATE INDEX idx_calls_caller_extension_id ON calls(caller_extension_id);
CREATE INDEX idx_calls_callee_extension_id ON calls(callee_extension_id);
CREATE INDEX idx_calls_queue_id ON calls(queue_id);
```

#### `cdr` (Call Detail Records)
Archivierte Anrufe mit Partitionierung

```sql
CREATE TABLE cdr (
    id UUID DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL,

    direction VARCHAR(50) NOT NULL,

    caller_number VARCHAR(50) NOT NULL,
    caller_name VARCHAR(100),
    callee_number VARCHAR(50) NOT NULL,
    callee_name VARCHAR(100),

    caller_extension_id UUID,
    callee_extension_id UUID,
    trunk_id UUID,

    initiated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ringing_at TIMESTAMP WITH TIME ZONE,
    answered_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE NOT NULL,

    duration_seconds INT, -- answered_at → ended_at
    billable_seconds INT, -- für Abrechnungen

    hangup_cause VARCHAR(100),

    recording_id UUID,

    queue_id UUID,
    agent_extension_id UUID,
    queue_wait_time_seconds INT,

    -- Kosten (optional)
    cost_per_minute NUMERIC(10, 4),
    total_cost NUMERIC(10, 4),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (id, initiated_at)
) PARTITION BY RANGE (initiated_at);

-- Monatliche Partitionen (automatisch via Cron/Trigger)
CREATE TABLE cdr_2025_11 PARTITION OF cdr
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE INDEX idx_cdr_call_id ON cdr(call_id);
CREATE INDEX idx_cdr_initiated_at ON cdr(initiated_at);
CREATE INDEX idx_cdr_caller_number ON cdr(caller_number);
CREATE INDEX idx_cdr_callee_number ON cdr(callee_number);
CREATE INDEX idx_cdr_trunk_id ON cdr(trunk_id);
```

### 3.6 Queues & Agents

#### `queues`
Warteschlangen (ACD)

```sql
CREATE TABLE queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    extension_number VARCHAR(20) UNIQUE, -- Durchwahl für Queue

    -- Routing-Strategie
    strategy VARCHAR(50) NOT NULL DEFAULT 'longest_idle' CHECK (strategy IN ('ring_all', 'longest_idle', 'least_talk_time', 'round_robin', 'random')),

    -- Service-Level
    service_level_threshold_seconds INT DEFAULT 20,
    service_level_goal_percent INT DEFAULT 80,

    -- Wartezeit
    max_wait_time_seconds INT DEFAULT 300,

    -- Music-on-Hold
    music_on_hold_id UUID REFERENCES media_files(id) ON DELETE SET NULL,

    -- Ansagen
    welcome_prompt_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    position_announcement_enabled BOOLEAN DEFAULT TRUE,
    position_announcement_interval_seconds INT DEFAULT 30,

    -- Limits
    max_queue_size INT DEFAULT 50,

    -- Wrap-Up
    wrap_up_time_seconds INT DEFAULT 10,

    -- Overflow
    overflow_action VARCHAR(50) DEFAULT 'voicemail' CHECK (overflow_action IN ('voicemail', 'ivr', 'external', 'hangup')),
    overflow_destination_id UUID,
    overflow_destination_number VARCHAR(50),

    -- Callback (optional, für Enterprise)
    callback_enabled BOOLEAN DEFAULT FALSE,

    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_queues_name ON queues(name) WHERE deleted_at IS NULL;
```

#### `queue_members`
Agenten-Zuordnung zu Queues

```sql
CREATE TABLE queue_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    extension_id UUID NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,

    -- Priority (niedrigere Zahl = höhere Priorität)
    priority INT DEFAULT 0,

    -- Skills (für Skills-Based-Routing, optional)
    skills TEXT[],

    -- Penalties (erhöht bei schlechter Performance, optional)
    penalty INT DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(queue_id, extension_id)
);

CREATE INDEX idx_queue_members_queue_id ON queue_members(queue_id);
CREATE INDEX idx_queue_members_extension_id ON queue_members(extension_id);
```

#### `agent_states`
Live-Status der Agenten

```sql
CREATE TABLE agent_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extension_id UUID NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
    queue_id UUID REFERENCES queues(id) ON DELETE CASCADE, -- NULL = globaler Status

    status VARCHAR(50) NOT NULL CHECK (status IN ('available', 'busy', 'wrap_up', 'break', 'offline')),

    -- Reason Codes (optional)
    reason_code VARCHAR(100),

    -- Timestamps
    state_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_call_ended_at TIMESTAMP WITH TIME ZONE,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(extension_id, queue_id)
);

CREATE INDEX idx_agent_states_extension_id ON agent_states(extension_id);
CREATE INDEX idx_agent_states_status ON agent_states(status);
```

#### `queue_stats`
Zeitreihen-Statistiken (TimescaleDB Hypertable)

```sql
CREATE TABLE queue_stats (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,

    -- Aggregierte Metriken (z.B. pro 5 Minuten)
    calls_offered INT DEFAULT 0,
    calls_answered INT DEFAULT 0,
    calls_abandoned INT DEFAULT 0,

    avg_wait_time_seconds INT,
    max_wait_time_seconds INT,

    avg_talk_time_seconds INT,

    service_level_percent NUMERIC(5, 2),

    agents_available INT,
    agents_busy INT,

    PRIMARY KEY (time, queue_id)
);

-- TimescaleDB Hypertable (falls installiert)
-- SELECT create_hypertable('queue_stats', 'time');

CREATE INDEX idx_queue_stats_queue_id ON queue_stats(queue_id, time DESC);
```

### 3.7 IVR

#### `ivr_menus`
IVR-Konfigurationen

```sql
CREATE TABLE ivr_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,

    -- Welcome-Prompt
    welcome_prompt_id UUID REFERENCES media_files(id) ON DELETE SET NULL,

    -- Timeout
    digit_timeout_seconds INT DEFAULT 5,
    max_retries INT DEFAULT 3,

    -- Invalid-Input-Handling
    invalid_prompt_id UUID REFERENCES media_files(id) ON DELETE SET NULL,

    -- Timeout-Handling
    timeout_prompt_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    timeout_destination_type VARCHAR(50),
    timeout_destination_id UUID,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `ivr_menu_options`
DTMF-Optionen eines IVR-Menüs

```sql
CREATE TABLE ivr_menu_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ivr_menu_id UUID NOT NULL REFERENCES ivr_menus(id) ON DELETE CASCADE,

    dtmf_digit VARCHAR(2) NOT NULL, -- '0'-'9', '*', '#'

    -- Ziel
    action VARCHAR(50) NOT NULL CHECK (action IN ('extension', 'queue', 'ivr', 'voicemail', 'external', 'hangup', 'repeat')),
    destination_id UUID,
    destination_number VARCHAR(50),

    -- Optional: Ansage vor Transfer
    pre_transfer_prompt_id UUID REFERENCES media_files(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(ivr_menu_id, dtmf_digit)
);

CREATE INDEX idx_ivr_menu_options_ivr_menu_id ON ivr_menu_options(ivr_menu_id);
```

### 3.8 Voicemail

#### `voicemail_boxes`
Voicemail-Boxen (in der Regel 1:1 zu Extensions)

```sql
CREATE TABLE voicemail_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extension_id UUID NOT NULL UNIQUE REFERENCES extensions(id) ON DELETE CASCADE,

    pin VARCHAR(20),

    -- Grußnachricht
    greeting_prompt_id UUID REFERENCES media_files(id) ON DELETE SET NULL,

    -- Benachrichtigung
    email_notification BOOLEAN DEFAULT TRUE,
    email_address VARCHAR(255),
    attach_audio BOOLEAN DEFAULT TRUE,

    -- Retention
    retention_days INT DEFAULT 90,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_voicemail_boxes_extension_id ON voicemail_boxes(extension_id);
```

#### `voicemail_messages`
Voicemail-Nachrichten

```sql
CREATE TABLE voicemail_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voicemail_box_id UUID NOT NULL REFERENCES voicemail_boxes(id) ON DELETE CASCADE,

    caller_number VARCHAR(50) NOT NULL,
    caller_name VARCHAR(100),

    -- Audio-Datei
    storage_path VARCHAR(500) NOT NULL, -- MinIO/S3-Pfad
    duration_seconds INT NOT NULL,
    file_size_bytes BIGINT,

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_urgent BOOLEAN DEFAULT FALSE,

    -- Timestamps
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    delete_at TIMESTAMP WITH TIME ZONE, -- Auto-Deletion-Datum

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_voicemail_messages_voicemail_box_id ON voicemail_messages(voicemail_box_id);
CREATE INDEX idx_voicemail_messages_received_at ON voicemail_messages(received_at DESC);
```

### 3.9 Recordings

#### `recordings`
Anruf-Aufzeichnungen

```sql
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES cdr(call_id) ON DELETE CASCADE,

    -- Aufzeichnungs-Typ
    recording_type VARCHAR(50) NOT NULL CHECK (recording_type IN ('on_demand', 'automatic', 'compliance')),

    -- Initiator (wer hat gestartet)
    initiated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Audio-Datei
    storage_path VARCHAR(500) NOT NULL,
    duration_seconds INT NOT NULL,
    file_size_bytes BIGINT,

    -- Encryption
    is_encrypted BOOLEAN DEFAULT FALSE,
    encryption_key_id VARCHAR(100), -- Referenz zu Key-Management-System

    -- Access-Control
    allowed_user_ids UUID[], -- Wer darf anhören
    allowed_roles TEXT[],

    -- Retention
    retention_until DATE NOT NULL,

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    stopped_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_recordings_call_id ON recordings(call_id);
CREATE INDEX idx_recordings_retention_until ON recordings(retention_until);
CREATE INDEX idx_recordings_started_at ON recordings(started_at DESC);
```

### 3.10 Conferences

#### `conferences`
Konferenz-Räume

```sql
CREATE TABLE conferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    extension_number VARCHAR(20) UNIQUE, -- Einwahl-Nummer

    -- Typ
    conference_type VARCHAR(50) NOT NULL DEFAULT 'audio' CHECK (conference_type IN ('audio', 'webrtc')),

    -- Sicherheit
    pin VARCHAR(20),
    moderator_pin VARCHAR(20),

    -- Moderator
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Optionen
    wait_for_moderator BOOLEAN DEFAULT FALSE,
    record_conference BOOLEAN DEFAULT FALSE,
    max_participants INT DEFAULT 25,

    -- WebRTC-Optionen
    enable_screen_sharing BOOLEAN DEFAULT TRUE,
    enable_chat BOOLEAN DEFAULT TRUE,

    -- Geplante Konferenzen
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,

    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conferences_extension_number ON conferences(extension_number);
CREATE INDEX idx_conferences_scheduled_start ON conferences(scheduled_start);
```

#### `conference_participants`
Teilnehmer einer aktiven Konferenz

```sql
CREATE TABLE conference_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conference_id UUID NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,

    -- Identifikation
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL,
    display_name VARCHAR(100),

    -- Status
    is_moderator BOOLEAN DEFAULT FALSE,
    is_muted BOOLEAN DEFAULT FALSE,

    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_conference_participants_conference_id ON conference_participants(conference_id);
```

### 3.11 Media Files

#### `media_files`
Audio-Dateien für Prompts, MoH, etc.

```sql
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,

    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('prompt', 'moh', 'greeting', 'other')),

    storage_path VARCHAR(500) NOT NULL,
    duration_seconds INT,
    file_size_bytes BIGINT,

    -- Audio-Format
    format VARCHAR(20), -- z.B. 'wav', 'mp3', 'gsm'
    sample_rate INT DEFAULT 8000,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_media_files_file_type ON media_files(file_type);
```

### 3.12 CRM Integrations

#### `crm_integrations`
CRM-Konnektoren

```sql
CREATE TABLE crm_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    crm_type VARCHAR(50) NOT NULL CHECK (crm_type IN ('salesforce', 'zoho', 'hubspot', 'freshdesk', 'dynamics365', 'custom')),

    -- API-Konfiguration
    base_url VARCHAR(500),
    api_version VARCHAR(20),

    -- Authentifizierung
    auth_type VARCHAR(50) NOT NULL CHECK (auth_type IN ('oauth2', 'api_key', 'basic')),
    auth_credentials JSONB, -- Verschlüsselt: {api_key, client_id, client_secret, refresh_token, ...}

    -- Endpoints
    lookup_endpoint VARCHAR(500), -- z.B. '/contacts/search?phone={number}'
    create_contact_endpoint VARCHAR(500),
    log_call_endpoint VARCHAR(500),

    -- Field-Mapping
    field_mappings JSONB,
    /* Beispiel:
    {
      "contact": {
        "phone": "phone_number",
        "email": "email_address",
        "name": "full_name"
      },
      "call_log": {
        "duration": "duration_seconds",
        "direction": "call_direction"
      }
    }
    */

    -- Screen-Pop
    screen_pop_enabled BOOLEAN DEFAULT TRUE,
    screen_pop_url_template TEXT, -- z.B. 'https://crm.example.com/contact/{contactId}'

    -- Webhooks (Outbound)
    webhook_url VARCHAR(500),
    webhook_events TEXT[], -- z.B. ['call_started', 'call_ended']

    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `crm_contacts_cache`
Gecachte CRM-Kontakte für schnelle Lookups

```sql
CREATE TABLE crm_contacts_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crm_integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,

    external_id VARCHAR(255) NOT NULL, -- CRM Contact-ID

    phone_numbers TEXT[] NOT NULL,
    email VARCHAR(255),
    name VARCHAR(200),

    -- Zusätzliche Felder (flexibel)
    custom_fields JSONB,

    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(crm_integration_id, external_id)
);

CREATE INDEX idx_crm_contacts_cache_phone ON crm_contacts_cache USING GIN (phone_numbers);
CREATE INDEX idx_crm_contacts_cache_email ON crm_contacts_cache(email);
```

### 3.13 Reports & Analytics

#### `reports`
Gespeicherte Berichte

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('agent_performance', 'queue_kpis', 'trunk_utilization', 'call_volume', 'custom')),

    -- Parameter
    parameters JSONB,
    /* Beispiel:
    {
      "date_from": "2025-11-01",
      "date_to": "2025-11-30",
      "queue_ids": ["uuid1", "uuid2"],
      "group_by": "day"
    }
    */

    -- Generiert von
    generated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Datei
    file_format VARCHAR(20) CHECK (file_format IN ('csv', 'json', 'pdf')),
    storage_path VARCHAR(500),
    file_size_bytes BIGINT,

    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_report_type ON reports(report_type);
CREATE INDEX idx_reports_generated_at ON reports(generated_at DESC);
```

#### `scheduled_reports`
Automatisch generierte Berichte

```sql
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL,

    parameters JSONB,

    -- Schedule (Cron-Expression)
    cron_expression VARCHAR(100) NOT NULL, -- z.B. '0 8 * * 1' (jeden Montag 8 Uhr)

    -- E-Mail-Versand
    email_recipients TEXT[] NOT NULL,

    -- Nächste Ausführung
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,

    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.14 System Configuration

#### `system_settings`
Globale Einstellungen

```sql
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Beispiel-Einträge:
-- INSERT INTO system_settings (key, value, description) VALUES
-- ('security.max_login_attempts', '5', 'Max failed login attempts before lockout'),
-- ('security.allowed_countries', '["DE", "AT", "CH"]', 'Country whitelist for SIP'),
-- ('recordings.default_retention_days', '90', 'Default retention for recordings');
```

#### `blacklist`
IP/Telefonnummer-Blacklist

```sql
CREATE TABLE blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN ('ip', 'phone_number', 'user_agent')),
    value VARCHAR(255) NOT NULL,

    reason TEXT,

    -- Auto-Expire
    expires_at TIMESTAMP WITH TIME ZONE,

    added_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(entry_type, value)
);

CREATE INDEX idx_blacklist_entry_type ON blacklist(entry_type, value);
```

#### `audit_logs`
Audit-Trail für Admin-Aktionen

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL, -- z.B. 'user.created', 'trunk.deleted', 'recording.played'
    resource_type VARCHAR(50), -- z.B. 'user', 'trunk', 'recording'
    resource_id UUID,

    -- Details
    details JSONB,

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### 3.15 Backups

#### `backups`
Backup-Metadaten

```sql
CREATE TABLE backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('full', 'incremental', 'manual')),

    storage_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,

    -- Checksums für Integritätsprüfung
    checksum_sha256 VARCHAR(64),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
    error_message TEXT,

    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_backups_started_at ON backups(started_at DESC);
```

## 4. Views (Häufige Queries)

### 4.1 Active Calls View

```sql
CREATE VIEW active_calls_view AS
SELECT
    c.id,
    c.call_id,
    c.direction,
    c.caller_number,
    c.caller_name,
    c.callee_number,
    c.callee_name,
    c.state,
    c.initiated_at,
    EXTRACT(EPOCH FROM (NOW() - c.initiated_at))::INT AS duration_seconds,
    t.name AS trunk_name,
    q.name AS queue_name,
    u.first_name || ' ' || u.last_name AS agent_name
FROM calls c
LEFT JOIN trunks t ON c.trunk_id = t.id
LEFT JOIN queues q ON c.queue_id = q.id
LEFT JOIN extensions e ON c.agent_extension_id = e.id
LEFT JOIN users u ON e.user_id = u.id
WHERE c.state IN ('initiated', 'ringing', 'answered', 'held');
```

### 4.2 Queue Statistics View

```sql
CREATE VIEW queue_live_stats AS
SELECT
    q.id AS queue_id,
    q.name AS queue_name,
    COUNT(CASE WHEN c.state = 'ringing' THEN 1 END) AS waiting_calls,
    COUNT(CASE WHEN c.state = 'answered' THEN 1 END) AS active_calls,
    COUNT(CASE WHEN a.status = 'available' THEN 1 END) AS available_agents,
    COUNT(CASE WHEN a.status = 'busy' THEN 1 END) AS busy_agents,
    AVG(EXTRACT(EPOCH FROM (NOW() - c.initiated_at)))::INT AS avg_wait_time_seconds
FROM queues q
LEFT JOIN calls c ON q.id = c.queue_id AND c.ended_at IS NULL
LEFT JOIN agent_states a ON q.id = a.queue_id
WHERE q.deleted_at IS NULL
GROUP BY q.id, q.name;
```

## 5. Indexes & Performance

### 5.1 Composite Indexes

```sql
-- Schnelles User-Lookup für Login
CREATE INDEX idx_users_email_status ON users(email, status) WHERE deleted_at IS NULL;

-- Extension-Registrierungen mit Expiry-Check
CREATE INDEX idx_extension_registrations_active ON extension_registrations(extension_id, expires_at)
    WHERE expires_at > NOW();

-- CDR-Queries nach Datum und Nummer
CREATE INDEX idx_cdr_date_caller ON cdr(initiated_at DESC, caller_number);
CREATE INDEX idx_cdr_date_callee ON cdr(initiated_at DESC, callee_number);
```

### 5.2 Full-Text-Search (optional)

```sql
-- Für User-Suche
ALTER TABLE users ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('german', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, ''))
    ) STORED;

CREATE INDEX idx_users_search_vector ON users USING GIN(search_vector);
```

## 6. Triggers & Functions

### 6.1 Auto-Update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Anwenden auf relevante Tabellen
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extensions_updated_at BEFORE UPDATE ON extensions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... (für alle Tabellen mit updated_at)
```

### 6.2 Call-to-CDR Migration

```sql
CREATE OR REPLACE FUNCTION archive_ended_call()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.state = 'ended' AND OLD.state != 'ended' THEN
        INSERT INTO cdr (
            call_id, direction, caller_number, caller_name, callee_number, callee_name,
            caller_extension_id, callee_extension_id, trunk_id,
            initiated_at, ringing_at, answered_at, ended_at,
            duration_seconds, hangup_cause,
            recording_id, queue_id, agent_extension_id, queue_wait_time_seconds
        ) VALUES (
            NEW.id, NEW.direction, NEW.caller_number, NEW.caller_name, NEW.callee_number, NEW.callee_name,
            NEW.caller_extension_id, NEW.callee_extension_id, NEW.trunk_id,
            NEW.initiated_at, NEW.ringing_at, NEW.answered_at, NEW.ended_at,
            EXTRACT(EPOCH FROM (NEW.ended_at - COALESCE(NEW.answered_at, NEW.initiated_at)))::INT,
            NEW.hangup_cause,
            NEW.recording_id, NEW.queue_id, NEW.agent_extension_id, NEW.queue_wait_time_seconds
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER archive_call_to_cdr AFTER UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION archive_ended_call();
```

## 7. Migrations-Strategie

**Tool**: TypeORM Migrations oder Flyway

**Namenskonvention**: `{timestamp}_{description}.sql`

Beispiel:
- `20251112100000_create_initial_schema.sql`
- `20251112110000_add_crm_integrations.sql`

**Rollback-Support**: Jede Migration hat ein entsprechendes Rollback-Skript.

---

**Version:** 1.0
**Datum:** 2025-11-12
