# Use Case: Add Execution-OS to an Existing Project

You already have a codebase. You want to add AI-powered code review, testing, security scanning, and sprint tracking without starting over.

---

## Setup: Plugin Install (5 minutes)

Install just the AI agents — no vault directories needed.

```bash
# Open your existing project
cd /path/to/your-existing-project

# Start Claude Code
claude

# Install the plugin
/plugin marketplace add wantanwonderland/execution-os-devteam
/plugin install execution-os-devteam
```

**What you can do immediately:**

```
# Have Levi review a PR
Tell Levi to review PR #42

# Run security scan
/security

# Check deployment status
/deploy

# Debug an error
/debug "TypeError: Cannot read properties of undefined (reading 'map')"

# Start a standup
/standup

# Scaffold a new feature
Tell Tanjiro to add a user settings page with email change, password change, and notification preferences
```

Commands that write to vault directories (`/standup`, `/incident`, `/decide`) will create the directories on first use.

---

## Optional: Add Vault Structure (15 minutes)

For full sprint tracking, incident management, and the dashboard.

### Step 1: Copy vault structure

```bash
cd /path/to/your-existing-project

# Download vault structure (won't overwrite your files)
git clone --depth 1 https://github.com/wantanwonderland/execution-os-devteam.git /tmp/eos-template

# Copy vault dirs (skip existing files with -n)
cp -rn /tmp/eos-template/vault/00-identity .
cp -rn /tmp/eos-template/vault/01-projects .
cp -rn /tmp/eos-template/vault/02-docs .
cp -rn /tmp/eos-template/vault/03-research .
cp -rn /tmp/eos-template/vault/04-decisions .
cp -rn /tmp/eos-template/vault/05-goals .
cp -rn /tmp/eos-template/vault/06-ceremonies .
cp -rn /tmp/eos-template/vault/07-personal .
cp -rn /tmp/eos-template/vault/08-inbox .
cp -rn /tmp/eos-template/vault/09-ops .

# Copy data + dashboard
cp -rn /tmp/eos-template/vault/data .
cp -rn /tmp/eos-template/vault/dashboard .

# Copy config (only if you don't already have these)
cp -n /tmp/eos-template/vault/CLAUDE.md . 2>/dev/null
cp -n /tmp/eos-template/vault/INTEGRATIONS.md . 2>/dev/null
cp -rn /tmp/eos-template/vault/.claude . 2>/dev/null

# Clean up
rm -rf /tmp/eos-template
```

### Step 2: Initialize the database

```bash
sqlite3 data/company.db < data/schema.sql
```

### Step 3: Personalize

```bash
# Edit CLAUDE.md — replace {{COMPANY_NAME}} and {{OWNER_NAME}} with your values
```

### Step 4: Install the plugin

```bash
claude
/plugin marketplace add wantanwonderland/execution-os-devteam
/plugin install execution-os-devteam
```

### Step 5: Register your project

```
/capture This is the frontend-app project at https://github.com/our-org/frontend-app, built with React + TypeScript, deployed to Vercel
```

Or create a project manifest manually:

```bash
cat > 01-projects/frontend-app.md << 'EOF'
---
title: "Frontend App"
created: 2026-04-02
type: project
tags: [frontend, react, typescript]
status: active
project: frontend-app
related: []
---

## Repository
- URL: https://github.com/our-org/frontend-app
- Default branch: main
- Squad: frontend
- Environments: [staging, production]
- CI: GitHub Actions
- Test suites: [unit, integration, browser]
EOF
```

---

## Example: Adding to a Django Project

You have an existing Django REST Framework API.

```bash
cd /path/to/my-django-api

# Install plugin only
claude
/plugin marketplace add wantanwonderland/execution-os-devteam
/plugin install execution-os-devteam
```

Now use the agents:

```
# Security scan your Django dependencies
/security

# Review an open PR
Tell Levi to review PR #87

# Generate API docs from your views
/api gen myapp/views.py

# Debug a 500 error
/debug "IntegrityError: UNIQUE constraint failed: users_user.email"

# Add database migration for a new feature
/migrate create add-user-preferences-table

# Generate unit tests for a view
/test unit myapp/views/user_views.py

# Onboard a new developer
/onboard my-django-api

# Track tech debt
/debt add my-django-api "Upgrade Django from 4.2 to 5.1" high dependency

# Check code ownership
/ownership myapp/
```

