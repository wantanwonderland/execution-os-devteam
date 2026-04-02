---
name: codebase-guide
description: Hange's codebase orientation skill. Analyzes a repository's structure, entry points, data flow, and testing strategy to generate a structured developer orientation document.
---

# Codebase Guide Workflow

When Hange is dispatched to analyze a repository for developer onboarding.

## Input

Hange receives a repository path or name. The goal is to produce a complete factual analysis that the `/onboard` command uses to generate the orientation guide.

## Phase 1: Structure Discovery

### 1.1 Top-Level Scan

```bash
ls -la {repo-path}/
```

Identify and categorize every top-level directory and key file. Map each to a purpose:

| Category | Common Patterns |
|----------|----------------|
| Source code | `src/`, `lib/`, `app/`, `packages/`, `internal/` |
| Tests | `test/`, `tests/`, `__tests__/`, `spec/`, `e2e/` |
| Configuration | `config/`, `.env.example`, `*.config.*`, `docker-compose.yml` |
| Build artifacts | `dist/`, `build/`, `out/`, `.next/`, `target/` |
| Documentation | `docs/`, `README.md`, `CONTRIBUTING.md` |
| Infrastructure | `infra/`, `terraform/`, `k8s/`, `.github/` |
| Database | `migrations/`, `prisma/`, `db/`, `alembic/` |

### 1.2 Entry Point Detection

Search for primary entry points:

```bash
ls {repo-path}/src/main.* {repo-path}/src/index.* {repo-path}/index.* \
   {repo-path}/app.* {repo-path}/server.* {repo-path}/main.* 2>/dev/null
```

Read each entry point file. Note:
- What it initializes
- What it imports/depends on
- How it starts (HTTP server, CLI args, export)

### 1.3 Configuration Files

Read each config file found and extract:

**`package.json`** (Node): scripts (`start`, `build`, `test`, `dev`), main dependencies, devDependencies

**`pyproject.toml` / `setup.py`** (Python): entry points, test runner, key dependencies

**`Makefile`**: key targets (`make run`, `make test`, `make build`, `make migrate`)

**`docker-compose.yml`**: services defined, ports exposed, environment variables, volume mounts

**`.env.example`**: all required environment variables with their descriptions

## Phase 2: Module Analysis

### 2.1 Identify Key Modules

Find the most-imported modules (they are central to understanding the system):

```bash
# For TypeScript/JavaScript
grep -rh "from ['\"]" {repo-path}/src/ | sort | uniq -c | sort -rn | head -20

# For Python
grep -rh "^import\|^from" {repo-path}/src/ | sort | uniq -c | sort -rn | head -20
```

For the top 5 most-imported internal modules:
1. Read the module file
2. Note: what it exports, what problem it solves, who depends on it

### 2.2 Data Flow Trace

Trace one representative operation through the system (e.g., an HTTP request, a CLI command, a job run):

1. **Entry**: where does it arrive? (route handler, CLI command, queue consumer)
2. **Validation**: is input validated? Where?
3. **Business logic**: which module does the core work?
4. **Persistence**: how is data read/written? (ORM, raw SQL, file I/O)
5. **Response**: what is returned or emitted?

Document this as a numbered flow — do not guess. Only trace paths found in code.

## Phase 3: Dev Setup Extraction

### 3.1 Local Run Instructions

Extract exact commands from config files:

```bash
# From package.json
cat {repo-path}/package.json | grep -A2 '"scripts"'

# From Makefile
grep -E '^(run|start|dev|serve):' {repo-path}/Makefile

# From README
grep -A10 "## Getting Started\|## Setup\|## Running" {repo-path}/README.md
```

Report exact commands only — never invent commands not found in the repo.

### 3.2 Environment Variables

Read `.env.example` completely. For each variable, note:
- Variable name
- Whether it has a default or must be set
- Brief description (from inline comment if present)

If no `.env.example` exists: search for `process.env.` or `os.environ` in source files to surface undocumented variables.

## Phase 4: Testing Strategy

### 4.1 Test Runner Detection

Detect the test framework:

```bash
# Check package.json test script
cat {repo-path}/package.json | grep '"test"'

# Check for config files
ls {repo-path}/jest.config.* {repo-path}/vitest.config.* \
   {repo-path}/pytest.ini {repo-path}/pyproject.toml 2>/dev/null | head -5
```

### 4.2 Test Structure

```bash
find {repo-path} -type d -name "*test*" -o -name "*spec*" -o -name "__tests__" 2>/dev/null
```

Count: total test files, unit vs integration vs e2e breakdown (by directory convention).

### 4.3 Run Commands

Extract exact test commands from config:
- Run all tests
- Run a single test file
- Run with coverage
- Run in watch mode

### 4.4 Coverage Gaps (Surface Only — Do Not Fabricate)

If a coverage report exists:
```bash
cat {repo-path}/coverage/coverage-summary.json 2>/dev/null | head -50
```

If no report: note "Run tests with coverage flag to generate report."

## Phase 5: Contribution Guide

### 5.1 Git Conventions

```bash
git -C {repo-path} log --oneline -10
```

Detect commit message pattern (conventional commits, imperative mood, custom format).

```bash
ls {repo-path}/.github/ 2>/dev/null
cat {repo-path}/.github/pull_request_template.md 2>/dev/null
```

Detect: branch naming pattern, PR template requirements, CI checks required.

### 5.2 Code Style

Check for formatters/linters:

```bash
ls {repo-path}/.eslintrc* {repo-path}/.prettierrc* {repo-path}/pyproject.toml \
   {repo-path}/.rubocop.yml {repo-path}/.golangci.yml 2>/dev/null | head -10
```

Extract: linter commands, formatter commands, pre-commit hooks.

## Phase 6: Output Compilation

Hange returns a structured research briefing to the `/onboard` command:

```markdown
## Codebase Analysis: {repo}

### Purpose
{1-2 sentence description of what this system does}

### Directory Map
{table of directories and their purposes}

### Entry Points
{list of main entry files and what they do}

### Key Modules
{top 5 most-imported modules with one-line descriptions}

### Data Flow
{numbered flow trace for one representative operation}

### Dev Setup
**Start**: `{command}`
**Environment**: {list of required vars from .env.example}

### Testing
**Runner**: {framework}
**Run all**: `{command}`
**Coverage**: {percentage or "not measured"}

### Contribution Conventions
**Commits**: {pattern detected}
**Branches**: {pattern detected}
**Pre-commit**: {hooks detected or "none"}

### Gaps
{Things searched for but not found — missing .env.example, no test runner detected, etc.}
```

## Constraints

- NEVER fabricate commands, file paths, or variable names — only report what exists in the repo
- If a section cannot be determined from static analysis, include it in Gaps
- Do not execute the application — static analysis only (read files, run `ls`, `grep`, `git log`)
- Distinguish clearly: "found in code" vs "inferred from convention"
- If the repo is very large (>10k files), scope to the top-level `src/` or `app/` directory and note the scoping
