# PBX-X REST API Blueprint

## 1. Overview

Diese API-Spezifikation folgt OpenAPI 3.0-Standards und definiert alle REST-Endpunkte für PBX-X.

**Base URL:** `https://pbx-x.example.com/api/v1`

**Authentifizierung:** JWT Bearer Token

**Content-Type:** `application/json`

## 2. Authentication

### 2.1 POST /auth/login

Login mit E-Mail und Passwort, gibt Access- und Refresh-Token zurück.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@example.com",
    "firstName": "Max",
    "lastName": "Mustermann",
    "role": "admin"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Errors:**
- `401 Unauthorized` - Ungültige Credentials
- `403 Forbidden` - Account gesperrt
- `429 Too Many Requests` - Rate-Limit erreicht

---

### 2.2 POST /auth/refresh

Erneuert Access-Token via Refresh-Token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

---

### 2.3 POST /auth/logout

Invalidiert Refresh-Token (Access-Token läuft von selbst ab).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (204 No Content)**

---

## 3. Users

### 3.1 GET /users

Liste aller Benutzer (mit Paginierung und Filterung).

**Query Parameters:**
- `page` (int, default: 1)
- `limit` (int, default: 50, max: 100)
- `role` (string, optional): `admin`, `supervisor`, `agent`, `user`
- `status` (string, optional): `active`, `inactive`, `suspended`
- `search` (string, optional): Suche in Name/E-Mail

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "agent1@example.com",
      "firstName": "Anna",
      "lastName": "Schmidt",
      "role": "agent",
      "status": "active",
      "createdAt": "2025-01-15T10:30:00Z",
      "lastLoginAt": "2025-11-12T08:45:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "totalPages": 5
  }
}
```

**Required Role:** `admin`, `supervisor`

---

### 3.2 GET /users/:id

Einzelner Benutzer mit vollständigen Details.

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "agent1@example.com",
  "firstName": "Anna",
  "lastName": "Schmidt",
  "role": "agent",
  "status": "active",
  "language": "de-DE",
  "timezone": "Europe/Berlin",
  "timeProfile": {
    "id": "...",
    "name": "Business Hours"
  },
  "extensions": [
    {
      "id": "...",
      "number": "200"
    }
  ],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-11-10T14:20:00Z"
}
```

**Errors:**
- `404 Not Found` - User existiert nicht

---

### 3.3 POST /users

Neuen Benutzer erstellen.

**Request:**
```json
{
  "email": "neuer.agent@example.com",
  "password": "InitialPassword123!",
  "firstName": "Tom",
  "lastName": "Müller",
  "role": "agent",
  "language": "de-DE",
  "timezone": "Europe/Berlin"
}
```

**Response (201 Created):**
```json
{
  "id": "...",
  "email": "neuer.agent@example.com",
  "firstName": "Tom",
  "lastName": "Müller",
  "role": "agent",
  "status": "active",
  "createdAt": "2025-11-12T10:00:00Z"
}
```

**Errors:**
- `400 Bad Request` - Validierungsfehler
- `409 Conflict` - E-Mail bereits vergeben

**Required Role:** `admin`

---

### 3.4 PATCH /users/:id

Benutzer aktualisieren.

**Request:**
```json
{
  "firstName": "Thomas",
  "status": "inactive"
}
```

**Response (200 OK):** Aktualisierter User

**Required Role:** `admin` (User kann sich selbst editieren, aber nicht `role` oder `status`)

---

### 3.5 DELETE /users/:id

Benutzer löschen (Soft-Delete).

**Response (204 No Content)**

**Required Role:** `admin`

---

## 4. Extensions

### 4.1 GET /extensions

Liste aller Nebenstellen.

