#!/bin/bash
# SessionStart hook with matcher: "compact"
# Fires when Claude Code starts a new session after compaction.
# This is the correct mechanism (per post_compact_reminder — 38 stars, battle-tested).
# PostCompact does not exist yet in Claude Code — SessionStart(source:"compact") is the workaround.
#
# Strategy:
#   1. Read the latest compaction snapshot from SQLite (ruvnet pattern)
#   2. Inject: identity rules (context-essentials.md) + snapshot context
#   3. The combined systemMessage closes the compaction memory loop

PROJECT_CLAUDE="$(pwd)/.claude"
ESSENTIALS="$PROJECT_CLAUDE/context-essentials.md"
STATE_FILE="$PROJECT_CLAUDE/coordinator-state.json"
DB_PATH="${HOME}/.wantan-mem/wantan-mem.db"
MEM_PORT="${WANTAN_MEM_PORT:-37778}"
PROJECT=$(basename "$(pwd)")

# --- Load identity rules ---
if [ ! -f "$ESSENTIALS" ]; then
  exit 0
fi
ESSENTIALS_CONTENT=$(cat "$ESSENTIALS")

# --- Try to load compaction snapshot ---
SNAPSHOT_TEXT=""

# Method 1: wantan-mem HTTP API (preferred — structured)
if command -v curl >/dev/null 2>&1; then
  SNAP_RESPONSE=$(curl -s \
    "http://localhost:${MEM_PORT}/api/compaction/snapshot?project=${PROJECT}" \
    --max-time 5 2>/dev/null)

  if echo "$SNAP_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('found') else 1)" 2>/dev/null; then
    SNAPSHOT_TEXT=$(echo "$SNAP_RESPONSE" | python3 - <<'PYEOF'
import json, sys
d = json.load(sys.stdin)
snap = d.get('snapshot', {})
lines = []

sdd = snap.get('sdd_state')
if sdd:
    lines.append(f"Active pipeline at compaction: Phase {sdd.get('current_phase','?')} — {sdd.get('task','unknown task')}")
else:
    lines.append("No active SDD pipeline at compaction.")

branch = snap.get('git_branch')
if branch:
    lines.append(f"Git branch at compaction: {branch}")

lines.append("\nTop facts before compaction:")
for f in (snap.get('top_facts') or []):
    lines.append(f"  [{f.get('category','?')}] (imp:{f.get('importance','?')}) {f.get('content','')[:100]}")

lines.append("\nRecent activity before compaction:")
for o in (snap.get('recent_obs_summary') or [])[:8]:
    lines.append(f"  {o.get('agent','?')} ({o.get('type','?')}): {o.get('snippet','')[:80]}")

print('\n'.join(lines))
PYEOF
    )
  fi
fi

# Method 2: fallback to sqlite3 CLI
if [ -z "$SNAPSHOT_TEXT" ] && [ -f "$DB_PATH" ] && command -v sqlite3 >/dev/null 2>&1; then
  SNAPSHOT_TEXT=$(sqlite3 "$DB_PATH" \
    "SELECT 'Top facts: ' || group_concat(category || ': ' || substr(content,1,80), ' | ')
     FROM (SELECT category, content FROM facts WHERE superseded=0
           ORDER BY importance DESC LIMIT 5);" \
    2>/dev/null || echo "")
fi

# Method 3: fallback to coordinator-state.json
if [ -z "$SNAPSHOT_TEXT" ] && [ -f "$STATE_FILE" ]; then
  SNAPSHOT_TEXT=$(python3 -c "
import json
d = json.load(open('$STATE_FILE'))
parts = []
sdd = d.get('sdd_pipeline')
if sdd and sdd.get('task'):
    parts.append(f\"Active pipeline: Phase {sdd['phase']} — {sdd['task']}\")
branch = d.get('git_branch')
if branch:
    parts.append(f\"Branch: {branch}\")
print('; '.join(parts) if parts else 'No prior context available.')
" 2>/dev/null || echo "No prior context available.")
fi

# --- Build the combined recovery systemMessage ---
# Escape essentials content for JSON embedding
ESCAPED_ESSENTIALS=$(echo "$ESSENTIALS_CONTENT" \
  | sed 's/\\/\\\\/g' \
  | sed 's/"/\\"/g' \
  | awk '{printf "%s\\n", $0}' \
  | sed 's/\\n$//')

ESCAPED_SNAPSHOT=$(echo "$SNAPSHOT_TEXT" \
  | sed 's/\\/\\\\/g' \
  | sed 's/"/\\"/g' \
  | awk '{printf "%s\\n", $0}' \
  | sed 's/\\n$//')

cat <<JSON
{
  "systemMessage": "COMPACTION RECOVERY — SESSION RESUMED\n\n=== YOUR IDENTITY ===\n${ESCAPED_ESSENTIALS}\n\n=== CONTEXT BEFORE COMPACTION ===\n${ESCAPED_SNAPSHOT}\n\n=== REQUIRED BEFORE ACTING ===\n1. State your core rule in one sentence.\n2. Identify which squad member owns the next action.\n3. Call mem_compact_context(project: '${PROJECT}') for full snapshot if needed."
}
JSON
