---
name: fullstack-workflow
description: Tanjiro's full-stack feature development workflow. PRD → design → implement → test → ship pipeline with multi-agent coordination. Reverse-engineered from shinpr/claude-code-workflows.
---

# Full-Stack Feature Workflow

For features spanning frontend + backend + database, follow this structured pipeline.

## Phase 1: Requirements (Wantan + User)

1. User describes the feature
2. Wantan clarifies: scope, users, acceptance criteria
3. Output: Brief requirements doc (not a formal PRD unless complex)

## Phase 2: Design (Tanjiro + Ochaco + Senku)

### Database Design (Tanjiro)
1. Identify entities and relationships
2. Design schema using `database-design` skill
3. Generate migration using `/migrate create`

### API Design (Tanjiro + L)
1. Define endpoints: method, path, request/response
2. Generate OpenAPI spec using L's `api-spec` skill
3. Identify auth requirements using `auth-patterns` skill

### UI Design (Ochaco)
1. Choose aesthetic direction using `frontend-design` skill
2. Define component hierarchy
3. Set up design tokens if new project using `design-system` skill

### Architecture Review (Senku)
1. Review overall approach
2. Flag tech debt implications
3. Create ADR if this introduces new patterns

## Phase 3: Implement (Tanjiro)

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

## Phase 4: Review (Levi + Killua + Itachi)

1. **Levi**: Code review — architecture, bugs, security, readability
2. **Killua**: Run tests — unit, integration, E2E, browser
3. **Itachi**: Security scan — dependencies, SAST, secrets

## Phase 5: Ship (Shikamaru + L)

1. **Shikamaru**: Pre-deploy validation, deploy to staging
2. **Killua**: Post-deploy smoke tests
3. **L**: Update documentation (API docs, changelog, ADR if applicable)
4. **Shikamaru**: Deploy to production (gated)

## Constraints

- Never skip the design phase — even 10 minutes of design prevents hours of rework
- Database first, then backend, then frontend — not the reverse
- Tests are written alongside implementation, not after
- Every feature gets at least one E2E test for the happy path
- Architecture review is mandatory for features touching >3 modules
