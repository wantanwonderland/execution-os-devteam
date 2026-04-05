#!/bin/bash
# PreCompact hook: rebuild memory index + prune old observations before context compaction
# This ensures the L1 summary is fresh and the database doesn't grow unbounded
WORKER_URL="http://localhost:37778"

# Get project name
PROJECT=$(python3 -c "
import json, os
print(json.dumps(os.path.basename(os.getcwd()))[1:-1])
" 2>/dev/null)
PROJECT="${PROJECT:-unknown}"

# 1. Prune observations older than 14 days (creates weekly digests, deletes originals)
curl -s -X POST "$WORKER_URL/api/prune" \
  -H "Content-Type: application/json" \
  -d "{\"older_than_days\":14}" \
  --connect-timeout 2 --max-time 5 \
  > /dev/null 2>&1 || true

# 2. Clean up orphaned worktree project data (agent-* projects)
curl -s -X POST "$WORKER_URL/api/prune/worktrees" \
  -H "Content-Type: application/json" \
  --connect-timeout 2 --max-time 3 \
  > /dev/null 2>&1 || true

# 3. Trigger L1 index rebuild for this project (with improved quality filters)
curl -s -X POST "$WORKER_URL/api/facts/rebuild-index" \
  -H "Content-Type: application/json" \
  -d "{\"project\":\"$PROJECT\"}" \
  --connect-timeout 2 --max-time 3 \
  > /dev/null 2>&1 || true

# 4. Checkpoint the session
curl -s -X POST "$WORKER_URL/api/sessions/checkpoint" \
  -H "Content-Type: application/json" \
  --connect-timeout 2 --max-time 2 \
  > /dev/null 2>&1 || true

exit 0
