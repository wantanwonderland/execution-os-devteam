# Spec-Driven Development Pipeline

This is the **single source of truth** for SDD phases, transitions, and data dependencies.
All agent files and skills reference this document — do not duplicate pipeline definitions elsewhere.

This rule is MANDATORY. It overrides agent autonomy for code changes.

## The Rule

Any development work that changes more than 1 file MUST follow the SDD workflow. **Maximize parallelism** — this is an AI team.

## Pipeline Overview

```
Phase 1:   Lelouch writes spec (with self-validation) → USER CONFIRMS INTENT → user approves
           (Byakuya dispatched only as fallback if spec structure fails post-return validation)
Phase 2:   ALL IN PARALLEL:
           - Rohan designs (if UI)
           - Senku reviews architecture (if 3+ modules)
           - Killua writes failing tests from spec
           - Conan starts backend (DB + API) — no Rohan dependency
           - Itachi runs dependency audit + SAST (parallel, catches security issues early)
           Phase 2 COMPLETE when ALL dispatched tracks report back.
Phase 3:   Conan implements frontend (BLOCKED until Rohan + Killua deliver)
Phase 3.5: Killua live tests ↔ Conan fixes (loop, via SendMessage continuation)
           If spec gap → escalate to Lelouch for revision
           Max 5 fix cycles. Early-out if >5 failures on first pass.
Phase 4:   Diablo reviews → SURFACE VERDICT TO USER
           Max 2 CHANGES_REQUESTED rounds (fixes via SendMessage to existing Conan).
Phase 5:   USER CONFIRMS DEPLOY → Shikamaru deploys + L writes final docs
```

## Phase Details

### Phase 1: Spec Creation (Lelouch + User)

1. User describes the feature
2. Wantan routes to **Lelouch** for spec creation
3. Lelouch clarifies: scope, users, acceptance criteria, edge cases, scope boundary
4. Output: Structured spec with acceptance criteria, scope boundary, and edge cases
5. **USER INTENT CHECK**: Wantan presents spec summary and asks: "Does this capture what you meant?" This is the highest-leverage quality gate — research shows AI-validated AI specs are prone to circular validation. User confirmation anchors the pipeline to real business intent.
6. User approves the spec ("go" / "approved")

### Phase 1.5: Spec Validation (Merged Into Lelouch — Byakuya as Fallback)

Lelouch now self-validates specs against Byakuya's checklist before delivery. Wantan's post-return validation checks the spec structure. If structure issues are detected (missing acceptance criteria, untestable requirements, no scope boundary), THEN Byakuya is dispatched as fallback.

This eliminates 1 subagent dispatch per pipeline in the common case (>90% of specs pass self-validation).

### Phase 2: Design + Tests + Backend (ALL IN PARALLEL)

After spec is validated, Wantan dispatches all applicable tracks simultaneously:

| Track | Agent | Condition | Blocks |
|-------|-------|-----------|--------|
| A: UI Design | Rohan | If task has UI | Conan frontend (Phase 3) |
| B: Architecture | Senku | If task touches 3+ modules | Conan implementation |
| C: Failing Tests | Killua | Always | Conan frontend (Phase 3) |
| D: Backend (DB + API) | Conan | If task has backend | Nothing — starts immediately |
| E: Security Scan | Itachi | Always | Deploy (Phase 5) — catches issues early |

**Phase 2 completion rule**: Phase 2 is COMPLETE when ALL dispatched tracks report back. Individual tracks may complete at different times — that's expected.

**Data dependency rule**: Conan backend (Track D) starts immediately and does NOT wait for Rohan or Killua. Conan frontend (Phase 3) is BLOCKED until both Rohan design spec AND Killua failing tests are delivered.

### Phase 3: Frontend Implementation (Conan)

1. Conan implements frontend to Rohan's design spec
2. Killua's failing tests must turn GREEN
3. Conan runs tests after implementation — batch validate, show output as evidence
4. Conan does NOT self-review — proceeds to Runtime Verification

### Phase 3 → 3.5 Gate: Runtime Verification

**Before any testing or review, Wantan enforces these runtime checks. All require actual command output as proof — no claims without evidence.**

| Check | Command | Pass Condition | On Fail |
|-------|---------|---------------|---------|
| **Build** | `npm run build` / `tsc` / `go build` | Exit code 0, no errors in stderr | Route to Conan |
| **Imports** | Cross-ref imports vs package.json / requirements.txt | All imports resolve | Route to Conan |
| **Dev server** | `npm run dev` / `python manage.py runserver` | "listening" / "ready" in stdout within 30s | Route to Conan |
| **Migration** (if DB) | Migration UP then DOWN | Both succeed with exit code 0 | Route to Conan |
| **Env vars** | Scan code for `process.env.*` / `os.environ` | All vars in .env.example | Flag to user |

