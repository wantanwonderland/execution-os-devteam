#!/bin/bash
# SessionStart hook: ensure wantan-mem deps installed + start worker + create session
WORKER_URL="http://localhost:37778"
PROJECT=$(basename "$(pwd)")
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MEM_DIR="$SCRIPT_DIR/../mem"

# Auto-install deps if node_modules missing (first run after plugin install/update)
if [ -f "$MEM_DIR/package.json" ] && [ ! -d "$MEM_DIR/node_modules" ]; then
  cd "$MEM_DIR" && npm install --silent > /tmp/wantan-mem-install.log 2>&1 || true
fi

# Start worker if not running
if ! curl -s "$WORKER_URL/api/health" --connect-timeout 1 --max-time 1 > /dev/null 2>&1; then
  if [ -d "$MEM_DIR/node_modules" ]; then
    cd "$MEM_DIR" && nohup npx tsx src/worker/server.ts > /tmp/wantan-mem.log 2>&1 &
    sleep 2
  fi
fi

# Start session
curl -s -X POST "$WORKER_URL/api/sessions/start" \
  -H "Content-Type: application/json" \
  -d "{\"project\":\"$PROJECT\"}" \
  --connect-timeout 2 --max-time 2 \
  > /dev/null 2>&1 || true

exit 0
