#!/bin/bash
# PostToolUse hook: capture tool observations to wantan-mem
# Sends a lightweight POST to the worker — fails silently if worker is down

WORKER_URL="http://localhost:37778"

# Read hook input from stdin (Claude Code passes JSON)
INPUT=$(cat)

# Extract tool name and result summary
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name','unknown'))" 2>/dev/null)
TOOL_INPUT=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('tool_input',{}))[:200])" 2>/dev/null)

# Skip self-referential observations (don't observe the observe hook)
if [[ "$TOOL_NAME" == *"wantan-mem"* ]]; then
  exit 0
fi

# POST to worker (fire and forget, 2s timeout)
curl -s -X POST "$WORKER_URL/api/observe" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"tool_use\",\"agent\":\"wantan\",\"content\":\"Tool: $TOOL_NAME\",\"project\":\"$(basename $(pwd))\"}" \
  --connect-timeout 2 --max-time 2 \
  > /dev/null 2>&1 || true

exit 0
