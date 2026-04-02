---
name: sprint-ceremonies
description: Kazuma's sprint ceremony facilitation skill. Structured workflows for standup, planning, review, and retrospective.
---

# Sprint Ceremonies

Kazuma facilitates all sprint ceremonies. Each ceremony has a defined structure.

## Ceremony 1: Daily Standup

**Trigger**: `/standup` command
**Duration target**: 5 minutes
**Output**: `vault/06-ceremonies/standup/YYYY-MM-DD-standup.md`

### Data Gathering
1. Previous standup: read latest file in `vault/06-ceremonies/standup/`
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
**Duration target**: 10 minutes
**Output**: `vault/06-ceremonies/sprint-review/YYYY-MM-DD-sprint-{id}-plan.md`

### AI Team Context
This is an AI team — no PTO, no holidays, no capacity constraints. Agents run in parallel. Sprint duration should default to **3-5 days** (not 2 weeks). Never ask about availability or reduced capacity.

### Data Gathering
1. Velocity baseline: last 3 sprints from `sprint_metrics` (if first sprint, state "no baseline — establishing from this sprint")
2. Backlog: stories provided by user or from open issues + tech debt items from `tech_debt`
3. Carryover: incomplete goals from last sprint

### Structure
1. Velocity trend (present baseline, or "first sprint — no history" if Sprint 1)
2. Backlog review (prioritized by user)
3. **Parallel wave plan** — organize stories into waves based on agent capabilities and SDD pipeline dependencies:
   - **Wave 1**: Stories that can start immediately (specs → design → build in parallel)
   - **Wave 2**: Stories that depend on Wave 1 output
   - Each wave shows which agents work on what simultaneously
4. Sprint goals (3-5, set by user)
5. Sprint duration (default: 3-5 days for AI team)
6. Write to DB: new sprint_metrics record with committed values

## Ceremony 3: Sprint Review

**Trigger**: `/sprint-review` command
**Duration target**: 15 minutes
**Output**: `vault/06-ceremonies/sprint-review/YYYY-MM-DD-sprint-{id}-review.md`

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
**Output**: `vault/06-ceremonies/retro/YYYY-MM-DD-sprint-{id}-retro.md`

### Data Gathering
1. Standup logs: all files in `vault/06-ceremonies/standup/` for the sprint period
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

- Sprint goals are set by humans, not by Kazuma — Kazuma facilitates, humans decide
- Velocity numbers MUST come from DB, never estimated
- Always show trend vs previous sprint
- Never modify historical sprint data — append only
- Action items from retros become tasks with due dates
