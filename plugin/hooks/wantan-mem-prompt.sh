#!/bin/bash
# UserPromptSubmit hook: capture user prompts to wantan-mem
WORKER_URL="http://localhost:37778"

INPUT=$(cat)

# Extract prompt
PROMPT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('prompt', ''))
except:
    print('')
" 2>/dev/null)

# Skip noise: short prompts, empty, single words, slash commands, casual chat
if [ ${#PROMPT} -lt 20 ]; then
  exit 0
fi

# Skip slash commands (handled by skills, not knowledge)
if [[ "$PROMPT" == /* ]]; then
  exit 0
fi

# Skip casual/acknowledgment messages (no knowledge value)
LOWER_PROMPT=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')
if echo "$LOWER_PROMPT" | grep -qE '^(yes|no|ok|sure|thanks|good|nice|cool|great|proceed|go ahead|do it|lgtm|hei |hey |btw|nah)\b'; then
  exit 0
fi

# Truncate to 500 chars and escape for JSON
CONTENT=$(echo "$PROMPT" | python3 -c "
import sys, json
text = sys.stdin.read().strip()[:500]
# Escape for JSON embedding
print(json.dumps(text)[1:-1])
" 2>/dev/null)

curl -s -X POST "$WORKER_URL/api/observe" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"insight\",\"agent\":\"user\",\"content\":\"$CONTENT\",\"project\":\"$(basename $(pwd))\"}" \
  --connect-timeout 2 --max-time 2 \
  > /dev/null 2>&1 || true

exit 0
