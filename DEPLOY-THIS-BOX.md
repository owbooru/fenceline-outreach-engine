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

## CI/CD — auto-deploy OUR main (no auto-merge)
A systemd timer deploys **our local `main`** whenever its HEAD changes (checked every 2 min).
It does **NOT** auto-merge `origin/main` — colleague pushes are integrated **manually** (we
decide when), so their raw pushes never touch the live site on their own.

- **Engine:** `deploy.sh` — fetch (refs only, **no merge**) → if `main` HEAD changed since the
  last deploy (tracked in `/opt/fenceline-last-deployed`) → `pnpm install` → `pnpm db:push` →
  `pnpm build` → restart → health-check `http://127.0.0.1:3003/`. If the build fails it leaves
  the current build running (doesn't restart). Skips entirely on a dirty tree or off-main HEAD.
- **Trigger:** `fenceline-deploy.timer` → `fenceline-deploy.service` (oneshot, runs as `dev`).
  - Status: `systemctl list-timers fenceline-deploy.timer`
  - Logs: `tail -f /opt/fenceline-deploy.log`
  - Deploy now (don't wait for the poll): `sudo systemctl start fenceline-deploy.service`
  - Pause/resume: `sudo systemctl {stop,start} fenceline-deploy.timer`
- **Git auth (private repo):** repo-local `credential.helper` reads `GITHUB_TOKEN` from
  `/opt/auth_info/.secret` at call time (no token stored in git config). Needed because the
  systemd environment has no interactive credentials.
- **Integrating colleague work:** when you want their latest, do it deliberately:
  `git fetch origin && git merge origin/main` (resolve conflicts), then the timer deploys it.
  Their pushes are NOT auto-deployed.
- **Upgrade to push-triggered (instant):** add a GitHub webhook or a self-hosted Actions runner
  on a repo you admin, calling `deploy.sh`. The poll timer is the zero-setup equivalent.