**Query Parameters:**
- `page`, `limit`, `search` (wie bei Users)
- `status` (string): `active`, `inactive`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "number": "200",
      "displayName": "Sales - Anna Schmidt",
      "extensionType": "sip",
      "user": {
        "id": "...",
        "firstName": "Anna",
        "lastName": "Schmidt"
      },
      "status": "active",
      "registrations": [
        {
          "contactUri": "sip:200@192.168.1.50:5060",
          "userAgent": "Yealink SIP-T46S 66.85.0.50",
          "expiresAt": "2025-11-12T11:30:00Z"
        }
      ]
    }
  ],
  "meta": { ... }
}
```

---

### 4.2 GET /extensions/:id

Einzelne Nebenstelle mit allen Details.

**Response (200 OK):**
```json
{
  "id": "...",
  "number": "200",
  "displayName": "Sales - Anna Schmidt",
  "extensionType": "sip",
  "sipPassword": "***hidden***",
  "user": { ... },
  "voicemail": {
    "enabled": true,
    "pin": "***hidden***",
    "emailNotification": true
  },
  "callRecording": {
    "policy": "on_demand",
    "canRecord": true
  },
  "forwarding": {
    "onBusy": {
      "enabled": false,
      "destination": null
    },
    "onNoAnswer": {
      "enabled": true,
      "destination": "voicemail:200",
      "timeout": 20
    },
    "unconditional": {
      "enabled": false,
      "destination": null
    }
  },
  "dndEnabled": false,
  "presenceStatus": "available",
  "codecPreferences": ["opus", "g722", "pcmu", "pcma"],
  "maxConcurrentCalls": 2,
  "registrations": [ ... ],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-11-10T09:00:00Z"
}
```

---

### 4.3 POST /extensions

Neue Nebenstelle erstellen.

**Request:**
```json
{
  "number": "201",
  "displayName": "Marketing - Lisa Weber",
  "userId": "...",
  "extensionType": "sip",
  "sipPassword": "GeneratedSecure123!",
  "voicemailEnabled": true,
  "voicemailPin": "1234",
  "codecPreferences": ["opus", "g722", "pcmu"]
}
```

**Response (201 Created):** Erstellte Extension

**Errors:**
- `400 Bad Request` - Validierungsfehler (z.B. Nummer zu kurz)
- `409 Conflict` - Nummer bereits vergeben

**Required Role:** `admin`

---

### 4.4 PATCH /extensions/:id

Nebenstelle aktualisieren.

**Request:**
```json
{
  "displayName": "Marketing Team",
  "dndEnabled": true,
  "forwardOnNoAnswerEnabled": true,
  "forwardOnNoAnswerDestination": "voicemail:201",
  "forwardOnNoAnswerTimeout": 25
}
```

**Response (200 OK):** Aktualisierte Extension

**Required Role:** `admin` (User kann eigene Extension begrenzt editieren)

---

### 4.5 DELETE /extensions/:id

Nebenstelle löschen.

**Response (204 No Content)**

**Required Role:** `admin`

---

### 4.6 GET /extensions/:id/registrations

Aktuelle Registrierungen einer Extension.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "contactUri": "sip:200@192.168.1.50:5060",
      "userAgent": "Yealink SIP-T46S 66.85.0.50",
      "ipAddress": "192.168.1.50",
      "port": 5060,
      "transport": "udp",
      "expiresAt": "2025-11-12T11:45:00Z",
      "registeredAt": "2025-11-12T10:45:00Z"
    }
  ]
}
```

---

## 5. Trunks

### 5.1 GET /trunks

Liste aller SIP-Trunks.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Telekom SIP-Trunk",
      "trunkType": "register",
      "host": "tel.t-online.de",
      "port": 5060,
      "transport": "udp",
      "maxConcurrentCalls": 10,
      "status": "active",
      "currentCalls": 3
    }
  ],
  "meta": { ... }
}
```

---

### 5.2 GET /trunks/:id

Einzelner Trunk mit Details.

**Response (200 OK):**
```json
{
  "id": "...",
  "name": "Telekom SIP-Trunk",
  "trunkType": "register",
  "host": "tel.t-online.de",
  "port": 5060,
  "transport": "udp",
  "username": "49301234567",
  "password": "***hidden***",
  "codecPreferences": ["pcmu", "pcma", "g722"],
  "dtmfMode": "rfc2833",
  "defaultCallerId": "+49301234567",
  "didRanges": [
    {
      "start": "+49301000000",
      "end": "+49301000099"
    }
  ],
  "maxConcurrentCalls": 10,
  "backupTrunk": null,
  "status": "active",
  "createdAt": "2025-01-10T12:00:00Z",
  "updatedAt": "2025-11-01T15:30:00Z"
}
```

---

### 5.3 POST /trunks

Neuen Trunk erstellen.

**Request:**
```json
{
  "name": "Sipgate Trunk",
  "trunkType": "register",
  "host": "sipgate.de",
  "port": 5060,
  "transport": "udp",
  "username": "1234567e0",
  "password": "TrunkPassword123!",
  "codecPreferences": ["opus", "pcmu", "pcma"],
  "dtmfMode": "rfc2833",
  "maxConcurrentCalls": 20
}
```

**Response (201 Created):** Erstellter Trunk

**Required Role:** `admin`

---

### 5.4 PATCH /trunks/:id

Trunk aktualisieren.

**Response (200 OK):** Aktualisierter Trunk

**Required Role:** `admin`

---

### 5.5 DELETE /trunks/:id

Trunk löschen.

**Response (204 No Content)**

**Required Role:** `admin`

---

### 5.6 POST /trunks/:id/test

Trunk-Verbindung testen (SIP OPTIONS oder REGISTER-Test).

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Registration successful",
  "latencyMs": 45
}
```

