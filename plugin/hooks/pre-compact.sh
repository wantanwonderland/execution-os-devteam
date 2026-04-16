#!/bin/bash
# PreCompact hook — fires before Claude Code compacts the conversation.
#
# Strategy (ruvnet two-hook pattern):
#   1. Try the wantan-mem HTTP API first (rich, structured snapshot)
#   2. Fall back to direct sqlite3 CLI if server is not running
#   3. Always write coordinator-state.json as a lightweight fast fallback
#
# The compaction snapshot survives in SQLite and is restored by
# session-start-compact.sh when Claude Code resumes post-compaction.

PROJECT_CLAUDE="$(pwd)/.claude"
STATE_FILE="$PROJECT_CLAUDE/coordinator-state.json"
DB_PATH="${HOME}/.wantan-mem/wantan-mem.db"
MEM_PORT="${WANTAN_MEM_PORT:-37778}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# --- Detect current git branch ---
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# --- Read active SDD state ---
SDD_TASK=""
SDD_PHASE=""
if [ -f "$PROJECT_CLAUDE/sdd-state.json" ]; then
  SDD_TASK=$(python3 -c "import json; d=json.load(open('$PROJECT_CLAUDE/sdd-state.json')); print(d.get('task',''))" 2>/dev/null || echo "")
  SDD_PHASE=$(python3 -c "import json; d=json.load(open('$PROJECT_CLAUDE/sdd-state.json')); print(d.get('current_phase',''))" 2>/dev/null || echo "")
fi

# --- Try wantan-mem HTTP API first (requires server to be running) ---
API_SUCCESS=false

if command -v curl >/dev/null 2>&1; then
  # Detect project from cwd basename
  PROJECT=$(basename "$(pwd)")

  # Build SDD state JSON for the API call
  if [ -n "$SDD_TASK" ]; then
    SDD_JSON="{\"task\":\"$SDD_TASK\",\"current_phase\":\"$SDD_PHASE\"}"
  else
    SDD_JSON="null"
  fi

  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "http://localhost:${MEM_PORT}/api/compaction/snapshot" \
    -H "Content-Type: application/json" \
    -d "{\"project\":\"$PROJECT\",\"git_branch\":\"$GIT_BRANCH\",\"sdd_state\":$SDD_JSON}" \
    --max-time 5 2>/dev/null)

  if [ "$HTTP_STATUS" = "201" ]; then
    API_SUCCESS=true
  fi
fi

# --- Fallback: direct sqlite3 snapshot ---
if [ "$API_SUCCESS" = "false" ] && [ -f "$DB_PATH" ] && command -v sqlite3 >/dev/null 2>&1; then
  PROJECT=$(basename "$(pwd)")

  # Query top 10 facts
  TOP_FACTS_RAW=$(sqlite3 "$DB_PATH" \
    "SELECT id, category, substr(content,1,120), importance FROM facts WHERE superseded=0 ORDER BY importance DESC LIMIT 10;" \
    2>/dev/null || echo "")

  # Query last 10 observations
  RECENT_OBS_RAW=$(sqlite3 "$DB_PATH" \
    "SELECT id, agent, type, substr(content,1,80) FROM observations ORDER BY id DESC LIMIT 10;" \
    2>/dev/null || echo "")

  # Build JSON and insert snapshot
  python3 - <<PYEOF
import json, subprocess, sys

top_facts = []
for line in """$TOP_FACTS_RAW""".strip().split('\n'):
    if not line.strip(): continue
    parts = line.split('|')
    if len(parts) >= 4:
        top_facts.append({"id": parts[0].strip(), "category": parts[1].strip(),
                          "content": parts[2].strip(), "importance": parts[3].strip()})

recent_obs = []
for line in """$RECENT_OBS_RAW""".strip().split('\n'):
    if not line.strip(): continue
    parts = line.split('|')
    if len(parts) >= 4:
        recent_obs.append({"id": parts[0].strip(), "agent": parts[1].strip(),
                           "type": parts[2].strip(), "snippet": parts[3].strip()})

sdd_state = None
sdd_task = "$SDD_TASK"
sdd_phase = "$SDD_PHASE"
if sdd_task:
    sdd_state = json.dumps({"task": sdd_task, "current_phase": sdd_phase})
else:
    sdd_state = "NULL"

top_facts_json = json.dumps(top_facts).replace("'", "''")
recent_obs_json = json.dumps(recent_obs).replace("'", "''")
git_branch = "$GIT_BRANCH".replace("'", "''")
project = "$PROJECT".replace("'", "''")

sql = f"""INSERT INTO compaction_snapshots
  (project, git_branch, sdd_state, top_facts, recent_obs_summary)
  VALUES ('{project}', '{git_branch}', {sdd_state if sdd_state == 'NULL' else "'" + sdd_state.replace("'","''") + "'"}, '{top_facts_json}', '{recent_obs_json}');"""

result = subprocess.run(['sqlite3', '$DB_PATH'], input=sql, capture_output=True, text=True)
sys.exit(0 if result.returncode == 0 else 1)
PYEOF
fi

# --- Always write lightweight coordinator-state.json ---
API_FLAG="$API_SUCCESS"
python3 -c "
import json, sys
state = {
    'compacted_at': sys.argv[1],
    'core_constraint': 'orchestrate-not-execute',
    'git_branch': sys.argv[2] or None,
    'sdd_pipeline': {'task': sys.argv[3], 'phase': sys.argv[4]} if sys.argv[3] else None,
    'api_snapshot_saved': sys.argv[5] == 'true',
    'reminder': 'Re-read .claude/context-essentials.md before acting. Delegate — never execute directly.'
}
with open(sys.argv[6], 'w') as f:
    json.dump(state, f, indent=2)
" "$TIMESTAMP" "$GIT_BRANCH" "$SDD_TASK" "$SDD_PHASE" "$API_FLAG" "$STATE_FILE"

exit 0
