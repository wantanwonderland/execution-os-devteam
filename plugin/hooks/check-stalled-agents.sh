#!/bin/bash
# UserPromptSubmit hook: detect stalled in_progress agents in sdd-state.json
# If any in_progress phase has been running > STALL_THRESHOLD minutes, warn Wantan.

STATE_FILE=".claude/sdd-state.json"

if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

python3 << 'PYEOF'
import json, os, sys
from datetime import datetime, timezone

STATE_FILE = ".claude/sdd-state.json"
STALL_THRESHOLD = 600  # 10 minutes in seconds

try:
    with open(STATE_FILE) as f:
        state = json.load(f)
except Exception:
    sys.exit(0)

phases = state.get('phases', {})
agent_ids = state.get('agent_ids', {})
now = datetime.now(timezone.utc)
stalled = []

for phase_key, phase_data in phases.items():
    if not isinstance(phase_data, dict):
        continue
    if phase_data.get('status') != 'in_progress':
        continue

    agent_name = phase_data.get('agent', 'unknown')
    dispatched_at_str = phase_data.get('dispatched_at')
    if not dispatched_at_str:
        continue

    try:
        dispatched_at = datetime.fromisoformat(dispatched_at_str.replace('Z', '+00:00'))
        if dispatched_at.tzinfo is None:
            dispatched_at = dispatched_at.replace(tzinfo=timezone.utc)
        elapsed = (now - dispatched_at).total_seconds()
        if elapsed < STALL_THRESHOLD:
            continue

        minutes_elapsed = int(elapsed // 60)
        jsonl_note = ""

        # Confirm via JSONL mtime if agent_id is known
        agent_id = agent_ids.get(agent_name)
        if agent_id:
            home = os.path.expanduser("~")
            claude_dir = os.path.join(home, ".claude", "projects")
            if os.path.isdir(claude_dir):
                found = False
                for proj_slug in os.listdir(claude_dir):
                    if found:
                        break
                    proj_path = os.path.join(claude_dir, proj_slug)
                    if not os.path.isdir(proj_path):
                        continue
                    for session_id in os.listdir(proj_path):
                        jsonl_path = os.path.join(
                            proj_path, session_id, "subagents",
                            f"agent-{agent_id}.jsonl"
                        )
                        if os.path.isfile(jsonl_path):
                            mtime_age = now.timestamp() - os.path.getmtime(jsonl_path)
                            jsonl_note = f", JSONL silent {int(mtime_age // 60)}m"
                            found = True
                            break

        stalled.append({
            'phase': phase_key,
            'agent': agent_name,
            'minutes': minutes_elapsed,
            'jsonl_note': jsonl_note,
        })
    except Exception:
        continue

if stalled:
    print(f"⚠️  STALL ALERT: {len(stalled)} agent(s) appear stalled in .claude/sdd-state.json:")
    for s in stalled:
        print(f"  • {s['agent']} (phase {s['phase']}): dispatched {s['minutes']}m ago, no completion{s['jsonl_note']}")
    print("  → Re-dispatch the stalled agent(s) immediately. Do NOT wait for their return.")

sys.exit(0)
PYEOF

exit 0
