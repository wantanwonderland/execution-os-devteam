#!/bin/bash
# PostToolUse hook: capture tool observations to wantan-mem
# Sends a lightweight POST to the worker — fails silently if worker is down

WORKER_URL="http://localhost:37778"

# Read hook input from stdin (Claude Code passes JSON)
INPUT=$(cat)

# Extract tool name, input summary, and output summary
TOOL_NAME=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_name', 'unknown'))
except:
    print('unknown')
" 2>/dev/null)

# Skip self-referential and noisy observations
if [[ "$TOOL_NAME" == *"wantan-mem"* ]] || [[ "$TOOL_NAME" == "Read" ]] || [[ "$TOOL_NAME" == "Glob" ]] || [[ "$TOOL_NAME" == "Grep" ]]; then
  exit 0
fi

# Build meaningful content from tool input + output
CONTENT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    tool = d.get('tool_name', 'unknown')
    tool_input = d.get('tool_input', {})
    tool_output = str(d.get('tool_output', ''))[:300]

    # Extract meaningful content based on tool type
    if tool == 'Bash':
        cmd = tool_input.get('command', '')[:150]
        content = f'Bash: {cmd}'
    elif tool == 'Agent':
        desc = tool_input.get('description', '')[:100]
        agent_type = tool_input.get('subagent_type', 'general')
        content = f'Agent ({agent_type}): {desc}'
    elif tool == 'Write':
        path = tool_input.get('file_path', '')
        content = f'Write: {path}'
    elif tool == 'Edit':
        path = tool_input.get('file_path', '')
        content = f'Edit: {path}'
    elif tool == 'WebSearch':
        query = tool_input.get('query', '')[:100]
        content = f'WebSearch: {query}'
    elif tool == 'WebFetch':
        url = tool_input.get('url', '')[:100]
        content = f'WebFetch: {url}'
    elif 'mcp__' in tool:
        content = f'MCP: {tool}'
    else:
        content = f'{tool}: {json.dumps(tool_input)[:150]}'

    print(content)
except:
    print(f'Tool: {sys.argv[0] if len(sys.argv) > 0 else \"unknown\"}')
" 2>/dev/null)

# Determine agent from context (Agent tool dispatches carry subagent_type)
AGENT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    tool = d.get('tool_name', '')
    if tool == 'Agent':
        agent = d.get('tool_input', {}).get('subagent_type', 'wantan')
        # Map known subagent types to our agent names
        mapping = {
            'Levi': 'levi', 'Killua': 'killua', 'Itachi': 'itachi',
            'Shikamaru': 'shikamaru', 'L': 'l', 'Erwin': 'erwin',
            'Hange': 'hange', 'Senku': 'senku', 'Sai': 'sai',
            'Byakuya': 'byakuya', 'Tanjiro': 'tanjiro', 'Ochaco': 'ochaco',
            'Explore': 'hange', 'Plan': 'senku',
        }
        print(mapping.get(agent, agent.lower() if agent else 'wantan'))
    else:
        print('wantan')
except:
    print('wantan')
" 2>/dev/null)

# Default to wantan if empty
AGENT="${AGENT:-wantan}"
CONTENT="${CONTENT:-Tool: $TOOL_NAME}"

# POST to worker (fire and forget, 2s timeout)
curl -s -X POST "$WORKER_URL/api/observe" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"tool_use\",\"agent\":\"$AGENT\",\"content\":\"$CONTENT\",\"project\":\"$(basename $(pwd))\"}" \
  --connect-timeout 2 --max-time 2 \
  > /dev/null 2>&1 || true

exit 0
