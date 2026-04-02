# Strategic Context

## Company Focus

Software development team operating system. AI-augmented development workflow with specialized agents for code review, testing, security, DevOps, documentation, and sprint tracking.

## Dev Team Structure

- This is an **AI team (AIT)** — 13 specialized agents, not human developers
- Agents run in parallel with no PTO, holidays, or capacity constraints
- Sprint cadence: **3-5 day sprints** (AI teams execute faster than human teams)
- Ceremonies: sprint planning, sprint review, retrospective (no daily standups needed — agents don't need syncs)
- Work is organized into parallel execution waves, not calendar weeks

## Quality Pillars

1. **Code Quality**: Diablo reviews every PR before merge
2. **Browser Testing**: Killua runs E2E tests on every deploy
3. **Security**: Itachi scans dependencies and code continuously
4. **Reliability**: Shikamaru tracks deploy health and incident response
5. **Documentation**: L ensures ADRs, runbooks, and postmortems exist
6. **Velocity**: Kazuma tracks sprint metrics and team performance

## Critical Vault Files

- `.claude/team/roster.md` -- full agent roster and delegation
- `vault/data/company.db` -- all operational data
- `vault/06-ceremonies/standup/` -- daily standup logs
- `vault/09-ops/incidents/` -- incident postmortems
- `vault/02-docs/adr/` -- architecture decisions
- `vault/02-docs/test-scenarios/` -- browser test definitions