**All checks pass → proceed to Phase 3.5.**
**Any check fails → Conan fixes, re-run checks. Do NOT proceed to testing with broken code.**

### Phase 3.5: Live Testing (Killua ↔ Conan via SendMessage)

1. Killua runs live browser testing against the running app (dev server verified in Runtime Gate)
2. Tests across viewports: mobile (375px), tablet (768px), desktop (1280px)
3. Killua MUST include actual test runner output (stdout/stderr) in report — Wantan rejects reports without it
4. If failures found, classify:
   - **Code bug** → Wantan sends fix instructions to existing Conan agent via `SendMessage` (NOT a fresh dispatch). Conan fixes, then Wantan sends re-test request to existing Killua via `SendMessage`.
   - **Spec gap** → Escalate to Lelouch for spec revision. Notify user.
5. **Max 5 fix cycles** before escalating to user with full context
6. **Early-out**: If Killua reports >5 distinct failures on first pass, escalate to user immediately
7. All scenarios pass → proceed to Phase 4

### Phase 4: Code Review (Diablo)

**Pre-dispatch gate**: Wantan verifies ALL of Killua's tests are GREEN (with actual test runner output as proof) before dispatching Diablo. Do not dispatch Diablo with failing tests or unverified claims.

1. Diablo reviews against the approved spec (not general taste)
2. Checks: acceptance criteria coverage, scope boundary compliance, test quality, security surface
3. **Anti-hallucination checks**: phantom imports, nonexistent API calls, unproven build/test claims
4. **APPROVE** → Wantan surfaces verdict to user, proceeds to Phase 4.5
5. **CHANGES REQUESTED** → Wantan notifies user with summary, sends fix instructions to existing Conan via `SendMessage`, then Killua re-tests via `SendMessage`, then Diablo re-reviews via `SendMessage`. **Max 2 CHANGES_REQUESTED rounds** — after round 2, escalate to user.

### Phase 4.5: Security Gate Check

Itachi's scan ran in Phase 2 (parallel). At this point, Wantan checks Itachi's results:
1. **CRITICAL findings unresolved** → Wantan sends fix instructions to existing Conan via `SendMessage`, then sends re-scan request to existing Itachi via `SendMessage`
2. **All findings resolved or no critical** → proceed to Phase 5
3. If new dependencies were added during Phase 3-4, Wantan sends a re-scan request to existing Itachi via `SendMessage` (not a fresh dispatch)

### Phase 5: Ship (Shikamaru + L)

**Pre-dispatch gate**: Wantan MUST have:
- Diablo's APPROVE verdict
- Killua's tests all GREEN (with actual runner output)
- Itachi's security scan clear (no unresolved CRITICAL)
- Build verified (actual build output showing success)
- **User's explicit "deploy" confirmation**

1. **L writes all documentation** (API docs, changelog, ADR if applicable) — L is dispatched HERE, not in Phase 2. Writing docs after implementation is final produces accurate documentation without rewrite waste.
2. Shikamaru deploys to staging (Review-required gate)
3. **Killua runs smoke tests against staging** — actual HTTP requests to critical endpoints:
   - Server responds (health check)
   - Key API endpoints return 2xx
   - Database connected and queryable
4. **Smoke tests MUST pass before production deploy** — Shikamaru refuses to proceed otherwise
5. Shikamaru deploys to production (Blocked gate — requires CONFIRM)

## Agent Responsibilities

| Agent | SDD Role | Hard Constraint |
|-------|----------|----------------|
| Lelouch | Writes spec + self-validates (Phase 1) | Acceptance criteria, scope boundary, edge cases. Byakuya checklist built-in. |
| Byakuya | Fallback spec validation (only if Lelouch self-validation fails) | Gate 1 — dispatched only when post-return validation detects structure issues |
| Rohan | Design specs (Phase 2, parallel) | UI tasks only — delivers palette, typography, component hierarchy |
| Senku | Architecture review (Phase 2, parallel) | Multi-module changes only |
| Killua | Failing tests (Phase 2) + live testing (Phase 3.5) | Tests BEFORE implementation. Actual test runner output MANDATORY. |
| Conan | Backend immediately (Phase 2), frontend after Rohan (Phase 3) | REFUSES frontend without design spec. Must prove code works with actual build/test/server output. |
| Itachi | Security scan (Phase 2, parallel) + gate check (Phase 4.5) | Runs early to catch issues during implementation, re-scans if new deps added |
| Diablo | Reviews (Phase 4) | NEVER reviews code he wrote. Checks tests GREEN. Anti-hallucination: verify imports, API calls, build proof. |
| L | Final docs (Phase 5 only) | Writes once after implementation is final — no Phase 2 draft (avoids rewrite waste) |
| Shikamaru | Deploys (Phase 5) | REFUSES without Diablo APPROVE + tests GREEN + security clear + build verified + smoke tests pass + user confirm |

