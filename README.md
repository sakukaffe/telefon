# PBX-X - Modern VoIP PBX System

Eine moderne, skalierbare VoIP-PBX-Lösung, die die Kernfunktionalität von 3CX nachbildet.

## Features

### MVP (Aktueller Stand)
- ✅ Benutzerverwaltung (Users, Extensions)
- ✅ SIP-Trunks-Verwaltung
- ✅ REST API für Verwaltung
- 🚧 SIP-Server-Integration (geplant)
- 🚧 Anrufsteuerung (geplant)
- 🚧 WebSocket CTI Events (geplant)

### Roadmap
- Warteschlangen & ACD
- IVR-Menüs
- Voicemail
- Aufzeichnungen
- Konferenzen
- CRM-Integrationen
- Reporting & Analytics

## Tech Stack

- **Backend:** Node.js 20, NestJS 10, TypeScript
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Storage:** MinIO (S3-kompatibel)
- **SIP:** Drachtio (geplant)
- **WebRTC:** Mediasoup (geplant)

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

### Benutzer
- `POST /api/v1/users` - Benutzer erstellen
- `GET /api/v1/users` - Alle Benutzer abrufen
- `GET /api/v1/users/:id` - Einzelnen Benutzer abrufen
- `PATCH /api/v1/users/:id` - Benutzer aktualisieren
- `DELETE /api/v1/users/:id` - Benutzer löschen

### Extensions
- `POST /api/v1/extensions` - Extension erstellen
- `GET /api/v1/extensions` - Alle Extensions abrufen
- `GET /api/v1/extensions/:id` - Einzelne Extension abrufen
- `GET /api/v1/extensions/:id/registrations` - Registrierungen abrufen
- `PATCH /api/v1/extensions/:id` - Extension aktualisieren
- `DELETE /api/v1/extensions/:id` - Extension löschen

### Trunks
- `POST /api/v1/trunks` - Trunk erstellen
- `GET /api/v1/trunks` - Alle Trunks abrufen
- `GET /api/v1/trunks/:id` - Einzelnen Trunk abrufen
- `POST /api/v1/trunks/:id/test` - Trunk-Verbindung testen
- `PATCH /api/v1/trunks/:id` - Trunk aktualisieren
- `DELETE /api/v1/trunks/:id` - Trunk löschen

Vollständige API-Dokumentation: `docs/API_BLUEPRINT.md`

## Projektstruktur

```
telefon/
├── docs/                       # Dokumentation
│   ├── SYSTEM_DESIGN.md       # System-Architektur
│   ├── DATABASE_SCHEMA.md     # Datenbankschema
│   ├── API_BLUEPRINT.md       # REST API Spezifikation
│   └── EVENT_SCHEMA.md        # WebSocket Events
├── src/
│   ├── modules/               # Feature-Module
│   │   ├── users/            # Benutzerverwaltung
│   │   ├── extensions/       # Nebenstellen
│   │   ├── trunks/          # SIP-Trunks
│   │   ├── calls/           # Anrufsteuerung
│   │   ├── queues/          # Warteschlangen
│   │   └── ...              # Weitere Module
│   ├── common/              # Gemeinsame Utilities
│   │   ├── entities/        # Basis-Entities
│   │   ├── dto/            # Data Transfer Objects
│   │   └── ...
│   ├── config/             # Konfiguration
│   ├── app.module.ts       # Haupt-App-Modul
│   └── main.ts             # Entry Point
├── docker-compose.yml      # Docker-Setup
├── Dockerfile             # Docker-Image
└── package.json           # Dependencies

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

## Docker-Services

- **PostgreSQL:** `localhost:5432`
- **Redis:** `localhost:6379`
- **MinIO:** `localhost:9000` (API), `localhost:9001` (Console)
- **PBX-X API:** `localhost:3000`

## Lizenz

MIT

## Autoren

PBX-X Development Team
