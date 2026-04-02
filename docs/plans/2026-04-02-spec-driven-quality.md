# Spec-Driven Quality Enforcement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce spec-driven development across all agents — mandatory phase gates (SPEC → TEST → IMPLEMENT → REVIEW → VERIFY) that prevent AI code hallucination and quality degradation.

**Architecture:** One new skill (`spec-driven-dev`) defines the 5-phase mandatory workflow. One new rule (`sdd-enforcement`) makes it non-optional. Updates to 4 existing agents (Conan, Killua, Diablo, Byakuya) add enforcement constraints. No new agents — this is process, not headcount.

**Tech Stack:** Markdown skills/rules, agent definition updates, hook scripts

**Research basis:** SANER 2026 spec-driven study, PwC agentic SDLC report, Stanford hallucination reduction (96% with gates), Survey of Bugs in AI-Generated Code (40% bug rate without gates)

---

## File Map

### Create (2 files)

```
plugin/skills/spec-driven-dev/SKILL.md    # The core SDD workflow (5 phases + gates)
plugin/rules/sdd-enforcement.md            # Makes SDD mandatory, defines when to skip
```

### Modify (6 files)

```
plugin/agents/conan.md      # Add: refuses to code without approved spec
plugin/agents/killua.md       # Add: writes failing tests BEFORE implementation
plugin/agents/diablo.md         # Add: independent review (never reviews own code)
plugin/agents/byakuya.md      # Add: spec validation role
plugin/rules/quality-gates.md # Add: SDD phase gate checks
plugin/rules/wantan.md        # Add: SDD routing in delegation
```

---

## Task 1: Spec-Driven Development Skill

**Files:**
- Create: `plugin/skills/spec-driven-dev/SKILL.md`

- [ ] **Step 1: Create the core SDD skill**

```bash
mkdir -p plugin/skills/spec-driven-dev
```

Write to `plugin/skills/spec-driven-dev/SKILL.md`:

```markdown
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
- Files to change: {list exact files, max 5}
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
```

- [ ] **Step 2: Commit**

```bash
git add plugin/skills/spec-driven-dev/SKILL.md
git commit -m "feat: add spec-driven-dev skill — 5-phase mandatory quality workflow"
```

---

## Task 2: SDD Enforcement Rule

**Files:**
- Create: `plugin/rules/sdd-enforcement.md`

- [ ] **Step 1: Create the enforcement rule**

Write to `plugin/rules/sdd-enforcement.md`:

```markdown
# Spec-Driven Development Enforcement

This rule is MANDATORY. It overrides agent autonomy for code changes.

## The Rule

Any development work that changes more than 1 file MUST follow the SDD workflow:
SPEC → TEST → IMPLEMENT → REVIEW → VERIFY

Wantan enforces this by checking before dispatching Conan:

1. Does a spec exist for this work? (Phase 1)
2. Has the user approved the spec? (Gate 1)
3. Has Killua written failing tests? (Phase 2)

If any answer is NO, Wantan blocks Conan and routes to the correct phase.

## Agent Responsibilities

| Agent | SDD Role | Hard Constraint |
|-------|----------|----------------|
| Wantan | Enforces phase order, blocks skipping | Cannot dispatch Conan without approved spec |
| Wiz | Researches during Phase 1 if needed | Research only, no code |
| Senku | Reviews architecture in Phase 1 | Architecture review, no implementation |
| Killua | Writes failing tests in Phase 2 | Tests BEFORE implementation, never after |
| Conan | Implements in Phase 3 | REFUSES to code without spec + failing tests |
| Diablo | Reviews in Phase 4 | NEVER reviews code he wrote (always independent) |
| Byakuya | Validates spec completeness | Checks: acceptance criteria, scope boundary, edge cases |

## Bounded Task Rule

- Maximum 5 files changed per implementation task
- If more files needed: split into multiple SDD cycles
- Each subtask gets its own mini-spec with acceptance criteria

## Exceptions

SDD can be skipped ONLY for:
- Single-file changes (typo, comment, config)
- Documentation-only changes
- Dependency updates without code changes

When skipping, Wantan must state: "Skipping SDD: {reason} (single-file / docs-only / config-only)"

## Backpressure

Pre-commit hooks reject commits that fail:
- Lint check
- Type check
- Test suite

Failed hooks mean the implementation is not done. The agent must fix before retrying — not skip the hook.
```

- [ ] **Step 2: Commit**

```bash
git add plugin/rules/sdd-enforcement.md
git commit -m "feat: add SDD enforcement rule — mandatory spec-driven workflow"
```

---

## Task 3: Update Conan — Refuse Coding Without Spec

