#!/bin/bash
# SessionEnd hook: close the active wantan-mem session
WORKER_URL="http://localhost:37778"

curl -s -X POST "$WORKER_URL/api/sessions/end" \
  -H "Content-Type: application/json" \
  -d "{\"summary\":\"Session ended\"}" \
  --connect-timeout 2 --max-time 2 \
  > /dev/null 2>&1 || true

exit 0
