#!/bin/bash
# Stop hook: capture turn summary to wantan-mem
WORKER_URL="http://localhost:37778"

INPUT=$(cat)

# Extract transcript path
TRANSCRIPT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('transcript_path', ''))
except:
    print('')
" 2>/dev/null)

# Skip if no transcript
if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  exit 0
fi

# Extract a lightweight summary from the last 20 lines of the transcript
SUMMARY=$(python3 -c "
import sys, json

transcript_path = '$TRANSCRIPT'
try:
    with open(transcript_path, 'r') as f:
        lines = f.readlines()

    # Get last 20 entries
    recent = lines[-20:] if len(lines) > 20 else lines

    tools_used = []
    files_changed = set()
    searches = []

    for line in recent:
        try:
            entry = json.loads(line.strip())
            msg = entry.get('message', {})
            content = msg.get('content', '')

            # Extract tool uses from assistant messages
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict):
                        if block.get('type') == 'tool_use':
                            name = block.get('name', '')
                            inp = block.get('input', {})
                            if name == 'Write' or name == 'Edit':
                                fp = inp.get('file_path', '')
                                if fp:
                                    files_changed.add(fp.split('/')[-1])
                            elif name == 'WebSearch':
                                q = inp.get('query', '')[:80]
                                if q:
                                    searches.append(q)
                            elif name == 'Bash':
                                cmd = inp.get('command', '')[:60]
                                if cmd and not cmd.startswith('echo') and not cmd.startswith('cat'):
                                    tools_used.append(f'bash: {cmd}')
                            elif name == 'Agent':
                                desc = inp.get('description', '')[:60]
                                if desc:
                                    tools_used.append(f'agent: {desc}')
        except:
            continue

    parts = []
    if files_changed:
        parts.append(f'Files: {\", \".join(list(files_changed)[:5])}')
    if searches:
        parts.append(f'Searched: {\"; \".join(searches[:3])}')
    if tools_used:
        parts.append(f'Actions: {\"; \".join(tools_used[:5])}')

    summary = ' | '.join(parts) if parts else ''
    print(summary[:500])
except Exception as e:
    print('')
" 2>/dev/null)

# Skip if empty summary
if [ -z "$SUMMARY" ]; then
  exit 0
fi

# Escape for JSON
CONTENT=$(echo "$SUMMARY" | python3 -c "
import sys, json
text = sys.stdin.read().strip()
print(json.dumps(text)[1:-1])
" 2>/dev/null)

curl -s -X POST "$WORKER_URL/api/observe" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"review\",\"agent\":\"wantan\",\"content\":\"Turn summary: $CONTENT\",\"project\":\"$(basename $(pwd))\"}" \
  --connect-timeout 2 --max-time 2 \
  > /dev/null 2>&1 || true

exit 0