**Errors:**
- `503 Service Unavailable` - Trunk nicht erreichbar

**Required Role:** `admin`

---

## 6. Inbound Rules

### 6.1 GET /rules/inbound

Liste aller eingehenden Routen.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Main Number to IVR",
      "didPattern": "+49301000000",
      "trunk": {
        "id": "...",
        "name": "Telekom SIP-Trunk"
      },
      "priority": 10,
      "destinationType": "ivr",
      "destination": {
        "id": "...",
        "name": "Main Menu"
      },
      "status": "active"
    }
  ],
  "meta": { ... }
}
```

---

### 6.2 GET /rules/inbound/:id

Einzelne Inbound-Regel.

**Response (200 OK):**
```json
{
  "id": "...",
  "name": "Support Line to Queue",
  "didPattern": "+49301000010",
  "trunk": { ... },
  "priority": 20,
  "timeProfile": {
    "id": "...",
    "name": "Business Hours"
  },
  "callerIdPattern": null,
  "destinationType": "queue",
  "destination": {
    "id": "...",
    "name": "Support Queue"
  },
  "fallbackDestinationType": "voicemail",
  "fallbackDestination": {
    "extensionNumber": "100"
  },
  "status": "active",
  "createdAt": "2025-02-01T10:00:00Z"
}
```

---

### 6.3 POST /rules/inbound

Neue Inbound-Regel erstellen.

**Request:**
```json
{
  "name": "Sales Line",
  "didPattern": "+49301000020",
  "trunkId": "...",
  "priority": 30,
  "timeProfileId": "...",
  "destinationType": "queue",
  "destinationId": "...",
  "fallbackDestinationType": "voicemail",
  "fallbackDestinationNumber": "200"
}
```

**Response (201 Created):** Erstellte Regel

**Required Role:** `admin`

---

### 6.4 PATCH /rules/inbound/:id

Inbound-Regel aktualisieren.

**Response (200 OK):** Aktualisierte Regel

**Required Role:** `admin`

---

### 6.5 DELETE /rules/inbound/:id

Inbound-Regel löschen.

**Response (204 No Content)**

**Required Role:** `admin`

---

## 7. Outbound Rules

### 7.1 GET /rules/outbound

Liste aller ausgehenden Routen.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "name": "National Calls",
      "numberPattern": "^0[1-9]",
      "priority": 10,
      "stripDigits": 1,
      "prepend": "+49",
      "trunk": {
        "id": "...",
        "name": "Telekom SIP-Trunk"
      },
      "callerIdMode": "trunk",
      "status": "active"
    }
  ],
  "meta": { ... }
}
```

---

### 7.2 GET /rules/outbound/:id

Einzelne Outbound-Regel.

**Response (200 OK):** (Struktur ähnlich Inbound)

---

### 7.3 POST /rules/outbound

Neue Outbound-Regel erstellen.

**Request:**
```json
{
  "name": "International Calls",
  "numberPattern": "^00",
  "priority": 20,
  "stripDigits": 2,
  "prepend": "+",
  "trunkId": "...",
  "callerIdMode": "trunk",
  "allowedForRoles": ["admin", "supervisor"]
}
```

**Response (201 Created):** Erstellte Regel

**Required Role:** `admin`

---

### 7.4 PATCH /rules/outbound/:id

Outbound-Regel aktualisieren.

**Response (200 OK):** Aktualisierte Regel

**Required Role:** `admin`

---

### 7.5 DELETE /rules/outbound/:id

Outbound-Regel löschen.

**Response (204 No Content)**

**Required Role:** `admin`

---

## 8. Queues

### 8.1 GET /queues