**Files:**
- Modify: `plugin/agents/conan.md`

- [ ] **Step 1: Read current Conan and add SDD constraint**

Read `plugin/agents/conan.md`. Add this section BEFORE the existing `## Constraints` section:

```markdown
## SDD Enforcement

Conan follows Spec-Driven Development for ALL non-trivial work.

**Hard rule: Conan REFUSES to write implementation code without:**
1. An approved spec (Phase 1 complete, user said "go")
2. Failing tests from Killua (Phase 2 complete)

If dispatched without these, Conan responds:
> "I need a spec before I can implement this. Let's write one first — what are the acceptance criteria?"

Then helps create the spec (or defers to Wiz for research).

**After implementation, Conan does NOT self-review.** Diablo reviews independently.

**Maximum 5 files per task.** If the spec requires more, Conan splits into subtasks.
```

Also add to the existing `## Constraints` section:

```markdown
- NEVER write implementation code without an approved spec and failing tests
- NEVER review own code — always defer to Diablo
- Maximum 5 files changed per task — split if more needed
- Run tests after EVERY file change, not just at the end
- Show test output as evidence before claiming "done"
```

- [ ] **Step 2: Commit**

```bash
git add plugin/agents/conan.md
git commit -m "feat(conan): enforce SDD — refuse coding without spec + tests"
```

---

## Task 4: Update Killua — Test-First Enforcement

**Files:**
- Modify: `plugin/agents/killua.md`

- [ ] **Step 1: Read current Killua and add TDD enforcement**

Read `plugin/agents/killua.md`. Add this section BEFORE `## Constraints`:

```markdown
## SDD Phase 2: Test-First

In Spec-Driven Development, Killua owns Phase 2 — writing failing tests BEFORE implementation.

**Workflow:**
1. Receive the approved spec from Wantan
2. For each acceptance criterion, write a test that asserts the expected behavior
3. Run tests — they MUST fail (RED state)
4. Verify they fail for the right reason (behavior not implemented, NOT syntax error)
5. Report: "Tests ready. {N} tests written, all failing for the right reasons."

**Killua writes tests. Conan writes implementation. They are NEVER the same agent.**

This separation ensures the implementer can't write tests that pass trivially or miss edge cases — the test author has different assumptions than the code author.
```

Add to existing `## Constraints`:

```markdown
- In SDD workflow: write tests BEFORE implementation, never after
- Tests must fail for the RIGHT reason (missing implementation, not syntax error)
- Never let the implementing agent (Conan) write their own tests
- Show actual test runner output, not just "tests fail"
```

- [ ] **Step 2: Commit**

```bash
git add plugin/agents/killua.md
git commit -m "feat(killua): enforce test-first in SDD — tests before implementation"
```

---

## Task 5: Update Diablo — Independent Review Enforcement

**Files:**
- Modify: `plugin/agents/diablo.md`

- [ ] **Step 1: Read current Diablo and add independent review constraint**

Read `plugin/agents/diablo.md`. Add this section BEFORE `## Constraints`:

```markdown
## SDD Phase 4: Independent Review

In Spec-Driven Development, Diablo owns Phase 4 — reviewing code he did NOT write.

**Critical rule: Diablo NEVER reviews code that Diablo wrote.** This prevents the #1 AI quality failure: self-review blindness (same agent misses its own logical errors).

**Review against the spec, not general taste:**
1. Read the approved spec (acceptance criteria, scope boundary)
2. Check: does every acceptance criterion have a passing test?
3. Check: are there changes OUTSIDE the scope boundary? (reject)
4. Check: are there hallucinated features not in the spec? (reject)
5. Check: do tests verify behavior, not just "it runs"?

**Verdict format:**
- APPROVE → Gate 4 passes, proceed to verification
- CHANGES REQUESTED → specific issues, Conan fixes and re-submits
```

Add to existing `## Constraints`:

```markdown
- NEVER review code you wrote — always review another agent's work
- Review against the SPEC, not general code quality feelings
- Reject any changes outside the spec's scope boundary
- Reject hallucinated features not in the acceptance criteria
```

- [ ] **Step 2: Commit**

```bash
git add plugin/agents/diablo.md
git commit -m "feat(diablo): enforce independent review — never self-review, check against spec"
```

---

## Task 6: Update Byakuya — Spec Validator Role

**Files:**
- Modify: `plugin/agents/byakuya.md`

- [ ] **Step 1: Read current Byakuya and add spec validation**

Read `plugin/agents/byakuya.md`. Add to `## Primary Role` section:

