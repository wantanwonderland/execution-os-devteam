# Execution-OS for Software Development Teams

**v2.3.0** — An AI-powered operating system for software engineering. Built on Claude Code with 13 specialized anime-named agents, spec-driven development, runtime verification gates, and anti-hallucination enforcement.

## What Is This?

Execution-OS turns Claude into your dev team's command center. It orchestrates 13 specialized AI agents through a Spec-Driven Development (SDD) pipeline that enforces: spec → design → tests → implement → runtime verify → review → security scan → deploy. Every phase has hard gates. Agents cannot self-review. Code must prove it works with actual command output before it ships.

**You talk to Wantan. The squad executes.**

## Prerequisites

- **Claude Code CLI** — [Install guide](https://docs.anthropic.com/en/docs/claude-code)
- **Claude Pro or Team subscription** — Required for Claude Code
- **macOS or Linux** — Windows WSL works too
- **Node.js 18+** — For wantan-mem memory service
- **GitHub CLI (`gh`)** — For PR, CI/CD, and security integrations

## Quick Start

### 1. Install Prerequisites

```bash
bash install.sh
```

### 2. Run the Setup Wizard

```bash
bash setup-wizard.sh
```

Answer questions about your team, repos, and workflow. Populates template placeholders.

### 3. Initialize the Database

```bash
sqlite3 data/company.db < data/schema.sql
sqlite3 data/company.db < data/seed-dev.sql   # optional: sample data
```

### 4. Install the AI Plugin

In Claude Code, install the Execution-OS plugin:

```bash
claude
/plugin marketplace add wantanwonderland/execution-os-devteam
/plugin install execution-os-devteam
```

### 5. Start Your AI

```bash
claude
```

## Commands

### Core Commands

| Command | What It Does |
|---------|-------------|
| `/today` | Morning briefing — open PRs, failing CI, incidents, sprint progress |
| `/standup` | Daily standup — blockers, PRs, commitments |
| `/standup-close` | End-of-day — score commitments, capture decisions |
| `/sprint-plan` | Sprint planning — velocity baseline, goal setting |
| `/sprint-review` | Sprint review — velocity vs committed, deploy count |
| `/retro` | Retrospective — patterns, stop/start/continue |
| `/pr-queue` | PR queue — open PRs, review SLA, blockers |
| `/test` | Browser testing — trigger Killua, view results, coverage |
| `/security` | Security dashboard — CVEs, scans, dependency health |
| `/incident` | Declare incident — auto-routes to triage + documentation |
| `/deploy` | Deploy status — environments, CI health, rollbacks |
| `/oncall` | On-call rotation — view, add, swap shifts |
| `/debt` | Tech debt — inventory, add, resolve items |
| `/inbox` | Review gated agent actions awaiting approval |
| `/capture` | Quick-capture an idea or note |
| `/decide` | Log an architecture/tech decision |
| `/find` | Search the vault |
| `/pulse` | Weekly dev metrics pulse |
| `/status` | System dashboard |
| `/close` | Session close ritual |

### Integration-Enhanced Commands

| Command | Requires | What It Does |
|---------|----------|-------------|
| `/calendar` | Google Calendar MCP | View schedule, create events |
| `/prep` | Gmail + Calendar MCP | Meeting preparation |

## The Squad

13 agents orchestrated by **Wantan**:

| Agent | Anime | Role | Specialization |
|-------|-------|------|---------------|
| **Lelouch** | Code Geass | Spec Strategist | PRDs, acceptance criteria, scope boundary, edge cases |
| **Byakuya** | Bleach | Spec Validator | Gate 1 — validates spec structure before any code is written |
| **Rohan** | My Hero Academia | UI/Design Engineer | Aesthetic direction, design systems, responsive layouts |
| **Senku** | Dr. Stone | System Architect | Architecture decisions, tech debt, agent creation |
| **Conan** | Demon Slayer | Full-Stack Developer | Project scaffolding, components, APIs, database, auth |
| **Killua** | Hunter x Hunter | E2E/Browser Tester | Playwright testing, TDD, mutation testing, live browser testing |
| **Diablo** | Attack on Titan | Code Reviewer | PR review, architectural consistency, anti-hallucination checks |
| **Itachi** | Naruto | Security Guardian | CVE scanning, SAST, secrets detection, supply chain audit |
| **Shikamaru** | Naruto | DevOps/Deployer | CI/CD monitoring, deploy tracking, rollback management |
| **L** | Death Note | Tech Writer | ADRs, runbooks, postmortems, API docs, changelogs |
| **Kazuma** | Attack on Titan | Sprint Tracker | Velocity, ceremonies, standup facilitation, retro data |
| **Wiz** | Attack on Titan | Researcher | Tech evaluations, RFC prep, deep research |
| **Sai** | Naruto | Dashboard Dev | HTML dashboards, data visualization |

## SDD Pipeline

Every feature follows Spec-Driven Development. No phase is skipped.

```
Phase 1:   Lelouch writes spec → USER CONFIRMS INTENT → user approves
Phase 1.5: Byakuya validates spec (Gate 1)
Phase 2:   ALL IN PARALLEL:
           - Rohan: UI design specs
           - Senku: architecture review (3+ modules)
           - Killua: writes failing tests from spec (TDD)
           - Conan: backend (DB + API) — starts immediately
           - L: drafts docs from spec
Phase 3:   Conan implements frontend (after Rohan + Killua deliver)
           ↓
           RUNTIME VERIFICATION GATE:
           ✓ Build must succeed (actual npm run build output)
           ✓ All imports resolve to installed packages
           ✓ Dev server boots within 30s (actual boot log)
           ✓ Database migration UP + DOWN succeed (if DB changes)
           ✓ Env vars scanned against .env.example
           ↓
Phase 3.5: Killua live tests ↔ Conan fixes (loop)
           If spec gap found → escalate to Lelouch for revision
Phase 4:   Diablo reviews (requires: tests GREEN + actual output proof)
           Anti-hallucination: phantom imports, nonexistent API calls,
           unproven build/test claims all rejected
Phase 4.5: Itachi security scan
Phase 5:   USER CONFIRMS DEPLOY
           Shikamaru deploys to staging
           Killua smoke tests staging (server responds, APIs 2xx, DB connected)
           Shikamaru deploys to production (requires CONFIRM)
```

### Quality Guarantees

| What Happens | How It's Enforced |
|---|---|
| No code written without spec | Conan refuses without Lelouch spec + Killua tests |
| No self-review | Conan ≠ Diablo, Killua writes tests ≠ Conan writes code |
| Tests written before implementation | Killua Phase 2.5 hard gate |
| Code actually builds | Runtime verification gate (actual stdout required) |
| Dev server actually boots | Runtime verification gate (actual boot log required) |
| Tests actually run | Killua must include `test_runner_output` (stdout) — no claims without proof |
| No phantom imports | Diablo cross-references imports against dependency files |
| No hallucinated API calls | Diablo cross-references fetch/axios calls against defined routes |
| Security scanned before deploy | Itachi Phase 4.5 gate |
| Staging verified before production | Killua smoke tests must pass |
| Deploy gated | Shikamaru refuses without Diablo APPROVE + tests GREEN + smoke tests pass |

## Architecture

```
You ──> Wantan (orchestrator) ──> 13 Agents
            │                          │
            ├── wantan-mem             ├── GitHub (via gh CLI)
            │   (cross-session         ├── Playwright MCP
            │    memory)               ├── SQLite DB
            │                          └── Vault (markdown files)
            └── Quality Gates
                Layer 0: SDD phase gates (pre/post implementation)
                Layer 1: Output validation (schema, references, math)
                Layer 2: Human-in-the-loop gates (auto/review/blocked)
                Layer 3: Retry & circuit breaker
```

### The Vault

```
00-identity/     -> Team values, engineering principles, coding standards
01-projects/     -> Repository manifests and project docs
02-docs/         -> ADRs, runbooks, RFCs, postmortems, test scenarios
03-research/     -> Tech evaluations, library comparisons
04-decisions/    -> Architecture and tech decision log
05-goals/        -> Sprint goals, quarterly OKRs
06-ceremonies/   -> Standups, sprint reviews, retros
07-personal/     -> 1-on-1 notes, career development
08-inbox/        -> Quick captures, raw ideas
09-ops/          -> Deploys, incidents, test reports, security reports
```

### Database

SQLite at `data/company.db` with 15 tables:

`staff`, `pull_requests`, `test_runs`, `deployments`, `incidents`, `security_scans`, `sprint_metrics`, `tech_debt`, `contribution_reviews`, `oncall_rotation`, `agent_usage`, `kpi_metrics`, `contacts`, `interactions`, `projects`

### Dashboard

```bash
python3 -m http.server 8080
# Open http://localhost:8080/dashboard/
```

7 views: Overview, Sprint, Pull Requests, Deployments, Testing, Security, System Health.

## Customization

- **Add projects**: Create manifest files in `01-projects/`
- **Add team members**: Tell Wantan to update the roster
- **Add agents**: Ask Senku to "hire" a new specialist
- **Add test scenarios**: Create files in `02-docs/test-scenarios/` using the template
- **Add integrations**: See `INTEGRATIONS.md` for GitHub, Calendar, Gmail MCP setup

## Cwizlog

### v2.3.0 — Runtime Verification & Anti-Hallucination
- Added runtime verification gate between Phase 3 and 3.5: build check, import resolution, dev server boot, migration test, env var scan
- All agent quality claims now require actual command output (stdout/stderr) as proof
- Diablo: 5 new anti-hallucination checks (phantom imports, nonexistent API calls, unproven claims)
- Killua: `test_runner_output` is mandatory in all reports
- Shikamaru: staging smoke tests required before production deploy
- Killua: mutation testing added for critical business logic (80%+ score required)

### v2.2.0 — Plugin Architecture & Pipeline Hardening
- Moved system behavior to plugin rules, slimmed CLAUDE.md
- Added explicit Phase 1→5 orchestration gates
- Added user communication gates at every pipeline milestone
- Byakuya: removed stale file count limits
- Killua: spec gap escalation path in Phase 3.5
- sdd-enforcement.md: consolidated single source of truth for all SDD phases

### v2.1.1 — Remove Human Limits, Maximize Parallelism
- Removed artificial capacity limits from all agents
- Phase 2 now runs 5 parallel tracks
- Conan starts backend immediately, parallel with design and tests

## License

Built on the Execution-OS framework.
