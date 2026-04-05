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
if [[ "$TOOL_NAME" == *"wantan-mem"* ]] || [[ "$TOOL_NAME" == "Read" ]] || [[ "$TOOL_NAME" == "Glob" ]] || [[ "$TOOL_NAME" == "Grep" ]] || [[ "$TOOL_NAME" == "TaskCreate" ]] || [[ "$TOOL_NAME" == "TaskUpdate" ]] || [[ "$TOOL_NAME" == "TaskList" ]] || [[ "$TOOL_NAME" == "TaskGet" ]]; then
  exit 0
fi

# Build meaningful content from tool input + output, with proper JSON escaping
CONTENT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    tool = d.get('tool_name', 'unknown')
    tool_input = d.get('tool_input', {})
    tool_output = str(d.get('tool_output', ''))[:300]

    import re

    # Credential scrubbing patterns — strip BEFORE storing
    def scrub_credentials(text):
        # Passwords in CLI args
        text = re.sub(r'(-p|--password[= ]|sshpass -p )[\'\"]\S+[\'\"]', r'\1[REDACTED]', text)
        text = re.sub(r'(-p|--password[= ])\S+', r'\1[REDACTED]', text)
        # Connection strings with passwords
        text = re.sub(r'(mysql|postgres|mongodb|redis)://\S+:\S+@', r'\1://[REDACTED]@', text)
        # Bearer tokens and API keys
        text = re.sub(r'(Bearer |Authorization: |token[= ]|api[_-]?key[= ])\S+', r'\1[REDACTED]', text)
        # AWS/GCP/Azure keys
        text = re.sub(r'(AKIA|AIza|sk-|ghp_|gho_|github_pat_)\S+', '[REDACTED_KEY]', text)
        # Generic password patterns in env vars
        text = re.sub(r'(PASSWORD|SECRET|TOKEN|PRIVATE_KEY)[= ]\S+', r'\1=[REDACTED]', text, flags=re.IGNORECASE)
        return text

    # Bash noise filter — skip commands with no knowledge value
    BASH_NOISE = re.compile(
        r'^(git\s+(status|log|diff|branch|stash|fetch|pull|show|remote)|'
        r'ls(\s|$)|cat\s|head\s|tail\s|wc\s|grep\s|sed\s|awk\s|'
        r'echo\s|pwd|cd\s|which\s|whoami|date|clear|'
        r'node\s+--version|python3?\s+--version|npm\s+(--version|ls)|'
        r'docker\s+(ps|images|logs)|'
        r'curl\s.*localhost:37778)',
        re.IGNORECASE
    )

    # Extract meaningful content based on tool type
    if tool == 'Bash':
        cmd = tool_input.get('command', '')[:150]
        # Skip noisy bash commands entirely
        if BASH_NOISE.match(cmd.strip()):
            print('')
            import sys; sys.exit(0)
        cmd = scrub_credentials(cmd)
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

    # Final credential scrub on all content
    content = scrub_credentials(content)
    # Escape for safe JSON embedding
    print(json.dumps(content)[1:-1])
except:
    print(f'Tool: unknown')
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
            'Diablo': 'diablo', 'Killua': 'killua', 'Itachi': 'itachi',
            'Shikamaru': 'shikamaru', 'L': 'l', 'Kazuma': 'kazuma',
            'Wiz': 'wiz', 'Senku': 'senku', 'Sai': 'sai',
            'Byakuya': 'byakuya', 'Conan': 'conan', 'Rohan': 'rohan',
            'Explore': 'wiz', 'Plan': 'senku',
        }
        print(mapping.get(agent, agent.lower() if agent else 'wantan'))
    else:
        print('wantan')
except:
    print('wantan')
" 2>/dev/null)

# Escape project name for JSON
PROJECT=$(python3 -c "
import json, os
print(json.dumps(os.path.basename(os.getcwd()))[1:-1])
" 2>/dev/null)

# Default to wantan if empty
AGENT="${AGENT:-wantan}"
PROJECT="${PROJECT:-unknown}"

# Skip if content is empty (noise-filtered by python)
if [[ -z "$CONTENT" ]]; then
  exit 0
fi
CONTENT="${CONTENT:-Tool: $TOOL_NAME}"

# POST to worker (fire and forget, 2s timeout)
curl -s -X POST "$WORKER_URL/api/observe" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"tool_use\",\"agent\":\"$AGENT\",\"content\":\"$CONTENT\",\"project\":\"$PROJECT\"}" \
  --connect-timeout 2 --max-time 2 \
  > /dev/null 2>&1 || true

exit 0
