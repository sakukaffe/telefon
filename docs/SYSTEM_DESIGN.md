# PBX-X System Design

## 1. Executive Summary

PBX-X ist ein modernes, skalierbares VoIP-PBX-System, das die Kernfunktionalität von 3CX nachbildet. Es unterstützt SIP-basierte Telefonie, Contact-Center-Funktionen, WebRTC-Videokonferenzen und CRM-Integrationen.

## 2. Architektur-Übersicht

### 2.1 High-Level-Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Web UI   │  │ Desktop  │  │  Mobile  │  │SIP Phones│   │
│  │(WebRTC)  │  │   App    │  │   App    │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway / Reverse Proxy               │
│                  (NGINX/Traefik + Let's Encrypt)            │
└─────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   REST API   │  │  WebSocket   │  │  SIP Server  │
│   Service    │  │  CTI Service │  │   (Core)     │
│              │  │              │  │              │
│ - Admin API  │  │ - Events     │  │ - Signaling  │
│ - User API   │  │ - Commands   │  │ - RTP/SRTP   │
│ - CRM Hooks  │  │ - Presence   │  │ - Codecs     │
└──────────────┘  └──────────────┘  └──────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Core Services Layer                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Call Control │  │   IVR/ACD    │  │  Recording   │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Voicemail   │  │  Conference  │  │  Provisioning│     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     CDR      │  │   Reporting  │  │     CRM      │     │
│  │   Service    │  │   Service    │  │  Integration │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │    Redis     │  │  S3/MinIO    │     │
│  │  (Primary)   │  │  (Cache/Pub) │  │(Recordings)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               External Integrations                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  SIP Trunks  │  │     CRM      │  │    SMTP      │     │
│  │  (Carriers)  │  │  (REST APIs) │  │   Server     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Architektur-Entscheidungen

**Modular Monolith mit Service-Orientierung**
- Initialer Ansatz: Modular Monolith für einfachere Entwicklung und Deployment
- Services sind intern klar getrennt und können später zu Microservices extrahiert werden
- Ermöglicht einfaches Debugging und Transaktionsmanagement

**Event-Driven-Architektur**
- Interne Events über Event Emitter (in-process)
- Redis Pub/Sub für verteilte Szenarien (zukünftig)
- WebSocket für Echtzeit-Client-Updates

## 3. Technologie-Stack

### 3.1 Backend

**Runtime & Sprache**
- **Node.js 20 LTS** - Runtime-Umgebung
- **TypeScript 5.x** - Typsichere Entwicklung
- **NestJS 10.x** - Enterprise-Framework mit Dependency Injection

**SIP Stack**
- **Drachtio Server** - Hochperformanter SIP-Proxy
- **Drachtio SRF** (Signaling Resource Framework) - SIP-Applikations-Framework
- **RTPEngine** - Media-Proxy für RTP/SRTP (alternativ: FreeSWITCH ESL)

**WebRTC**
- **Mediasoup 3.x** - SFU für WebRTC-Konferenzen
- **coturn** - TURN/STUN-Server für NAT-Traversal

### 3.2 Datenbanken & Caching

**Primary Database**
- **PostgreSQL 15+** mit TimescaleDB-Extension für CDR/Zeitreihen
- **TypeORM** - ORM mit Migrations-Support

**Caching & Pub/Sub**
- **Redis 7.x** - Cache, Session-Store, Pub/Sub

**Object Storage**
- **MinIO** (Self-Hosted) oder **AWS S3** - Aufzeichnungen, Voicemails, Backups

### 3.3 Frontend

**Admin-Konsole**
- **React 18** + **TypeScript**
- **Ant Design / Material-UI** - UI-Komponenten
- **React Query** - State-Management & API-Caching
- **Zustand** - Lokaler State

**Web-Client (Softphone)**
- **React** + **WebRTC APIs**
- **SIP.js** - SIP-Stack für Browser
- **Socket.io-client** - CTI-Events

### 3.4 DevOps & Infrastructure

**Containerization**
- **Docker** + **Docker Compose**
- Multi-Stage-Builds für optimierte Images

**Reverse Proxy & TLS**
- **NGINX** oder **Traefik**
- **Let's Encrypt** via Certbot/ACME

**Monitoring**
- **Prometheus** - Metriken
- **Grafana** - Dashboards
- **Loki** - Log-Aggregation
- **Jaeger** - Distributed Tracing (optional)

**CI/CD**
- **GitHub Actions** - Automatisierte Tests & Deployment

## 4. Daten-Architektur

### 4.1 Datenbank-Strategie

**Hot Data (PostgreSQL)**
- Aktive Calls, Registrierungen, User, Extensions, Konfiguration
- Retention: Live + 90 Tage

**Warm Data (PostgreSQL + TimescaleDB)**
- CDR, Queue-Stats, Agent-Performance
- Retention: 1–2 Jahre, danach Archivierung

**Cold Storage (S3/MinIO)**
- Aufzeichnungen, Voicemails (>90 Tage), Backups
- Lifecycle-Policies für automatische Archivierung/Löschung

### 4.2 Caching-Strategie

**Redis Caching**
- User-Sessions: TTL 24h
- Extension-Registrierungen: TTL 3600s
- Dial-Plan-Cache: TTL 300s, invalidiert bei Änderungen
- Rate-Limiting: Sliding Window

## 5. Core Module

### 5.1 SIP Core Module

**Verantwortlichkeiten**
- SIP-Registrierung (REGISTER, SUBSCRIBE)
- Call-Setup (INVITE, ACK, BYE)
- SDP-Verhandlung & Codec-Auswahl
- DTMF-Handling (RFC2833 + In-Band)
- SIP-Trunk-Verwaltung

**Technologie**
- Drachtio Server als SIP-Proxy
- Drachtio SRF für Applikations-Logik
- RTPEngine für Media-Handling

**Key Features**
- Multi-Transport (UDP/TCP/TLS)
- IPv4/IPv6-Support
- NAT-Traversal (SIP ALG Detection, STUN)

### 5.2 Call Control Module

**Verantwortlichkeiten**
- Call-State-Machine (IDLE → RINGING → ACTIVE → HELD → ENDED)
- Call-Features (Hold, Transfer, Park, Conference)
- DID-Routing (Inbound Rules)
- Trunk-Selection (Outbound Rules)

**Design Pattern**
- State Machine mit XState oder custom FSM
- Event-Driven: CALL_CREATED, CALL_ANSWERED, CALL_ENDED, etc.

### 5.3 IVR/ACD Module

**IVR (Interactive Voice Response)**
- DTMF-basierte Menüs
- TTS/ASR-Integration (optional)
- Zeit-basiertes Routing (Bürozeiten)

**ACD (Automatic Call Distribution)**
- Queue-Management
- Agent-Status (Available, Busy, Wrap-Up, Offline)
- Routing-Strategien:
  - Ring All
  - Longest Idle
  - Least Talk Time
  - Skills-Based (Pro)

**Technologie**
- State-Machine für IVR-Flows
- Priority Queue für ACD
- Redis für Shared Agent State

### 5.4 Recording Module

**Features**
- On-Demand & Always-On-Recording
- RBAC: Wer darf starten/stoppen/anhören
- Encryption-at-Rest (AES-256)
- Auto-Retention & Deletion

**Workflow**
1. Call-Event triggert Recording-Start
2. RTP-Stream → RTPEngine → WAV/MP3
3. Upload zu MinIO/S3 mit Metadaten
4. Datenbank-Eintrag mit Pfad & Retention-Date
5. Cron-Job für Auto-Cleanup

### 5.5 Voicemail Module

**Features**
- Pro-Nebenstelle, PIN-geschützt
- E-Mail-Benachrichtigung mit Attachment (optional)
- MWI (Message Waiting Indicator) via SIP NOTIFY
- Web/App-Zugriff

**Storage**
- Audio-Dateien in MinIO/S3
- Metadaten in PostgreSQL

### 5.6 Conference Module

**Audio-Konferenzen**
- SIP-basiert via Drachtio/FreeSWITCH
- DTMF-Controls (Mute, Kick, etc.)

**Video-Konferenzen**
- WebRTC-basiert via Mediasoup
- SFU-Architektur (Selective Forwarding Unit)
- Simulcast & SVC für adaptive Qualität
- Screen-Sharing, Chat, PDF-Präsentationen

### 5.7 Provisioning Module

**Auto-Provisioning**
- Template-Engine für Hersteller-spezifische Konfigurationen
- HTTP(S)-Endpoint: `https://pbx-x.example.com/provision/{mac}.xml`
- Unterstützte Templates: Yealink, Snom, Grandstream, Polycom, etc.

**Features**
- Firmware-Updates
- BLF-Key-Mapping
- Hotdesking

### 5.8 CRM Integration Module

**Capabilities**
- Screen-Pop: Inbound-Call → Kontakt-Lookup → Browser-Popup
- Click-to-Call: CRM → PBX-X API → Originate Call
- Call-Journaling: Post-Call → CRM-API → Activity-Log

**Native Konnektoren (Roadmap)**
- Salesforce, Zoho, HubSpot, Freshdesk, Microsoft Dynamics 365

**Custom Integration**
- Konfigurierbarer REST-Client
- OAuth 2.0, API-Key, Basic-Auth
- Field-Mapping-DSL

### 5.9 Reporting Module

**Standard-Berichte**
- Agent-Performance
- Queue-KPIs (ASA, SL, Abandonment-Rate)
- Trunk-Utilization
- Call-Volume (eingehend/ausgehend)

**Export-Formate**
- CSV, JSON, PDF (via Puppeteer)

**Scheduled Reports**
- Cron-Jobs mit E-Mail-Versand

## 6. API-Design

### 6.1 REST API

**Authentifizierung**
- JWT-basiert (Access Token + Refresh Token)
- RBAC: Admin, Supervisor, Agent, User

**Versionierung**
- URL-basiert: `/api/v1/...`

**Endpunkt-Kategorien**
- `/api/v1/users` - Benutzerverwaltung
- `/api/v1/extensions` - Nebenstellen
- `/api/v1/trunks` - SIP-Trunks
- `/api/v1/rules/inbound` - Eingehende Routen
- `/api/v1/rules/outbound` - Ausgehende Routen
- `/api/v1/queues` - Warteschlangen
- `/api/v1/ivr` - IVR-Menüs
- `/api/v1/recordings` - Aufzeichnungen
- `/api/v1/reports` - Berichte
- `/api/v1/backups` - Backup & Restore

### 6.2 WebSocket CTI API

**Protokoll**
- Socket.io oder native WebSockets mit JSON-Messages

**Event-Stream**
```json
{
  "type": "CALL_CREATED",
  "timestamp": "2025-11-12T10:00:00Z",
  "data": {
    "callId": "uuid",
    "from": "+49301234567",
    "to": "100",
    "direction": "inbound"
  }
}
```

**Command-Requests**
```json
{
  "command": "transferBlind",
  "params": {
    "callId": "uuid",
    "destination": "200"
  }
}
```

### 6.3 CRM Webhooks

**Outbound (PBX-X → CRM)**
- POST-Request bei Call-Events
- Configurable Headers & Body-Template

**Inbound (CRM → PBX-X)**
- `GET /api/v1/crm/lookup?ani=+49301234567` → Contact-Match

## 7. Sicherheit

### 7.1 Netzwerk-Sicherheit

- **TLS/SRTP Enforced** - Optional per Trunk/Policy
- **Fail2Ban Integration** - Automatische IP-Blacklist bei Brute-Force
- **Geo-IP-Filtering** - Ländersperre per Allowlist
- **Rate-Limiting** - Pro IP/User/Endpoint

### 7.2 Application-Sicherheit

- **SQL Injection Protection** - Prepared Statements via ORM
- **XSS Protection** - Content-Security-Policy, Input-Sanitization
- **CSRF Protection** - SameSite Cookies, CSRF-Tokens
- **Secrets Management** - Environment-Variables, Vault-Integration (optional)

### 7.3 Compliance

- **GDPR** - Daten-Retention-Policies, Lösch-Funktionen
- **Audit-Logs** - Alle Admin-Aktionen werden geloggt
- **Recording-Consent** - Ansage vor Aufzeichnung (konfigurierbar)

## 8. Skalierung & Performance

### 8.1 Horizontal Scaling

**Phase 1: Single-Instance**
- Bis 500 Extensions / 100 gleichzeitige Calls
- Hardware: 8 vCPU, 16 GB RAM, 100 GB SSD

**Phase 2: Multi-Instance**
- Load-Balancing via NGINX/HAProxy
- Shared State via Redis
- Sticky-Sessions für SIP-Dialogs

**Phase 3: Distributed (Optional)**
- SIP-Cluster mit Kamailio/OpenSIPS
- Microservices-Extraktion
- Kubernetes-Deployment

### 8.2 Performance-Optimierungen

- **Connection Pooling** - PostgreSQL, Redis
- **Query-Optimierung** - Indexes, Materialized Views
- **Caching** - Redis für häufige Lookups
- **Asynchrone Verarbeitung** - BullMQ für Background-Jobs

## 9. Deployment-Strategien

### 9.1 Self-Hosted (Docker Compose)

**Services**
- `pbx-core` - Haupt-Applikation
- `drachtio` - SIP-Server
- `rtpengine` - Media-Proxy
- `postgres` - Datenbank
- `redis` - Cache
- `minio` - Object-Storage
- `nginx` - Reverse-Proxy

**Setup**
```bash
docker-compose up -d
./scripts/init-db.sh
./scripts/configure-ssl.sh
```

### 9.2 Cloud-Deployment (AWS/Azure/GCP)

**Compute**
- EC2/Compute Engine/VM - Haupt-Instanz
- Auto-Scaling-Group (optional)

**Storage**
- RDS/Cloud SQL - Managed PostgreSQL
- S3/Blob Storage - Aufzeichnungen

**Networking**
- VPC mit Public/Private Subnets
- Security Groups für SIP (5060-5061), RTP (10000-20000), HTTPS (443)

**CDN**
- CloudFront/Azure CDN für Static Assets

## 10. Monitoring & Observability

### 10.1 Metriken (Prometheus)

- **System-Metriken**: CPU, RAM, Disk I/O
- **Call-Metriken**: Calls/sec, ASR, ACD, Concurrent-Calls
- **SIP-Metriken**: Registrierungen, INVITE-Latenz, Fehlerquoten
- **Queue-Metriken**: Queue-Length, Avg-Wait-Time, SL%

### 10.2 Logging

- **Strukturiertes Logging** - JSON-Format via Winston/Pino
- **Log-Levels**: ERROR, WARN, INFO, DEBUG
- **Log-Aggregation**: Loki + Grafana oder ELK-Stack

### 10.3 Alerting

- **Prometheus Alertmanager** - Alerts bei Schwellwerten
- **Notification-Channels**: E-Mail, Slack, PagerDuty

## 11. Testing-Strategie

### 11.1 Unit Tests
- Jest + TypeScript
- Coverage-Ziel: >80%

### 11.2 Integration Tests
- API-Tests mit Supertest
- Datenbank-Tests mit Testcontainers

### 11.3 E2E Tests
- SIP-Szenarien mit SIPp
- WebRTC-Tests mit Puppeteer

### 11.4 Load Tests
- JMeter/Gatling für API
- SIPp für Call-Simulationen

## 12. Roadmap

### Phase 1: MVP (3 Monate)
- ✅ Core SIP (Registrierung, Calls)
- ✅ Basic Dial-Plan (Inbound/Outbound)
- ✅ Voicemail
- ✅ Admin-API & Web-UI (Basic)
- ✅ PostgreSQL + Redis
- ✅ Docker-Deployment

### Phase 2: Contact-Center (3 Monate)
- ✅ Queues mit ACD
- ✅ Agent-Panel
- ✅ Recording
- ✅ Basic-Reports
- ✅ IVR

### Phase 3: Advanced (6 Monate)
- ✅ WebRTC-Konferenzen
- ✅ CRM-Integrationen
- ✅ Advanced-Reports & Wallboard
- ✅ Mobile-Apps (React Native)
- ✅ Multi-Tenancy

### Phase 4: Enterprise (ongoing)
- ✅ HA/Failover
- ✅ Kubernetes-Support
- ✅ AI-Features (Transkription, Sentiment-Analyse)
- ✅ Omnichannel (SMS, WhatsApp, E-Mail)

## 13. Lizenzierung & Compliance

**Open-Source-Lizenz**
- MIT oder Apache 2.0 für Core
- Kommerzielle Lizenz für Enterprise-Features (optional)

**Dependencies**
- Alle verwendeten Libraries müssen kompatible Lizenzen haben
- Drachtio: MIT
- RTPEngine: GPLv3 (Alternative: FreeSWITCH MPL 1.1)
- Mediasoup: ISC

---

**Dokument-Version:** 1.0
**Datum:** 2025-11-12
**Autor:** PBX-X Architecture Team
