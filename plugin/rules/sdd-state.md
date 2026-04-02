# SDD State Management

## State File: `.claude/sdd-state.json`

Wantan MUST write and maintain this file during any SDD pipeline execution. The state file is the **single source of truth** for pipeline progress — hooks read it to enforce gates.

## Schema

```json
{
  "task": "feature-name-slug",
  "created_at": "ISO-8601 timestamp",
  "updated_at": "ISO-8601 timestamp",
  "ui_classification": "YES | NO",
  "current_phase": 1,
  "phases": {
    "1_spec": { "status": "completed", "agent": "lelouch" },
    "1.5_validate": { "status": "completed", "agent": "byakuya" },
    "2_design": { "status": "in_progress | completed | skipped", "agent": "rohan" },
    "2_architecture": { "status": "pending | completed | skipped", "agent": "senku" },
    "2_tests": { "status": "pending | completed", "agent": "killua" },
    "2_backend": { "status": "pending | completed", "agent": "conan" },
    "2_docs": { "status": "pending | completed", "agent": "l" },
    "3_frontend": { "status": "blocked | in_progress | completed", "agent": "conan" },
    "3.5_live_tests": { "status": "pending | completed", "agent": "killua" },
    "4_review": { "status": "pending | completed", "agent": "diablo" },
    "4.5_security": { "status": "pending | completed", "agent": "itachi" },
    "5_deploy": { "status": "pending | completed", "agent": "shikamaru" }
  },
  "gates": {
    "spec_approved": false,
    "spec_validated": false,
    "rohan_delivered": false,
    "tests_written": false,
    "backend_complete": false,
    "frontend_blocked": true,
    "review_approved": false,
    "security_clear": false,
    "deploy_confirmed": false
  }
}
```

## When Wantan Writes State

| Event | Action |
|-------|--------|
| User says "build X" / SDD pipeline starts | Create `.claude/sdd-state.json` with Phase 1 in_progress |
| User approves spec | Set `spec_approved: true`, advance to Phase 1.5 |
| Byakuya validates | Set `spec_validated: true`, advance to Phase 2 |
| Dispatching Phase 2 agents | Set each dispatched agent's status to `in_progress`. If `ui_classification: NO`, set `2_design` to `skipped` and `rohan_delivered` to N/A |
| Rohan returns | Set `rohan_delivered: true`, `2_design: completed` |
| Killua returns tests | Set `tests_written: true`, `2_tests: completed` |
| Conan backend returns | Set `backend_complete: true`, `2_backend: completed` |
| All Phase 2 agents complete | Set `3_frontend` status from `blocked` to `pending`, advance `current_phase: 3` |
| Conan frontend returns | Set `3_frontend: completed` |
| Diablo approves | Set `review_approved: true`, `4_review: completed` |
| Itachi clears | Set `security_clear: true`, `4.5_security: completed` |
| User confirms deploy | Set `deploy_confirmed: true`, advance to Phase 5 |
| Shikamaru deploys | Set `5_deploy: completed`, pipeline done |

## State Write Command

Wantan updates state using Bash:

```bash
python3 -c "
import json, os
from datetime import datetime

state_file = '.claude/sdd-state.json'
os.makedirs('.claude', exist_ok=True)

# Read existing or create new
if os.path.exists(state_file):
    with open(state_file) as f:
        state = json.load(f)
else:
    state = {}

# Update fields (replace with actual updates)
state['updated_at'] = datetime.now().isoformat()
# state['gates']['spec_approved'] = True
# state['current_phase'] = 2

with open(state_file, 'w') as f:
    json.dump(state, f, indent=2)
print('SDD state updated')
"
```

## Cleanup

When a pipeline completes (Phase 5 done) or is abandoned:
- Move `.claude/sdd-state.json` to `.claude/sdd-history/{task}-{timestamp}.json`
- This preserves history while clearing the active state for the next pipeline run

## Hook Integration

- **PreToolUse (Agent)**: `sdd-gate.sh` reads state to block premature dispatches
- **PostToolUse (Agent)**: `sdd-state-update.sh` detects agent completion and updates state
- **Both hooks are non-blocking if state file doesn't exist** (allows non-SDD work)
