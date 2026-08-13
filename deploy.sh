#!/usr/bin/env bash
# Fenceline auto-deploy — idempotent. Pulls latest from origin/main, installs,
# migrates, builds, restarts, health-checks, and rolls back to the previous
# commit if the new build fails to build or boot. Safe to run repeatedly.
#
# Triggered by the fenceline-deploy.timer (poll) or manually: bash deploy.sh
set -uo pipefail

REPO=/opt/fenceline-outreach-engine
LOG=/opt/fenceline-deploy.log          # outside the git tree on purpose
HEALTH_URL=http://127.0.0.1:3003/
export PATH=/usr/local/bin:/usr/bin:/bin:$PATH

cd "$REPO" || exit 1
exec >>"$LOG" 2>&1
echo "===== deploy $(git rev-parse --short HEAD 2>/dev/null) @ $(date -u +%FT%TZ) ====="

# Don't deploy on a dirty tree (someone editing live) — bail safely.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "working tree dirty — skipping auto-deploy"; exit 0
fi

PREV=$(git rev-parse HEAD)

git fetch origin --quiet || { echo "fetch failed"; exit 1; }

# Integrate upstream. Fast-forward when possible; a real merge otherwise.
# On conflict, abort and keep the current (working) build live.
if ! git merge --no-edit origin/main; then
  echo "MERGE CONFLICT — aborting, keeping $PREV live. Resolve manually."
  git merge --abort
  exit 2
fi

NEW=$(git rev-parse HEAD)
if [ "$PREV" = "$NEW" ]; then echo "already up to date ($PREV)"; exit 0; fi
echo "updating $PREV -> $NEW"

rollback() {
  echo "ROLLBACK -> $PREV"
  git reset --hard "$PREV"
  pnpm install >/dev/null 2>&1
  pnpm build   >/dev/null 2>&1
  sudo systemctl restart fenceline
}

set -a; . ./.env; set +a

pnpm install || { echo "install failed"; rollback; exit 3; }
pnpm db:push  || echo "WARN: db:push failed (continuing — migrations are additive)"

if ! pnpm build; then echo "BUILD FAILED"; rollback; exit 4; fi

sudo systemctl restart fenceline
sleep 4

CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" || echo 000)
if [ "$CODE" != "200" ]; then
  echo "HEALTH CHECK FAILED (HTTP $CODE)"; rollback; exit 5
fi

echo "DEPLOYED $NEW OK (health $CODE)"
