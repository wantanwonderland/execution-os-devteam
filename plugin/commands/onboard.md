Generate a codebase orientation guide for a repository. Hange analyzes and writes the guide.

Usage: `/onboard {repo name or path}`

## Steps

### Step 1: Locate the Repository

Find the repo:
1. Check `01-projects/` for a matching project file
2. If a local path is given: verify it exists
3. If neither: ask Wantan for the repo location before proceeding

### Step 2: Dispatch Hange — Codebase Analysis

Hange performs a full orientation analysis using the codebase-guide skill (`.claude/skills/codebase-guide/SKILL.md`).

Hange analyzes:
- Top-level directory structure and what each directory contains
- Entry points: `main.*`, `index.*`, `app.*`, `server.*`, `cli.*`
- Key configuration files: `package.json`, `pyproject.toml`, `Makefile`, `docker-compose.yml`, `.env.example`
- Build and run commands
- Test runner and how to execute tests
- Import/dependency graph for the top 5 most-imported modules

### Step 3: Load Team Context

While Hange runs, load team-produced context from the vault:

1. **Recent ADRs**: Read all files in `02-docs/adr/` — focus on those tagged to this repo or with recent `created:` dates
2. **Active tech debt**: Query `data/company.db`:
   ```sql
   SELECT title, severity, category, created_at
   FROM tech_debt
   WHERE repo = '{repo}' AND resolved_at IS NULL
   ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END;
   ```
3. **Test coverage**: Read `02-docs/test-scenarios/` for scenarios tagged to this repo. Note which flows have coverage and which don't.
4. **Recent incidents**: Query `data/company.db`:
   ```sql
   SELECT title, severity, detected_at
   FROM incidents
   WHERE repo = '{repo}'
   ORDER BY detected_at DESC LIMIT 5;
   ```

### Step 4: Write Onboarding Guide

Combine Hange's analysis and vault context into a structured guide.

Save to: `02-docs/onboarding/YYYY-MM-DD-{repo-slug}-guide.md`

```markdown
---
title: "{Repo} Onboarding Guide"
created: YYYY-MM-DD
type: note
tags: [onboarding, {repo-slug}]
status: active
project: {project}
related: []
---

## Purpose

This guide orients a new contributor to `{repo}`. Read it before making your first contribution.

## Architecture Overview

{2-4 sentence description of what this system does, who uses it, and the high-level design.}

### Directory Structure

| Directory | Purpose |
|-----------|---------|
| `{dir}/` | {what it contains} |
| ... | ... |

### Key Files

| File | Role |
|------|------|
| `{path}` | {what it does — entry point, config, core logic, etc.} |

### Data Flow

{How a typical request/operation flows through the system: entry → processing → persistence → response}

## Running Locally

### Prerequisites

- {Tool/runtime and version}
- {Environment variable setup: point to .env.example}

### Start

```bash
{exact command to start the dev server}
```

**Expected**: {what you should see — port, log line, URL}

### Environment Setup

Copy `.env.example` to `.env` and fill in:
- `{VAR_NAME}` — {what it controls}

## Running Tests

```bash
{exact command to run all tests}
{exact command to run a single test file}
```

**Coverage**: {percentage or "not tracked"} — {covered flows listed}

**Gaps**: The following flows have no test coverage:
- {flow name}

## Active Tech Debt

Be aware of these known issues before contributing:

| Severity | Title | Category |
|----------|-------|----------|
| {severity} | {title} | {category} |

{If none: "No active tech debt tracked for this repo."}

## Recent Architecture Decisions

| ADR | Decision | Status |
|-----|----------|--------|
| {ADR number + link} | {one-line summary} | {Accepted/Proposed} |

{If none: "No ADRs recorded for this repo yet."}

## Recent Incidents

| Severity | Title | Date |
|----------|-------|------|
| {P0-P3} | {title} | {date} |

{If none in last 90 days: "No incidents recorded in the last 90 days."}

## Making Your First Contribution

1. **Branch**: `git checkout -b feature/{your-feature}` or `fix/{bug-slug}`
2. **Develop**: Follow patterns in `{key-example-file}`
3. **Test**: Run `{test command}` — all tests must pass before opening a PR
4. **PR**: Open against `main`. Tag a reviewer. Fill in the PR template.
5. **Review SLA**: Expect first review within 24h. Respond to comments within 24h.

## Where to Get Help

- **Code questions**: Tag Levi in your PR for review
- **Architecture questions**: Check `02-docs/adr/` first; surface to Wantan if not answered
- **Incidents**: Follow `02-docs/runbooks/` for operational procedures
```

### Step 5: Confirm

Report:
```
Onboarding guide written: 02-docs/onboarding/YYYY-MM-DD-{repo-slug}-guide.md

Sections covered: architecture, directory map, local setup, test instructions, {N} ADRs, {N} tech debt items, {N} recent incidents.
```

## Constraints

- Never fabricate commands — only include setup/test commands found in actual config files
- If a section has no data (e.g., no ADRs), include the section with a clear "none recorded" note
- Guide must be readable by someone who has never seen the codebase before
- Always include the tech debt section — new contributors need to know what to avoid stepping on
- If `02-docs/onboarding/` does not exist, create it before writing the guide
