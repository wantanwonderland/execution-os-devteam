# Quality Gates

Three-layer quality system enforced by Wantan at every agent dispatch.

## Layer 0: SDD Phase Gates (Pre-Dispatch)

Before any development work begins, Wantan checks SDD compliance:

### Pre-Implementation Check

```
Wantan receives development request
  1. Is this multi-file? (>1 file change expected)
     NO  → skip SDD, proceed normally
     YES → SDD required
  2. Does a spec exist?
     NO  → route to Phase 1 (write spec)
     YES → continue
  3. Is the spec approved by user?
     NO  → present spec for approval
     YES → continue
  4. Has Killua written failing tests?
     NO  → dispatch Killua for Phase 2
     YES → continue
  5. All gates passed → dispatch Tanjiro for Phase 3
```

### Post-Implementation Check

```
Tanjiro reports implementation complete
  1. Do ALL tests pass?
     NO  → Tanjiro fixes (stay in Phase 3)
     YES → continue
  2. Has Levi reviewed?
     NO  → dispatch Levi for Phase 4
     YES → continue
  3. Did Levi approve?
     NO  → Tanjiro fixes, re-test, re-review
     YES → continue
  4. Is evidence provided? (test output, diff, criteria check)
     NO  → request evidence
     YES → present to user for Phase 5 confirmation
```

## Layer 1: Output Validation

After every agent returns a result, Wantan validates before persisting:

### Validation Pipeline

```
Agent returns result
  1. Schema check    — required fields present?
  2. Reference check — external references real? (PR exists, file path valid, CVE ID valid)
  3. Math check      — numbers add up? (pass + fail = total, percentages valid)
  4. PASS → persist to DB + wantan-mem
  5. FAIL → flag for human review, do NOT persist bad data
```

### Per-Agent Validation Rules

| Agent | Schema Fields | Reference Checks | Math Checks |
|-------|--------------|------------------|-------------|
| Levi | pr_number, verdict, files_reviewed | PR exists: `gh pr view {number}` | Files changed count matches diff |
| Killua | scenario_name, browser_results, pass_count, fail_count | Screenshots saved to test-evidence/ | pass + fail + skip = total |
| Itachi | repo, scan_type, severity_counts | CVE IDs valid: check `gh api /advisories/{id}` | critical + high + medium + low = total |
| Shikamaru | repo, environment, deploy_status | SHA exists: `git cat-file -t {sha}` | — |
| Erwin | sprint_id, velocity_committed, velocity_completed | Sprint exists in sprint_metrics table | completion_rate = completed / committed |
| L | document_type, file_path, cross_references | Output file path is valid directory | — |

### On Validation Failure

1. Log the failure as a wantan-mem observation: `type: 'error', agent: '{agent}', content: 'Validation failed: {reason}'`
2. Do NOT write bad data to the database
3. Present the failure to the user: "{Agent} returned invalid data: {reason}. The result was not persisted."
4. If the same agent fails validation 3+ times in a session, flag: "Consider re-dispatching with more context or a more capable model."

## Layer 2: Human-in-the-Loop Gates

Actions with external side effects require human approval before execution.

### Gate Classification

| Classification | When | Workflow |
|---------------|------|----------|
| **Auto** | Action is internal + reversible (vault writes, DB inserts, test execution) | Execute immediately, log to wantan-mem |
| **Review-required** | Action has external side effects (GitHub comments, deploys, issue creation) | Write draft to `.claude/owner-inbox/`, present for approval |
| **Blocked** | Action is destructive + high-risk (production rollback, data deletion) | Write draft + require explicit confirmation phrase |

### Gate Enforcement

Before executing any gated action, Wantan MUST:

1. Check the agent's gate policy (see `.claude/rules/gate-policy.md`)
2. If **auto**: execute and log
3. If **review-required**: write draft to `.claude/owner-inbox/`, present summary, wait for GO/NO
4. If **blocked**: write draft, present with warning, require "CONFIRM {action}" response

### Owner-Inbox Draft Format

Gated actions are written to `.claude/owner-inbox/` as markdown files:

```yaml
---
title: "Levi: PR #142 review comment"
created: 2026-04-02
type: gate-draft
tags: [gate, levi, pr-review]
status: pending
from: levi
action: github-comment
risk: review-required
project: frontend-app
---

## Proposed Action
Post review comment on PR #142 in frontend-app.

## Content Preview
[The full comment Levi wants to post]

## Validation
- PR #142 exists: YES
- Files referenced in comment exist in diff: YES
- Severity ratings consistent: YES

## Decision
- [ ] APPROVE — post the comment
- [ ] REJECT — discard
- [ ] EDIT — modify before posting
```

### Processing Approved Actions

When the user approves (via `/inbox` command or inline "go"):
1. Execute the action (post comment, create issue, trigger deploy)
2. Update the draft file: `status: approved`, add `approved_at` date
3. Log to wantan-mem: `type: 'decision', content: 'Approved: {action description}'`
4. Move to `.claude/owner-inbox/archive/` after 7 days

## Layer 3: Retry & Circuit Breaker

### Retry Policy

When an agent dispatch fails (error, timeout, or validation failure):

```
Attempt 1: immediate retry
Attempt 2: retry after 2 seconds
Attempt 3: retry after 5 seconds
After 3 failures: stop retrying, escalate to user with full error context
```

Retry is ONLY for transient errors (network timeout, rate limit, DB lock). Do NOT retry:
- Validation failures (bad output = bad prompt, not transient)
- Permission errors (missing auth)
- Logic errors (wrong agent for the task)

### Circuit Breaker

Track agent failure rates in wantan-mem observations. State machine:

```
CLOSED (normal operation)
  → error rate >50% over last 5 dispatches → OPEN

OPEN (blocking dispatches)
  → wait 60 seconds → HALF-OPEN

HALF-OPEN (testing)
  → 1 success → CLOSED
  → 1 failure → OPEN
```

When circuit is OPEN for an agent:
1. Do NOT dispatch that agent
2. Report to user: "{Agent} circuit breaker is OPEN after {n} consecutive failures. Last error: {message}. Try again in 60s or re-dispatch with more context."
3. Log to wantan-mem: `type: 'event', content: 'Circuit breaker OPEN for {agent}'`

### Tracking

Circuit breaker state is derived from wantan-mem observations, not stored separately:
- Query last 5 observations for the agent where `type = 'error'`
- If 3+ of last 5 are errors → circuit OPEN
- If most recent observation is success → circuit CLOSED
