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
     NO  → route to Lelouch for Phase 1 (write spec)
     YES → continue
  3. Is the spec approved by user?
     NO  → present spec for approval
     YES → continue
  4. USER INTENT CHECK: Present spec summary to user:
     "Lelouch wrote this spec. Does it capture what you meant?"
     User confirms → continue
     User corrects → Lelouch revises, re-present
  5. Has Byakuya validated the spec? (Gate 1)
     NO  → dispatch Byakuya for Phase 1.5
     YES (VALID) → continue
     YES (NEEDS REVISION) → route back to Lelouch, then re-validate
  5.5. RESEARCH ARTIFACT GATE (if UI Classification = YES):
       - Has Wiz saved a research briefing to vault/03-research/?
         NO  → dispatch Wiz for Phase 1.75. Do NOT proceed to Phase 2.
         YES → verify file has frontmatter (title, created, type: research, tags).
               If malformed → route back to Wiz to fix.
               If valid → continue. Inject file path into Rohan's dispatch.
  6. Dispatch Phase 2 in parallel (all that apply):
     - IF task has UI → dispatch Rohan (design specs, with vault/03-research/ file path)
     - IF task touches 3+ modules → dispatch Senku (architecture review)
     - ALWAYS dispatch Killua (write failing tests from spec)
     - IF task has backend → dispatch Conan (DB + API only, frontend blocked)
     - ALWAYS dispatch L (draft docs from spec)
  7. Phase 2 complete when ALL dispatched tracks report back.
     Conan backend may proceed before Rohan, but frontend is
     BLOCKED until Rohan design spec + Killua failing tests both delivered.
  8. Dispatch Conan for Phase 3 (frontend implementation)
```

### Post-Implementation Check

```
Conan reports implementation complete

  === RUNTIME VERIFICATION (before any testing or review) ===

  0a. BUILD CHECK: Run the project's build command
      - Frontend: npm run build / vite build / next build
      - Backend: tsc --noEmit / python -m py_compile / go build
      - Capture actual stdout + stderr
      - If build FAILS → route to Conan with build errors. Do NOT proceed.

  0b. DEPENDENCY CHECK: Verify all imports resolve
      - Cross-reference import statements against package.json / requirements.txt / go.mod
      - Flag any import that references a package not in the dependency file
      - If phantom imports found → route to Conan. Do NOT proceed.

  0c. DEV SERVER BOOT: Start the dev server
      - Run: npm run dev / python manage.py runserver / go run main.go
      - Wait for "listening on" / "ready" / "started" message in stdout
      - If server fails to start within 30s → route to Conan with boot log. Do NOT proceed.

  0d. DATABASE MIGRATION (if task involves DB changes):
      - Apply migration UP: capture output, verify no errors
      - Run rollback DOWN: capture output, verify no errors
      - If migration fails → route to Conan. Do NOT proceed.

  0e. ENVIRONMENT CHECK: Scan code for env var references
      - Extract all process.env.* / os.environ / os.Getenv references
      - Verify each var exists in .env.example or config template
      - If missing vars found → flag to user: "Code references {VAR} but no template defines it"

  === All runtime checks pass → proceed to testing ===

  1. Dispatch Killua for Phase 3.5 (live browser testing)
     All scenarios pass? → continue
     Failures found?
       - If CODE BUG → route to Conan for fix, Killua re-tests (loop)
       - If SPEC GAP (test reveals missing requirement) →
         route to Lelouch for spec revision, then re-validate through
         Byakuya → Killua → Conan. Notify user: "Spec gap found
         during testing. Lelouch is revising."
       - Max 5 fix cycles before escalating to user
  2. Are ALL of Killua's tests GREEN?
     NO  → Conan fixes (stay in Phase 3.5)
     YES → continue
  3. Dispatch Diablo for Phase 4 (code review)
  4. Did Diablo approve?
     NO (CHANGES REQUESTED) →
       Notify user: "Diablo requested changes: {summary}. Routing to Conan."
       Conan fixes → Killua re-tests → Diablo re-reviews (loop)
     YES (APPROVE) → continue
  5. Dispatch Itachi for security scan
     Any CRITICAL findings? →
       Notify user: "Itachi found critical security issues: {summary}."
       Route to Conan for fix → Itachi re-scans (loop)
     All clear → continue
  6. Is evidence provided? (test output, review verdict, security scan)
     NO  → request evidence
     YES → continue
  7. SURFACE TO USER: Present full results:
     "Ready for deployment:
      - Diablo: APPROVED (cleanliness {N}/10)
      - Killua: {pass}/{total} tests passing
      - Itachi: security scan clear
      Deploy to staging? (confirm to proceed)"
  8. User confirms → dispatch Shikamaru for Phase 5
     User declines → hold, await further instruction
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
| Lelouch | title, acceptance_criteria (≥3), scope_boundary (IN+OUT), edge_cases (≥3) | — | Criteria count matches listed items |
| Byakuya | verdict (VALID/NEEDS REVISION), issues_count, issues_list | Files referenced exist in vault | issues_count matches issues_list length |
| Rohan | aesthetic_direction (not "clean"/"default"), color_palette (≥3 colors), typography (2+ fonts), responsive_breakpoints | — | — |
| Conan | files_created (list), build_output (actual stdout), test_output (actual stdout), dev_server_log (actual boot log) | All listed file paths exist, all imports resolve to installed packages | — |
| Diablo | pr_number or file:line refs, verdict, files_reviewed, cleanliness_score | PR exists: `gh pr view {number}` | Files changed count matches diff |
| Killua | scenario_name, browser_results, pass_count, fail_count, test_runner_output (actual stdout — MANDATORY), test_command | Screenshots saved to test-evidence/ | pass + fail + skip = total, counts match test_runner_output |
| Itachi | repo, scan_type, severity_counts | CVE IDs valid: check `gh api /advisories/{id}` | critical + high + medium + low = total |
| Shikamaru | repo, environment, deploy_status | SHA exists: `git cat-file -t {sha}` | — |
| Kazuma | sprint_id, velocity_committed, velocity_completed | Sprint exists in sprint_metrics table | completion_rate = completed / committed |
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
title: "Diablo: PR #142 review comment"
created: 2026-04-02
type: gate-draft
tags: [gate, diablo, pr-review]
status: pending
from: diablo
action: github-comment
risk: review-required
project: frontend-app
---

## Proposed Action
Post review comment on PR #142 in frontend-app.

## Content Preview
[The full comment Diablo wants to post]

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