---

## Example: Adding to a React Native App

You have an existing Expo React Native app.

```bash
cd /path/to/my-rn-app
claude
/plugin marketplace add wantanwonderland/execution-os-devteam
/plugin install execution-os-devteam
```

Now use the agents:

```
# Run browser tests on the web version
/test browser

# Visual regression test across viewports
/test visual http://localhost:8081

# Accessibility audit
/test a11y http://localhost:8081

# Have Ochaco review your UI
/design review src/screens/HomeScreen.tsx

# Generate design tokens from your existing theme
/design system

# Performance audit
Tell Killua to analyze the app for performance issues — check bundle size, re-renders, and list performance

# Security scan dependencies
/security

# Generate a codebase guide for new team members
/onboard my-rn-app
```

---

## Example: Adding to a Go Microservice

You have an existing Go API service.

```bash
cd /path/to/my-go-service
claude
/plugin marketplace add wantanwonderland/execution-os-devteam
/plugin install execution-os-devteam
```

Now use the agents:

```
# Security scan
/security

# Code review
Tell Levi to review PR #23

# Generate API spec from handlers
/api gen internal/handlers/

# Debug a concurrency issue
/debug "fatal error: concurrent map writes in handleRequest"

# Generate unit tests
/test unit internal/services/user_service.go

# Architecture review
Tell Senku to review the service architecture and identify tech debt

# Sprint tracking
/standup
/sprint-plan
```

---

## What Works Without the Vault

These commands work with **plugin only** (no vault directories needed):

| Command | Works? | Notes |
|---------|--------|-------|
| `/security` | Yes | Scans your repo's dependencies and code |
| `/debug` | Yes | Analyzes errors using git history + wantan-mem |
| `/test unit` | Yes | Generates tests for your code |
| `/test browser` | Yes | Runs Playwright against your app |
| `/pr-queue` | Yes | Queries GitHub for open PRs |
| `/api gen` | Yes | Generates OpenAPI from your routes |
| `/design` | Yes | UI guidance for your components |
| `/refactor` | Yes | Guided refactoring of your code |
| `/ownership` | Yes | CODEOWNERS from your git history |
| `/onboard` | Yes | Codebase orientation from your repo |
| `/new` | Yes | Scaffolds new project |

These commands need **vault directories** to persist data:

| Command | Needs | Why |
|---------|-------|-----|
| `/standup` | `06-ceremonies/standup/` | Writes daily standup logs |
| `/sprint-plan` | `06-ceremonies/sprint-review/` | Writes sprint plans |
| `/incident` | `09-ops/incidents/` + `data/company.db` | Writes incident records |
| `/decide` | `04-decisions/log/` | Writes decision records |
| `/capture` | `08-inbox/captures/` | Writes quick captures |
| `/today` | Multiple vault dirs | Reads from vault for briefing |
| `/deploy` | `data/company.db` | Reads deployment history |
| `/pulse` | `06-ceremonies/` | Computes weekly metrics |
| Dashboard | `data/company.db` + `dashboard/` | Reads from DB |

**Tip**: Commands that need vault dirs will create them automatically on first use. You just won't have the database or dashboard without Option B setup.

---

## Merging with Existing CLAUDE.md

If your project already has a `CLAUDE.md`, add these key sections from the Execution-OS version:

```markdown
## Wantan: Virtual Integrator

You are **Wantan**, the orchestrator. Delegate to specialists:

| Query Type | Route To |
|------------|----------|
| PR review, code quality | Levi |
| Testing (unit, E2E, browser, perf) | Killua |
| Security scanning | Itachi |
| CI/CD, deploys, rollbacks | Shikamaru |
| Documentation, ADRs, runbooks | L |
| Sprint progress, velocity | Erwin |
| Research, tech evaluation | Hange |
| Architecture, tech debt | Senku |
| UI design, aesthetics | Ochaco |
| Project scaffolding, full-stack dev | Tanjiro |
| Dashboard, visualization | Sai |
| Vault audits, health checks | Byakuya |
```

This is the minimum needed for Wantan to route requests to the right agent.
