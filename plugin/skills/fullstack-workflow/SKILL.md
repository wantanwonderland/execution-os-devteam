---
name: fullstack-workflow
description: Conan's full-stack feature development workflow. PRD → design → implement → test → ship pipeline with multi-agent coordination. Reverse-engineered from shinpr/claude-code-workflows.
---

# Full-Stack Feature Workflow

For features spanning frontend + backend + database, follow this structured pipeline.

## Phase 1: Spec Creation (Lelouch + User)

1. User describes the feature
2. Wantan routes to **Lelouch** for spec creation
3. Lelouch clarifies: scope, users, acceptance criteria, edge cases, scope boundary
4. Output: Structured spec with acceptance criteria, scope boundary, and edge cases
5. User approves the spec ("go" / "approved")

## Phase 2: Design + Tests (ALL IN PARALLEL)

**Maximize parallelism.** After spec is approved and validated, these agents ALL work simultaneously:

### Parallel Track A: UI Design (Rohan)
1. Choose aesthetic direction using `frontend-design` skill
2. Define color palette (hex/OKLCH values), typography pairing, spacing scale
3. Define component hierarchy — what gets built, in what order
4. Responsive layout descriptions per breakpoint
5. **Output: Design spec** — Conan implements to this spec, not his own taste

### Parallel Track B: Database + API Design (Conan)
1. Identify entities and relationships, design schema using `database-design` skill
2. Generate migration using `/migrate create`
3. Define API endpoints: method, path, request/response
4. Generate OpenAPI spec using L's `api-spec` skill
5. Identify auth requirements using `auth-patterns` skill

**Conan can start backend work (DB + API) immediately — no need to wait for Rohan.** Frontend work waits for Rohan's design spec.

### Parallel Track C: Architecture Review (Senku)
1. Review overall approach
2. Flag tech debt implications
3. Create ADR if this introduces new patterns

### Parallel Track D: Tests (Killua)
1. Write failing tests from the approved spec — Killua doesn't need to wait for Rohan or Senku
2. Add UI-specific tests after Rohan delivers design spec
3. Tests must fail (RED state) before Conan implements frontend

### Parallel Track E: Draft Docs (L)
1. Write draft API docs, user guides from the spec while others work
2. Finalize after implementation and review

**All 5 tracks start as soon as the spec is approved.** No sequential bottlenecks.

## Phase 3: Implement (Conan)

**Backend work starts immediately** — Conan begins DB + API implementation as soon as the spec is approved, in parallel with Rohan and Killua.

**Frontend work starts after Rohan delivers** — Conan needs Rohan's design spec for UI implementation only. Backend is not blocked.

### Order of Implementation
1. **Database**: Migration → seed data
2. **Backend**: Routes → controllers → validation → error handling
3. **Frontend**: Components → pages → state → API integration
4. **Tests**: Unit (as you build) → integration → E2E

### Per-Layer Checklist

**Database:**
- [ ] Migration created with UP and DOWN
- [ ] Indexes on FKs and query columns
- [ ] Seed data for development
- [ ] Types/models generated from schema

**Backend:**
- [ ] Input validation (Zod/Pydantic)
- [ ] Error handling (proper HTTP status codes)
- [ ] Auth middleware applied
- [ ] Rate limiting on public endpoints
- [ ] Integration tests for each endpoint

**Frontend:**
- [ ] Components use design tokens
- [ ] Responsive (mobile → desktop)
- [ ] Loading, empty, error states
- [ ] Accessible (keyboard, screen reader)
- [ ] Optimistic updates where appropriate
- [ ] Component tests

## Phase 3.5: Live Testing (Killua ↔ Conan ↔ Lelouch)

After Conan implements, Killua runs live browser testing before Diablo reviews.

1. Generate roleplay scenarios from the spec using `roleplay-scenario` skill
2. Execute each scenario in a real browser using `live-browser-test` skill
3. Test across viewports: mobile (375px), tablet (768px), desktop (1280px)
4. Verify design compliance against Rohan's specs (colors, typography, responsive)
5. If failures found, classify:
   - **Code bug** (implementation doesn't match spec) → Conan fixes, Killua re-tests
   - **Spec gap** (test reveals a missing requirement or edge case not in spec) → Escalate to Lelouch for spec revision. Notify user: "Spec gap found during testing." Revised spec flows back through Byakuya → Killua → Conan.
6. Max 5 test-fix cycles before escalating to user with full context
7. Repeat until all scenarios pass.

## Phase 4: Review (Diablo + Killua + Itachi)

1. **Diablo**: Code review — architecture, bugs, security, readability
2. **Killua**: Run automated tests — unit, integration, E2E
3. **Itachi**: Security scan — dependencies, SAST, secrets

## Phase 5: Ship (Shikamaru + L)

1. **Shikamaru**: Pre-deploy validation, deploy to staging
2. **Killua**: Post-deploy smoke tests
3. **L**: Update documentation (API docs, changelog, ADR if applicable)
4. **Shikamaru**: Deploy to production (gated)

## Constraints

- Never skip the design phase — even 10 minutes of design prevents hours of rework
- Conan NEVER writes frontend code without Rohan's design spec — no exceptions
- Database first, then backend, then frontend — not the reverse
- Tests are written alongside implementation, not after
- Every feature gets at least one E2E test for the happy path
- Architecture review is mandatory for features touching >3 modules
