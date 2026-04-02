#!/bin/bash
# HOOK: Block commits containing secrets or .env files
# Type: PreToolUse
# Trigger: Bash commands containing git add or git commit
# Rule: Never commit .env files, credentials, or secrets to version control.

TOOL_INPUT="$CLAUDE_TOOL_INPUT"

# Only check git add and git commit commands
if [[ "$TOOL_INPUT" == *"git add"* ]] || [[ "$TOOL_INPUT" == *"git commit"* ]]; then
  # Derive vault root from this script's location
  VAULT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
  STAGED=$(cd "$VAULT_ROOT" && git diff --cached --name-only 2>/dev/null)

  for file in $STAGED; do
    case "$file" in
      .env|.env.*|*.env|*credentials*|*secret*|.mcp.json)
        echo "BLOCKED: Sensitive file detected in staged changes: $file" >&2
        echo "Run 'git reset HEAD $file' to unstage before committing." >&2
        exit 2
        ;;
    esac
  done
fi

exit 0
