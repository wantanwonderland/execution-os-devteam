#!/bin/bash
# PreCompact hook: rebuild memory index before context compaction
# This ensures the L1 summary is fresh so session-start can inject it next time
WORKER_URL="http://localhost:37778"

# Get project name
PROJECT=$(python3 -c "
import json, os
print(json.dumps(os.path.basename(os.getcwd()))[1:-1])
" 2>/dev/null)
PROJECT="${PROJECT:-unknown}"

# Trigger L1 index rebuild for this project
curl -s -X POST "$WORKER_URL/api/facts/rebuild-index" \
  -H "Content-Type: application/json" \
  -d "{\"project\":\"$PROJECT\"}" \
  --connect-timeout 2 --max-time 3 \
  > /dev/null 2>&1 || true

# Also checkpoint the session
curl -s -X POST "$WORKER_URL/api/sessions/checkpoint" \
  -H "Content-Type: application/json" \
  --connect-timeout 2 --max-time 2 \
  > /dev/null 2>&1 || true

exit 0
