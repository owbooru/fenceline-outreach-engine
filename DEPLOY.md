# Fenceline Lead Engine — VPS Deployment Guide

## Server Requirements

- **OS:** Ubuntu 22.04 or 24.04 LTS
- **CPU:** 8 vCore
- **RAM:** 16 GB
- **Disk:** 480 GB NVMe SSD
- **Network:** Public IP with ports 80 and 443 open

## Quick Deploy (Docker)

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. Install Chromium (for Puppeteer scraping)

```bash
sudo apt update && sudo apt install -y chromium-browser
```

### 3. Clone the repository

```bash
git clone <your-repo-url> /opt/fenceline-lead-engine
cd /opt/fenceline-lead-engine
```

### 4. Create environment file

```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:password@localhost:3306/fenceline
JWT_SECRET=your-random-secret-here-minimum-32-chars

# ─── SMTP (required for email sending) ────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Rob McMullen
SMTP_FROM_EMAIL=your-gmail@gmail.com
APP_URL=https://your-domain.com

# ─── CASL Sender Identification (required before sending — legal obligation) ──
CASL_SENDER_NAME=Rob McMullen
CASL_BUSINESS_NAME=FenceLine
CASL_MAILING_ADDRESS=Edmonton, AB, Canada
CASL_CONTACT_PHONE=780-555-0000
CASL_CONTACT_EMAIL=rob@fenceline.ca
CASL_CONTACT_WEB=https://fenceline.ca

# ─── App Access Password ──────────────────────────────────────────────────────
APP_ACCESS_PASSWORD=Fenceline!

# ─── Optional: Add these when you have API keys ──────────────────────────────
# HUNTER_API_KEY=your-hunter-key
# APOLLO_API_KEY=your-apollo-key
# SERPAPI_KEY=your-serpapi-key
# SCOTTS_API_KEY=your-scotts-key
# SALESFORCE_CLIENT_ID=your-sf-client-id
# SALESFORCE_CLIENT_SECRET=your-sf-secret
# SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com
EOF
```

### 5. Build and run with Docker

```bash
docker build -t fenceline-lead-engine .
docker run -d \
  --name fenceline \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  -v /dev/shm:/dev/shm \
  fenceline-lead-engine
```

### 6. Set up Nginx reverse proxy (HTTPS)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

sudo cat > /etc/nginx/sites-available/fenceline << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/fenceline /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Deploy Without Docker (Direct Node.js)

### 1. Install Node.js 22 and Chromium

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs chromium-browser
sudo npm install -g corepack@latest pm2
```

### 2. Clone and build

```bash
git clone <your-repo-url> /opt/fenceline-lead-engine
cd /opt/fenceline-lead-engine
corepack pnpm install
corepack pnpm run build
```

### 3. Create .env file (same as Docker step 4 above)

### 4. Run with PM2 (process manager)

```bash
pm2 start dist/index.js --name fenceline-lead-engine
pm2 save
pm2 startup  # Auto-start on reboot
```

### 5. Set up Nginx (same as Docker step 6 above)

## Database Setup (MySQL/MariaDB)

```bash
sudo apt install -y mariadb-server
sudo mysql_secure_installation

