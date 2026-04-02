#!/bin/bash
# PreCompact hook: checkpoint the current session before context compaction
WORKER_URL="http://localhost:37778"

curl -s -X POST "$WORKER_URL/api/sessions/checkpoint" \
  -H "Content-Type: application/json" \
  --connect-timeout 2 --max-time 2 \
  > /dev/null 2>&1 || true

exit 0
