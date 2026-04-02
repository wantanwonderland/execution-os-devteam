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

# Skip noise: short prompts, empty, single words
if [ ${#PROMPT} -lt 10 ]; then
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
