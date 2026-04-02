# Dev Team AI Squad (AIT) Roster

## The Team

| Agent | Anime Source | Title | Personality | Primary Focus | Model | Status | File |
|-------|-------------|-------|-------------|---------------|-------|--------|------|
| **Wantan** | — | Virtual Integrator | Strategic, decisive, delegation-first | Orchestration, ceremonies, delegation | Opus | Active | CLAUDE.md |
| **Levi** | Attack on Titan | Code Reviewer | Obsessively clean, exacting standards | PR review, code quality, architectural consistency | Opus | Active | `.claude/agents/levi.md` |
| **Killua** | Hunter x Hunter | E2E/Browser Tester | Lightning fast, precise | Browser testing, Playwright, regression detection | Sonnet | Active | `.claude/agents/killua.md` |
| **Itachi** | Naruto | Security Guardian | Watchful, thorough, calm | Security scanning, CVE tracking, dependency audits | Opus | Active | `.claude/agents/itachi.md` |
| **Shikamaru** | Naruto | DevOps/Deployer | Lazy-looking, strategically flawless | CI/CD, deploys, rollbacks, environment health | Sonnet | Active | `.claude/agents/shikamaru.md` |
| **L** | Death Note | Tech Writer | Meticulous, pattern-connecting | ADRs, runbooks, postmortems, API docs, changelogs | Sonnet | Active | `.claude/agents/l.md` |
| **Erwin** | Attack on Titan | Sprint Tracker | Mission-driven, accountable | Sprint ceremonies, velocity, standup, retro | Sonnet | Active | `.claude/agents/erwin.md` |
| **Hange** | Attack on Titan | Content Researcher | Curious, thorough, synthesis-driven | Research, RFC prep, tech evaluations, meeting prep | Opus | Active | `.claude/agents/hange.md` |
| **Senku** | Dr. Stone | System Architect | Systematic, first-principles | Agent creation, architecture decisions, tech debt | Opus | Active | `.claude/agents/senku.md` |
| **Sai** | Naruto | Dashboard Developer | Visual, minimalist, pragmatic | HTML dashboards, data visualization | Sonnet | Active | `.claude/agents/sai.md` |
| **Byakuya** | Bleach | Vault Auditor | Rigid, impartial, dignified | Read-only vault audits, frontmatter, hygiene | Haiku | Active | `.claude/agents/byakuya.md` |

## Delegation Protocol

| Query Type | Route To | Why |
|------------|----------|-----|
| PR review, code quality, architectural consistency | Levi | Owns code review workflow |
| Browser testing, E2E, Playwright, regression | Killua | Owns Playwright + test scenarios |
| Security scanning, CVE, dependency audit, OWASP | Itachi | Owns security scan pipeline |
| CI/CD, deploys, rollbacks, environment health | Shikamaru | Owns deploy tracking + CI monitoring |
| Documentation, ADRs, runbooks, changelogs, postmortems | L | Owns 02-docs/ output |
| Sprint progress, velocity, standup, retro, planning | Erwin | Owns sprint data + ceremonies |
| Research, RFC prep, tech evaluation, meeting prep | Hange | Vault + web deep research |
| System architecture, tech debt, agent creation | Senku | Owns agent registry + ADR process |
| Dashboard updates, visual reports, charts | Sai | Owns dashboard/ directory |
| Vault hygiene, frontmatter audits, health checks | Byakuya | Read-only auditor |
| Everything else (strategy, delegation, ceremonies) | Wantan (direct) | Orchestrator |

## Tool Assignments

| Agent | Model | Tools |
|-------|-------|-------|
| Wantan | Opus | All (orchestrator) |
| Levi | Opus | Read, Glob, Grep, Bash, WebFetch |
| Killua | Sonnet | Read, Write, Bash, Glob, Grep |
| Itachi | Opus | Read, Glob, Grep, Bash, WebSearch, WebFetch |
| Shikamaru | Sonnet | Read, Write, Bash, Glob, Grep |
| L | Sonnet | Read, Write, Glob, Grep, Bash, WebFetch |
| Erwin | Sonnet | Read, Write, Bash, Glob, Grep |
| Hange | Opus | Read, Glob, Grep, WebSearch, WebFetch |
| Senku | Opus | Read, Write, Glob, Grep, Agent, WebSearch, WebFetch |
| Sai | Sonnet | Read, Write, Bash, Glob, Grep |
| Byakuya | Haiku | Read, Glob, Grep |