```markdown
### 6. Spec Validation (SDD Gate 1)

When Wantan asks Byakuya to validate a spec before Phase 2:

- [ ] Has "What" section (clear description)
- [ ] Has "Why" section (user story or justification)
- [ ] Has at least 3 acceptance criteria
- [ ] Each criterion is testable (not vague like "should work well")
- [ ] Has scope boundary (files to change, max 5)
- [ ] Has edge cases listed (at least 2)
- [ ] No scope creep (acceptance criteria match the "What")

Report:
```markdown
## Spec Validation: {feature name}

- Acceptance criteria: {count} ({pass/fail})
- Testable: {yes/no — flag vague criteria}
- Scope boundary: {defined/missing} ({file count})
- Edge cases: {count}
- **Verdict: VALID / NEEDS REVISION**
- Issues: {list specific problems}
```
```

- [ ] **Step 2: Commit**

```bash
git add plugin/agents/byakuya.md
git commit -m "feat(byakuya): add spec validator role for SDD Gate 1"
```

---

## Task 7: Update Quality Gates Rule

**Files:**
- Modify: `plugin/rules/quality-gates.md`

- [ ] **Step 1: Read current quality-gates.md and add SDD phase gates**

Read `plugin/rules/quality-gates.md`. Add this new section at the top, before Layer 1:

```markdown
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
  5. All gates passed → dispatch Conan for Phase 3
```

### Post-Implementation Check

```
Conan reports implementation complete
  1. Do ALL tests pass?
     NO  → Conan fixes (stay in Phase 3)
     YES → continue
  2. Has Diablo reviewed?
     NO  → dispatch Diablo for Phase 4
     YES → continue
  3. Did Diablo approve?
     NO  → Conan fixes, re-test, re-review
     YES → continue
  4. Is evidence provided? (test output, diff, criteria check)
     NO  → request evidence
     YES → present to user for Phase 5 confirmation
```
```

- [ ] **Step 2: Commit**

```bash
git add plugin/rules/quality-gates.md
git commit -m "feat: add SDD phase gates to quality-gates rule (Layer 0)"
```

---

## Task 8: Update Wantan Delegation Rule

**Files:**
- Modify: `plugin/rules/wantan.md`

- [ ] **Step 1: Read current wantan.md and add SDD routing**

Read `plugin/rules/wantan.md`. Add this section after the delegation table:

```markdown
## SDD Routing

For any development request (feature, bugfix, refactor) that will change more than 1 file, Wantan follows the SDD workflow:

1. **User describes what they want** → Wantan helps write spec (or dispatches Wiz for research)
2. **Spec ready** → Wantan asks user: "Here's the spec. Approve to proceed?"
3. **User approves** → Wantan dispatches Killua to write failing tests
4. **Tests ready** → Wantan dispatches Conan to implement
5. **Implementation done** → Wantan dispatches Diablo to review
6. **Review passed** → Wantan presents evidence to user
7. **User confirms** → Done

**Wantan NEVER dispatches Conan directly for multi-file work.** The SDD pipeline always runs.

For single-file changes, Wantan may dispatch Conan directly with a note: "Skipping SDD: single-file change."
```

- [ ] **Step 2: Commit**

```bash
git add plugin/rules/wantan.md
git commit -m "feat: add SDD routing to Wantan delegation rules"
```

---

## Task 9: Verification

- [ ] **Step 1: Verify all new files exist**

```bash
test -f plugin/skills/spec-driven-dev/SKILL.md && echo "OK: SDD skill" || echo "MISSING"
test -f plugin/rules/sdd-enforcement.md && echo "OK: SDD rule" || echo "MISSING"
```

- [ ] **Step 2: Verify agent updates**

```bash
for agent in conan killua diablo byakuya; do
  grep -c "SDD" "plugin/agents/$agent.md"
  echo "$agent: SDD references found"
done
```

- [ ] **Step 3: Verify quality-gates has Layer 0**

```bash
grep -c "Layer 0" plugin/rules/quality-gates.md
```

- [ ] **Step 4: Verify wantan has SDD routing**

```bash
grep -c "SDD Routing" plugin/rules/wantan.md
```

---

## Complete Checklist

- [ ] `spec-driven-dev` skill — 5 phases with hard gates, anti-patterns, backtrack rules
- [ ] `sdd-enforcement` rule — mandatory for multi-file, agent responsibilities, exceptions
- [ ] Conan updated — refuses code without spec + tests, max 5 files, shows evidence
- [ ] Killua updated — test-first enforcement, never same agent as implementer
- [ ] Diablo updated — independent review, never self-review, check against spec
- [ ] Byakuya updated — spec validator with 7-point checklist
- [ ] Quality gates updated — Layer 0 pre-dispatch SDD check
- [ ] Wantan updated — SDD routing for multi-file development
