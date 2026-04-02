---
name: incident-response
description: Coordinated incident response pipeline. Wantan dispatches Shikamaru (triage + rollback) and L (documentation) in parallel, with Killua for smoke tests.
---

# Incident Response Workflow

Activated when `/incident` is run or when an agent detects a production issue.

## Phase 1: Declaration (Wantan)

1. Parse severity (P0-P3), repo, description
2. Insert into `incidents` table: severity, title, repo, detected_at=now()
3. Query `oncall_rotation` for current primary on-call
4. Announce: "{severity} incident declared for {repo}. {name} is primary on-call."

## Phase 2: Parallel Dispatch (Wantan orchestrates)

### Dispatch Shikamaru — Triage

1. Query latest deploy for the affected repo
2. Check if deploy timestamp correlates with incident detection (within 30 minutes)
3. If correlated: "Recent deploy v{version} at {time} likely caused this. Rollback target: v{previous}."
4. If not correlated: "No recent deploy. Investigate application logs."
5. Check CI status for the repo
6. Return: triage assessment with rollback recommendation

### Dispatch L — Documentation

1. Create incident document at `vault/09-ops/incidents/YYYY-MM-DD-{incident-slug}.md`:

```markdown
---
title: "{severity}: {title}"
created: YYYY-MM-DD
type: incident
tags: [incident, {severity-lowercase}, {repo}]
status: active
project: {repo}
related: []
---

## Timeline

| Time | Event |
|------|-------|
| {detected_at} | Incident detected: {description} |
| {now} | On-call notified: {name} |

## Impact

- **Severity**: {P0-P3}
- **Affected service**: {repo}
- **User impact**: {estimated scope}

## Root Cause

TBD — update after investigation

## Resolution Steps

1. {Steps taken, updated as investigation progresses}

## Action Items

- [ ] {Post-incident action 1}
- [ ] {Post-incident action 2}

## Postmortem

Scheduled for: {next business day}
```

### Dispatch Killua — Smoke Tests (if applicable)

1. Run smoke tests (priority: critical) for the affected repo
2. Report which flows are broken vs still working
3. This helps scope the incident impact

## Phase 3: Summary (Wantan compiles)

Present all agent findings:

```markdown
## Incident Summary -- {severity}

**{title}** | {repo} | On-call: {name}

### Shikamaru's Assessment
{triage findings — deploy correlation, rollback recommendation}

### Killua's Test Results
{smoke test pass/fail — which flows are impacted}

### L's Documentation
Incident doc created: {file path}

### Recommended Action
{Based on findings: rollback, investigate, monitor}
→ Reply "CONFIRM rollback" to proceed, or "investigate" to continue monitoring
```

## Phase 4: Resolution

When incident is resolved:
1. Update `incidents` table: resolved_at, mttr_minutes, root_cause
2. Update incident document with resolution timeline
3. Dispatch L to create postmortem from incident document (runbook-writer skill)
4. Log wantan-mem observation: type='event', content='Incident resolved'

## Escalation

- P0: If not acknowledged in 15 minutes → escalate to secondary on-call
- P1: If not acknowledged in 30 minutes → escalate to secondary on-call
- P2/P3: No automatic escalation

## Constraints

- Rollback is ALWAYS a Blocked gate action — requires CONFIRM
- Incident document is created immediately — don't wait for resolution
- Timeline is append-only — never edit past entries
- Postmortems are blameless — focus on systems, not individuals
