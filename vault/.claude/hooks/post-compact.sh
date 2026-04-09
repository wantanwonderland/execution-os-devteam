#!/bin/bash
# PostCompact hook — fires after Claude Code auto-compacts the conversation.
#
# Purpose: Re-inject the Wantan delegation rules into the new context window
# so that agent identity is restored before any work resumes.
#
# Output: JSON with systemMessage — becomes a system-level injection Claude
# reads immediately after compaction, before the next user turn.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ESSENTIALS="$SCRIPT_DIR/../context-essentials.md"

if [ ! -f "$ESSENTIALS" ]; then
  exit 0
fi

CONTENT=$(cat "$ESSENTIALS")

# Escape for JSON: backslashes first, then double quotes, then newlines
ESCAPED=$(echo "$CONTENT" \
  | sed 's/\\/\\\\/g' \
  | sed 's/"/\\"/g' \
  | awk '{printf "%s\\n", $0}' \
  | sed 's/\\n$//')

cat <<JSON
{
  "systemMessage": "COMPACTION DETECTED — IDENTITY RESTORED\n\nBefore doing anything else, read and acknowledge:\n\n${ESCAPED}\n\nREQUIRED: State your core rule in one sentence, then identify which squad member owns the next action based on .claude/sdd-state.json (if it exists) or the last task from .claude/tasks/todo.md."
}
JSON
