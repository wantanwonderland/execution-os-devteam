---
name: sprint-ceremonies
description: Erwin's sprint ceremony facilitation skill. Structured workflows for standup, planning, review, and retrospective.
---

# Sprint Ceremonies

Erwin facilitates all sprint ceremonies. Each ceremony has a defined structure.

## Ceremony 1: Daily Standup

**Trigger**: `/standup` command
**Duration target**: 5 minutes
**Output**: `06-ceremonies/standup/YYYY-MM-DD-standup.md`

### Data Gathering
1. Previous standup: read latest file in `06-ceremonies/standup/`
2. Open PRs: `gh pr list --state open` for all repos
3. CI status: `gh run list --limit 5` for all repos
4. Active incidents: query `incidents` WHERE resolved_at IS NULL

### Structure
1. Yesterday's commitments → completion status
2. Today's 3 priorities (ask user)
3. Blockers (ask user)
4. Open PR snapshot (auto-generated)
5. CI health snapshot (auto-generated)

## Ceremony 2: Sprint Planning

**Trigger**: `/sprint-plan` command
**Duration target**: 30 minutes
**Output**: `06-ceremonies/sprint-review/YYYY-MM-DD-sprint-{id}-plan.md`

### Data Gathering
1. Velocity baseline: last 3 sprints from `sprint_metrics`
2. Capacity: ask about PTO, holidays, reduced capacity
3. Backlog: open issues + tech debt items from `tech_debt`
4. Carryover: incomplete goals from last sprint

### Structure
1. Velocity trend (present baseline with chart data)
2. Capacity adjustment
3. Backlog review (prioritized)
4. Sprint goals (3-5, set by user)
5. Commitment (flag if >120% of baseline velocity)
6. Write to DB: new sprint_metrics record with committed values

## Ceremony 3: Sprint Review

**Trigger**: `/sprint-review` command
**Duration target**: 15 minutes
**Output**: `06-ceremonies/sprint-review/YYYY-MM-DD-sprint-{id}-review.md`

### Data Gathering
1. Sprint goals: from planning doc
2. Velocity: committed vs completed from `sprint_metrics`
3. PRs merged this sprint from `pull_requests`
4. Deploys this sprint from `deployments`
5. Incidents this sprint from `incidents`
6. Test coverage trend from `test_runs`
7. Security scan status from `security_scans`

### Structure
1. Goal review (DONE / PARTIAL / NOT DONE per goal)
2. Velocity: committed vs completed with %
3. Key metrics dashboard (PRs, deploys, incidents, coverage)
4. Highlights (ask user)
5. Carryover decisions (ask user)
6. Mission success rating

## Ceremony 4: Retrospective

**Trigger**: `/retro` command
**Duration target**: 20 minutes
**Output**: `06-ceremonies/retro/YYYY-MM-DD-sprint-{id}-retro.md`

### Data Gathering
1. Standup logs: all files in `06-ceremonies/standup/` for the sprint period
2. Incident data: patterns in root causes
3. PR review data: bottlenecks, SLA violations
4. Deploy data: failures, rollbacks
5. Previous retro actions: check completion status

### Structure
1. Data-driven patterns (top 3, auto-detected from data)
2. Stop / Start / Continue (ask team)
3. Action items (concrete, with owner and due date)
4. Previous retro action review
5. Team health check (optional)

## Constraints

- Sprint goals are set by humans, not by Erwin — Erwin facilitates, humans decide
- Velocity numbers MUST come from DB, never estimated
- Always show trend vs previous sprint
- Never modify historical sprint data — append only
- Action items from retros become tasks with due dates
