#!/usr/bin/env bash
# Deploy OUR local `main` only. Does NOT auto-merge upstream — colleague pushes to
# origin/main are integrated MANUALLY (Scott decides when). This just rebuilds +
# restarts whenever main's HEAD changes (i.e. after a deliberate merge/commit).
set -uo pipefail

REPO=/opt/fenceline-outreach-engine
LOG=/opt/fenceline-deploy.log
STATE=/opt/fenceline-last-deployed        # last successfully-deployed commit
HEALTH_URL=http://127.0.0.1:3003/
export PATH=/usr/local/bin:/usr/bin:/bin:$PATH

cd "$REPO" || exit 1
exec >>"$LOG" 2>&1
echo "===== deploy check $(date -u +%FT%TZ) ====="

# Only ever deploy from main, and never on a dirty tree.
if [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then echo "not on main — skip"; exit 0; fi
if ! git diff --quiet || ! git diff --cached --quiet; then echo "tree dirty — skip"; exit 0; fi

# Keep origin refs fresh so manual `git merge origin/main` is easy — but DO NOT merge.
git fetch origin --quiet 2>/dev/null || true

CURRENT=$(git rev-parse HEAD)
PREV=$(cat "$STATE" 2>/dev/null || echo "")
if [ "$CURRENT" = "$PREV" ]; then echo "no change ($CURRENT)"; exit 0; fi
echo "deploying $PREV -> $CURRENT"

set -a; . ./.env; set +a
pnpm install || { echo "install failed — leaving current build running"; exit 3; }
pnpm db:push  || echo "WARN: db:push failed (continuing — migrations are additive)"
if ! pnpm build; then echo "BUILD FAILED — leaving current build running (not restarting)"; exit 4; fi

sudo systemctl restart fenceline
sleep 4
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" || echo 000)
if [ "$CODE" != "200" ]; then echo "HEALTH CHECK FAILED (HTTP $CODE) — investigate; main $CURRENT is live but unhealthy"; exit 5; fi

echo "$CURRENT" > "$STATE"
echo "DEPLOYED $CURRENT OK (health $CODE)"
