# PBX-X Event Schema (WebSocket/CTI)

## 1. Overview

PBX-X nutzt WebSocket für Echtzeit-Events zwischen Server und Clients (Web-UI, Desktop-App, Mobile-App).

**Protokoll:** Socket.io oder native WebSocket mit JSON-Messages

**Endpoint:** `wss://pbx-x.example.com/ws`

**Authentifizierung:** JWT-Token als Query-Parameter oder im Handshake-Header

```
wss://pbx-x.example.com/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 2. Message-Format

### 2.1 Server → Client (Events)

```json
{
  "type": "EVENT_TYPE",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "data": {
    ...
  }
}
```

### 2.2 Client → Server (Commands)

```json
{
  "id": "unique-request-id",
  "command": "COMMAND_NAME",
  "params": {
    ...
  }
}
```

### 2.3 Server → Client (Command Response)

```json
{
  "id": "unique-request-id",
  "success": true,
  "data": {
    ...
  }
}
```

oder bei Fehler:

```json
{
  "id": "unique-request-id",
  "success": false,
  "error": {
    "code": "INVALID_CALL_ID",
    "message": "Call not found"
  }
}
```

## 3. Event Types

### 3.1 Call Events

#### `CALL_CREATED`

Neuer Anruf wurde initiiert.

```json
{
  "type": "CALL_CREATED",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440000",
    "direction": "inbound",
    "caller": {
      "number": "+49301234567",
      "name": "Max Mustermann"
    },
    "callee": {
      "number": "200",
      "name": "Anna Schmidt"
    },
    "trunk": {
      "id": "...",
      "name": "Telekom SIP-Trunk"
    },
    "state": "initiated"
  }
}
```

---

#### `CALL_RINGING`

Anruf klingelt beim Ziel.

```json
{
  "type": "CALL_RINGING",
  "timestamp": "2025-11-12T10:30:01.500Z",
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440000",
    "caller": {
      "number": "+49301234567",
      "name": "Max Mustermann"
    },
    "callee": {
      "number": "200",
      "name": "Anna Schmidt"
    },
    "state": "ringing"
  }
}
```

---

#### `CALL_ANSWERED`

Anruf wurde angenommen.

```json
{
  "type": "CALL_ANSWERED",
  "timestamp": "2025-11-12T10:30:05.000Z",
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440000",
    "answeredBy": {
      "extensionId": "...",
      "number": "200",
      "name": "Anna Schmidt"
    },
    "state": "answered"
  }
}
```

---

#### `CALL_HELD`

Anruf wurde gehalten.

```json
{
  "type": "CALL_HELD",
  "timestamp": "2025-11-12T10:32:00.000Z",
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440000",
    "heldBy": {
      "extensionId": "...",
      "number": "200"
    },
    "state": "held"
  }
}
```

---

#### `CALL_UNHELD`

Anruf wurde fortgesetzt.

```json
{
  "type": "CALL_UNHELD",
  "timestamp": "2025-11-12T10:32:30.000Z",
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440000",
    "state": "answered"
  }
}
```

---

#### `CALL_TRANSFERRED`

Anruf wurde weitergeleitet.

```json
{
  "type": "CALL_TRANSFERRED",
  "timestamp": "2025-11-12T10:33:00.000Z",
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440000",
    "transferType": "blind",
    "transferredBy": {
      "extensionId": "...",
      "number": "200"
    },
    "transferTarget": {
      "number": "201",
      "name": "Lisa Weber"
    },
    "state": "transferred"
  }
}
```

---

#### `CALL_PARKED`

Anruf wurde geparkt.

```json
{
  "type": "CALL_PARKED",
  "timestamp": "2025-11-12T10:34:00.000Z",
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440000",
    "parkingSlot": "701",
    "parkedBy": {
      "extensionId": "...",
      "number": "200"
    },
    "expiresAt": "2025-11-12T10:39:00.000Z"
  }
}
```

---

#### `CALL_UNPAKED`

Geparkter Anruf wurde aufgenommen.

```json
{
  "type": "CALL_UNPARKED",
  "timestamp": "2025-11-12T10:35:00.000Z",
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440000",
    "parkingSlot": "701",
    "pickedUpBy": {
      "extensionId": "...",
      "number": "201"
    },
    "state": "answered"
  }
}
```

---

#### `CALL_ENDED`

Anruf wurde beendet.

```json
{
  "type": "CALL_ENDED",
  "timestamp": "2025-11-12T10:35:45.000Z",
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440000",
    "caller": {
      "number": "+49301234567"
    },
    "callee": {
      "number": "200"
    },
    "hangupCause": "normal_clearing",
    "hangupBy": "caller",
    "durationSeconds": 340,
    "state": "ended"
  }
}
```

**Hangup Causes:**
- `normal_clearing` - Normales Auflegen
- `busy` - Besetzt
- `no_answer` - Keine Antwort
- `cancel` - Abgebrochen
- `rejected` - Abgelehnt
- `failed` - Technischer Fehler
- `timeout` - Timeout

---

#### `CALL_DTMF`

DTMF-Ton wurde erkannt.

```json
{
  "type": "CALL_DTMF",
  "timestamp": "2025-11-12T10:31:00.000Z",
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440000",
    "digit": "5",
    "source": "caller"
  }
}
```

---

#### `CALL_RECORDING_STARTED`

Aufzeichnung wurde gestartet.

```json
{
  "type": "CALL_RECORDING_STARTED",
  "timestamp": "2025-11-12T10:30:10.000Z",
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440000",
    "recordingId": "...",
    "startedBy": {
      "userId": "...",
      "name": "Anna Schmidt"
    }
  }
}
```

---

#### `CALL_RECORDING_STOPPED`

Aufzeichnung wurde gestoppt.

```json
{
  "type": "CALL_RECORDING_STOPPED",
  "timestamp": "2025-11-12T10:35:45.000Z",
  "data": {
    "callId": "550e8400-e29b-41d4-a716-446655440000",
    "recordingId": "...",
    "durationSeconds": 335,
    "fileSizeBytes": 2048000
  }
}
```

---

### 3.2 Extension Events

#### `EXTENSION_REGISTERED`

Extension wurde registriert.

```json
{
  "type": "EXTENSION_REGISTERED",
  "timestamp": "2025-11-12T08:45:00.000Z",
  "data": {
    "extensionId": "...",
    "number": "200",
    "contactUri": "sip:200@192.168.1.50:5060",
    "userAgent": "Yealink SIP-T46S 66.85.0.50",
    "ipAddress": "192.168.1.50",
    "transport": "udp",
    "expiresAt": "2025-11-12T09:45:00.000Z"
  }
}
```

---

#### `EXTENSION_UNREGISTERED`

Extension wurde deregistriert.

```json
{
  "type": "EXTENSION_UNREGISTERED",
  "timestamp": "2025-11-12T18:00:00.000Z",
  "data": {
    "extensionId": "...",
    "number": "200",
    "reason": "user_logout"
  }
}
```

**Reasons:**
- `user_logout` - Benutzer hat sich abgemeldet
- `timeout` - Registrierung abgelaufen
- `admin_force` - Admin hat Force-Unregister durchgeführt

---

#### `EXTENSION_STATUS_CHANGED`

Extension-Status hat sich geändert (DND, Forwarding, etc.).

```json
{
  "type": "EXTENSION_STATUS_CHANGED",
  "timestamp": "2025-11-12T10:00:00.000Z",
  "data": {
    "extensionId": "...",
    "number": "200",
    "changes": {
      "dndEnabled": true,
      "forwardUnconditionalEnabled": false
    }
  }
}
```

---

### 3.3 Presence Events

#### `PRESENCE_UPDATED`

Präsenz-Status eines Users hat sich geändert.

```json
{
  "type": "PRESENCE_UPDATED",
  "timestamp": "2025-11-12T10:15:00.000Z",
  "data": {
    "userId": "...",
    "extensionId": "...",
    "number": "200",
    "presenceStatus": "busy",
    "statusMessage": "In a call"
  }
}
```

**Presence Status:**
- `available` - Verfügbar
- `busy` - Beschäftigt
- `away` - Abwesend
- `dnd` - Nicht stören
- `offline` - Offline

---

### 3.4 Queue Events

#### `QUEUE_CALL_ENTERED`

Anruf ist in Queue eingetroffen.

```json
{
  "type": "QUEUE_CALL_ENTERED",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "data": {
    "queueId": "...",
    "queueName": "Support Queue",
    "callId": "...",
    "caller": {
      "number": "+49301234567",
      "name": "Max Mustermann"
    },
    "position": 3,
    "estimatedWaitSeconds": 45
  }
}
```

---

#### `QUEUE_CALL_ANSWERED`

Queue-Call wurde von Agent angenommen.

```json
{
  "type": "QUEUE_CALL_ANSWERED",
  "timestamp": "2025-11-12T10:30:25.000Z",
  "data": {
    "queueId": "...",
    "queueName": "Support Queue",
    "callId": "...",
    "agent": {
      "extensionId": "...",
      "number": "200",
      "name": "Anna Schmidt"
    },
    "waitTimeSeconds": 25
  }
}
```

---

#### `QUEUE_CALL_ABANDONED`

Anrufer hat Queue verlassen.

```json
{
  "type": "QUEUE_CALL_ABANDONED",
  "timestamp": "2025-11-12T10:31:00.000Z",
  "data": {
    "queueId": "...",
    "queueName": "Support Queue",
    "callId": "...",
    "caller": {
      "number": "+49301234567"
    },
    "waitTimeSeconds": 60,
    "reason": "caller_hangup"
  }
}
```

**Reasons:**
- `caller_hangup` - Anrufer hat aufgelegt
- `timeout` - Max-Wartezeit überschritten
- `queue_full` - Queue voll
- `no_agents` - Keine Agents verfügbar

---

#### `QUEUE_STATS_UPDATED`

Queue-Statistiken haben sich aktualisiert (alle 5 Sekunden).

```json
{
  "type": "QUEUE_STATS_UPDATED",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "data": {
    "queueId": "...",
    "queueName": "Support Queue",
    "waitingCalls": 3,
    "activeCalls": 5,
    "availableAgents": 2,
    "busyAgents": 5,
    "wrapUpAgents": 1,
    "avgWaitTimeSeconds": 32,
    "longestWaitSeconds": 78
  }
}
```

---

### 3.5 Agent Events

#### `AGENT_STATE_CHANGED`

Agent-Status hat sich geändert.

```json
{
  "type": "AGENT_STATE_CHANGED",
  "timestamp": "2025-11-12T10:00:00.000Z",
  "data": {
    "agentId": "...",
    "extensionId": "...",
    "number": "200",
    "name": "Anna Schmidt",
    "queueId": "...",
    "queueName": "Support Queue",
    "oldStatus": "available",
    "newStatus": "wrap_up",
    "reasonCode": "post_call_notes"
  }
}
```

**Agent Status:**
- `available` - Verfügbar für Calls
- `busy` - In einem Call
- `wrap_up` - Nachbearbeitung
- `break` - Pause
- `offline` - Offline/Ausgeloggt

---

#### `AGENT_LOGGED_IN`

Agent hat sich in Queue eingeloggt.

```json
{
  "type": "AGENT_LOGGED_IN",
  "timestamp": "2025-11-12T08:00:00.000Z",
  "data": {
    "agentId": "...",
    "extensionId": "...",
    "number": "200",
    "name": "Anna Schmidt",
    "queues": [
      {
        "queueId": "...",
        "queueName": "Support Queue"
      },
      {
        "queueId": "...",
        "queueName": "Sales Queue"
      }
    ]
  }
}
```

---

#### `AGENT_LOGGED_OUT`

Agent hat sich ausgeloggt.

```json
{
  "type": "AGENT_LOGGED_OUT",
  "timestamp": "2025-11-12T17:00:00.000Z",
  "data": {
    "agentId": "...",
    "extensionId": "...",
    "number": "200",
    "name": "Anna Schmidt",
    "totalCallsToday": 42,
    "totalTalkTimeSeconds": 10800
  }
}
```

---

### 3.6 Voicemail Events

#### `VOICEMAIL_RECEIVED`

Neue Voicemail-Nachricht erhalten.

```json
{
  "type": "VOICEMAIL_RECEIVED",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "data": {
    "voicemailBoxId": "...",
    "extensionNumber": "200",
    "messageId": "...",
    "caller": {
      "number": "+49301234567",
      "name": "Max Mustermann"
    },
    "durationSeconds": 45,
    "isUrgent": false
  }
}
```

---

#### `VOICEMAIL_READ`

Voicemail wurde als gelesen markiert.

```json
{
  "type": "VOICEMAIL_READ",
  "timestamp": "2025-11-12T10:35:00.000Z",
  "data": {
    "voicemailBoxId": "...",
    "messageId": "...",
    "readBy": {
      "userId": "...",
      "name": "Anna Schmidt"
    }
  }
}
```

---

#### `VOICEMAIL_DELETED`

Voicemail wurde gelöscht.

```json
{
  "type": "VOICEMAIL_DELETED",
  "timestamp": "2025-11-12T10:40:00.000Z",
  "data": {
    "voicemailBoxId": "...",
    "messageId": "...",
    "deletedBy": {
      "userId": "...",
      "name": "Anna Schmidt"
    }
  }
}
```

---

### 3.7 Conference Events

#### `CONFERENCE_STARTED`

Konferenz wurde gestartet.

```json
{
  "type": "CONFERENCE_STARTED",
  "timestamp": "2025-11-12T14:00:00.000Z",
  "data": {
    "conferenceId": "...",
    "name": "Team Meeting",
    "startedBy": {
      "userId": "...",
      "name": "Max Mustermann"
    }
  }
}
```

---

#### `CONFERENCE_PARTICIPANT_JOINED`

Teilnehmer ist beigetreten.

```json
{
  "type": "CONFERENCE_PARTICIPANT_JOINED",
  "timestamp": "2025-11-12T14:05:00.000Z",
  "data": {
    "conferenceId": "...",
    "participantId": "...",
    "displayName": "Anna Schmidt",
    "isModerator": false,
    "currentParticipantCount": 5
  }
}
```

---

#### `CONFERENCE_PARTICIPANT_LEFT`

Teilnehmer hat verlassen.

```json
{
  "type": "CONFERENCE_PARTICIPANT_LEFT",
  "timestamp": "2025-11-12T14:45:00.000Z",
  "data": {
    "conferenceId": "...",
    "participantId": "...",
    "displayName": "Anna Schmidt",
    "reason": "left",
    "currentParticipantCount": 4
  }
}
```

**Reasons:**
- `left` - Freiwillig verlassen
- `kicked` - Vom Moderator entfernt
- `timeout` - Verbindung verloren

---

#### `CONFERENCE_PARTICIPANT_MUTED`

Teilnehmer wurde stummgeschaltet.

```json
{
  "type": "CONFERENCE_PARTICIPANT_MUTED",
  "timestamp": "2025-11-12T14:10:00.000Z",
  "data": {
    "conferenceId": "...",
    "participantId": "...",
    "mutedBy": {
      "participantId": "...",
      "displayName": "Moderator"
    },
    "isSelfMute": false
  }
}
```

---

#### `CONFERENCE_ENDED`

Konferenz wurde beendet.

```json
{
  "type": "CONFERENCE_ENDED",
  "timestamp": "2025-11-12T15:00:00.000Z",
  "data": {
    "conferenceId": "...",
    "name": "Team Meeting",
    "durationSeconds": 3600,
    "totalParticipants": 8,
    "endedBy": {
      "userId": "...",
      "name": "Max Mustermann"
    }
  }
}
```

---

### 3.8 System Events

#### `SYSTEM_ALERT`

System-Warnung oder Fehler.

```json
{
  "type": "SYSTEM_ALERT",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "data": {
    "severity": "warning",
    "category": "trunk",
    "message": "Trunk 'Telekom SIP-Trunk' is experiencing high packet loss (15%)",
    "trunkId": "...",
    "metrics": {
      "packetLoss": 15.2,
      "jitter": 45
    }
  }
}
```

**Severity:**
- `info` - Information
- `warning` - Warnung
- `error` - Fehler
- `critical` - Kritisch

**Categories:**
- `trunk` - Trunk-Probleme
- `storage` - Speicher-Probleme
- `database` - Datenbank-Probleme
- `service` - Service-Ausfall

---

#### `TRUNK_STATUS_CHANGED`

Trunk-Status hat sich geändert.

```json
{
  "type": "TRUNK_STATUS_CHANGED",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "data": {
    "trunkId": "...",
    "trunkName": "Telekom SIP-Trunk",
    "oldStatus": "active",
    "newStatus": "inactive",
    "reason": "registration_failed",
    "errorMessage": "Authentication failed"
  }
}
```

---

## 4. Commands (Client → Server)

### 4.1 Call Control Commands

#### `originate`

Neuen Anruf initiieren.

**Request:**
```json
{
  "id": "req-001",
  "command": "originate",
  "params": {
    "from": "200",
    "to": "+49301234567"
  }
}
```

**Response:**
```json
{
  "id": "req-001",
  "success": true,
  "data": {
    "callId": "...",
    "status": "initiated"
  }
}
```

---

#### `answer`

Eingehenden Anruf annehmen.

**Request:**
```json
{
  "id": "req-002",
  "command": "answer",
  "params": {
    "callId": "..."
  }
}
```

**Response:**
```json
{
  "id": "req-002",
  "success": true,
  "data": {
    "callId": "...",
    "status": "answered"
  }
}
```

---

#### `hold`

Anruf halten.

**Request:**
```json
{
  "id": "req-003",
  "command": "hold",
  "params": {
    "callId": "..."
  }
}
```

---

#### `unhold`

Anruf fortsetzen.

**Request:**
```json
{
  "id": "req-004",
  "command": "unhold",
  "params": {
    "callId": "..."
  }
}
```

---

#### `transferBlind`

Blind-Transfer.

**Request:**
```json
{
  "id": "req-005",
  "command": "transferBlind",
  "params": {
    "callId": "...",
    "destination": "201"
  }
}
```

---

#### `transferAttended`

Attended-Transfer.

**Request:**
```json
{
  "id": "req-006",
  "command": "transferAttended",
  "params": {
    "callId": "...",
    "consultCallId": "..."
  }
}
```

---

#### `park`

Anruf parken.

**Request:**
```json
{
  "id": "req-007",
  "command": "park",
  "params": {
    "callId": "..."
  }
}
```

**Response:**
```json
{
  "id": "req-007",
  "success": true,
  "data": {
    "parkingSlot": "701",
    "expiresAt": "2025-11-12T10:40:00.000Z"
  }
}
```

---

#### `pickup`

Geparkten Anruf aufnehmen.

**Request:**
```json
{
  "id": "req-008",
  "command": "pickup",
  "params": {
    "parkingSlot": "701"
  }
}
```

---

#### `hangup`

Anruf beenden.

**Request:**
```json
{
  "id": "req-009",
  "command": "hangup",
  "params": {
    "callId": "..."
  }
}
```

---

#### `recordStart`

Aufzeichnung starten.

**Request:**
```json
{
  "id": "req-010",
  "command": "recordStart",
  "params": {
    "callId": "..."
  }
}
```

**Response:**
```json
{
  "id": "req-010",
  "success": true,
  "data": {
    "recordingId": "..."
  }
}
```

---

#### `recordStop`

Aufzeichnung stoppen.

**Request:**
```json
{
  "id": "req-011",
  "command": "recordStop",
  "params": {
    "callId": "..."
  }
}
```

---

### 4.2 Agent Commands

#### `agentLogin`

Agent in Queues einloggen.

**Request:**
```json
{
  "id": "req-020",
  "command": "agentLogin",
  "params": {
    "extensionId": "...",
    "queueIds": ["...", "..."]
  }
}
```

---

#### `agentLogout`

Agent ausloggen.

**Request:**
```json
{
  "id": "req-021",
  "command": "agentLogout",
  "params": {
    "extensionId": "..."
  }
}
```

---

#### `agentSetStatus`

Agent-Status ändern.

**Request:**
```json
{
  "id": "req-022",
  "command": "agentSetStatus",
  "params": {
    "extensionId": "...",
    "status": "break",
    "reasonCode": "lunch_break"
  }
}
```

---

### 4.3 Presence Commands

#### `setPresence`

Präsenz-Status setzen.

**Request:**
```json
{
  "id": "req-030",
  "command": "setPresence",
  "params": {
    "status": "busy",
    "statusMessage": "In a meeting"
  }
}
```

---

#### `subscribePresence`

Präsenz-Updates abonnieren.

**Request:**
```json
{
  "id": "req-031",
  "command": "subscribePresence",
  "params": {
    "extensionIds": ["...", "...", "..."]
  }
}
```

**Response:**
```json
{
  "id": "req-031",
  "success": true,
  "data": {
    "subscriptions": [
      {
        "extensionId": "...",
        "number": "200",
        "presenceStatus": "available"
      }
    ]
  }
}
```

---

### 4.4 Subscription Commands

#### `subscribe`

Kanal abonnieren (für gefilterte Events).

**Request:**
```json
{
  "id": "req-040",
  "command": "subscribe",
  "params": {
    "channels": [
      "calls",
      "queues:550e8400-e29b-41d4-a716-446655440000",
      "extension:200"
    ]
  }
}
```

**Channels:**
- `calls` - Alle Calls
- `calls:extensionId` - Calls einer Extension
- `queues` - Alle Queue-Events
- `queues:queueId` - Spezifische Queue
- `extension:number` - Spezifische Extension
- `agents` - Alle Agent-Events
- `system` - System-Alerts

---

#### `unsubscribe`

Kanal deabonnieren.

**Request:**
```json
{
  "id": "req-041",
  "command": "unsubscribe",
  "params": {
    "channels": ["queues:550e8400-e29b-41d4-a716-446655440000"]
  }
}
```

---

## 5. Error Codes

**Client → Server Command Errors:**

```json
{
  "id": "req-001",
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You don't have permission to perform this action"
  }
}
```

**Error Codes:**
- `UNAUTHORIZED` - Nicht autorisiert
- `INVALID_PARAMS` - Ungültige Parameter
- `CALL_NOT_FOUND` - Call nicht gefunden
- `EXTENSION_NOT_FOUND` - Extension nicht gefunden
- `QUEUE_NOT_FOUND` - Queue nicht gefunden
- `ALREADY_IN_CALL` - Bereits in einem Call
- `EXTENSION_OFFLINE` - Extension offline
- `RATE_LIMIT_EXCEEDED` - Rate-Limit überschritten

---

## 6. Connection Lifecycle

### 6.1 Connection Established

Nach erfolgreicher Verbindung sendet der Server:

```json
{
  "type": "CONNECTED",
  "timestamp": "2025-11-12T10:00:00.000Z",
  "data": {
    "userId": "...",
    "extensionId": "...",
    "sessionId": "..."
  }
}
```

### 6.2 Heartbeat

Client sollte alle 30 Sekunden ein Ping senden:

**Client → Server:**
```json
{
  "command": "ping"
}
```

**Server → Client:**
```json
{
  "type": "PONG",
  "timestamp": "2025-11-12T10:00:30.000Z"
}
```

### 6.3 Disconnection

Bei Disconnect sendet Server (falls möglich):

```json
{
  "type": "DISCONNECTED",
  "timestamp": "2025-11-12T18:00:00.000Z",
  "data": {
    "reason": "session_timeout",
    "message": "Session expired due to inactivity"
  }
}
```

**Disconnect Reasons:**
- `session_timeout` - Session-Timeout
- `auth_revoked` - Auth wurde widerrufen
- `server_shutdown` - Server-Shutdown
- `duplicate_connection` - Doppelte Verbindung erkannt

---

## 7. Best Practices

### 7.1 Reconnection Strategy

Bei Verbindungsabbruch:
1. Exponential Backoff (1s, 2s, 4s, 8s, max 30s)
2. Nach Reconnect: Subscriptions neu senden
3. Fehlende Events via REST-API nachladen

### 7.2 Event Handling

- Events sind idempotent (können mehrfach empfangen werden)
- Client sollte Deduplizierung via `timestamp` + `callId`/`eventId` durchführen
- Events kommen nicht garantiert in exakter Reihenfolge (bei High-Load)

### 7.3 Security

- JWT-Token regelmäßig erneuern (vor Ablauf)
- Bei `401` → Token-Refresh → Reconnect
- Sensible Commands (z.B. `recordStart`) erfordern zusätzliche Permission-Checks

---

**Version:** 1.0
**Datum:** 2025-11-12
