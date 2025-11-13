# PBX-X Dokumentation

## Überblick

PBX-X ist eine moderne, vollständig funktionale VoIP-TK-Anlage (Telefonanlage), die als 3CX-kompatible Alternative entwickelt wurde. Das System basiert auf NestJS und bietet umfassende Funktionen für Unternehmen jeder Größe.

## Inhaltsverzeichnis

1. [Systemarchitektur](#systemarchitektur)
2. [Kernfunktionen](#kernfunktionen)
3. [Module](#module)
4. [API-Endpunkte](#api-endpunkte)
5. [WebSocket-Events](#websocket-events)
6. [Datenbank-Schema](#datenbank-schema)
7. [Sicherheit](#sicherheit)
8. [Konfiguration](#konfiguration)

## Systemarchitektur

### Technologie-Stack

- **Backend-Framework**: NestJS 10 mit TypeScript 5
- **Datenbank**: PostgreSQL 15 mit TypeORM
- **Cache/Pub-Sub**: Redis 7
- **Authentifizierung**: JWT mit Passport
- **WebSocket**: Socket.io für Echtzeit-CTI-Events
- **SIP-Protokoll**: Drachtio-Server-Integration
- **Speicher**: MinIO/S3 für Aufnahmen und Voicemail
- **Container**: Docker & Docker Compose

### Architektur-Prinzipien

- **Modularer Monolith**: Klar getrennte Module mit definierten Schnittstellen
- **Service-orientiert**: Business-Logik in Services gekapselt
- **Event-getrieben**: WebSocket-Events für Echtzeit-Updates
- **RESTful API**: Standardisierte HTTP-Endpunkte
- **Type-Safe**: Vollständige TypeScript-Typisierung

## Kernfunktionen

### 1. Benutzerverwaltung
- Mehrstufiges Rollensystem (Admin, Supervisor, Agent, User)
- Benutzerprofile mit Kontaktinformationen
- Rechtebasierte Zugriffskontrolle (RBAC)
- Passwort-Hashing mit bcrypt

### 2. Nebenstellen (Extensions)
- SIP-Nebenstellen-Konfiguration
- Registrierungsverwaltung mit Ablaufkontrolle
- Rufumleitung (immer, bei besetzt, keine Antwort)
- DND (Nicht stören)
- Voicemail-Box pro Nebenstelle
- Anrufweiterleitung

### 3. SIP-Trunks
- Mehrere Provider unterstützt
- Authentifizierung (keine, Benutzername/Passwort, IP-basiert)
- Anzahl gleichzeitiger Anrufe konfigurierbar
- Codecs (G.711, G.729, Opus)
- Aktiv/Inaktiv-Status

### 4. Anrufverwaltung
- Echtzeit-Anrufverfolgung
- Anrufzustände (initiiert, klingelt, beantwortet, gehalten, übergeben, beendet)
- Anrufsteuerung (Halten, Fortsetzen, Auflegen, Übergeben)
- Vollständige Anrufhistorie
- WebSocket-Benachrichtigungen für alle Anrufänderungen

### 5. Warteschlangen & ACD (Automatic Call Distribution)
- Mehrere Warteschlangen-Strategien:
  - Ring All (alle gleichzeitig)
  - Round Robin (reihum)
  - Longest Idle (längste Wartezeit)
  - Least Calls (wenigste Anrufe)
  - Random (zufällig)
  - Priority (nach Priorität)
- Agent-Statusverwaltung (verfügbar, beschäftigt, nachbearbeiten, pause, offline)
- Skill-basiertes Routing
- Service-Level-Ziele (SLA)
- Warteschlangen-Statistiken in Echtzeit
- Maximale Wartezeit und Warteschlangengröße

### 6. IVR (Interactive Voice Response)
- Mehrstufige IVR-Menüs
- DTMF-Tonwahl-Routing (0-9, *, #)
- Flexible Aktionen:
  - Weiterleitung zu Nebenstelle
  - Weiterleitung zu Warteschlange
  - Weiterleitung zu Voicemail
  - Weiterleitung zu anderem IVR-Menü
  - Anruf auflegen
- Timeout-Konfiguration
- Willkommens- und Timeout-Ansagen
- Ungültige Eingaben behandeln

### 7. Voicemail
- Voicemail-Box pro Nebenstelle
- PIN-geschützt
- E-Mail-Benachrichtigungen
- Maximale Nachrichtenlänge konfigurierbar
- Automatische Löschung nach X Tagen
- Gelesen/Ungelesen-Status
- Transkription (optional)
- Nachrichtenanhörung und -verwaltung

### 8. Anrufaufzeichnung
- Automatische und manuelle Aufzeichnung
- Verschlüsselung (AES-256)
- Aufbewahrungsrichtlinien
- Rechteverwaltung (wer darf aufzeichnen/anhören)
- Speicherung in S3/MinIO
- Metadaten-Tracking
- Automatische Bereinigung abgelaufener Aufzeichnungen

### 9. Eingehende und ausgehende Regeln
- **Eingehende Regeln**:
  - DID-Routing (Direct Inward Dialing)
  - Zeitbasiertes Routing
  - Priorisierung
  - Zieltypen: Nebenstelle, Warteschlange, IVR, Voicemail, Konferenz
- **Ausgehende Regeln**:
  - Nummernmuster-Matching (Regex)
  - Trunk-Auswahl
  - Nummernmanipulation (Präfix hinzufügen/entfernen)
  - Priorisierung
  - Zeitbasiertes Routing

### 10. CRM-Integration
- Unterstützte Systeme:
  - Salesforce
  - Zoho CRM
  - HubSpot
  - Microsoft Dynamics
  - Pipedrive
  - Custom (eigene API)
- Feldmapping konfigurierbar
- Webhook-URLs für Events
- OAuth 2.0 und API-Key-Authentifizierung
- Automatische Kontakt-Pop-ups bei eingehenden Anrufen

### 11. Konferenzen
- Audio-Konferenzen
- WebRTC-Konferenzen
- PIN-geschützt
- Maximale Teilnehmerzahl konfigurierbar
- Wartemusik
- Moderator-Funktionen
- Teilnehmerverwaltung

### 12. Echtzeit-CTI (Computer Telephony Integration)
- WebSocket-Verbindung
- Event-Subscriptions (Channels)
- Echtzeit-Benachrichtigungen:
  - Anruf-Events (erstellt, klingelt, beantwortet, beendet)
  - Agent-Status-Änderungen
  - Warteschlangen-Statistiken
  - Präsenz-Updates
- JWT-Authentifizierung für WebSocket-Verbindungen

## Module

### Auth-Modul (`src/modules/auth`)
Verwaltet Authentifizierung und Autorisierung.

**Hauptkomponenten**:
- `auth.service.ts`: Login, Token-Generierung, Validierung
- `jwt.strategy.ts`: JWT-Validierungsstrategie
- `local.strategy.ts`: Benutzername/Passwort-Validierung
- `jwt-auth.guard.ts`: Globaler JWT-Guard mit @Public()-Support
- `roles.guard.ts`: Rollenbasierte Zugriffskontrolle

**Decorators**:
- `@Public()`: Route als öffentlich markieren
- `@Roles(...)`: Erforderliche Rollen definieren
- `@CurrentUser()`: Aktuellen Benutzer extrahieren

### Users-Modul (`src/modules/users`)
Benutzerverwaltung und -profile.

**Entitäten**:
- `User`: Benutzer mit Rollen und Profil

**Rollen**:
- `admin`: Vollzugriff auf alle Funktionen
- `supervisor`: Überwachung und Reporting
- `agent`: Anrufbearbeitung
- `user`: Grundlegende Telefonfunktionen

### Extensions-Modul (`src/modules/extensions`)
SIP-Nebenstellen-Verwaltung.

**Entitäten**:
- `Extension`: Nebenstellen-Konfiguration
- `ExtensionRegistration`: SIP-Registrierungsverfolgung

**Features**:
- Registrierungsablauf-Überwachung
- Automatische Bereinigung abgelaufener Registrierungen
- Rufumleitungskonfiguration
- DND-Verwaltung

### Trunks-Modul (`src/modules/trunks`)
SIP-Trunk-Konfiguration und Routing.

**Entitäten**:
- `Trunk`: SIP-Provider-Konfiguration
- `InboundRule`: Eingehende Routing-Regeln
- `OutboundRule`: Ausgehende Routing-Regeln

### Calls-Modul (`src/modules/calls`)
Anrufverfolgung und -steuerung.

**Entitäten**:
- `Call`: Anrufdetails mit Zustandsmaschine

**Zustände**:
- `initiated`: Anruf wird initiiert
- `ringing`: Klingelt
- `answered`: Beantwortet
- `held`: Gehalten
- `transferred`: Übergeben
- `ended`: Beendet
- `failed`: Fehlgeschlagen

**API-Aktionen**:
- `PUT /calls/:id/hold`: Anruf halten
- `PUT /calls/:id/unhold`: Anruf fortsetzen
- `PUT /calls/:id/hangup`: Anruf beenden

### Queues-Modul (`src/modules/queues`)
Warteschlangen und ACD-System.

**Entitäten**:
- `Queue`: Warteschlangen-Konfiguration
- `QueueMember`: Agent-Zuordnungen
- `AgentState`: Agent-Statusverfolgung

**Agent-Aktionen**:
- `POST /queues/:id/login`: Agent anmelden
- `POST /queues/:id/logout`: Agent abmelden
- `PUT /agents/:extensionId/state`: Status ändern

### IVR-Modul (`src/modules/ivr`)
Interactive Voice Response System.

**Entitäten**:
- `IvrMenu`: IVR-Menü-Konfiguration
- `IvrMenuOption`: DTMF-Optionen (0-9, *, #)

**Aktionstypen**:
- `extension`: Zu Nebenstelle weiterleiten
- `queue`: Zu Warteschlange weiterleiten
- `voicemail`: Zu Voicemail weiterleiten
- `submenu`: Zu Untermenü weiterleiten
- `hangup`: Anruf beenden

### Voicemail-Modul (`src/modules/voicemail`)
Voicemail-System.

**Entitäten**:
- `VoicemailBox`: Voicemail-Box pro Nebenstelle
- `VoicemailMessage`: Einzelne Nachrichten

**Features**:
- E-Mail-Benachrichtigungen
- Transkription
- Automatische Löschung
- Als gelesen/ungelesen markieren

### Recordings-Modul (`src/modules/recordings`)
Anrufaufzeichnungs-System.

**Entitäten**:
- `Recording`: Aufzeichnungsmetadaten

**Features**:
- Verschlüsselung (AES-256)
- Aufbewahrungsrichtlinien
- S3/MinIO-Speicherung
- Rechteverwaltung
- Automatische Bereinigung

### CRM-Modul (`src/modules/crm`)
CRM-Integrations-Framework.

**Entitäten**:
- `CrmIntegration`: CRM-Konfiguration

**Unterstützte Systeme**:
- Salesforce, Zoho, HubSpot, Dynamics, Pipedrive, Custom

### Conferences-Modul (`src/modules/conferences`)
Konferenz-System.

**Entitäten**:
- `Conference`: Konferenz-Konfiguration

**Typen**:
- `audio`: Reine Audio-Konferenz
- `webrtc`: WebRTC-Videokonferenz

### WebSocket-Modul (`src/modules/websocket`)
Echtzeit-CTI-Gateway.

**Gateway**: `CtiGateway`
- JWT-Authentifizierung
- Channel-Subscriptions
- Event-Emission

**Channels**:
- `calls`: Anruf-Events
- `queues`: Warteschlangen-Events
- `agents`: Agent-Status-Events
- `presence`: Präsenz-Updates

## API-Endpunkte

### Authentifizierung

```
POST   /api/v1/auth/login          Login und Token-Erhalt
POST   /api/v1/auth/refresh        Token erneuern
POST   /api/v1/auth/logout         Logout
GET    /api/v1/auth/profile        Aktuelles Profil abrufen
```

### Benutzer

```
GET    /api/v1/users               Liste aller Benutzer (Admin)
POST   /api/v1/users               Neuen Benutzer erstellen (Admin)
GET    /api/v1/users/:id           Benutzer-Details
PATCH  /api/v1/users/:id           Benutzer aktualisieren
DELETE /api/v1/users/:id           Benutzer löschen (Admin)
```

### Nebenstellen

```
GET    /api/v1/extensions          Liste aller Nebenstellen
POST   /api/v1/extensions          Neue Nebenstelle erstellen
GET    /api/v1/extensions/:id      Nebenstellen-Details
PATCH  /api/v1/extensions/:id      Nebenstelle aktualisieren
DELETE /api/v1/extensions/:id      Nebenstelle löschen
GET    /api/v1/extensions/:id/registrations  Registrierungen abrufen
```

### Trunks

```
GET    /api/v1/trunks              Liste aller Trunks
POST   /api/v1/trunks              Neuen Trunk erstellen
GET    /api/v1/trunks/:id          Trunk-Details
PATCH  /api/v1/trunks/:id          Trunk aktualisieren
DELETE /api/v1/trunks/:id          Trunk löschen
```

### Anrufe

```
GET    /api/v1/calls               Liste aktiver Anrufe
GET    /api/v1/calls/:id           Anruf-Details
PUT    /api/v1/calls/:id/hold      Anruf halten
PUT    /api/v1/calls/:id/unhold    Anruf fortsetzen
PUT    /api/v1/calls/:id/hangup    Anruf beenden
```

### Warteschlangen

```
GET    /api/v1/queues              Liste aller Warteschlangen
POST   /api/v1/queues              Neue Warteschlange erstellen
GET    /api/v1/queues/:id          Warteschlangen-Details
PATCH  /api/v1/queues/:id          Warteschlange aktualisieren
DELETE /api/v1/queues/:id          Warteschlange löschen
GET    /api/v1/queues/:id/members  Warteschlangen-Mitglieder
POST   /api/v1/queues/:id/members  Mitglied hinzufügen
DELETE /api/v1/queues/:id/members/:memberId  Mitglied entfernen
POST   /api/v1/queues/:id/login    Agent anmelden
POST   /api/v1/queues/:id/logout   Agent abmelden
PUT    /api/v1/agents/:extensionId/state  Agent-Status ändern
```

### IVR

```
GET    /api/v1/ivr                 Liste aller IVR-Menüs
POST   /api/v1/ivr                 Neues IVR-Menü erstellen
GET    /api/v1/ivr/:id             IVR-Details
PATCH  /api/v1/ivr/:id             IVR aktualisieren
DELETE /api/v1/ivr/:id             IVR löschen
```

### Voicemail

```
GET    /api/v1/voicemail/boxes     Liste aller Voicemail-Boxen
POST   /api/v1/voicemail/boxes     Neue Box erstellen
GET    /api/v1/voicemail/boxes/:id Box-Details
PATCH  /api/v1/voicemail/boxes/:id Box aktualisieren
DELETE /api/v1/voicemail/boxes/:id Box löschen
GET    /api/v1/voicemail/messages  Nachrichten abrufen
PATCH  /api/v1/voicemail/messages/:id/read  Als gelesen markieren
DELETE /api/v1/voicemail/messages/:id  Nachricht löschen
```

### Aufzeichnungen

```
GET    /api/v1/recordings          Liste aller Aufzeichnungen
GET    /api/v1/recordings/:id      Aufzeichnungs-Details
DELETE /api/v1/recordings/:id      Aufzeichnung löschen
GET    /api/v1/recordings/:id/download  Aufzeichnung herunterladen
```

### CRM

```
GET    /api/v1/crm                 Liste aller CRM-Integrationen
POST   /api/v1/crm                 Neue Integration erstellen
GET    /api/v1/crm/:id             Integration-Details
PATCH  /api/v1/crm/:id             Integration aktualisieren
DELETE /api/v1/crm/:id             Integration löschen
```

### Konferenzen

```
GET    /api/v1/conferences         Liste aller Konferenzen
POST   /api/v1/conferences         Neue Konferenz erstellen
GET    /api/v1/conferences/:id     Konferenz-Details
PATCH  /api/v1/conferences/:id     Konferenz aktualisieren
DELETE /api/v1/conferences/:id     Konferenz löschen
```

## WebSocket-Events

### Verbindung

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/ws', {
  auth: {
    token: 'JWT_TOKEN_HIER'
  }
});
```

### Channel-Subscription

```javascript
// Zu Channels subscriben
socket.emit('subscribe', { channels: ['calls', 'queues', 'agents'] });

// Von Channels desubscriben
socket.emit('unsubscribe', { channels: ['calls'] });
```

### Anruf-Events

```javascript
// Neuer Anruf erstellt
socket.on('CALL_CREATED', (data) => {
  console.log('Neuer Anruf:', data);
  // { callId, fromNumber, toNumber, direction, state }
});

// Anruf klingelt
socket.on('CALL_RINGING', (data) => {
  console.log('Anruf klingelt:', data);
});

// Anruf beantwortet
socket.on('CALL_ANSWERED', (data) => {
  console.log('Anruf beantwortet:', data);
});

// Anruf beendet
socket.on('CALL_ENDED', (data) => {
  console.log('Anruf beendet:', data);
  // { callId, duration, endReason }
});

// Anruf gehalten
socket.on('CALL_HELD', (data) => {
  console.log('Anruf gehalten:', data);
});

// Anruf fortgesetzt
socket.on('CALL_UNHELD', (data) => {
  console.log('Anruf fortgesetzt:', data);
});
```

### Agent-Events

```javascript
// Agent-Status geändert
socket.on('AGENT_STATE_CHANGED', (data) => {
  console.log('Agent-Status:', data);
  // { extensionId, queueId, status, reasonCode }
});

// Agent angemeldet
socket.on('AGENT_LOGGED_IN', (data) => {
  console.log('Agent angemeldet:', data);
});

// Agent abgemeldet
socket.on('AGENT_LOGGED_OUT', (data) => {
  console.log('Agent abgemeldet:', data);
});
```

### Warteschlangen-Events

```javascript
// Warteschlangen-Statistiken aktualisiert
socket.on('QUEUE_STATS_UPDATED', (data) => {
  console.log('Queue Stats:', data);
  // { queueId, waitingCalls, availableAgents, longestWaitTime }
});
```

## Datenbank-Schema

### Haupttabellen

#### users
```sql
- id: UUID (PK)
- email: VARCHAR (unique)
- password_hash: VARCHAR
- first_name: VARCHAR
- last_name: VARCHAR
- role: ENUM (admin, supervisor, agent, user)
- is_active: BOOLEAN
- last_login: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- deleted_at: TIMESTAMP (soft delete)
```

#### extensions
```sql
- id: UUID (PK)
- extension_number: VARCHAR (unique)
- sip_password: VARCHAR
- user_id: UUID (FK -> users)
- email: VARCHAR
- enable_voicemail: BOOLEAN
- voicemail_pin: VARCHAR
- forward_always: VARCHAR
- forward_busy: VARCHAR
- forward_no_answer: VARCHAR
- dnd_enabled: BOOLEAN
- max_concurrent_calls: INTEGER
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- deleted_at: TIMESTAMP
```

#### trunks
```sql
- id: UUID (PK)
- name: VARCHAR
- provider: VARCHAR
- host: VARCHAR
- port: INTEGER
- username: VARCHAR
- password: VARCHAR
- auth_type: ENUM (none, username_password, ip_based)
- max_concurrent_calls: INTEGER
- codec: ENUM[] (g711, g729, opus)
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- deleted_at: TIMESTAMP
```

#### calls
```sql
- id: UUID (PK)
- from_number: VARCHAR
- to_number: VARCHAR
- caller_id_name: VARCHAR
- direction: ENUM (inbound, outbound, internal)
- state: ENUM (initiated, ringing, answered, held, transferred, ended, failed)
- extension_id: UUID (FK -> extensions)
- trunk_id: UUID (FK -> trunks)
- queue_id: UUID (FK -> queues)
- started_at: TIMESTAMP
- ringing_at: TIMESTAMP
- answered_at: TIMESTAMP
- ended_at: TIMESTAMP
- duration: INTEGER (seconds)
- recording_enabled: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### queues
```sql
- id: UUID (PK)
- name: VARCHAR (unique)
- extension_number: VARCHAR (unique)
- strategy: ENUM (ring_all, round_robin, longest_idle, least_calls, random, priority)
- max_wait_time: INTEGER (seconds)
- max_queue_size: INTEGER
- service_level_threshold: INTEGER (seconds)
- service_level_target: INTEGER (percentage)
- wrap_up_time: INTEGER (seconds)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- deleted_at: TIMESTAMP
```

#### queue_members
```sql
- id: UUID (PK)
- queue_id: UUID (FK -> queues)
- extension_id: UUID (FK -> extensions)
- priority: INTEGER
- skill_level: INTEGER
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### agent_states
```sql
- id: UUID (PK)
- extension_id: UUID (FK -> extensions)
- queue_id: UUID (FK -> queues, nullable)
- status: ENUM (available, busy, wrap_up, break, offline)
- reason_code: VARCHAR
- changed_at: TIMESTAMP
- created_at: TIMESTAMP
```

#### ivr_menus
```sql
- id: UUID (PK)
- name: VARCHAR (unique)
- extension_number: VARCHAR (unique)
- greeting_audio_url: VARCHAR
- timeout_seconds: INTEGER
- timeout_audio_url: VARCHAR
- invalid_audio_url: VARCHAR
- max_retries: INTEGER
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- deleted_at: TIMESTAMP
```

#### ivr_menu_options
```sql
- id: UUID (PK)
- menu_id: UUID (FK -> ivr_menus)
- digit: VARCHAR (0-9, *, #)
- action: ENUM (extension, queue, voicemail, submenu, hangup)
- destination_id: UUID
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### voicemail_boxes
```sql
- id: UUID (PK)
- extension_id: UUID (FK -> extensions, unique)
- pin: VARCHAR
- email: VARCHAR
- email_notifications: BOOLEAN
- max_message_length: INTEGER (seconds)
- auto_delete_after_days: INTEGER
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### voicemail_messages
```sql
- id: UUID (PK)
- box_id: UUID (FK -> voicemail_boxes)
- caller_number: VARCHAR
- caller_name: VARCHAR
- audio_url: VARCHAR
- duration: INTEGER (seconds)
- is_read: BOOLEAN
- transcription: TEXT
- received_at: TIMESTAMP
- created_at: TIMESTAMP
```

#### recordings
```sql
- id: UUID (PK)
- call_id: UUID (FK -> calls)
- file_url: VARCHAR
- duration: INTEGER (seconds)
- file_size: BIGINT (bytes)
- is_encrypted: BOOLEAN
- encryption_key: VARCHAR
- retention_until: TIMESTAMP
- created_at: TIMESTAMP
```

#### crm_integrations
```sql
- id: UUID (PK)
- name: VARCHAR
- type: ENUM (salesforce, zoho, hubspot, dynamics, pipedrive, custom)
- api_url: VARCHAR
- api_key: VARCHAR
- oauth_token: TEXT
- field_mappings: JSONB
- webhook_url: VARCHAR
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### conferences
```sql
- id: UUID (PK)
- name: VARCHAR (unique)
- extension_number: VARCHAR (unique)
- pin: VARCHAR
- max_participants: INTEGER
- type: ENUM (audio, webrtc)
- wait_music_url: VARCHAR
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- deleted_at: TIMESTAMP
```

## Sicherheit

### Authentifizierung

- **JWT-Tokens**: Verwendung von Access- und Refresh-Tokens
- **Token-Ablauf**: Access-Tokens 15 Minuten, Refresh-Tokens 7 Tage
- **Password-Hashing**: bcrypt mit Salt-Rounds von 10
- **WebSocket-Auth**: JWT-Token-Validierung bei Verbindungsaufbau

### Autorisierung

- **Globaler Guard**: JWT-Guard auf allen Routen außer @Public()
- **Rollen-Guard**: Überprüfung erforderlicher Rollen
- **RBAC**: Rollenbasierte Zugriffskontrolle für alle Ressourcen

### Daten-Sicherheit

- **Verschlüsselung**: Aufzeichnungen mit AES-256 verschlüsselt
- **Soft-Deletes**: Keine harten Löschungen, nur Markierung
- **Input-Validierung**: class-validator für alle DTOs
- **SQL-Injection-Schutz**: TypeORM parametrisierte Queries
- **XSS-Schutz**: Helmet.js Middleware

## Konfiguration

### Umgebungsvariablen

Siehe `.env.example` für vollständige Liste.

**Datenbank**:
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=pbx_x
```

**Redis**:
```
REDIS_HOST=localhost
REDIS_PORT=6379
```

**JWT**:
```
JWT_SECRET=your-secret-key-here
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d
```

**SIP**:
```
DRACHTIO_HOST=localhost
DRACHTIO_PORT=9022
DRACHTIO_SECRET=cymru
```

**Storage**:
```
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=pbx-recordings
```

### Logging

- **Winston**: Strukturiertes Logging
- **Log-Levels**: error, warn, info, debug
- **Console & File**: Ausgabe in Konsole und Dateien

## Support & Lizenz

Für weitere Informationen siehe `INSTALLATION.md`.
