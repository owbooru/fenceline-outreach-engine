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

# Optional: Add these when you have API keys
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

- The app password is set in the frontend code (currently "Fenceline!")
- Change it in `client/src/components/DashboardLayout.tsx`
- For production, consider adding proper authentication
- Keep your .env file secure (chmod 600)
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

