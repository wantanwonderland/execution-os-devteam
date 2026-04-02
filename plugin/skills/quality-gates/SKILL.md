---
name: quality-gates
description: Wantan's quality gate enforcement. Validates agent output, enforces approval gates, manages retry/circuit breaker. Referenced automatically at every agent dispatch.
---

# Quality Gate Enforcement

Wantan uses this skill at every agent dispatch. It is NOT optional.

## Pre-Dispatch Checklist

Before dispatching any agent:

1. **Circuit breaker check**: Query wantan-mem for last 5 observations where `agent = '{agent}' AND type = 'error'`. If 3+ of last 5 are errors, the circuit is OPEN. Report: "{Agent} circuit is OPEN. Last error: {error}. Waiting 60s before retry."

2. **Context injection**: Query wantan-mem for relevant observations to include in agent prompt. Keep under 5 observations to limit token usage.

3. **Gate awareness**: Include the agent's gate policy in the dispatch prompt so the agent knows which actions need drafts vs can execute directly.

## Post-Return Validation

After an agent returns results:

### Step 1: Schema Validation

Check that the output contains expected fields based on the agent:

- **Diablo**: Must include `pr_number` or `file:line` references
- **Killua**: Must include pass/fail counts and scenario name
- **Itachi**: Must include severity counts (critical/high/medium/low)
- **Shikamaru**: Must include environment and status
- **Kazuma**: Must include sprint_id and velocity numbers
- **L**: Must include document type and file path

If schema validation fails: log error to wantan-mem, report to user, do NOT persist.

### Step 2: Reference Validation

Verify external references are real:

```bash
# Diablo: verify PR exists
gh pr view {number} --json number --jq '.number' 2>/dev/null

# Itachi: verify CVE exists (basic check)
# CVE format: CVE-YYYY-NNNNN
echo "{cve_id}" | grep -qE '^CVE-[0-9]{4}-[0-9]{4,}$'

# Shikamaru: verify commit SHA
git cat-file -t {sha} 2>/dev/null

# Killua: verify screenshots saved
test -f ".claude/test-evidence/{date}/{filename}"
```

If reference validation fails: log warning, present to user with context, ask whether to persist anyway.

### Step 3: Math Validation

Check that numbers are internally consistent:

```
Killua: pass + fail + skip == total
Itachi: critical + high + medium + low == total
Kazuma: completion_rate == completed / committed (within 1% tolerance)
```

If math fails: this is likely a hallucination. Do NOT persist. Re-dispatch the agent.

## Gate Enforcement

After validation passes, check if the proposed action needs a gate:

1. Read `.claude/rules/gate-policy.md`
2. Match the agent + action to the gate matrix
3. If **Auto**: execute, persist, log to wantan-mem
4. If **Review-required**: write draft to `.claude/owner-inbox/`, present summary
5. If **Blocked**: write draft, warn user, require "CONFIRM {action}"

### Writing Gate Drafts

When an action is gated, write a file to `.claude/owner-inbox/`:

Filename: `YYYY-MM-DD-{agent}-{action-slug}.md`

```yaml
---
title: "{Agent}: {action description}"
created: YYYY-MM-DD
type: gate-draft
tags: [gate, {agent}, {action-type}]
status: pending
from: {agent}
action: {action-type}
risk: review-required | blocked
project: {project}
---

## Proposed Action
{What the agent wants to do}

## Content Preview
{The actual content — comment text, issue body, deploy command}

## Validation Results
- Schema: PASS/FAIL
- References: PASS/FAIL  
- Math: PASS/FAIL/N/A

## Decision
Waiting for approval. Reply "go" to approve, "no" to reject.
```

## Retry Logic

When a dispatch fails:

1. **Attempt 1**: Immediate retry (same prompt)
2. **Attempt 2**: Wait 2s, retry with additional context: "Previous attempt failed: {error}"
3. **Attempt 3**: Wait 5s, retry with simplified prompt (fewer files, less context)
4. **After 3 failures**: Stop. Log circuit breaker event. Report to user with full error chain.

Do NOT retry:
- Validation failures (fix the prompt, not the retry count)
- Auth errors (user needs to re-authenticate)
- Gate rejections (user said no)

## Logging

Every quality gate decision is logged to wantan-mem:

| Event | Type | Content |
|-------|------|---------|
| Validation pass | insight | "Validated {agent} output: schema OK, refs OK, math OK" |
| Validation fail | error | "Validation failed for {agent}: {reason}" |
| Gate auto-approved | insight | "Auto-approved: {agent} {action}" |
| Gate pending | event | "Gate pending: {agent} {action} awaiting approval" |
| Gate approved | decision | "Approved: {agent} {action}" |
| Gate rejected | decision | "Rejected: {agent} {action}" |
| Retry attempt | error | "Retry {n}/3 for {agent}: {error}" |
| Circuit open | event | "Circuit OPEN for {agent} after {n} failures" |
| Circuit closed | event | "Circuit CLOSED for {agent}" |
