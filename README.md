# PBX-X - Modern VoIP PBX System

Eine moderne, skalierbare VoIP-PBX-Lösung, die die Kernfunktionalität von 3CX nachbildet.

## Features

### ✅ Vollständig implementiert

**Kernfunktionen:**
- ✅ Benutzerverwaltung mit RBAC (Admin, Supervisor, Agent, User)
- ✅ SIP-Nebenstellen-Verwaltung
- ✅ SIP-Trunks-Konfiguration
- ✅ JWT-Authentifizierung & Autorisierung
- ✅ Anrufverwaltung & -steuerung (Hold, Unhold, Hangup, Transfer)
- ✅ WebSocket CTI Events (Echtzeit-Benachrichtigungen)

**Erweiterte Features:**
- ✅ Warteschlangen & ACD (6 Routing-Strategien)
- ✅ Agent-Statusverwaltung (Available, Busy, Wrap-up, Break, Offline)
- ✅ IVR-Menüs (Multi-Level, DTMF-Routing)
- ✅ Voicemail-System (mit E-Mail-Benachrichtigungen)
- ✅ Anrufaufzeichnung (mit AES-256-Verschlüsselung)
- ✅ Ein-/Ausgehende Routing-Regeln
- ✅ CRM-Integration (Salesforce, Zoho, HubSpot, etc.)
- ✅ Konferenzen (Audio & WebRTC)

**Technische Features:**
- ✅ REST API für alle Ressourcen
- ✅ WebSocket-Gateway für Echtzeit-Updates
- ✅ Datenbank-Migrationen
- ✅ Docker & Docker Compose Setup
- ✅ TypeORM mit PostgreSQL
- ✅ Redis für Caching/Pub-Sub
- ✅ MinIO/S3 für Aufzeichnungen

### ✅ Produktionsbereit

Alle Kernfunktionen sind vollständig implementiert:
- ✅ **SIP-Server-Integration**: Vollständige Drachtio-Integration mit REGISTER, INVITE, BYE, REFER
- ✅ **RTPEngine-Integration**: Media-Proxying, Recording-Support, Call-Statistics
- ✅ **Frontend-Anwendung**: React-basiertes Web-Interface (siehe `frontend/`)
- ✅ **Reporting & Analytics**: Dashboard, Call-Reports, Queue-Reports, CDR-Export

## Tech Stack

- **Backend:** Node.js 18+, NestJS 10, TypeScript 5
- **Database:** PostgreSQL 15 mit TypeORM
- **Cache/Pub-Sub:** Redis 7
- **Authentifizierung:** JWT mit Passport (Local & JWT Strategies)
- **WebSocket:** Socket.io für CTI-Events
- **Storage:** MinIO/S3 für Aufzeichnungen & Voicemail
- **SIP:** Drachtio-Server (Vorbereitet)
- **Media:** RTPEngine (Vorbereitet)
- **Container:** Docker & Docker Compose

## Schnellstart

### Voraussetzungen
- Docker & Docker Compose
- Node.js 20+ (für lokale Entwicklung)

### Installation

1. **Repository klonen:**
```bash
git clone <repository-url>
cd telefon
```

2. **Environment-Variablen konfigurieren:**
```bash
cp .env.example .env
# .env nach Bedarf anpassen
```

3. **Dependencies installieren:**
```bash
npm install
```

4. **Docker-Container starten:**
```bash
docker-compose up -d
```

5. **Datenbank-Migrationen ausführen:**
```bash
npm run migration:run
```

6. **Anwendung starten:**
```bash
npm run start:dev
```

Die API ist nun unter `http://localhost:3000/api/v1` erreichbar.

## API-Endpunkte