sudo mysql -e "
CREATE DATABASE fenceline;
CREATE USER 'fenceline'@'localhost' IDENTIFIED BY 'your-strong-password';
GRANT ALL PRIVILEGES ON fenceline.* TO 'fenceline'@'localhost';
FLUSH PRIVILEGES;
"
```

Update `DATABASE_URL` in your `.env`:
```
DATABASE_URL=mysql://fenceline:your-strong-password@localhost:3306/fenceline
```

Then push the schema:
```bash
cd /opt/fenceline-lead-engine
npx drizzle-kit generate && npx drizzle-kit migrate
```

## CASL Compliance — Required Before Sending

Canada's Anti-Spam Legislation (CASL) requires valid consent and sender identification in every commercial electronic message. The application self-enforces its compliance requirements on startup — it will not start if configuration is incomplete.

### What happens on startup

1. **Environment validation.** The application checks that all required variables are set and non-empty. If any are missing, it logs each one by name with a description, and exits with a non-zero status code. It does not start with warnings.

2. **Trigger auto-apply.** After connecting to the database, the application detects the engine (`SELECT VERSION()`). On MySQL or MariaDB, it checks `information_schema.TRIGGERS` for the three compliance triggers and creates any that are missing. This is idempotent — safe on every boot. On TiDB, it logs a warning and continues (triggers are unsupported; enforcement is application-level only).

3. **Health endpoint.** `GET /api/health` (unauthenticated) reports the compliance state after startup.

### Required environment variables

The application will not start without these:

```
DATABASE_URL=mysql://user:password@localhost:3306/fenceline
JWT_SECRET=your-random-secret-here-minimum-32-chars
APP_ACCESS_PASSWORD=Fenceline!
CASL_SENDER_NAME=Rob McMullen
CASL_BUSINESS_NAME=FenceLine Rentals
CASL_MAILING_ADDRESS=9871 279 St #112, Acheson, AB T7X 6J4
CASL_CONTACT_EMAIL=info@fenceline.ca
```

Plus at least one of:

```
CASL_CONTACT_PHONE=(780) 720-6300
CASL_CONTACT_WEB=https://fenceline.ca
```

CASL requires a working contact method beyond email. Either phone or web satisfies this; both may be set.

### Deployment is now

1. Set `.env` with all required variables
2. `git pull && pnpm install && pnpm build`
3. Restart the application (`pm2 restart fenceline` or `docker compose up -d`)
4. Confirm with `GET /api/health`

The manual `mysql < triggers/casl_triggers.sql` step is no longer required — the application applies the triggers itself on startup.

### Verifying compliance state

```bash
curl https://your-domain.com/api/health
```

Expected response (MariaDB):

```json
{
  "status": "ok",
  "database": { "engine": "MariaDB 10.11.x", "connected": true },
  "compliance": {
    "triggersPresent": true,
    "senderIdentificationConfigured": true,
    "enforcementLevel": "database"
  }
}
```

If `enforcementLevel` is `"application"`, the triggers are not active. On MariaDB/MySQL this means the auto-apply failed — check the application logs. On TiDB this is expected.

### Engine requirement

MariaDB or MySQL supports the compliance triggers. TiDB does not. The VPS deployment installs MariaDB, which is the intended production engine. The canonical trigger definitions remain in `triggers/casl_triggers.sql` — the startup code and the migration file produce identical triggers.

## Updating the App

```bash
cd /opt/fenceline-lead-engine
git pull
corepack pnpm install
corepack pnpm run build
pm2 restart fenceline-lead-engine
```

Or with Docker:
```bash
cd /opt/fenceline-lead-engine
git pull
docker build -t fenceline-lead-engine .
docker stop fenceline && docker rm fenceline
docker run -d --name fenceline --restart unless-stopped -p 3000:3000 --env-file .env -v /dev/shm:/dev/shm fenceline-lead-engine
```

## Chromium / Puppeteer Notes

The web scraping uses Puppeteer with system Chromium to render JavaScript-heavy pages like:
- Alberta Purchasing Connection (Angular SPA)
- MERX tender portal
- City of Edmonton SAP Ariba

On this VPS (8 vCore, 16GB RAM), Chromium runs comfortably. The scraper:
- Launches headless Chromium
- Navigates to tender portals
- Waits for JavaScript to render
- Extracts real tender data, contact emails, and bidder lists
- Closes the browser

If scraping is slow, you can increase the shared memory:
```bash
# For Docker
docker run ... --shm-size=2g ...

# For direct install, /dev/shm is already large enough on 16GB RAM
```

## Security

- The app password is enforced **server-side** via the `APP_ACCESS_PASSWORD` environment variable
- The client submits the password to `POST /api/access/login`; the server validates it and issues a signed JWT session cookie (`fenceline_access`)
- All `/api/trpc` routes are protected by this cookie — unauthenticated requests receive HTTP 401
- Tracking routes (`/api/track/*`) remain public so open pixels, click redirects, and unsubscribe pages work without authentication
- To change the password, update `APP_ACCESS_PASSWORD` in `.env` and restart the app. Do not edit frontend code.
- Keep your `.env` file secure (`chmod 600`)
- The app never sends from fenceline.ca — outreach uses isolated domains only

## Monitoring

```bash
# Check app status
pm2 status
pm2 logs fenceline-lead-engine

# Check Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
```
