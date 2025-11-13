# PBX-X Installationsanleitung

## Inhaltsverzeichnis

1. [Systemanforderungen](#systemanforderungen)
2. [Schnellstart mit Docker](#schnellstart-mit-docker)
3. [Manuelle Installation](#manuelle-installation)
4. [Konfiguration](#konfiguration)
5. [Datenbank-Migration](#datenbank-migration)
6. [Erste Schritte](#erste-schritte)
7. [SIP-Server-Integration](#sip-server-integration)
8. [Produktion](#produktion)
9. [Troubleshooting](#troubleshooting)

## Systemanforderungen

### Mindestanforderungen

- **CPU**: 2 Kerne (4 empfohlen)
- **RAM**: 4 GB (8 GB empfohlen)
- **Festplatte**: 20 GB (mehr für Aufzeichnungen)
- **Betriebssystem**: Linux (Ubuntu 22.04, Debian 11, CentOS 8), Windows 10/11, macOS 12+

### Software-Anforderungen

- **Node.js**: Version 18.x oder höher
- **npm**: Version 9.x oder höher
- **PostgreSQL**: Version 15.x oder höher
- **Redis**: Version 7.x oder höher
- **Docker**: Version 24.x oder höher (optional, aber empfohlen)
- **Docker Compose**: Version 2.x oder höher (optional)

## Schnellstart mit Docker

Die einfachste Methode, PBX-X zu starten, ist mit Docker Compose.

### Schritt 1: Repository klonen

```bash
git clone https://github.com/your-org/pbx-x.git
cd pbx-x
```

### Schritt 2: Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
```

Bearbeiten Sie die `.env`-Datei und passen Sie die Werte an:

```env
# Datenbank
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=pbx_user
DATABASE_PASSWORD=ÄNDERN_SIE_DIES
DATABASE_NAME=pbx_x

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=ÄNDERN_SIE_DIES_ZU_EINEM_SICHEREN_SECRET
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Server
PORT=3000
NODE_ENV=production

# SIP (später konfigurieren)
DRACHTIO_HOST=drachtio
DRACHTIO_PORT=9022
DRACHTIO_SECRET=cymru

# Storage
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=ÄNDERN_SIE_DIES
S3_BUCKET=pbx-recordings
S3_REGION=us-east-1
```

### Schritt 3: Docker-Container starten

```bash
docker-compose up -d
```

Dies startet:
- PostgreSQL-Datenbank
- Redis-Cache
- MinIO-Objektspeicher
- PBX-X-Anwendung

### Schritt 4: Datenbank-Migrationen ausführen

```bash
docker-compose exec app npm run migration:run
```

### Schritt 5: Zugriff auf die Anwendung

Die API ist nun verfügbar unter:
- **API**: http://localhost:3000/api/v1
- **WebSocket**: ws://localhost:3000/ws
- **MinIO-Console**: http://localhost:9001 (minioadmin/minioadmin)

### Schritt 6: Admin-Benutzer erstellen

Verbinden Sie sich mit der Datenbank:

```bash
docker-compose exec postgres psql -U pbx_user -d pbx_x
```

Führen Sie aus:

```sql
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active)
VALUES (
  gen_random_uuid(),
  'admin@pbx-x.local',
  '$2b$10$YourHashedPasswordHere',  -- Generieren Sie diesen Hash (siehe unten)
  'System',
  'Administrator',
  'admin',
  true
);
```

Um einen Passwort-Hash zu generieren, verwenden Sie Node.js:

```bash
docker-compose exec app node -e "console.log(require('bcrypt').hashSync('IhrPasswort', 10))"
```

## Manuelle Installation

Wenn Sie Docker nicht verwenden möchten, können Sie PBX-X manuell installieren.

### Schritt 1: Node.js und npm installieren

**Ubuntu/Debian**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS**:
```bash
brew install node@18
```

**Windows**:
Laden Sie den Installer von https://nodejs.org herunter

### Schritt 2: PostgreSQL installieren

**Ubuntu/Debian**:
```bash
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS**:
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Windows**:
Laden Sie den Installer von https://www.postgresql.org/download herunter

### Schritt 3: Redis installieren

**Ubuntu/Debian**:
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS**:
```bash
brew install redis
brew services start redis
```

**Windows**:
Laden Sie Redis von https://github.com/microsoftarchive/redis herunter

### Schritt 4: Datenbank erstellen

```bash
sudo -u postgres psql
```

In der PostgreSQL-Konsole:

```sql
CREATE USER pbx_user WITH PASSWORD 'IhrPasswort';
CREATE DATABASE pbx_x OWNER pbx_user;
GRANT ALL PRIVILEGES ON DATABASE pbx_x TO pbx_user;
\q
```

### Schritt 5: Repository klonen und Abhängigkeiten installieren

```bash
git clone https://github.com/your-org/pbx-x.git
cd pbx-x
npm install
```

### Schritt 6: Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
# Bearbeiten Sie .env mit Ihrem Editor
nano .env
```

### Schritt 7: TypeScript kompilieren

```bash
npm run build
```

### Schritt 8: Datenbank-Migrationen ausführen

```bash
npm run migration:run
```

### Schritt 9: Anwendung starten

**Entwicklung** (mit Hot-Reload):
```bash
npm run start:dev
```

**Produktion**:
```bash
npm run start:prod
```

## Konfiguration

### .env-Datei

Die `.env`-Datei ist die zentrale Konfigurationsdatei. Hier sind alle verfügbaren Optionen:

#### Datenbank-Konfiguration

```env
# PostgreSQL-Verbindung
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=pbx_user
DATABASE_PASSWORD=IhrSicheresPasswort
DATABASE_NAME=pbx_x

# Logging (true für detaillierte SQL-Queries)
DATABASE_LOGGING=false

# SSL-Modus (disable, require, verify-ca, verify-full)
DATABASE_SSL_MODE=disable
```

#### Redis-Konfiguration

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

#### JWT-Konfiguration

```env
# Geheimer Schlüssel (mindestens 32 Zeichen)
JWT_SECRET=IhrSehrLangerUndSichererGeheimschluessel123!

# Token-Ablaufzeiten
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d
```

#### Server-Konfiguration

```env
# Port für die API
PORT=3000

# Umgebung (development, production, test)
NODE_ENV=production

# CORS-Origins (kommagetrennt)
CORS_ORIGINS=http://localhost:3000,http://localhost:4200

# Log-Level (error, warn, info, debug)
LOG_LEVEL=info
```

#### SIP-Server-Konfiguration

```env
# Drachtio-Server
DRACHTIO_HOST=localhost
DRACHTIO_PORT=9022
DRACHTIO_SECRET=cymru

# RTPEngine
RTPENGINE_HOST=localhost
RTPENGINE_PORT=22222
```

#### Speicher-Konfiguration (S3/MinIO)

```env
# S3-kompatibler Objektspeicher
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=IhrSicheresPasswort
S3_BUCKET=pbx-recordings
S3_REGION=us-east-1

# Für AWS S3 lassen Sie ENDPOINT leer:
# S3_ENDPOINT=
# S3_REGION=eu-central-1
```

#### E-Mail-Konfiguration (für Voicemail)

```env
# SMTP-Server
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ihre-email@gmail.com
SMTP_PASSWORD=IhrAppPasswort
SMTP_FROM=PBX-X <noreply@pbx-x.local>
```

### MinIO-Speicher einrichten

Wenn Sie MinIO für Aufzeichnungen verwenden:

1. **MinIO installieren**:
   ```bash
   # Linux
   wget https://dl.min.io/server/minio/release/linux-amd64/minio
   chmod +x minio
   sudo mv minio /usr/local/bin/

   # macOS
   brew install minio/stable/minio
   ```

2. **MinIO starten**:
   ```bash
   minio server /data --console-address ":9001"
   ```

3. **Bucket erstellen**:
   - Öffnen Sie http://localhost:9001
   - Login mit minioadmin/minioadmin
   - Erstellen Sie einen Bucket namens `pbx-recordings`
   - Erstellen Sie Access Keys unter "Identity > Service Accounts"

## Datenbank-Migration

### Migrationen erstellen

Wenn Sie das Datenbankschema ändern:

```bash
npm run migration:generate -- src/migrations/MigrationName
```

### Migrationen ausführen

```bash
npm run migration:run
```

### Migration rückgängig machen

```bash
npm run migration:revert
```

### Alle Migrationen anzeigen

```bash
npm run migration:show
```

## Erste Schritte

### 1. Admin-Benutzer erstellen

Siehe "Schritt 6: Admin-Benutzer erstellen" oben.

Oder verwenden Sie das CLI-Tool (wenn verfügbar):

```bash
npm run cli user:create -- \
  --email admin@pbx-x.local \
  --password AdminPasswort123! \
  --firstName System \
  --lastName Administrator \
  --role admin
```

### 2. Anmelden und Token erhalten

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pbx-x.local",
    "password": "AdminPasswort123!"
  }'
```

Antwort:
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@pbx-x.local",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "admin"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

Verwenden Sie den `accessToken` für alle weiteren API-Anfragen:

```bash
curl http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### 3. Erste Nebenstelle erstellen

```bash
curl -X POST http://localhost:3000/api/v1/extensions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "extensionNumber": "100",
    "sipPassword": "SicheresPasswort123!",
    "email": "user@example.com",
    "enableVoicemail": true,
    "voicemailPin": "1234",
    "maxConcurrentCalls": 2
  }'
```

### 4. SIP-Trunk erstellen

```bash
curl -X POST http://localhost:3000/api/v1/trunks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Provider 1",
    "provider": "sipgate",
    "host": "sipgate.de",
    "port": 5060,
    "username": "IhrBenutzername",
    "password": "IhrPasswort",
    "authType": "username_password",
    "maxConcurrentCalls": 10,
    "codec": ["g711", "g729"],
    "isActive": true
  }'
```

### 5. WebSocket-Verbindung testen

Erstellen Sie eine HTML-Datei zum Testen:

```html
<!DOCTYPE html>
<html>
<head>
  <title>PBX-X WebSocket Test</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <h1>PBX-X WebSocket Test</h1>
  <div id="status">Verbindung wird hergestellt...</div>
  <div id="events"></div>

  <script>
    const token = 'IHR_JWT_TOKEN_HIER';

    const socket = io('http://localhost:3000/ws', {
      auth: { token }
    });

    socket.on('connect', () => {
      document.getElementById('status').innerText = 'Verbunden!';

      // Subscribe zu Channels
      socket.emit('subscribe', { channels: ['calls', 'agents', 'queues'] });
    });

    socket.on('disconnect', () => {
      document.getElementById('status').innerText = 'Getrennt';
    });

    // Anruf-Events
    socket.on('CALL_CREATED', (data) => {
      console.log('CALL_CREATED', data);
      addEvent('Neuer Anruf: ' + JSON.stringify(data));
    });

    socket.on('CALL_RINGING', (data) => {
      console.log('CALL_RINGING', data);
      addEvent('Anruf klingelt: ' + JSON.stringify(data));
    });

    socket.on('CALL_ANSWERED', (data) => {
      console.log('CALL_ANSWERED', data);
      addEvent('Anruf beantwortet: ' + JSON.stringify(data));
    });

    socket.on('CALL_ENDED', (data) => {
      console.log('CALL_ENDED', data);
      addEvent('Anruf beendet: ' + JSON.stringify(data));
    });

    function addEvent(message) {
      const div = document.getElementById('events');
      const p = document.createElement('p');
      p.innerText = new Date().toLocaleTimeString() + ' - ' + message;
      div.appendChild(p);
    }
  </script>
</body>
</html>
```

## SIP-Server-Integration

PBX-X benötigt einen SIP-Server (z.B. Drachtio) für die eigentliche Anrufverarbeitung.

### Drachtio-Server installieren

**Mit Docker**:
```bash
docker run -d --name drachtio \
  --net=host \
  drachtio/drachtio-server \
  drachtio --contact "sip:*:5060" --loglevel info
```

**Manuell (Ubuntu/Debian)**:
```bash
# Drachtio-Repository hinzufügen
echo "deb https://deb.drachtio.org $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/drachtio.list
wget -O - https://deb.drachtio.org/drachtio-gpg-key.asc | sudo apt-key add -

# Installieren
sudo apt-get update
sudo apt-get install drachtio-server

# Konfigurieren
sudo nano /etc/drachtio.conf.xml
```

Beispiel-Konfiguration:
```xml
<drachtio>
  <admin port="9022" secret="cymru"/>
  <sip>
    <contact>sip:*:5060;transport=udp</contact>
    <contact>sip:*:5060;transport=tcp</contact>
    <contact>sip:*:5061;transport=tls</contact>
  </sip>
</drachtio>
```

**Drachtio starten**:
```bash
sudo systemctl start drachtio
sudo systemctl enable drachtio
```

### RTPEngine installieren (für Medien-Handling)

**Ubuntu/Debian**:
```bash
# Repository hinzufügen
sudo add-apt-repository ppa:ngcp/rtpengine
sudo apt-get update

# Installieren
sudo apt-get install ngcp-rtpengine-daemon ngcp-rtpengine-kernel-dkms

# Konfigurieren
sudo nano /etc/rtpengine/rtpengine.conf
```

Beispiel-Konfiguration:
```ini
[rtpengine]
interface = 192.168.1.100
listen-ng = 127.0.0.1:22222
port-min = 30000
port-max = 40000
log-level = 6
```

**RTPEngine starten**:
```bash
sudo systemctl start rtpengine
sudo systemctl enable rtpengine
```

### PBX-X mit SIP-Server verbinden

In `.env`:
```env
DRACHTIO_HOST=localhost
DRACHTIO_PORT=9022
DRACHTIO_SECRET=cymru

RTPENGINE_HOST=localhost
RTPENGINE_PORT=22222
```

**Neustart erforderlich**:
```bash
# Docker
docker-compose restart app

# Manuell
npm run start:prod
```

## Produktion

### Systemd-Service erstellen (Linux)

Erstellen Sie `/etc/systemd/system/pbx-x.service`:

```ini
[Unit]
Description=PBX-X VoIP System
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=pbx
WorkingDirectory=/opt/pbx-x
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Service aktivieren**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable pbx-x
sudo systemctl start pbx-x
```

### Reverse Proxy mit Nginx

Erstellen Sie `/etc/nginx/sites-available/pbx-x`:

```nginx
upstream pbx_backend {
  server 127.0.0.1:3000;
}

server {
  listen 80;
  server_name pbx.example.com;

  # SSL-Konfiguration (empfohlen)
  # listen 443 ssl http2;
  # ssl_certificate /etc/letsencrypt/live/pbx.example.com/fullchain.pem;
  # ssl_certificate_key /etc/letsencrypt/live/pbx.example.com/privkey.pem;

  location /api {
    proxy_pass http://pbx_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /ws {
    proxy_pass http://pbx_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

**Aktivieren**:
```bash
sudo ln -s /etc/nginx/sites-available/pbx-x /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL-Zertifikat mit Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d pbx.example.com
```

### Backup-Strategie

**Datenbank-Backup**:
```bash
# Backup erstellen
pg_dump -U pbx_user pbx_x > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup wiederherstellen
psql -U pbx_user pbx_x < backup_20231115_120000.sql
```

**Automatisches Backup mit Cron**:
```bash
# Crontab bearbeiten
crontab -e

# Täglich um 2 Uhr morgens
0 2 * * * pg_dump -U pbx_user pbx_x > /backups/pbx_x_$(date +\%Y\%m\%d).sql
```

**MinIO/S3-Backup**:
```bash
# MinIO Client installieren
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Konfigurieren
mc alias set myminio http://localhost:9000 minioadmin minioadmin

# Backup erstellen
mc mirror myminio/pbx-recordings /backups/recordings
```

### Monitoring

**PM2 für Prozessverwaltung** (Alternative zu Systemd):
```bash
# PM2 installieren
npm install -g pm2

# Anwendung starten
pm2 start dist/main.js --name pbx-x

# Logs anzeigen
pm2 logs pbx-x

# Monitoring
pm2 monit

# Beim Boot starten
pm2 startup
pm2 save
```

**Logging mit Winston**:

Logs finden Sie in:
- `logs/error.log` - Fehler
- `logs/combined.log` - Alle Logs

## Troubleshooting

### Problem: Verbindung zur Datenbank schlägt fehl

**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Lösung**:
```bash
# PostgreSQL-Status prüfen
sudo systemctl status postgresql

# PostgreSQL starten
sudo systemctl start postgresql

# Verbindung testen
psql -U pbx_user -d pbx_x -h localhost
```

### Problem: JWT-Authentifizierung schlägt fehl

**Symptom**: `401 Unauthorized`

**Lösung**:
1. Überprüfen Sie, ob `JWT_SECRET` in `.env` gesetzt ist
2. Token könnte abgelaufen sein - neues Token mit `/auth/refresh` holen
3. Token im `Authorization`-Header korrekt? Format: `Bearer <token>`

### Problem: WebSocket-Verbindung schlägt fehl

**Symptom**: WebSocket kann nicht verbinden

**Lösung**:
1. Firewall-Regeln prüfen
2. CORS-Origins in `.env` korrekt?
3. Token gültig?
4. Server läuft?

```bash
# WebSocket-Port testen
telnet localhost 3000
```

### Problem: Migrationen schlagen fehl

**Symptom**: `QueryFailedError`

**Lösung**:
```bash
# Migration-Status prüfen
npm run migration:show

# Letzte Migration rückgängig machen
npm run migration:revert

# Erneut ausführen
npm run migration:run

# Falls alles fehlschlägt: Datenbank neu aufsetzen
dropdb -U pbx_user pbx_x
createdb -U pbx_user pbx_x
npm run migration:run
```

### Problem: Hohe CPU-Auslastung

**Ursachen**:
- Zu viele aktive Anrufe
- WebSocket-Flooding
- Datenbank-Queries nicht optimiert

**Lösung**:
```bash
# CPU-Auslastung prüfen
top

# Node.js-Profiling
npm install -g clinic
clinic doctor -- node dist/main.js

# Logs überprüfen
tail -f logs/combined.log
```

### Problem: Aufzeichnungen werden nicht gespeichert

**Symptom**: Keine Dateien in MinIO/S3

**Lösung**:
1. MinIO läuft?
   ```bash
   curl http://localhost:9000/minio/health/live
   ```
2. Bucket existiert?
   ```bash
   mc ls myminio/pbx-recordings
   ```
3. Credentials korrekt in `.env`?
4. Netzwerk-Konnektivität?

### Problem: E-Mail-Benachrichtigungen funktionieren nicht

**Symptom**: Keine Voicemail-E-Mails

**Lösung**:
1. SMTP-Einstellungen in `.env` prüfen
2. Firewall blockiert Port 587?
3. Gmail: App-Passwort verwenden, nicht normales Passwort
4. Logs prüfen:
   ```bash
   grep -i "smtp\|email" logs/combined.log
   ```

### Problem: SIP-Registrierung schlägt fehl

**Symptom**: Nebenstellen registrieren sich nicht

**Lösung**:
1. Drachtio läuft?
   ```bash
   systemctl status drachtio
   ```
2. Firewall öffnen:
   ```bash
   sudo ufw allow 5060/udp
   sudo ufw allow 5060/tcp
   ```
3. SIP-Client-Konfiguration prüfen
4. Drachtio-Logs prüfen:
   ```bash
   journalctl -u drachtio -f
   ```

### Logs und Debugging

**Alle Logs anzeigen**:
```bash
# Docker
docker-compose logs -f app

# Systemd
journalctl -u pbx-x -f

# PM2
pm2 logs pbx-x

# Dateien
tail -f logs/combined.log
```

**Debug-Modus aktivieren**:
```env
# In .env
LOG_LEVEL=debug
DATABASE_LOGGING=true
```

**TypeORM-Queries anzeigen**:
```env
DATABASE_LOGGING=true
```

## Support

Bei weiteren Fragen:
- **Dokumentation**: Siehe `DOKUMENTATION.md`
- **Issues**: https://github.com/your-org/pbx-x/issues
- **Diskussionen**: https://github.com/your-org/pbx-x/discussions

## Nächste Schritte

Nach erfolgreicher Installation:

1. ✅ Lesen Sie `DOKUMENTATION.md` für Details zu allen Features
2. ✅ Erstellen Sie weitere Benutzer und Nebenstellen
3. ✅ Konfigurieren Sie Warteschlangen und IVR-Menüs
4. ✅ Richten Sie CRM-Integration ein
5. ✅ Testen Sie Anrufe und Aufzeichnungen
6. ✅ Konfigurieren Sie Backups
7. ✅ Richten Sie Monitoring ein

Viel Erfolg mit PBX-X!
