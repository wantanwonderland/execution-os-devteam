# Strategic Context

## Company Focus

Software development team operating system. AI-augmented development workflow with specialized agents for code review, testing, security, DevOps, documentation, and sprint tracking.

## Dev Team Structure

- Squads organized by domain (frontend, backend, platform, etc.)
- Each squad has developers, and AI agents augment their capacity
- Sprint cadence: 2-week sprints
- Ceremonies: daily standup, sprint planning, sprint review, retrospective

## Quality Pillars

1. **Code Quality**: Levi reviews every PR before merge
2. **Browser Testing**: Killua runs E2E tests on every deploy
3. **Security**: Itachi scans dependencies and code continuously
4. **Reliability**: Shikamaru tracks deploy health and incident response
5. **Documentation**: L ensures ADRs, runbooks, and postmortems exist
6. **Velocity**: Erwin tracks sprint metrics and team performance

## Critical Vault Files

- `.claude/team/roster.md` -- full agent roster and delegation
- `data/company.db` -- all operational data
- `06-ceremonies/standup/` -- daily standup logs
- `09-ops/incidents/` -- incident postmortems
- `02-docs/adr/` -- architecture decisions
- `02-docs/test-scenarios/` -- browser test definitions
