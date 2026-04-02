#!/bin/bash
# PostToolUse hook: Validates vault .md files have required YAML frontmatter
# Exit 0 = pass, Exit 1 = report error (don't block)

FILE="$CLAUDE_FILE_PATH"

# Skip non-md files
if [[ ! "$FILE" == *.md ]]; then exit 0; fi

# Skip system files
if [[ "$FILE" == *".claude/"* ]]; then exit 0; fi
if [[ "$FILE" == *".git/"* ]]; then exit 0; fi
if [[ "$(basename "$FILE")" == "CLAUDE.md" ]]; then exit 0; fi
if [[ "$(basename "$FILE")" == "CLAUDE.local.md" ]]; then exit 0; fi
if [[ "$(basename "$FILE")" == "README.md" ]]; then exit 0; fi

# Check file exists
if [[ ! -f "$FILE" ]]; then exit 0; fi

# Check file starts with ---
FIRST_LINE=$(head -1 "$FILE")
if [[ "$FIRST_LINE" != "---" ]]; then
  echo "FRONTMATTER ERROR: $FILE does not start with --- (missing YAML frontmatter)"
  exit 1
fi

# Check required fields exist in the frontmatter block
ERRORS=""
for field in title created type tags status venture related; do
  if ! head -20 "$FILE" | grep -q "^${field}:"; then
    ERRORS="${ERRORS}  - Missing required field: ${field}\n"
  fi
done

if [[ -n "$ERRORS" ]]; then
  echo "FRONTMATTER ERROR in $FILE:"
  echo -e "$ERRORS"
  exit 1
fi

# Check filename is lowercase-kebab-case (no uppercase, no spaces, no underscores)
BASENAME=$(basename "$FILE" .md)
if echo "$BASENAME" | grep -qE '[A-Z _]'; then
  echo "NAMING ERROR: $FILE — filename must be lowercase-kebab-case (no uppercase, spaces, or underscores)"
  exit 1
fi

exit 0
