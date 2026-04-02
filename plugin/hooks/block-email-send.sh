#!/bin/bash
# HOOK: Block direct email sending — Draft-only policy
# Type: PreToolUse
# Trigger: Any tool matching gmail_send*
# Rule: All agents must ONLY create drafts, never send directly.

TOOL_NAME="$CLAUDE_TOOL_NAME"

if [[ "$TOOL_NAME" == *"gmail_send"* ]] || [[ "$TOOL_NAME" == *"send_message"* ]] || [[ "$TOOL_NAME" == *"send_draft"* ]]; then
  echo "BLOCKED: Draft-only email policy enforced. Use gmail_create_draft instead." >&2
  echo "All emails must be saved as drafts for review before sending." >&2
  exit 2
fi

exit 0
