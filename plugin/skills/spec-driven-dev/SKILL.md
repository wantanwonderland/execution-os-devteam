---
name: spec-driven-dev
description: Mandatory 5-phase development workflow that prevents AI code hallucination. SPEC → TEST → IMPLEMENT → REVIEW → VERIFY with hard gates between each phase. Use for ANY feature, bugfix, or refactor that changes more than 1 file.
---

# Spec-Driven Development (SDD)

Mandatory workflow for all non-trivial development work. Based on research showing 40% of AI-generated code contains bugs — spec-driven approaches with phase gates reduce this by 96%.

## When SDD is Required

- ANY feature that changes more than 1 file
- ANY bugfix that touches business logic
- ANY refactor that changes interfaces or data flow
- ANY database migration
- ANY auth or security change

## When SDD can be Skipped

- Single-file cosmetic changes (typo fix, comment update)
- Adding a dependency without code changes
- Configuration-only changes (.env, config files)
- Documentation-only changes

If in doubt, use SDD. The cost of skipping it (hallucinated code, accumulated bugs) is always higher than the cost of a 5-minute spec.

---

## Phase 1: SPEC

**Who**: Wantan asks the user, Wiz researches if needed, Senku reviews architecture
**Output**: A spec document with requirements, acceptance criteria, and scope boundary
**Gate**: Spec must be approved by user before proceeding

### What the Spec Must Contain

```markdown
## Feature: {name}

### What
{1-3 sentences describing what this changes}

### Why
{Why this is needed — user story, bug report, or technical requirement}

### Acceptance Criteria
- [ ] {Specific, testable criterion 1}
- [ ] {Specific, testable criterion 2}
- [ ] {Specific, testable criterion 3}

### Scope Boundary
- Files to change: {list exact files}
- Files NOT to change: {explicitly exclude}
- Dependencies: {new packages needed, if any}

### Edge Cases
- {What happens when input is empty?}
- {What happens on error?}
- {What happens with concurrent access?}
```

### Hard Gate

```
GATE 1: Has the user approved this spec?
  YES → proceed to Phase 2
  NO  → revise spec, do NOT write any code
```

**Conan MUST refuse to write code if this gate has not passed.**

---

## Phase 2: TEST

**Who**: Killua writes failing tests based on the spec
**Output**: Test files that fail for the right reasons
**Gate**: Tests must compile and fail (not error) — proving the spec is testable

### What Tests Must Cover

For each acceptance criterion in the spec:
1. Write a test that asserts the criterion
2. Run the test — it MUST fail (RED)
3. Verify it fails for the right reason (expected behavior not implemented, NOT syntax error)

```bash
# Run tests — expect failures
npm test -- --reporter=verbose
# or: pytest -v
# or: go test -v ./...
```

### Hard Gate

```
GATE 2: Do tests compile and fail for the right reasons?
  YES → proceed to Phase 3
  NO  → fix tests until they fail correctly
  ERROR (won't compile) → fix compilation errors first
```

**Killua owns this phase. Conan does NOT write tests — the implementer never writes their own tests.**

---

## Phase 3: IMPLEMENT

**Who**: Conan writes the minimum code to make tests pass
**Output**: Implementation that passes all tests from Phase 2
**Gate**: All tests pass + lint + type check

### Implementation Rules

1. Write the MINIMUM code to pass each test — no over-engineering
2. Maximum 5 files changed per task — if more needed, split into subtasks
3. No new features beyond what's in the spec — YAGNI
4. Follow existing code patterns — don't introduce new conventions
5. Run tests after each file change, not just at the end

```bash
# After each file change
npm test
npm run lint
npm run typecheck  # or tsc --noEmit
```

### Hard Gate

```
GATE 3: Do ALL tests pass AND lint passes AND types check?
  YES → proceed to Phase 4
  NO  → fix until all green, do NOT skip failing tests
```

**Pre-commit hooks enforce this automatically.** If hooks fail, the commit is rejected and Conan must fix before retrying.

---

## Phase 4: REVIEW

**Who**: Diablo reviews (NEVER the same agent that wrote the code)
**Output**: Review with verdict: APPROVE / CHANGES REQUESTED
**Gate**: Diablo must approve before proceeding

### Review Checklist

Diablo checks against the spec (not general "is this good code"):

- [ ] Does implementation match every acceptance criterion in the spec?
- [ ] Are there changes OUTSIDE the scope boundary? (reject if yes)
- [ ] Do tests actually test the right behavior? (not just "it runs")
- [ ] Are edge cases from the spec handled?
- [ ] Any hallucinated features not in the spec?
- [ ] Any security issues introduced?

### Hard Gate

```
GATE 4: Has Diablo approved?
  APPROVED → proceed to Phase 5
  CHANGES REQUESTED → Conan fixes, then back to Gate 3 (re-test + re-review)
  Never skip this gate. Self-review is not a substitute.
```

**Critical: The agent that wrote the code (Conan) NEVER reviews its own output. Diablo is always a separate dispatch.**

---

## Phase 5: VERIFY

**Who**: Wantan confirms with evidence
**Output**: Proof that the feature works as specified
**Gate**: User sees evidence and confirms

### Required Evidence

At minimum, show:
1. **Test output**: Actual terminal output of tests passing (not "tests pass")
2. **Diff summary**: Files changed and line counts
3. **Acceptance criteria check**: Each criterion from spec with PASS/FAIL

```markdown
## Verification

### Test Output
{paste actual test runner output}

### Cwizs
- `src/auth/login.ts` (+45 -12)
- `tests/auth/login.test.ts` (+38 -0)

### Acceptance Criteria
- [x] User can log in with email/password → PASS (test: login.test.ts:12)
- [x] Invalid credentials return 401 → PASS (test: login.test.ts:25)
- [x] Rate limiting after 5 attempts → PASS (test: login.test.ts:38)
```

### Hard Gate

```
GATE 5: Has user confirmed the evidence?
  YES → mark complete, commit, done
  NO  → identify what's wrong, return to appropriate phase
```

**No agent may claim "done" without showing evidence. Confidence is not evidence.**

---

## Phase Flow Summary

```
User request
  → Phase 1: SPEC (what to build) → Gate 1: user approves
  → Phase 2: TEST (prove it's testable) → Gate 2: tests fail correctly
  → Phase 3: IMPLEMENT (minimum code) → Gate 3: tests pass + lint + types
  → Phase 4: REVIEW (independent check) → Gate 4: Diablo approves
  → Phase 5: VERIFY (show evidence) → Gate 5: user confirms
  → DONE
```

**Backtrack rules:**
- Gate 4 fails → return to Phase 3 (fix + re-test)
- Gate 3 fails → stay in Phase 3 (fix until green)
- Gate 2 fails → stay in Phase 2 (fix tests)
- Gate 1 fails → stay in Phase 1 (revise spec)
- NEVER skip a phase. NEVER skip a gate.

---

## Anti-Patterns (What NOT To Do)

| Anti-Pattern | Why It Fails | What To Do Instead |
|-------------|-------------|-------------------|
| "Let me just quickly build this" | 40% bug rate without spec | Write the 5-minute spec |
| Agent writes tests AND code | Won't catch its own logical errors | Killua tests, Conan implements |
| Agent reviews its own code | Blind to own assumptions | Diablo reviews (always separate) |
| "Tests pass" without showing output | AI confidently lies about test results | Paste actual terminal output |
| 15 files changed in one task | Too much scope, errors accumulate | Max 5 files per task |
| "I'll add tests later" | Tests never get written; bugs ship | Tests BEFORE implementation |
| Skipping review for "simple" changes | Simple changes cause complex bugs | Review everything |
