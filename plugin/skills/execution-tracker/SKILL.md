---
name: execution-tracker
description: Track sprint execution progress across standup logs, PR throughput, sprint goals, and blockers. Use when {{OWNER_NAME}} reports sprint progress, PR status, a completed task, a blocker, or asks about sprint health.
---

# Execution Tracker

When {{OWNER_NAME}} mentions sprint progress or execution status, update the relevant vault file immediately.

## Trigger Signals

- Sprint progress: "finished the...", "shipped X", "PR is merged", "feature is done"
- Standup update: "yesterday I did...", "today I'm working on...", "blocked by..."
- Sprint goal status: "we're tracking for the sprint goal", "might miss X this sprint"
- Blockers: "can't move forward on...", "waiting for...", "{{TEAM_MEMBER}} is blocked"
- Ceremony outcomes: retro action items, sprint review feedback, planning decisions

## Target Files

| Signal | File | Action |
|--------|------|--------|
| Standup update | `vault/06-ceremonies/standup/YYYY-MM-DD.md` | Create or update today's standup log |
| Sprint goal progress | `vault/06-ceremonies/sprint-review/current-sprint.md` | Update goal completion status |
| Blocker surfaced | `vault/06-ceremonies/standup/issues-list.md` | Add to active blockers list |
| Retro action item | `vault/06-ceremonies/retro/YYYY-MM-DD-retro.md` | Log as action item with owner |
| Decision made in ceremony | `vault/04-decisions/log/YYYY-MM-DD-decision.md` | Log decision record |

## Update Process

1. Identify which execution signal was triggered
2. Read the target file to find the exact section to update
3. Make the update (check box, log entry, update status)
4. If the update reveals a milestone or concern (sprint at risk, recurring blocker, missed goal), flag it to {{OWNER_NAME}}
5. If the update triggers a `needs-review` signal (goal reference, commitment), add the tag

## Sprint Health Signals

Flag to {{OWNER_NAME}} when:
- 3+ standup entries mention the same blocker — it's a systemic issue
- Sprint goal completion is below 50% with fewer than 3 days remaining
- PR review SLA exceeded (open >24h with no review)
- A planned item has had no standup mentions for 3+ days

## Rules

- Always read the file before editing — don't guess at current state
- Preserve existing data — append or update, never overwrite history
- When blockers persist across multiple standups, surface the pattern explicitly
- Cross-reference sprint goals with actual standup output — if they diverge, flag it
- If {{OWNER_NAME}} reports a metric, ask which sprint/week it applies to if ambiguous
