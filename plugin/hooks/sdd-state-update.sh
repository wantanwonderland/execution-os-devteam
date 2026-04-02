#!/bin/bash
# HOOK: SDD State Auto-Update — updates pipeline state after agent completion
# Type: PostToolUse on Agent
# Rule: When an agent completes, update .claude/sdd-state.json with the result.

TOOL_NAME="$CLAUDE_TOOL_NAME"
if [ "$TOOL_NAME" != "Agent" ]; then
  exit 0
fi

STATE_FILE=".claude/sdd-state.json"

# No state file = not an SDD pipeline run
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# Read hook input from stdin into a temp file (avoids stdin issues with python)
export TMPINPUT=$(mktemp)
cat > "$TMPINPUT"

python3 << 'PYEOF'
import json, sys, os
from datetime import datetime

# Read hook input
try:
    with open(os.environ.get('TMPINPUT', '/dev/null')) as f:
        hook_input = json.load(f)
except:
    sys.exit(0)

tool_input = hook_input.get('tool_input', {})
prompt = tool_input.get('prompt', '').lower()
desc = tool_input.get('description', '').lower()
agent_info = desc + ' ' + prompt[:300]

# Read state
state_file = '.claude/sdd-state.json'
try:
    with open(state_file) as f:
        state = json.load(f)
except:
    sys.exit(0)

gates = state.setdefault('gates', {})
phases = state.setdefault('phases', {})
updated = False

# Detect which agent completed
# Priority 1: exact agent name match (most reliable)
agent_names = ['lelouch', 'byakuya', 'rohan', 'senku', 'killua',
               'conan', 'diablo', 'itachi', 'shikamaru', 'kazuma', 'wiz']
detected_agent = None
for name in agent_names:
    if name in agent_info:
        detected_agent = name
        break

# Priority 2: keyword fallback (if no agent name found)
if not detected_agent:
    keyword_markers = {
        'lelouch': ['spec', 'prd', 'requirement'],
        'byakuya': ['validate', 'audit', 'lint'],
        'rohan': ['design', 'aesthetic', 'typography', 'color palette'],
        'killua': ['test', 'playwright'],
        'conan': ['implement', 'build', 'scaffold', 'develop'],
        'diablo': ['review', 'code review', 'pr review'],
        'itachi': ['security', 'scan', 'cve', 'vulnerability'],
        'shikamaru': ['deploy', 'ci/cd', 'rollback'],
        'l': ['documentation', 'docs', 'runbook', 'changelog'],
        'senku': ['architect', 'adr', 'tech debt'],
        'kazuma': ['sprint', 'velocity', 'standup'],
        'wiz': ['research', 'evaluate', 'investigate'],
    }
    for agent, markers in keyword_markers.items():
        if any(m in agent_info for m in markers):
            detected_agent = agent
            break

if not detected_agent:
    sys.exit(0)

now = datetime.now().isoformat()

if detected_agent == 'lelouch':
    phases['1_spec'] = {'status': 'completed', 'agent': 'lelouch', 'completed_at': now}
    updated = True

elif detected_agent == 'byakuya':
    phases['1.5_validate'] = {'status': 'completed', 'agent': 'byakuya', 'completed_at': now}
    gates['spec_validated'] = True
    updated = True

elif detected_agent == 'rohan':
    phases['2_design'] = {'status': 'completed', 'agent': 'rohan', 'completed_at': now}
    gates['rohan_delivered'] = True
    # Unblock frontend if tests also done
    if phases.get('3_frontend', {}).get('status') == 'blocked':
        if gates.get('tests_written', False):
            phases['3_frontend'] = {'status': 'pending', 'agent': 'conan'}
    updated = True

elif detected_agent == 'killua':
    is_live_test = any(kw in agent_info for kw in ['live test', 'live browser', 'smoke test', 'browser test', 'e2e test', 'regression test'])
    if is_live_test:
        phases['3.5_live_tests'] = {'status': 'completed', 'agent': 'killua', 'completed_at': now}
    else:
        phases['2_tests'] = {'status': 'completed', 'agent': 'killua', 'completed_at': now}
        gates['tests_written'] = True
        if gates.get('rohan_delivered', False):
            if phases.get('3_frontend', {}).get('status') == 'blocked':
                phases['3_frontend'] = {'status': 'pending', 'agent': 'conan'}
    updated = True

elif detected_agent == 'conan':
    if any(kw in agent_info for kw in ['backend', 'api', 'database', 'db ', 'schema', 'migration']):
        phases['2_backend'] = {'status': 'completed', 'agent': 'conan', 'completed_at': now}
        gates['backend_complete'] = True
    else:
        phases['3_frontend'] = {'status': 'completed', 'agent': 'conan', 'completed_at': now}
        gates['frontend_blocked'] = False
    updated = True

elif detected_agent == 'diablo':
    phases['4_review'] = {'status': 'completed', 'agent': 'diablo', 'completed_at': now}
    gates['review_approved'] = True
    updated = True

elif detected_agent == 'itachi':
    phases['4.5_security'] = {'status': 'completed', 'agent': 'itachi', 'completed_at': now}
    gates['security_clear'] = True
    updated = True

elif detected_agent == 'shikamaru':
    phases['5_deploy'] = {'status': 'completed', 'agent': 'shikamaru', 'completed_at': now}
    updated = True

elif detected_agent == 'l':
    phases['2_docs'] = {'status': 'completed', 'agent': 'l', 'completed_at': now}
    updated = True

elif detected_agent == 'senku':
    phases['2_architecture'] = {'status': 'completed', 'agent': 'senku', 'completed_at': now}
    updated = True

# Advance phase if all Phase 2 agents are done
if updated:
    phase2_agents = ['2_tests', '2_backend', '2_docs']
    ui = state.get('ui_classification', 'NO')
    if ui == 'YES':
        phase2_agents.append('2_design')

    all_phase2_done = all(
        phases.get(p, {}).get('status') in ('completed', 'skipped')
        for p in phase2_agents
    )
    if all_phase2_done and state.get('current_phase', 0) == 2:
        state['current_phase'] = 3

    state['updated_at'] = now

    with open(state_file, 'w') as f:
        json.dump(state, f, indent=2)
PYEOF

# Cleanup
rm -f "$TMPINPUT"

exit 0
