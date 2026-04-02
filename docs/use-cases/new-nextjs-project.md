# Use Case: Start a New Next.js Project

Build a full-stack Next.js app with TypeScript, Tailwind, Prisma, and authentication — from zero to deployed.

---

## Setup (one-time)

```bash
# Create your project
mkdir my-saas-app && cd my-saas-app
git init

# Start Claude Code and install the plugin
claude
/plugin marketplace add wantanwonderland/execution-os-devteam
/plugin install execution-os-devteam
```

---

## Step 1: Scaffold the Project

```
/new next.js
```

Wantan dispatches **Tanjiro** to scaffold a Next.js app. The wizard asks:
- Project name? `my-saas-app`
- Database? `PostgreSQL`
- ORM? `Prisma`
- Auth? `JWT`
- Styling? `Tailwind CSS`

Tanjiro creates the full project structure, installs dependencies, verifies the build passes, and starts the dev server.

**What you get:**
```
my-saas-app/
├── src/app/           # Next.js app router
├── src/components/    # Shared components
├── src/lib/           # Utilities + Prisma client
├── prisma/            # Schema + seed
├── tests/             # Unit + E2E
├── .env.example
├── docker-compose.yml # Dev database
├── Dockerfile
└── README.md
```

---

## Step 2: Design the UI

```
/design Landing page for a project management SaaS. Target audience: engineering teams. Should feel professional but not boring.
```

Wantan dispatches **Ochaco** who picks a bold aesthetic direction:

> **Tone**: Industrial-editorial — monospace headers, dense info layout, sharp accent color
> **Typography**: Space Mono (display) + DM Sans (body)
> **Colors**: Slate-900 primary, Electric blue accent (#3B82F6), warm gray background
> **Memorable detail**: Animated grid background that subtly pulses

Ochaco generates the full landing page component with responsive breakpoints.

---

## Step 3: Set Up the Database

```
Tell Tanjiro to design the database for a project management app with users, projects, tasks, and comments
```

Wantan dispatches **Tanjiro** using the `database-design` skill:
- Designs entities and relationships (User → Projects → Tasks → Comments)
- Generates Prisma schema with proper indexes
- Creates migration: `/migrate create add-project-management-tables`
- Seeds test data

---

## Step 4: Add Authentication

```
Tell Tanjiro to set up JWT authentication with login, register, and role-based access
```

Tanjiro uses the `auth-patterns` skill:
- Creates `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`, `/api/auth/me` routes
- Hashes passwords with bcrypt
- Issues access tokens (15min) + refresh tokens (7d, httpOnly cookie)
- Adds RBAC middleware (`requireRole('ADMIN')`)
- Writes integration tests for every endpoint

---

## Step 5: Build a Feature

```
Tell Tanjiro to build the task board feature — a Kanban-style board where users can create, move, and assign tasks within a project
```

Tanjiro uses the `fullstack-workflow` skill:
1. **Design**: Database schema for tasks (status, assignee, position), API endpoints, component hierarchy
2. **Backend**: CRUD API with validation, drag-and-drop position updates
3. **Frontend**: KanbanBoard component with drag-and-drop, column headers, task cards
4. **Tests**: Unit tests for API, component tests for board

---

## Step 6: Review the Code

```
/pr-queue
```

Shows all open PRs. Then:

```
Tell Levi to review PR #3
```

**Levi** does a 4-angle review:
- **Architecture**: Checks Kanban board follows existing component patterns
- **Bugs**: Spots a race condition in position updates during concurrent drag-and-drop
- **Security**: Verifies task assignment checks project membership
- **Readability**: Suggests renaming `handleDrop` to `handleTaskColumnChange`

**Cleanliness: 7/10** — Changes requested.

---

## Step 7: Test Everything

```
/test unit src/
/test browser
/test a11y http://localhost:3000
```

**Killua** runs:
- **Unit tests**: 45 tests, 43 passed, 2 failed (the race condition Levi flagged)
- **Browser tests**: Login flow, task creation, drag-and-drop across Chromium/Firefox/WebKit
- **Accessibility**: WCAG 2.1 AA audit — flags missing ARIA labels on task cards

---

## Step 8: Security Scan

```
/security
```

**Itachi** scans:
- **Dependencies**: 0 critical, 1 high (outdated `jsonwebtoken` — recommends upgrade)
- **SAST**: No injection vulnerabilities found
- **Secrets**: No hardcoded credentials

---

## Step 9: Deploy

```
/deploy
```

**Shikamaru** checks:
- CI: All green
- Tests: 95%+ pass rate
- Security: No critical findings
- Rollback target: v0.1.0

> "Drag scale: 2/10. Clean deploy to staging. What a drag — nothing interesting happened."

---

## Step 10: Sprint Review

```
/sprint-review
```

**Erwin** compiles:
- Velocity: 28/30 points completed (93%)
- PRs merged: 8
- Deploys: 3 (staging) + 1 (production)
- Incidents: 0
- Test coverage: 82%

> "Dedicate your hearts! Mission success: 9/10."
