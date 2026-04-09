#!/bin/bash
# PreCompact hook — fires before Claude Code compacts the conversation.
#
# Purpose: Write the current coordinator state to a file so it survives
# compaction and can be re-read by the PostCompact hook.
#
# The compaction summary may drop routing constraints and in-progress state.
# This hook checkpoints what matters before the summary is generated.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="$SCRIPT_DIR/../../.claude/coordinator-state.json"
SDD_STATE="$SCRIPT_DIR/../../.claude/sdd-state.json"
TODO_FILE="$SCRIPT_DIR/../../.claude/tasks/todo.md"

# Read active SDD state if it exists
SDD_SUMMARY="none"
if [ -f "$SDD_STATE" ]; then
  PHASE=$(python3 -c "import json,sys; d=json.load(open('$SDD_STATE')); print(d.get('current_phase','?'))" 2>/dev/null || echo "?")
  TASK=$(python3 -c "import json,sys; d=json.load(open('$SDD_STATE')); print(d.get('task','unknown'))" 2>/dev/null || echo "unknown")
  SDD_SUMMARY="phase=${PHASE}, task=${TASK}"
fi

# Read last in-progress todo
TODO_SUMMARY="none"
if [ -f "$TODO_FILE" ]; then
  TODO_SUMMARY=$(grep -m1 '\[ \]' "$TODO_FILE" 2>/dev/null | sed 's/^[[:space:]]*//' | cut -c1-120 || echo "none")
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

python3 - <<PYEOF
import json, os

state = {
    "compacted_at": "$TIMESTAMP",
    "core_constraint": "orchestrate-not-execute",
    "sdd_pipeline": "$SDD_SUMMARY",
    "pending_todo": "$TODO_SUMMARY",
    "reminder": "Re-read .claude/context-essentials.md before acting. Delegate — never execute directly."
}

os.makedirs(os.path.dirname("$STATE_FILE"), exist_ok=True)
with open("$STATE_FILE", "w") as f:
    json.dump(state, f, indent=2)
PYEOF

exit 0