Liste aller Warteschlangen.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Support Queue",
      "extensionNumber": "300",
      "strategy": "longest_idle",
      "serviceLevelThresholdSeconds": 20,
      "serviceLevelGoalPercent": 80,
      "status": "active",
      "liveStats": {
        "waitingCalls": 3,
        "activeCalls": 5,
        "availableAgents": 2,
        "busyAgents": 5
      }
    }
  ],
  "meta": { ... }
}
```

---

### 8.2 GET /queues/:id

Einzelne Queue mit Details.

**Response (200 OK):**
```json
{
  "id": "...",
  "name": "Support Queue",
  "extensionNumber": "300",
  "strategy": "longest_idle",
  "serviceLevelThresholdSeconds": 20,
  "serviceLevelGoalPercent": 80,
  "maxWaitTimeSeconds": 300,
  "musicOnHold": {
    "id": "...",
    "name": "Default MoH"
  },
  "welcomePrompt": {
    "id": "...",
    "name": "Welcome to Support"
  },
  "positionAnnouncementEnabled": true,
  "positionAnnouncementIntervalSeconds": 30,
  "maxQueueSize": 50,
  "wrapUpTimeSeconds": 10,
  "overflowAction": "voicemail",
  "members": [
    {
      "id": "...",
      "extension": {
        "number": "200",
        "displayName": "Anna Schmidt"
      },
      "priority": 0,
      "penalty": 0
    }
  ],
  "status": "active",
  "createdAt": "2025-02-05T09:00:00Z"
}
```

---

### 8.3 POST /queues

Neue Queue erstellen.

**Request:**
```json
{
  "name": "Sales Queue",
  "extensionNumber": "310",
  "strategy": "round_robin",
  "serviceLevelThresholdSeconds": 30,
  "serviceLevelGoalPercent": 85,
  "maxWaitTimeSeconds": 600,
  "wrapUpTimeSeconds": 15
}
```

**Response (201 Created):** Erstellte Queue

**Required Role:** `admin`, `supervisor`

---

### 8.4 PATCH /queues/:id

Queue aktualisieren.

**Response (200 OK):** Aktualisierte Queue

**Required Role:** `admin`, `supervisor`

---

### 8.5 DELETE /queues/:id

Queue löschen.

**Response (204 No Content)**

**Required Role:** `admin`

---

### 8.6 GET /queues/:id/stats

Live-Statistiken einer Queue.

**Query Parameters:**
- `from` (ISO8601 datetime)
- `to` (ISO8601 datetime)
- `interval` (string): `5min`, `hour`, `day`

**Response (200 OK):**
```json
{
  "queueId": "...",
  "queueName": "Support Queue",
  "period": {
    "from": "2025-11-12T00:00:00Z",
    "to": "2025-11-12T23:59:59Z"
  },
  "summary": {
    "callsOffered": 245,
    "callsAnswered": 230,
    "callsAbandoned": 15,
    "abandonmentRate": 6.12,
    "avgWaitTimeSeconds": 18,
    "maxWaitTimeSeconds": 125,
    "avgTalkTimeSeconds": 342,
    "serviceLevelPercent": 87.5
  },
  "timeSeries": [
    {
      "timestamp": "2025-11-12T00:00:00Z",
      "callsOffered": 10,
      "callsAnswered": 9,
      "callsAbandoned": 1,
      "avgWaitTimeSeconds": 15
    }
  ]
}
```

**Required Role:** `admin`, `supervisor`

---

### 8.7 POST /queues/:id/members

Agent zu Queue hinzufügen.

**Request:**
```json
{
  "extensionId": "...",
  "priority": 0,
  "skills": ["german", "technical_support"]
}
```

**Response (201 Created):**
```json
{
  "id": "...",
  "extension": { ... },
  "priority": 0,
  "skills": ["german", "technical_support"],
  "penalty": 0
}
```

**Required Role:** `admin`, `supervisor`

---

### 8.8 DELETE /queues/:id/members/:memberId

Agent aus Queue entfernen.

**Response (204 No Content)**

**Required Role:** `admin`, `supervisor`

---

## 9. IVR

### 9.1 GET /ivr

Liste aller IVR-Menüs.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Main Menu",
      "welcomePrompt": {
        "id": "...",
        "name": "Welcome to Company XYZ"
      },
      "digitTimeoutSeconds": 5,
      "maxRetries": 3
    }
  ],
  "meta": { ... }
}
```

---

### 9.2 GET /ivr/:id

Einzelnes IVR-Menü mit allen Optionen.

