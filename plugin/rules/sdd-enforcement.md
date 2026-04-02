# Spec-Driven Development Pipeline

This is the **single source of truth** for SDD phases, transitions, and data dependencies.
All agent files and skills reference this document — do not duplicate pipeline definitions elsewhere.

This rule is MANDATORY. It overrides agent autonomy for code changes.

## The Rule

Any development work that changes more than 1 file MUST follow the SDD workflow. **Maximize parallelism** — this is an AI team.

## Pipeline Overview

```
Phase 1:   Lelouch writes spec → USER CONFIRMS INTENT → user approves
Phase 1.5: Byakuya validates spec (Gate 1)
Phase 2:   ALL IN PARALLEL:
           - Rohan designs (if UI)
           - Senku reviews architecture (if 3+ modules)
           - Killua writes failing tests from spec
           - Conan starts backend (DB + API) — no Rohan dependency
           - L drafts docs from spec
           Phase 2 COMPLETE when ALL dispatched tracks report back.
Phase 3:   Conan implements frontend (BLOCKED until Rohan + Killua deliver)
Phase 3.5: Killua live tests ↔ Conan fixes (loop)
           If spec gap → escalate to Lelouch for revision
Phase 4:   Diablo reviews → SURFACE VERDICT TO USER
Phase 4.5: Itachi security scan → SURFACE FINDINGS TO USER
Phase 5:   USER CONFIRMS DEPLOY → Shikamaru deploys + L finalizes docs
```

## Phase Details

### Phase 1: Spec Creation (Lelouch + User)

1. User describes the feature
2. Wantan routes to **Lelouch** for spec creation
3. Lelouch clarifies: scope, users, acceptance criteria, edge cases, scope boundary
4. Output: Structured spec with acceptance criteria, scope boundary, and edge cases
5. **USER INTENT CHECK**: Wantan presents spec summary and asks: "Does this capture what you meant?" This is the highest-leverage quality gate — research shows AI-validated AI specs are prone to circular validation. User confirmation anchors the pipeline to real business intent.
6. User approves the spec ("go" / "approved")

### Phase 1.5: Spec Validation (Byakuya — Gate 1)

1. Byakuya validates spec structure: criteria count, testability, scope boundary, edge cases
2. **VALID** → proceed to Phase 2
3. **NEEDS REVISION** → route back to Lelouch, then re-validate

### Phase 2: Design + Tests + Backend (ALL IN PARALLEL)

After spec is validated, Wantan dispatches all applicable tracks simultaneously:

| Track | Agent | Condition | Blocks |
|-------|-------|-----------|--------|
| A: UI Design | Rohan | If task has UI | Conan frontend (Phase 3) |
| B: Architecture | Senku | If task touches 3+ modules | Conan implementation |
| C: Failing Tests | Killua | Always | Conan frontend (Phase 3) |
| D: Backend (DB + API) | Conan | If task has backend | Nothing — starts immediately |
| E: Draft Docs | L | Always | Nothing — starts immediately |

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

### Phase 3.5: Live Testing (Killua ↔ Conan ↔ Lelouch)

1. Killua runs live browser testing against the running app (dev server verified in Runtime Gate)
2. Tests across viewports: mobile (375px), tablet (768px), desktop (1280px)
3. Killua MUST include actual test runner output (stdout/stderr) in report — Wantan rejects reports without it
4. If failures found, classify:
   - **Code bug** (implementation doesn't match spec) → Conan fixes, Killua re-tests
   - **Spec gap** (test reveals missing requirement) → Escalate to Lelouch for spec revision. Notify user. Revised spec re-validates through Byakuya → Killua → Conan.
5. **Max 5 fix cycles** before escalating to user with full context
6. All scenarios pass → proceed to Phase 4

### Phase 4: Code Review (Diablo)

**Pre-dispatch gate**: Wantan verifies ALL of Killua's tests are GREEN (with actual test runner output as proof) before dispatching Diablo. Do not dispatch Diablo with failing tests or unverified claims.

1. Diablo reviews against the approved spec (not general taste)
2. Checks: acceptance criteria coverage, scope boundary compliance, test quality, security surface
3. **Anti-hallucination checks**: phantom imports, nonexistent API calls, unproven build/test claims
4. **APPROVE** → Wantan surfaces verdict to user, proceeds to Phase 4.5
5. **CHANGES REQUESTED** → Wantan notifies user with summary, routes to Conan for fixes, then Killua re-tests, then Diablo re-reviews

### Phase 4.5: Security Scan (Itachi)

1. Itachi scans: dependency audit, SAST, secrets check, OWASP review
2. **CRITICAL findings** → Wantan notifies user, routes to Conan for fix, Itachi re-scans
3. **No critical findings** → proceed to Phase 5

### Phase 5: Ship (Shikamaru + L)

**Pre-dispatch gate**: Wantan MUST have:
- Diablo's APPROVE verdict
- Killua's tests all GREEN (with actual runner output)
- Itachi's security scan clear (no unresolved CRITICAL)
- Build verified (actual build output showing success)
- **User's explicit "deploy" confirmation**

1. Shikamaru deploys to staging (Review-required gate)
2. **Killua runs smoke tests against staging** — actual HTTP requests to critical endpoints:
   - Server responds (health check)
   - Key API endpoints return 2xx
   - Database connected and queryable
3. **Smoke tests MUST pass before production deploy** — Shikamaru refuses to proceed otherwise
4. L finalizes documentation (API docs, changelog, ADR if applicable)
5. Shikamaru deploys to production (Blocked gate — requires CONFIRM)

## Agent Responsibilities

| Agent | SDD Role | Hard Constraint |
|-------|----------|----------------|
| Lelouch | Writes spec (Phase 1) | Acceptance criteria, scope boundary, edge cases |
| Byakuya | Validates spec (Phase 1.5) | Gate 1 — spec must be VALID before Phase 2 |
| Rohan | Design specs (Phase 2, parallel) | UI tasks only — delivers palette, typography, component hierarchy |
| Senku | Architecture review (Phase 2, parallel) | Multi-module changes only |
| Killua | Failing tests (Phase 2) + live testing (Phase 3.5) + mutation testing (critical logic) | Tests BEFORE implementation. Actual test runner output MANDATORY. |
| Conan | Backend immediately (Phase 2), frontend after Rohan (Phase 3) | REFUSES frontend without design spec. Must prove code works with actual build/test/server output. |
| L | Draft docs (Phase 2, parallel), finalize (Phase 5) | Drafts from spec, finalizes after review |
| Diablo | Reviews (Phase 4) | NEVER reviews code he wrote. Checks tests GREEN. Anti-hallucination: verify imports, API calls, build proof. |
| Itachi | Security scan (Phase 4.5) | Scans before deploy, blocks on CRITICAL |
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
- **Tests + design + architecture all run in parallel** after spec validation
- **L drafts docs during build** — does not wait for implementation to complete
- **Only true data dependencies block** — Conan frontend waits for Rohan + Killua, nothing else

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

## Exceptions

SDD can be skipped ONLY for:
- Single-file changes (typo, comment, config)
- Documentation-only changes
- Dependency updates without code changes

When skipping, Wantan must state: "Skipping SDD: {reason}"

## Backpressure

Pre-commit hooks reject commits that fail lint, type check, or test suite. Failed hooks mean the implementation is not done — fix before retrying, never skip the hook.
