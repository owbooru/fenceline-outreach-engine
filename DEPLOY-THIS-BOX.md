# Fenceline — how it's actually deployed on ai-geek (66.179.136.48)

The repo's `DEPLOY.md` / PDF guide targets a **generic fresh VPS** (nginx + PM2 + certbot,
port 3000 open to the internet). This box already runs a **shared Caddy + systemd** stack
(same as RS Breakers and Guitar Studio), so the deployment here differs. This file records
what was actually done on 2026-08-13.

## Live layout
- **Service:** `fenceline.service` (systemd, `User=dev`) → `/usr/bin/node dist/index.js`
- **Bind:** loopback `127.0.0.1:3003` (NOT 0.0.0.0). Port set by `PORT=3003` in `.env`.
  `server/_core/index.ts` was patched to bind `process.env.HOST || "127.0.0.1"`.
- **TLS / proxy:** the shared **Caddy** (`/etc/caddy/Caddyfile`) reverse-proxies to `:3003`.
  - Working now: `https://fenceline.66-179-136-48.sslip.io` (Caddy internal CA → self-signed,
    browser warning until the Caddy root cert is trusted).
  - Staged (commented) in the Caddyfile: `https://fenceline.geekcertified.com` — enable only
    after DNS resolves (see below).
- **DB:** local MariaDB, database `fenceline`, user `fenceline@localhost`. Creds live only in `.env`.
- **Chromium (for the puppeteer-core scraper):** `/usr/bin/chromium` is a symlink to the
  box's Playwright Chromium. No system chromium package is installed.

## Not used here (from the generic guide)
- **No nginx, no certbot** — Caddy owns :80/:443 and handles Let's Encrypt automatically.
- **No PM2** — systemd instead (`sudo systemctl {status,restart} fenceline`).
- **No `ufw allow 3000/3003`** — the app is loopback-only behind Caddy; 3003 stays closed.

## Domain — LIVE
`https://fenceline.geekcertified.com` is live with a trusted Let's Encrypt cert (GoDaddy
A record `fenceline` → `66.179.136.48` added 2026-08-13; Caddy issued the cert automatically).
The sslip.io URL stays as a fallback for networks that block the geekcertified hostname.

If you ever script edits to the shared `/etc/caddy/Caddyfile`, anchor on a string unique to
the target site (e.g. the `fenceline.66-179-136-48.sslip.io` line) — NOT a shared template
comment like "UPGRADE PATH", which appears in several blocks. `caddy validate` does not catch
accidental deletion of other sites. Always `sudo cp` a backup first.

## Update / redeploy
```bash
cd /opt/fenceline-outreach-engine
git pull
pnpm install
pnpm build
# reapply the loopback bind patch in server/_core/index.ts if git pull reverted it
sudo systemctl restart fenceline
# schema change? load env then migrate:  set -a; . ./.env; set +a; pnpm db:push
```

## Notes
- App password is client-side (`client/src/components/DashboardLayout.tsx`, currently `Fenceline!`).
- Connector API keys (Hunter/Apollo/SerpAPI/Salesforce/…) are optional; add them in the app
  Settings page or `.env`. The app runs without them; those integrations stay inert.
- `.env` is chmod 600 and gitignored — never commit it.