**Response (200 OK):**
```json
{
  "id": "...",
  "name": "Main Menu",
  "welcomePrompt": { ... },
  "digitTimeoutSeconds": 5,
  "maxRetries": 3,
  "invalidPrompt": {
    "id": "...",
    "name": "Invalid Input"
  },
  "timeoutPrompt": {
    "id": "...",
    "name": "Timeout Message"
  },
  "timeoutDestinationType": "extension",
  "timeoutDestinationNumber": "100",
  "options": [
    {
      "id": "...",
      "dtmfDigit": "1",
      "action": "queue",
      "destination": {
        "id": "...",
        "name": "Sales Queue"
      }
    },
    {
      "id": "...",
      "dtmfDigit": "2",
      "action": "queue",
      "destination": {
        "id": "...",
        "name": "Support Queue"
      }
    },
    {
      "id": "...",
      "dtmfDigit": "0",
      "action": "extension",
      "destinationNumber": "100"
    }
  ],
  "createdAt": "2025-01-20T10:00:00Z"
}
```

---

### 9.3 POST /ivr

Neues IVR-Menü erstellen.

**Request:**
```json
{
  "name": "Support Menu",
  "welcomePromptId": "...",
  "digitTimeoutSeconds": 5,
  "maxRetries": 3,
  "options": [
    {
      "dtmfDigit": "1",
      "action": "queue",
      "destinationId": "..."
    },
    {
      "dtmfDigit": "0",
      "action": "extension",
      "destinationNumber": "100"
    }
  ]
}
```

**Response (201 Created):** Erstelltes IVR

**Required Role:** `admin`, `supervisor`

---

### 9.4 PATCH /ivr/:id

IVR-Menü aktualisieren.

**Response (200 OK):** Aktualisiertes IVR

**Required Role:** `admin`, `supervisor`

---

### 9.5 DELETE /ivr/:id

IVR-Menü löschen.

**Response (204 No Content)**

**Required Role:** `admin`

---

## 10. Recordings

### 10.1 GET /recordings

Liste aller Aufzeichnungen (mit Paginierung und Filterung).

**Query Parameters:**
- `page`, `limit`
- `from`, `to` (ISO8601 datetime)
- `callerId` (string)
- `calleeNumber` (string)
- `recordingType` (string): `on_demand`, `automatic`, `compliance`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "callId": "...",
      "recordingType": "automatic",
      "callerNumber": "+49301234567",
      "calleeNumber": "200",
      "durationSeconds": 245,
      "fileSizeBytes": 1024000,
      "isEncrypted": true,
      "startedAt": "2025-11-12T09:30:00Z",
      "retentionUntil": "2026-02-12"
    }
  ],
  "meta": { ... }
}
```

**Required Role:** `admin`, `supervisor` (Agents nur eigene)

---

### 10.2 GET /recordings/:id

Einzelne Aufzeichnung mit Details.

**Response (200 OK):**
```json
{
  "id": "...",
  "callId": "...",
  "recordingType": "on_demand",
  "initiatedBy": {
    "id": "...",
    "firstName": "Anna",
    "lastName": "Schmidt"
  },
  "callerNumber": "+49301234567",
  "calleeNumber": "200",
  "durationSeconds": 245,
  "fileSizeBytes": 1024000,
  "isEncrypted": true,
  "allowedUserIds": ["...", "..."],
  "allowedRoles": ["admin", "supervisor"],
  "retentionUntil": "2026-02-12",
  "startedAt": "2025-11-12T09:30:00Z",
  "stoppedAt": "2025-11-12T09:34:05Z",
  "createdAt": "2025-11-12T09:34:05Z"
}
```

---

### 10.3 GET /recordings/:id/stream

Audio-Stream der Aufzeichnung (mit Range-Request-Support).

**Response (200 OK):**
- Content-Type: `audio/wav` oder `audio/mpeg`
- Content-Length: File-Size
- Accept-Ranges: `bytes`

**Errors:**
- `403 Forbidden` - Keine Berechtigung
- `404 Not Found` - Aufzeichnung nicht gefunden

**Required Role:** Prüfung gegen `allowedUserIds` / `allowedRoles`

---

### 10.4 DELETE /recordings/:id

Aufzeichnung löschen (permanent).

**Response (204 No Content)**

**Required Role:** `admin` (oder Owner der Aufzeichnung)

---

## 11. Voicemail

### 11.1 GET /voicemail/boxes

Liste aller Voicemail-Boxen.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "extension": {
        "number": "200",
        "displayName": "Anna Schmidt"
      },
      "emailNotification": true,
      "retentionDays": 90,
      "unreadMessages": 3,
      "totalMessages": 10
    }
  ],
  "meta": { ... }
}
```

