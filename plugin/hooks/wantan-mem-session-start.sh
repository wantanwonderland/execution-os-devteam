#!/bin/bash
# SessionStart hook: ensure wantan-mem deps installed + start worker + create session + inject L1 context
WORKER_URL="http://localhost:37778"
PROJECT=$(python3 -c "
import json, os
print(json.dumps(os.path.basename(os.getcwd()))[1:-1])
" 2>/dev/null)
PROJECT="${PROJECT:-$(basename "$(pwd)")}"
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

# Inject L1 memory context via stdout (plain text — not additionalContext JSON)
# This gets added to the session context automatically
L1_INDEX=$(curl -s "$WORKER_URL/api/facts/index?project=$PROJECT" \
  --connect-timeout 2 --max-time 3 2>/dev/null)

if [ -n "$L1_INDEX" ] && [ "$L1_INDEX" != "null" ]; then
  # Extract the text content from the MCP-formatted response
  MEMORY_TEXT=$(echo "$L1_INDEX" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    content = d.get('content', [])
    if content and len(content) > 0:
        text = content[0].get('text', '')
        if text and 'No memory index found' not in text:
            print(text)
except:
    pass
" 2>/dev/null)

  if [ -n "$MEMORY_TEXT" ]; then
    echo ""
    echo "=== wantan-mem: Previous Session Context ==="
    echo "$MEMORY_TEXT"
    echo "=== end wantan-mem ==="
    echo ""
  fi
fi

# Also fetch recent high-importance facts not in the index
RECENT_FACTS=$(curl -s "$WORKER_URL/api/facts/search?query=*&project=$PROJECT&min_importance=7&limit=5" \
  --connect-timeout 2 --max-time 3 2>/dev/null)

if [ -n "$RECENT_FACTS" ] && [ "$RECENT_FACTS" != "null" ]; then
  FACTS_TEXT=$(echo "$RECENT_FACTS" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    content = d.get('content', [])
    if content and len(content) > 0:
        text = content[0].get('text', '')
        if text and 'No facts found' not in text:
            print(text)
except:
    pass
" 2>/dev/null)

  if [ -n "$FACTS_TEXT" ]; then
    echo "=== wantan-mem: High-Priority Facts ==="
    echo "$FACTS_TEXT"
    echo "=== end facts ==="
    echo ""
  fi
fi

exit 0
