#!/bin/bash
# HOOK: SDD Pipeline Gate — blocks premature agent dispatches
# Type: PreToolUse on Agent
# Rule: Structural enforcement of SDD pipeline phases.
#   - Conan frontend blocked until Rohan delivers (if UI task)
#   - No agent dispatch for feature work without approved spec
#   - Phase ordering enforced via .claude/sdd-state.json

# Only applies to Agent tool
TOOL_NAME="$CLAUDE_TOOL_NAME"
if [ "$TOOL_NAME" != "Agent" ]; then
  exit 0
fi

STATE_FILE=".claude/sdd-state.json"

# No state file = not an SDD pipeline run, allow everything
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# Read tool input from stdin
INPUT=$(cat)

# Extract agent description/prompt from the Agent tool input
AGENT_INFO=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    prompt = d.get('prompt', '')[:500].lower()
    desc = d.get('description', '')[:200].lower()
    print(desc + ' ||| ' + prompt)
except:
    print('')
" 2>/dev/null)

# Read state
GATE_RESULT=$(python3 -c "
import json, sys

try:
    with open('$STATE_FILE') as f:
        state = json.load(f)
except:
    print('ALLOW:no_state')
    sys.exit(0)

gates = state.get('gates', {})
ui = state.get('ui_classification', 'NO')
phase = state.get('current_phase', 0)
agent_info = '''$AGENT_INFO'''.lower()

# Gate 1: Block Conan frontend if Rohan hasn't delivered (UI tasks only)
if ui == 'YES':
    conan_frontend = any(kw in agent_info for kw in [
        'conan', 'frontend', 'implement.*ui', 'build.*page',
        'build.*component', 'implement.*design', 'landing.page',
        'implement.*layout', 'build.*site'
    ])
    # Exclude design agent dispatches — Rohan IS the design agent, don't block her
    is_design_agent = any(kw in agent_info for kw in [
        'rohan', 'aesthetic', 'design spec', 'design system', 'typography',
        'color palette', 'zero-gravity'
    ])
    if is_design_agent:
        print('ALLOW:design_agent')
        sys.exit(0)

    # More specific: check for frontend keywords without backend keywords
    has_frontend = any(kw in agent_info for kw in [
        'frontend', 'ui ', 'page', 'component', 'layout',
        'landing', 'site', 'view', 'screen', 'style', 'css',
        'implement.*design', 'build.*page'
    ])
    has_backend_only = any(kw in agent_info for kw in [
        'backend', 'api', 'database', 'db ', 'schema', 'migration',
        'endpoint', 'service', 'server'
    ]) and not has_frontend

    if has_frontend and not has_backend_only:
        rohan_done = gates.get('rohan_delivered', False)
        if not rohan_done:
            print('BLOCK:rohan_not_delivered')
            sys.exit(0)

# Gate 2: Block any implementation dispatch without spec approval
if phase < 2:
    spec_approved = gates.get('spec_approved', False)
    implementation_dispatch = any(kw in agent_info for kw in [
        'conan', 'implement', 'build', 'code', 'scaffold',
        'create.*component', 'develop'
    ])
    if implementation_dispatch and not spec_approved:
        print('BLOCK:spec_not_approved')
        sys.exit(0)

# Gate 3: Block deploy without review approval
deploy_dispatch = any(kw in agent_info for kw in [
    'shikamaru', 'deploy', 'ship', 'release', 'production'
])
if deploy_dispatch:
    review_ok = gates.get('review_approved', False)
    if not review_ok:
        print('BLOCK:review_not_approved')
        sys.exit(0)

print('ALLOW:gates_passed')
" 2>/dev/null)

# Parse result
case "$GATE_RESULT" in
  BLOCK:rohan_not_delivered)
    echo "BLOCKED: Conan frontend dispatch requires Rohan's design spec. UI Classification is YES but rohan_delivered is false. Dispatch Rohan first." >&2
    exit 2
    ;;
  BLOCK:spec_not_approved)
    echo "BLOCKED: Cannot dispatch implementation agents before spec is approved (Phase 1 incomplete). Get user approval on Lelouch's spec first." >&2
    exit 2
    ;;
  BLOCK:review_not_approved)
    echo "BLOCKED: Cannot deploy without Diablo's review approval. Dispatch Diablo for code review first." >&2
    exit 2
    ;;
  ALLOW:*)
    exit 0
    ;;
  *)
    # Unknown result, don't block
    exit 0
    ;;
esac
