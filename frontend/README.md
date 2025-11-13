# PBX-X Frontend

Modern React-basiertes Web-Interface für PBX-X.

## Tech Stack

- **Framework**: React 18 mit TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **API Client**: Axios + React Query
- **Forms**: React Hook Form + Zod
- **WebSocket**: Socket.io Client
- **Routing**: React Router v6
- **Icons**: Lucide React

## Features

### Implementiert
- Login & Authentication (JWT)
- Dashboard mit Echtzeit-Statistiken
- Extension-Verwaltung
- Trunk-Verwaltung
- Live-Anrufliste mit WebSocket
- Warteschlangen-Übersicht
- Agent-Panel
- IVR-Menü-Editor
- Voicemail-Verwaltung
- Anrufaufzeichnungen
- Benutzer-Verwaltung
- CRM-Integration-Konfiguration

## Installation

### Voraussetzungen
- Node.js 18+
- npm oder yarn

### Setup

```bash
# In das Frontend-Verzeichnis wechseln
cd frontend

# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Öffne http://localhost:3001
```

### Build für Produktion

```bash
npm run build

# Preview des Production Builds
npm run preview
```

## Verzeichnisstruktur

```
frontend/
├── src/
│   ├── components/          # React-Komponenten
│   │   ├── ui/             # Wiederverwendbare UI-Komponenten
│   │   ├── layout/         # Layout-Komponenten (Nav, Sidebar)
│   │   ├── dashboard/      # Dashboard-Komponenten
│   │   ├── extensions/     # Nebenstellen-Komponenten
│   │   ├── calls/          # Anruf-Komponenten
│   │   ├── queues/         # Warteschlangen-Komponenten
│   │   └── auth/           # Authentifizierungs-Komponenten
│   ├── pages/              # Seiten/Views
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Extensions.tsx
│   │   ├── Calls.tsx
│   │   ├── Queues.tsx
│   │   ├── IVR.tsx
│   │   └── Settings.tsx
│   ├── hooks/              # Custom React Hooks
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts
│   │   └── useApi.ts
│   ├── services/           # API Services
│   │   ├── api.ts          # Axios instance
│   │   ├── auth.ts
│   │   ├── extensions.ts
│   │   ├── calls.ts
│   │   └── websocket.ts
│   ├── store/              # Zustand Stores
│   │   ├── authStore.ts
│   │   ├── callStore.ts
│   │   └── uiStore.ts
│   ├── types/              # TypeScript Types
│   │   └── index.ts
│   ├── utils/              # Utility Functions
│   ├── App.tsx             # Main App Component
│   └── main.tsx            # Entry Point
├── public/                 # Static Assets
├── index.html
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

## Umgebungsvariablen

Erstelle eine `.env` Datei:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000/ws
```

## Hauptkomponenten

### Dashboard
- Echtzeit-Statistiken (aktive Anrufe, registrierte Extensions, Queue-Status)
- Anrufverlauf (letzte 24h)
- System-Status
- Agent-Status-Übersicht

### Extension-Verwaltung
- Liste aller Nebenstellen
- Erstellen/Bearbeiten/Löschen
- Registrierungs-Status
- SIP-Konfiguration

### Live-Anrufe
- Echtzeit-Anrufmonitor via WebSocket
- Anrufsteuerung (Hold, Unhold, Hangup)
- Anrufdetails
- Anrufhistorie

### Warteschlangen
- Queue-Übersicht
- Agent An-/Abmeldung
- Agent-Status-Verwaltung
- Wartende Anrufe
- Queue-Statistiken

### IVR-Editor
- Menü-Struktur-Editor
- DTMF-Optionen konfigurieren
- Audio-Upload
- Verschachtelte Menüs

## Entwicklung

### Komponenten-Entwicklung

Neue Komponente erstellen:

```tsx
// src/components/example/ExampleComponent.tsx
import React from 'react';

interface ExampleComponentProps {
  title: string;
}

export const ExampleComponent: React.FC<ExampleComponentProps> = ({ title }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
  );
};
```

### API-Service erstellen

```typescript
// src/services/example.ts
import { api } from './api';

export interface Example {
  id: string;
  name: string;
}

export const exampleService = {
  getAll: () => api.get<Example[]>('/examples'),
  getOne: (id: string) => api.get<Example>(`/examples/${id}`),
  create: (data: Partial<Example>) => api.post<Example>('/examples', data),
  update: (id: string, data: Partial<Example>) => api.patch<Example>(`/examples/${id}`, data),
  delete: (id: string) => api.delete(`/examples/${id}`),
};
```

### WebSocket-Integration

```typescript
// Verwendung in Komponenten
import { useWebSocket } from '@/hooks/useWebSocket';

const MyComponent = () => {
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    subscribe(['calls', 'queues']);

    return () => {
      unsubscribe(['calls', 'queues']);
    };
  }, []);

  // Events werden automatisch in den Store geschrieben
};
```

## Testing

```bash
# Unit Tests (kommend)
npm run test

# E2E Tests (kommend)
npm run test:e2e
```

## Deployment

### Mit Docker

```dockerfile
# Dockerfile bereits im Root-Verzeichnis vorhanden
FROM node:18-alpine as build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Statisch hosten

Build-Artefakte aus `dist/` können auf jedem Webserver gehostet werden:
- Nginx
- Apache
- Netlify
- Vercel
- AWS S3 + CloudFront

## API-Endpoints (Backend)

Das Frontend kommuniziert mit folgenden Backend-Endpoints:

- `POST /api/v1/auth/login` - Login
- `GET /api/v1/extensions` - Extensions abrufen
- `GET /api/v1/calls` - Anrufe abrufen
- `GET /api/v1/queues` - Queues abrufen
- `WS /ws` - WebSocket-Verbindung

Siehe `DOKUMENTATION.md` im Root für vollständige API-Referenz.

## Lizenz

MIT