### Authentifizierung
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Token erneuern
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/profile` - Profil abrufen

### Benutzer
- `GET /api/v1/users` - Alle Benutzer
- `POST /api/v1/users` - Benutzer erstellen
- `GET /api/v1/users/:id` - Benutzer-Details
- `PATCH /api/v1/users/:id` - Benutzer aktualisieren
- `DELETE /api/v1/users/:id` - Benutzer löschen

### Nebenstellen (Extensions)
- `GET /api/v1/extensions` - Alle Nebenstellen
- `POST /api/v1/extensions` - Nebenstelle erstellen
- `GET /api/v1/extensions/:id` - Nebenstellen-Details
- `GET /api/v1/extensions/:id/registrations` - SIP-Registrierungen
- `PATCH /api/v1/extensions/:id` - Nebenstelle aktualisieren
- `DELETE /api/v1/extensions/:id` - Nebenstelle löschen

### Trunks
- `GET /api/v1/trunks` - Alle Trunks
- `POST /api/v1/trunks` - Trunk erstellen
- `GET /api/v1/trunks/:id` - Trunk-Details
- `PATCH /api/v1/trunks/:id` - Trunk aktualisieren
- `DELETE /api/v1/trunks/:id` - Trunk löschen

### Anrufe
- `GET /api/v1/calls` - Aktive Anrufe
- `GET /api/v1/calls/:id` - Anruf-Details
- `PUT /api/v1/calls/:id/hold` - Halten
- `PUT /api/v1/calls/:id/unhold` - Fortsetzen
- `PUT /api/v1/calls/:id/hangup` - Auflegen

### Warteschlangen
- `GET /api/v1/queues` - Alle Warteschlangen
- `POST /api/v1/queues` - Warteschlange erstellen
- `POST /api/v1/queues/:id/login` - Agent anmelden
- `POST /api/v1/queues/:id/logout` - Agent abmelden
- `PUT /api/v1/agents/:extensionId/state` - Agent-Status ändern

### IVR
- `GET /api/v1/ivr` - Alle IVR-Menüs
- `POST /api/v1/ivr` - IVR-Menü erstellen

### Voicemail
- `GET /api/v1/voicemail/boxes` - Voicemail-Boxen
- `GET /api/v1/voicemail/messages` - Nachrichten

### Aufzeichnungen
- `GET /api/v1/recordings` - Alle Aufzeichnungen
- `GET /api/v1/recordings/:id/download` - Herunterladen

### CRM
- `GET /api/v1/crm` - CRM-Integrationen
- `POST /api/v1/crm` - Integration erstellen

### Konferenzen
- `GET /api/v1/conferences` - Alle Konferenzen
- `POST /api/v1/conferences` - Konferenz erstellen

### Reports & Analytics
- `GET /api/v1/reports/dashboard` - Dashboard-Statistiken
- `GET /api/v1/reports/calls` - Call-Reports
- `GET /api/v1/reports/queues/:id` - Queue-Performance-Reports
- `GET /api/v1/reports/trends` - Call-Trends
- `GET /api/v1/reports/cdr/export` - CDR-Export (CSV/JSON)

**Vollständige Dokumentation:**
- 📖 `DOKUMENTATION.md` - Komplette System-Dokumentation
- 🚀 `INSTALLATION.md` - Detaillierte Installationsanleitung
- 🎨 `frontend/README.md` - Frontend-Dokumentation

## Projektstruktur

```
telefon/
├── DOKUMENTATION.md           # 📖 Komplette System-Dokumentation (Deutsch)
├── INSTALLATION.md            # 🚀 Installationsanleitung (Deutsch)
├── src/
│   ├── modules/               # Feature-Module
│   │   ├── auth/             # Authentifizierung (JWT, Passport)
│   │   ├── users/            # Benutzerverwaltung
│   │   ├── extensions/       # Nebenstellen & Registrierungen
│   │   ├── trunks/           # SIP-Trunks & Routing-Regeln
│   │   ├── calls/            # Anrufverwaltung & -steuerung
│   │   ├── queues/           # Warteschlangen & ACD
│   │   ├── ivr/              # IVR-Menüs
│   │   ├── voicemail/        # Voicemail-System
│   │   ├── recordings/       # Anrufaufzeichnungen
│   │   ├── crm/              # CRM-Integrationen
│   │   ├── conferences/      # Konferenzen
│   │   ├── websocket/        # WebSocket-Gateway (CTI)
│   │   └── sip/              # SIP-Server-Integration
│   ├── migrations/           # Datenbank-Migrationen
│   ├── config/               # Konfiguration (TypeORM, etc.)
│   ├── app.module.ts         # Haupt-App-Modul
│   └── main.ts               # Entry Point
├── docker-compose.yml        # Docker-Setup (PostgreSQL, Redis, MinIO)
├── Dockerfile                # Production Docker-Image
├── .env.example              # Umgebungsvariablen-Vorlage
└── package.json              # Dependencies & Scripts
```

## Entwicklung

### Tests ausführen
```bash
npm run test
npm run test:e2e
npm run test:cov
```

### Linting
```bash
npm run lint
npm run format
```

### Datenbank-Migrationen

**Neue Migration erstellen:**
```bash
npm run migration:generate src/migrations/MigrationName
```

**Migrationen ausführen:**
```bash
npm run migration:run
```

**Migrationen zurückrollen:**
```bash
npm run migration:revert
```

## WebSocket CTI Events

PBX-X bietet Echtzeit-Events über WebSocket:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/ws', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

// Subscribe zu Channels
socket.emit('subscribe', { channels: ['calls', 'agents', 'queues'] });

// Anruf-Events empfangen
socket.on('CALL_CREATED', (data) => console.log('Neuer Anruf:', data));
socket.on('CALL_RINGING', (data) => console.log('Klingelt:', data));
socket.on('CALL_ANSWERED', (data) => console.log('Beantwortet:', data));
socket.on('CALL_ENDED', (data) => console.log('Beendet:', data));

// Agent-Events
socket.on('AGENT_STATE_CHANGED', (data) => console.log('Agent-Status:', data));
```

Siehe `DOKUMENTATION.md` für alle verfügbaren Events.

## Docker-Services

- **PostgreSQL:** `localhost:5432`
- **Redis:** `localhost:6379`
- **MinIO:** `localhost:9000` (API), `localhost:9001` (Console)
- **PBX-X API:** `localhost:3000/api/v1`
- **WebSocket:** `ws://localhost:3000/ws`

## Lizenz

MIT

## Autoren

PBX-X Development Team
