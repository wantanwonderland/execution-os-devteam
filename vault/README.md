# Execution-OS for Software Development Teams

An AI-powered operating system for mid-size engineering teams (10-30 people). Built on Claude Code with specialized anime-named agents for code review, browser testing, security scanning, DevOps, documentation, and sprint tracking.

## What Is This?

Execution-OS is a markdown knowledge vault + AI execution engine that turns Claude into your dev team's command center. It orchestrates a squad of 10 specialized AI agents to review PRs, run browser tests, scan for vulnerabilities, track deployments, manage sprints, and write documentation — all through natural conversation.

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

This installs the AI squad (Levi, Killua, Itachi, etc.) with auto-updates.

### 5. Start Your AI

```bash
claude
```

Type `/start` for first-run onboarding, or `/today` for the daily briefing.

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

Your AI team, orchestrated by **Wantan**:

| Agent | Anime | Role | Specialization |
|-------|-------|------|---------------|
| **Levi** | Attack on Titan | Code Reviewer | PR review, architectural consistency, code quality |
| **Killua** | Hunter x Hunter | Browser Tester | Playwright E2E, cross-browser testing, regression detection |
| **Itachi** | Naruto | Security Guardian | CVE scanning, SAST, secrets detection, supply chain audit |
| **Shikamaru** | Naruto | DevOps/Deployer | CI/CD monitoring, deploy tracking, rollback management |
| **L** | Death Note | Tech Writer | ADRs, runbooks, postmortems, changelogs |
| **Erwin** | Attack on Titan | Sprint Tracker | Velocity, ceremonies, standup facilitation, retro data |
| **Hange** | Attack on Titan | Researcher | Tech evaluations, RFC prep, deep research |
| **Senku** | Dr. Stone | System Architect | Architecture decisions, tech debt, agent creation |
| **Sai** | Naruto | Dashboard Dev | HTML dashboards, data visualization |
| **Byakuya** | Bleach | Vault Auditor | Frontmatter audits, agent linting, health checks |

## Architecture

```
You ──> Wantan (orchestrator) ──> Squad (10 agents)
                │                       │
                ├── wantan-mem          ├── GitHub (via gh CLI)
                │   (cross-session     ├── Playwright MCP
                │    memory)           ├── SQLite DB
                │                      └── Vault (markdown files)
                └── Quality Gates
                    (validation, approval gates, circuit breakers)
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

Start the dashboard:

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

## License

Built on the Execution-OS framework.
