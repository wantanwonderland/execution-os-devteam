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
    "2_design": { "status": "in_progress | completed | skipped | stalled", "agent": "rohan", "dispatched_at": "ISO-8601 — set when status = in_progress" },
    "2_architecture": { "status": "pending | completed | skipped", "agent": "senku" },
    "2_tests": { "status": "pending | in_progress | completed | stalled", "agent": "killua", "dispatched_at": "ISO-8601 — set when status = in_progress" },
    "2_backend": { "status": "pending | in_progress | completed | stalled", "agent": "conan", "dispatched_at": "ISO-8601 — set when status = in_progress" },
    "2_security": { "status": "pending | completed", "agent": "itachi" },
    "3_frontend": { "status": "blocked | in_progress | completed | stalled", "agent": "conan", "dispatched_at": "ISO-8601 — set when status = in_progress" },
    "3.5_live_tests": { "status": "pending | completed", "agent": "killua" },
    "4_review": { "status": "pending | completed", "agent": "diablo" },
    "4.5_security_gate": { "status": "pending | completed", "agent": "itachi" },
    "5_docs": { "status": "pending | completed", "agent": "l" },
    "5_deploy": { "status": "pending | completed", "agent": "shikamaru" }
  },
  "gates": {
    "spec_approved": false,
    "rohan_delivered": false,
    "tests_written": false,
    "backend_complete": false,
    "security_scanned": false,
    "frontend_blocked": true,
    "review_approved": false,
    "security_clear": false,
    "deploy_confirmed": false
  },
  "agent_ids": {
    "conan": null,
    "killua": null,
    "diablo": null,
    "itachi": null
  },
  "fix_loop_counts": {
    "phase_3_5": 0,
    "phase_4": 0
  }
}
```

## When Wantan Writes State

| Event | Action |
|-------|--------|
| User says "build X" / SDD pipeline starts | Create `.claude/sdd-state.json` with Phase 1 `in_progress`. Create `.claude/context/` directory. |
| User approves spec | Set `spec_approved: true`, advance to Phase 2 (Byakuya merged into Lelouch) |
| Dispatching Phase 2 agents | Set each dispatched agent's status to `in_progress` **with `dispatched_at: now`**. Store agent IDs in `agent_ids`. If `ui_classification: NO`, set `2_design` to `skipped`. |
| Agent detected as stalled | Set phase status to `stalled`. Re-dispatch the agent fresh (not SendMessage). See `plugin/hooks/check-stalled-agents.sh`. |
| Rohan returns | Set `rohan_delivered: true`, `2_design: completed`. Verify `.claude/context/design.json` exists. |
| Killua returns tests | Set `tests_written: true`, `2_tests: completed`. Verify `.claude/context/tests.json` exists. |
| Conan backend returns | Set `backend_complete: true`, `2_backend: completed`. Verify `.claude/context/backend.json` exists. |
| Itachi scan returns | Set `security_scanned: true`, `2_security: completed`. Verify `.claude/context/security.json` exists. |
| All Phase 2 agents complete | Set `3_frontend` status from `blocked` to `pending`, advance `current_phase: 3` |
| Conan frontend returns | Set `3_frontend: completed` |
| Killua↔Conan fix loop | Increment `fix_loop_counts.phase_3_5`. Use `SendMessage` to `agent_ids.conan` / `agent_ids.killua`. |
| Diablo approves | Set `review_approved: true`, `4_review: completed` |
| Diablo requests changes | Increment `fix_loop_counts.phase_4`. Use `SendMessage` to `agent_ids.conan`. Max 2 rounds. |
| Phase 4.5 security gate | Check `.claude/context/security.json`. If new deps added, `SendMessage` to `agent_ids.itachi`. Set `security_clear: true`. |
| L writes docs (Phase 5) | Set `5_docs: completed` |
| User confirms deploy | Set `deploy_confirmed: true`, advance to Phase 5 deploy |
| Shikamaru deploys | Set `5_deploy: completed`, pipeline done. Move context/ to sdd-history/. |

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
now = datetime.now().isoformat()
state['updated_at'] = now
# state['gates']['spec_approved'] = True
# state['current_phase'] = 2
# When setting a phase to in_progress, ALWAYS include dispatched_at:
# state['phases']['2_design'] = {'status': 'in_progress', 'agent': 'rohan', 'dispatched_at': now}

with open(state_file, 'w') as f:
    json.dump(state, f, indent=2)
print('SDD state updated')
"
```

## Cleanup

When a pipeline completes (Phase 5 done) or is abandoned:
- Move `.claude/sdd-state.json` to `.claude/sdd-history/{task}-{timestamp}.json`
- This preserves history while clearing the active state for the next pipeline run

## Context Bus: `.claude/context/`

Agents write structured deliverables to `.claude/context/` instead of passing everything through Wantan's prompt. Downstream agents read only the files they need. This eliminates redundant context passing (5-20K tokens → 200-500 tokens per handoff).

### Context Bus Files

| File | Written By | Read By | Content |
|------|-----------|---------|---------|
| `spec.json` | Lelouch (Phase 1) | All Phase 2 agents | Task, acceptance criteria, scope, UI classification, key files |
| `design.json` | Rohan (Phase 2) | Conan (Phase 3) | Palette, typography, layout, components, responsive rules |
| `tests.json` | Killua (Phase 2) | Conan (Phase 3) | Test file paths, failing tests count, coverage targets |
| `architecture.json` | Senku (Phase 2) | Conan (Phase 2/3) | Module structure, API contracts, data flow |
| `security.json` | Itachi (Phase 2) | Wantan (Phase 4.5 gate) | Findings by severity, dependencies flagged, recommendations |
| `backend.json` | Conan (Phase 2) | Conan (Phase 3), Killua (Phase 3.5) | API routes created, DB schema, endpoints |
| `review.json` | Diablo (Phase 4) | Wantan (surface to user) | Verdict, cleanliness score, change requests |
| `test-results.json` | Killua (Phase 3.5) | Diablo (Phase 4) | Pass/fail count, browser matrix, test output summary |

### Context Bus Schema (per file)

Each context bus file follows this structure:
```json
{
  "agent": "agent-name",
  "phase": "2_design",
  "timestamp": "ISO-8601",
  "status": "completed | partial | failed",
  "summary": "One-line summary of deliverable",
  "data": { /* agent-specific structured data */ }
}
```

### Write Rule
Agents write their context bus file as the LAST step before reporting completion to Wantan. The file MUST exist before the agent's status is set to `completed` in sdd-state.json.

### Read Rule
Downstream agents read context bus files at the START of their dispatch. Wantan includes the relevant file paths in the dispatch prompt: "Read `.claude/context/design.json` for Rohan's design direction."

### Cleanup
When a pipeline completes or is abandoned:
- Move `.claude/context/*.json` to `.claude/sdd-history/{task}-context/`
- Clear `.claude/context/` for the next pipeline

## Hook Integration

- **PreToolUse (Agent)**: `sdd-gate.sh` reads state to block premature dispatches
- **PostToolUse (Agent)**: `sdd-state-update.sh` detects agent completion and updates state
- **Both hooks are non-blocking if state file doesn't exist** (allows non-SDD work)