## User Communication Gates

Wantan MUST surface results to the user at these points — do not silently proceed:

| Phase | When | What to Surface |
|-------|------|----------------|
| 1 | After Lelouch writes spec | "Does this capture what you meant?" |
| 3.5 | Spec gap found during testing | "Spec gap found. Lelouch is revising." |
| 4 | Diablo returns verdict | Full review summary + cleanliness score |
| 4.5 | Itachi finds CRITICAL/HIGH | Security findings summary |
| 5 | Before deploy | Full evidence summary + "confirm to deploy" |

## Parallelism Rules

- **No artificial file limits** — handle as many files as the spec requires
- **Backend starts immediately** — Conan does not wait for Rohan for DB + API work
- **Tests + design + architecture + security all run in parallel** after spec validation
- **Itachi scans in Phase 2** — dependency audit and SAST run alongside backend and tests, not after review
- **L writes docs in Phase 5 only** — no Phase 2 draft (eliminates 1 dispatch, avoids rewrite waste)
- **Only true data dependencies block** — Conan frontend waits for Rohan + Killua, nothing else
- **Fix loops use SendMessage** — continue existing agents instead of fresh dispatches (100x cheaper per fix cycle)

## Worktree Merge Coordination

When parallel agents run in isolated worktrees, merges back to `main` MUST be coordinated by Wantan — never by the agents themselves.

**Rule: No agent merges while another parallel agent is still in-flight.**

Premature merges cause conflicts: if Rohan merges her worktree while Conan is still editing the same files, Conan's subsequent merge will conflict. Conflict resolution is wasted work that serial merging would have avoided entirely.

**Correct merge sequence:**

```
Phase 2/3 parallel work completes
  ALL agents report back to Wantan
       ↓
Wantan merges worktrees SEQUENTIALLY in dependency order:
  1. Conan backend (DB + API) — merged first, fewest UI conflicts
  2. Rohan (UI/CSS) — merges after backend is in main
  3. Killua (test files) — merges after implementation is in main
  4. L (docs) — merges last, least likely to conflict
  5. Senku (ADRs) — merges last
       ↓
If conflict during merge:
  - Wantan spawns a conflict-resolution sub-agent
  - Sub-agent reads both sides, applies the correct intent from each
  - Never discard either agent's work — resolve, don't overwrite
```

**File ownership guidance** (reduces conflicts at the source):

| Agent | Owns | Does NOT touch |
|-------|------|----------------|
| Conan | API routes, controllers, DB schemas, backend logic | Component JSX, CSS, design tokens |
| Rohan | Component files, CSS/styles, design tokens | API routes, business logic, DB schemas |
| Killua | `*.test.*`, `*.spec.*`, test fixtures | Implementation files |
| L | `*.md`, OpenAPI specs | Source code |

When spec scope boundary lists files, assign each file to exactly one agent. Shared files (e.g. a component that needs both logic and design) should be split: Conan builds the logic shell, Rohan layers in the design — never both editing the same file simultaneously.

## Cost Optimization Rules

### Agent Continuation (SendMessage Over Fresh Dispatch)

Fix loops in Phases 3.5 and 4 MUST use `SendMessage` to continue the existing agent instead of spawning a new dispatch. Fresh dispatches reload ~45-65K tokens of context. Continuing an existing agent costs ~500 tokens.

**Rule**: Wantan MUST track agent IDs from Phase 2/3 dispatches and reuse them:

| Scenario | Wrong (expensive) | Right (cheap) |
|----------|-------------------|---------------|
| Killua found bugs → Conan fixes | Spawn new Conan agent | `SendMessage` to Phase 3 Conan |
| Diablo requests changes → Conan fixes | Spawn new Conan agent | `SendMessage` to Phase 3 Conan |
| Itachi found CRITICAL → Conan fixes | Spawn new Conan agent | `SendMessage` to Phase 3 Conan |
| Conan fixed bugs → Killua re-tests | Spawn new Killua agent | `SendMessage` to Phase 3.5 Killua |
| Conan fixed changes → Diablo re-reviews | Spawn new Diablo agent | `SendMessage` to Phase 4 Diablo |

**When SendMessage fails** (agent expired or context lost): Fall back to fresh dispatch. Log the fallback for diagnostics.

**When to use fresh dispatch**: Only for the initial dispatch of each phase (Phase 2 parallel wave, Phase 3 Conan frontend, Phase 3.5 first Killua test, Phase 4 first Diablo review).

### Structured Context Handoffs

When passing context between agents at phase transitions, Wantan MUST compress into structured handoff format. Never forward raw agent output (5-20K tokens) — use structured summaries (200-500 tokens).

