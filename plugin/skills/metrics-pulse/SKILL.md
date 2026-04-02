---
name: metrics-pulse
description: Generate weekly pulse report computing dev team execution patterns and system health from vault and database data
---

# Metrics Pulse Skill

Generate a weekly pulse file (`pulse-YYYY-WNN.md`) that auto-computes sprint execution patterns and system health from existing vault and database data.

## When to Use

- Every Sunday or sprint boundary before `/review`
- On-demand via `/pulse` command
- At `/close` to increment session metrics (Step 4.5)

## Output Location

`06-ceremonies/pulse-YYYY-WNN.md` — e.g., `pulse-2026-W11.md`

Week number is ISO 8601 (Monday-start). Date range in title for readability.

## Data Sources & Computation

### Dev Execution Metrics

| Metric | How to Compute |
|--------|---------------|
| Sprint goal completion | Query `data/company.db` sprints table — `goal_completion_pct` for current sprint |
| PR throughput | Query `pull_requests` table — count opened/merged/closed where `created_at` falls within current week |
| Cycle time avg | Query `pull_requests` — compute avg of `(merged_at - created_at)` for PRs merged this week |
| Deploy frequency | Query `deployment_logs` — count deploys this week per environment (staging, production) |
| Incident count | Query `incidents` table — count by severity (P0/P1/P2/P3) where `detected_at` falls within current week |
| MTTR | Query `incidents` — avg of `(resolved_at - detected_at)` for incidents resolved this week |
| Standup compliance | Count `06-ceremonies/standup/` files for current week's weekdays (Mon-Fri). Report as N/5. |
| Decisions logged | Count files in `04-decisions/log/` where `created` frontmatter date falls within current week |

### System Health Metrics

| Metric | How to Compute |
|--------|---------------|
| Corrections logged | Count rows in `.claude/tasks/lessons.md` Corrections Log where Date = current week. Group by Category column. |
| Files created | Count `.md` files across vault (excluding `.claude/`, `.git/`) where `created` frontmatter date = current week. |
| Routing overrides | Count corrections in lessons.md where Category = "routing" for current week. |
| Needs-review backlog | Grep all `.md` files for `needs-review` in frontmatter tags. Count total. |

### Pattern Detection

**Dev execution patterns** — scan these sources:
- PR throughput: streaks (3+ days high or low merge rate)
- Blockers: grep standup logs for "blocked", "waiting on", "slipping", "at risk"
- Sprint goal: compare current completion % to prior week's pulse
- Incident trend: flag if P0/P1 count increased vs prior week
- Deploy frequency: compare staging vs production — flag if they diverge (unreleased staging builds)

**System patterns** — scan these sources:
- Lessons.md: correction categories with 3+ occurrences all-time (repeat failure modes)
- Routing overrides trend: increasing = rules need updating
- Needs-review backlog: growing vs shrinking vs stable

### Recommendations

Generate 1-3 actionable items based on detected patterns. Rules:
- Each recommendation must cite the specific data point that triggered it
- Recommendations must be concrete actions, not observations
- If no patterns warrant action, say "No recommendations — steady state"

## Pulse File Template

```markdown
---
title: "Weekly Pulse — WNN (Mon Date - Fri Date)"
created: YYYY-MM-DD
type: review
tags: [execution-system, metrics, needs-review]
status: active
project: all
related: []
---

## Dev Execution

| Metric | This Week | Last Week | Trend |
|--------|-----------|-----------|-------|
| Sprint goal | X% | — | baseline |
| PRs merged | N | — | baseline |
| Avg cycle time | Xh | — | baseline |
| Deploy frequency | N staging / N prod | — | baseline |
| Incidents | N (P0: N, P1: N) | — | baseline |
| MTTR | Xh avg | — | baseline |
| Standup compliance | N/5 days | — | baseline |
| Decisions logged | N | — | baseline |

### Execution Patterns
- [auto-detected, cite data source]

## System Health

| Metric | This Week | Last Week | Trend |
|--------|-----------|-----------|-------|
| Corrections logged | N | — | baseline |
| By category | cat: N, cat: N | — | — |
| Files created | N | — | — |
| Routing overrides | N | — | — |
| Needs-review backlog | N | — | — |

### System Patterns
- [repeat correction categories, routing accuracy, memory staleness]

## Recommendations
- [1-3 actionable items with data citations]
```

## Incremental Updates

During the week, these commands update the pulse incrementally:

- **`/close` Step 4.5**: Increment `Files created` count, add any new corrections count, update routing override count

The Sunday `/review` or sprint boundary `/pulse` does a full recompute to ensure accuracy.

## Week Boundaries

- Week starts Monday 00:00, ends Sunday 23:59 (ISO 8601)
- Pulse file created on first write (could be Monday `/close` or Sunday `/review`)
- If pulse doesn't exist for current week at `/review` time, generate it fresh
- Previous week's pulse is set to `status: done` when new week's pulse is created