**Required Role:** `admin`, `supervisor` (User nur eigene Box)

---

### 11.2 GET /voicemail/boxes/:id/messages

Nachrichten einer Voicemail-Box.

**Query Parameters:**
- `page`, `limit`
- `isRead` (boolean)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "callerNumber": "+49301234567",
      "callerName": "Max Mustermann",
      "durationSeconds": 45,
      "fileSizeBytes": 256000,
      "isRead": false,
      "isUrgent": true,
      "receivedAt": "2025-11-12T10:15:00Z"
    }
  ],
  "meta": { ... }
}
```

**Required Role:** Owner oder `admin`

---

### 11.3 GET /voicemail/messages/:id

Einzelne Voicemail-Nachricht.

**Response (200 OK):** (Details wie oben)

---

### 11.4 GET /voicemail/messages/:id/stream

Audio-Stream der Voicemail.

**Response (200 OK):** Audio-Datei

**Required Role:** Owner oder `admin`

---

### 11.5 PATCH /voicemail/messages/:id

Voicemail-Status aktualisieren (z.B. als gelesen markieren).

**Request:**
```json
{
  "isRead": true
}
```

**Response (200 OK):** Aktualisierte Nachricht

---

### 11.6 DELETE /voicemail/messages/:id

Voicemail-Nachricht löschen.

**Response (204 No Content)**

---

## 12. Conferences

### 12.1 GET /conferences

Liste aller Konferenz-Räume.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Team Meeting",
      "extensionNumber": "400",
      "conferenceType": "webrtc",
      "scheduledStart": "2025-11-13T14:00:00Z",
      "scheduledEnd": "2025-11-13T15:00:00Z",
      "status": "scheduled",
      "currentParticipants": 0
    }
  ],
  "meta": { ... }
}
```

---

### 12.2 GET /conferences/:id

Einzelner Konferenz-Raum mit Details.

**Response (200 OK):**
```json
{
  "id": "...",
  "name": "Team Meeting",
  "extensionNumber": "400",
  "conferenceType": "webrtc",
  "pin": "***hidden***",
  "moderatorPin": "***hidden***",
  "owner": {
    "id": "...",
    "firstName": "Max",
    "lastName": "Mustermann"
  },
  "waitForModerator": false,
  "recordConference": true,
  "maxParticipants": 25,
  "enableScreenSharing": true,
  "enableChat": true,
  "scheduledStart": "2025-11-13T14:00:00Z",
  "scheduledEnd": "2025-11-13T15:00:00Z",
  "status": "scheduled",
  "participants": [],
  "createdAt": "2025-11-10T10:00:00Z"
}
```

---

### 12.3 POST /conferences

Neuen Konferenz-Raum erstellen.

**Request:**
```json
{
  "name": "Client Call",
  "extensionNumber": "410",
  "conferenceType": "webrtc",
  "pin": "123456",
  "moderatorPin": "654321",
  "scheduledStart": "2025-11-15T10:00:00Z",
  "scheduledEnd": "2025-11-15T11:00:00Z",
  "maxParticipants": 10
}
```

**Response (201 Created):** Erstellte Konferenz

**Required Role:** `admin`, `supervisor`, `user`

---

### 12.4 PATCH /conferences/:id

Konferenz aktualisieren.

**Response (200 OK):** Aktualisierte Konferenz

---

### 12.5 DELETE /conferences/:id

Konferenz löschen.

**Response (204 No Content)**

---

### 12.6 GET /conferences/:id/participants