**Phase 1 → Phase 2 Handoff** (Lelouch spec → all Phase 2 agents):
```
SPEC HANDOFF:
- Task: {one-line description}
- Acceptance criteria: {numbered list, max 10}
- Scope boundary: {in-scope / out-of-scope bullets}
- UI classification: YES/NO
- Key files: {list of files to create/modify}
- Tech stack: {relevant technologies}
```

**Phase 2 → Phase 3 Handoff** (Rohan + Killua → Conan frontend):
```
DESIGN HANDOFF (from Rohan):
- Palette: {hex values}
- Typography: {font names + weights}
- Layout: {structure, max-width, breakpoints}
- Components: {list with brief description}
- Responsive: {breakpoint rules}

TEST HANDOFF (from Killua):
- Test files: {paths}
- Failing tests: {count and summary}
- Coverage targets: {what each test verifies}
```

**Phase 3.5 → Phase 4 Handoff** (Killua test results → Diablo review):
```
TEST RESULTS HANDOFF:
- Status: ALL GREEN / {N} failures
- Test count: {pass}/{total}
- Browser matrix: {Chromium/Firefox/WebKit status}
- Test file paths: {list}
- Build output: exit code {N}
```

**Phase 4 → Phase 4.5 Handoff** (Diablo verdict → Itachi scan):
```
REVIEW HANDOFF:
- Verdict: APPROVE / CHANGES REQUESTED
- Cleanliness: {N}/10
- Files changed: {list}
- Dependencies added: {list or "none"}
```

### Merged Phases (Dispatch Reduction)

**Lelouch + Byakuya merged**: Lelouch now self-validates against Byakuya's checklist before delivering the spec. Byakuya's validation criteria are embedded in Lelouch's spec creation workflow:
- Minimum 3 acceptance criteria
- Each criterion is testable (contains a measurable condition)
- Scope boundary defined (in-scope AND out-of-scope)
- Edge cases listed (minimum 2)
- UI classification field present (YES/NO)

If Wantan's post-return validation detects spec structure issues, THEN dispatch Byakuya as fallback. This eliminates 1 dispatch per pipeline in the common case.

**L docs Phase 5 only**: L is NOT dispatched in Phase 2. Drafting docs from an unimplemented spec produces outdated documentation that requires rewriting after implementation. L writes docs once in Phase 5 after Diablo approves and implementation is final. This eliminates 1 dispatch per pipeline.

**Itachi parallel in Phase 2**: Itachi runs dependency audit and SAST in Phase 2 alongside other parallel agents, not sequentially after Diablo in Phase 4.5. This catches security issues during implementation rather than after review, reducing late-stage fix cycles. Itachi still blocks deploy (Phase 5 gate unchanged).

## Dispatch Tiers

Not every task needs a full SDD pipeline. Wantan classifies incoming requests into three tiers:

### Full SDD (14-31 dispatches)
**Criteria**: New features, redesigns, multi-module changes, UI work, any task the user explicitly requests SDD for.
**Pipeline**: Full Phase 1 → 5 as defined above.

### Light SDD (3-5 dispatches)
**Criteria**: Bug fixes, config changes, 1-5 file changes, no new UI, dependency updates with code changes.
**Pipeline**:
1. Conan implements the fix (1 dispatch)
2. Killua tests (1 dispatch — SendMessage to continue if fix loop needed)
3. Diablo reviews (1 dispatch)
4. If security-relevant: Itachi scans (1 dispatch)

Wantan states: "Light SDD: {reason}" before dispatching.

### Direct Dispatch (1 dispatch)
**Criteria**: Single-file changes, typos, documentation-only, vault operations, research queries, data analysis (Yomi/Chiyo).
**Pipeline**: Single agent dispatch with no pipeline overhead.

Wantan states: "Direct dispatch: {reason}" before dispatching.

### Tier Selection Rule
When uncertain between tiers, Wantan asks the user: "This looks like a {Light SDD / Full SDD} task. Should I run the full pipeline or the light path?" Default to the higher tier if user doesn't specify.

## Fix Loop Caps

### Phase 3.5 (Killua ↔ Conan)
- **Max 5 fix cycles** (unchanged)
- **Early-out**: If Killua finds >5 distinct failures on first pass, escalate to user immediately — "Killua found {N} failures on first pass. This may indicate a deeper issue. Should Conan continue fixing, or do we need to re-scope?"

### Phase 4 (Diablo Review Rounds)
- **Max 2 CHANGES_REQUESTED rounds**. After round 2, escalate to user: "Diablo requested changes twice. Here's what remains open: {summary}. Should Conan continue, or do we need Senku for architecture review?"
- This prevents infinite Conan → Killua → Diablo ping-pong.

## Backpressure

Pre-commit hooks reject commits that fail lint, type check, or test suite. Failed hooks mean the implementation is not done — fix before retrying, never skip the hook.