Teilnehmer einer aktiven Konferenz.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "user": {
        "firstName": "Anna",
        "lastName": "Schmidt"
      },
      "displayName": "Anna Schmidt",
      "isModerator": false,
      "isMuted": false,
      "joinedAt": "2025-11-13T14:05:00Z"
    }
  ]
}
```

---

### 12.7 POST /conferences/:id/join

Konferenz beitreten (gibt WebRTC-Credentials zurück).

**Request:**
```json
{
  "pin": "123456"
}
```

**Response (200 OK):**
```json
{
  "participantId": "...",
  "webrtcUrl": "wss://pbx-x.example.com/webrtc",
  "token": "jwt-token-for-webrtc",
  "iceServers": [
    {
      "urls": "stun:pbx-x.example.com:3478"
    },
    {
      "urls": "turn:pbx-x.example.com:3478",
      "username": "...",
      "credential": "..."
    }
  ]
}
```

**Errors:**
- `401 Unauthorized` - Falscher PIN
- `423 Locked` - Konferenz wartet auf Moderator

---

### 12.8 POST /conferences/:id/participants/:participantId/mute

Teilnehmer stummschalten (nur Moderator).

**Response (200 OK)**

---

### 12.9 POST /conferences/:id/participants/:participantId/kick

Teilnehmer aus Konferenz werfen (nur Moderator).

**Response (204 No Content)**

---

## 13. Reports

### 13.1 GET /reports

Liste generierter Berichte.

**Query Parameters:**
- `page`, `limit`
- `reportType` (string): `agent_performance`, `queue_kpis`, `trunk_utilization`, `call_volume`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Agent Performance November 2025",
      "reportType": "agent_performance",
      "fileFormat": "pdf",
      "fileSizeBytes": 524288,
      "generatedBy": {
        "firstName": "Max",
        "lastName": "Mustermann"
      },
      "generatedAt": "2025-11-12T08:00:00Z"
    }
  ],
  "meta": { ... }
}
```

**Required Role:** `admin`, `supervisor`

---

### 13.2 POST /reports

Neuen Bericht generieren.

**Request:**
```json
{
  "name": "Call Volume Report",
  "reportType": "call_volume",
  "fileFormat": "csv",
  "parameters": {
    "dateFrom": "2025-11-01",
    "dateTo": "2025-11-30",
    "groupBy": "day"
  }
}
```

**Response (202 Accepted):**
```json
{
  "reportId": "...",
  "status": "generating",
  "message": "Report generation started. You will be notified when ready."
}
```

---

### 13.3 GET /reports/:id

Bericht-Details.

**Response (200 OK):** (Details wie oben + `downloadUrl`)

---

### 13.4 GET /reports/:id/download

Bericht herunterladen.

**Response (200 OK):**
- Content-Type: `text/csv`, `application/json`, `application/pdf`
- Content-Disposition: `attachment; filename="report.pdf"`

---

### 13.5 DELETE /reports/:id

Bericht löschen.

**Response (204 No Content)**

---

## 14. Call Control (CTI Commands via REST)

### 14.1 POST /calls/originate

Neuen Anruf initiieren (Click-to-Call).

**Request:**
```json
{
  "from": "200",
  "to": "+49301234567"
}
```

**Response (201 Created):**
```json
{
  "callId": "...",
  "status": "initiated"
}
```

**Required Role:** User muss Extension besitzen oder Admin sein

---

### 14.2 POST /calls/:callId/hold

Anruf halten.

**Response (200 OK):**
```json
{
  "callId": "...",
  "status": "held"
}
```

---

### 14.3 POST /calls/:callId/unhold

Anruf fortsetzen.

**Response (200 OK):**
```json
{
  "callId": "...",
  "status": "answered"
}
```

---

### 14.4 POST /calls/:callId/transfer

Anruf weiterleiten.

**Request:**
```json
{
  "type": "blind",
  "destination": "201"
}
```

oder

```json
{
  "type": "attended",
  "destination": "201"
}
```

**Response (200 OK):**
```json
{
  "callId": "...",
  "status": "transferred"
}
```

---

### 14.5 POST /calls/:callId/park

Anruf parken.

**Response (200 OK):**
```json
{
  "callId": "...",
  "parkingSlot": "701",
  "expiresAt": "2025-11-12T10:15:00Z"
}
```

---

### 14.6 POST /calls/:callId/pickup

Geparkten Anruf aufnehmen.

**Response (200 OK):**
```json
{
  "callId": "...",
  "status": "answered"
}
```

---

### 14.7 POST /calls/:callId/recording/start

Aufzeichnung starten.

**Response (200 OK):**
```json
{
  "recordingId": "...",
  "status": "recording"
}
```

**Required Permission:** `canRecordCalls`

---

### 14.8 POST /calls/:callId/recording/stop

Aufzeichnung stoppen.

**Response (200 OK):**
```json
{
  "recordingId": "...",
  "status": "stopped",
  "durationSeconds": 120
}
```

---

### 14.9 POST /calls/:callId/hangup

Anruf beenden.

**Response (204 No Content)**

---

## 15. CRM Integration

### 15.1 GET /crm/integrations

Liste aller CRM-Integrationen.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Salesforce Production",
      "crmType": "salesforce",
      "screenPopEnabled": true,
      "status": "active",
      "lastSyncAt": "2025-11-12T09:00:00Z"
    }
  ],
  "meta": { ... }
}
```

**Required Role:** `admin`

---

### 15.2 POST /crm/integrations

Neue CRM-Integration erstellen.

**Request:**
```json
{
  "name": "HubSpot Integration",
  "crmType": "hubspot",
  "baseUrl": "https://api.hubapi.com",
  "authType": "api_key",
  "authCredentials": {
    "apiKey": "your-api-key"
  },
  "lookupEndpoint": "/contacts/v1/contact/search?q={number}",
  "screenPopEnabled": true,
  "screenPopUrlTemplate": "https://app.hubspot.com/contacts/{contactId}"
}
```

**Response (201 Created):** Erstellte Integration

**Required Role:** `admin`

---

### 15.3 GET /crm/lookup

Kontakt-Lookup (für Screen-Pop).

**Query Parameters:**
- `number` (string): Telefonnummer
- `integrationId` (UUID, optional): Spezifische Integration

**Response (200 OK):**
```json
{
  "found": true,
  "contact": {
    "id": "external-crm-id",
    "name": "Max Mustermann",
    "email": "max@example.com",
    "company": "Example GmbH",
    "popupUrl": "https://crm.example.com/contact/12345"
  }
}
```

oder

```json
{
  "found": false
}
```

**Required Role:** Alle authentifizierten User

---

## 16. System & Admin

### 16.1 GET /system/status

System-Status und Health-Check.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "services": {
    "sip": "healthy",
    "database": "healthy",
    "redis": "healthy",
    "storage": "healthy"
  },
  "activeCalls": 42,
  "registeredExtensions": 150
}
```

**Public Endpoint** (keine Auth erforderlich)

---

### 16.2 GET /system/stats

System-Statistiken.

**Response (200 OK):**
```json
{
  "totalUsers": 250,
  "totalExtensions": 300,
  "totalTrunks": 5,
  "totalQueues": 10,
  "currentActiveCalls": 42,
  "callsToday": 1250,
  "peakConcurrentCallsToday": 87,
  "storageUsedGB": 125.5
}
```

**Required Role:** `admin`

---

### 16.3 POST /system/backups

Backup initiieren.

**Request:**
```json
{
  "backupType": "full"
}
```

**Response (202 Accepted):**
```json
{
  "backupId": "...",
  "status": "in_progress"
}
```

**Required Role:** `admin`

---

### 16.4 GET /system/backups

Liste aller Backups.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "backupType": "full",
      "fileSizeBytes": 5368709120,
      "status": "completed",
      "startedAt": "2025-11-12T02:00:00Z",
      "completedAt": "2025-11-12T02:15:00Z"
    }
  ],
  "meta": { ... }
}
```

**Required Role:** `admin`

---

### 16.5 POST /system/backups/:id/restore

Backup wiederherstellen.

**Response (202 Accepted):**
```json
{
  "restoreId": "...",
  "status": "in_progress",
  "message": "System will restart after restore completes."
}
```

**Required Role:** `admin`

---

## 17. Error Responses

Alle Fehler folgen RFC 7807 (Problem Details for HTTP APIs):

```json
{
  "type": "https://pbx-x.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Email is required",
  "instance": "/api/v1/users",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

**Standard HTTP-Status-Codes:**
- `200 OK` - Erfolgreich
- `201 Created` - Ressource erstellt
- `204 No Content` - Erfolgreich, keine Daten
- `400 Bad Request` - Validierungsfehler
- `401 Unauthorized` - Nicht authentifiziert
- `403 Forbidden` - Nicht autorisiert
- `404 Not Found` - Ressource nicht gefunden
- `409 Conflict` - Konflikt (z.B. doppelte E-Mail)
- `422 Unprocessable Entity` - Business-Logic-Fehler
- `429 Too Many Requests` - Rate-Limit
- `500 Internal Server Error` - Server-Fehler
- `503 Service Unavailable` - Service nicht verfügbar

---

## 18. Rate Limiting

**Limits:**
- Authentifizierung: 5 Requests / Minute
- Standard-Endpoints: 100 Requests / Minute
- Call-Control: 30 Requests / Minute

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1699876543
```

**Error (429):**
```json
{
  "type": "https://pbx-x.example.com/errors/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Too many requests. Please try again in 45 seconds.",
  "retryAfter": 45
}
```

---

**Version:** 1.0
**Datum:** 2025-11-12
