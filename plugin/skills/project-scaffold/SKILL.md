---
name: project-scaffold
description: Tanjiro's project scaffolding skill. Interactive wizard for 70+ project types across web, mobile, backend, and more. Reverse-engineered from hmohamed01/Claude-Code-Scaffolding-Skill.
---

# Project Scaffolding Wizard

When Tanjiro is dispatched to create a new project, follow this wizard.

## Step 1: Choose Project Category

Ask the user:

| Category | Examples |
|----------|---------|
| **Web App** | Next.js, Remix, Nuxt, SvelteKit, Astro |
| **SPA** | React (Vite), Vue (Vite), Svelte, Angular |
| **Backend API** | Express, Fastify, NestJS, Hono, FastAPI, Django, Go Gin, Rust Axum |
| **Mobile** | React Native (Expo), Flutter, Ionic |
| **Desktop** | Tauri, Electron |
| **Full-Stack** | Next.js + Prisma, T3 Stack, Remix + Drizzle |
| **Monorepo** | Turborepo, Nx, pnpm workspaces |
| **Library** | TypeScript (npm), Python (PyPI), Go module |
| **CLI Tool** | Node.js (Commander), Python (Click), Go (Cobra) |
| **Extension** | Chrome (Manifest V3), VS Code, Figma |
| **Serverless** | AWS Lambda, Cloudflare Workers, Vercel Functions |
| **Static Site** | Astro, 11ty, Hugo |

## Step 2: Configure Stack

Based on category, ask about:

### For Web/SPA
- **Language**: TypeScript (default) or JavaScript
- **Styling**: Tailwind CSS (default), CSS Modules, styled-components, vanilla CSS
- **State management**: Zustand (default), Redux Toolkit, Jotai, Context API
- **Routing**: Framework default or TanStack Router
- **Testing**: Vitest + Testing Library (default), Jest, Playwright for E2E

### For Backend
- **Language**: TypeScript (default), Python, Go, Rust
- **Database**: PostgreSQL (default), MySQL, SQLite, MongoDB
- **ORM**: Prisma (TS), Drizzle (TS), SQLAlchemy (Py), GORM (Go)
- **Auth**: JWT (default), OAuth, Session
- **Validation**: Zod (TS), Pydantic (Py)

### For Mobile
- **Framework**: Expo (default for RN), bare React Native, Flutter
- **Navigation**: Expo Router (default), React Navigation
- **State**: Zustand (default), Redux Toolkit
- **Styling**: NativeWind (Tailwind for RN), StyleSheet

### For All
- **Linting**: ESLint + Prettier (TS/JS), Ruff (Py), golangci-lint (Go)
- **CI/CD**: GitHub Actions (default)
- **Docker**: Yes/No
- **Git hooks**: Husky + lint-staged (default)

## Step 3: Generate Project

Create the following structure (example for Next.js + Prisma):

```
{project-name}/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── layout.tsx          # Root layout with metadata
│   │   ├── page.tsx            # Homepage
│   │   ├── globals.css         # Global styles with Tailwind
│   │   └── api/                # API routes
│   ├── components/             # Shared components
│   │   └── ui/                 # Base UI components
│   ├── lib/                    # Utilities and helpers
│   │   ├── db.ts               # Prisma client instance
│   │   └── utils.ts            # Common utilities
│   └── types/                  # TypeScript types
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed data
├── tests/
│   ├── unit/                   # Unit tests (Vitest)
│   └── e2e/                    # E2E tests (Playwright)
├── public/                     # Static assets
├── .env.example                # Environment variables template
├── .eslintrc.json              # ESLint config
├── .prettierrc                 # Prettier config
├── .gitignore
├── docker-compose.yml          # Dev database
├── Dockerfile                  # Production build
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── vitest.config.ts
├── playwright.config.ts
└── README.md                   # How to run, test, deploy
```

## Step 4: Verify

After scaffolding:

```bash
# Install dependencies
npm install   # or pip install, go mod tidy, etc.

# Verify build
npm run build   # or equivalent

# Run tests
npm test

# Start dev server
npm run dev
```

All 4 must succeed. If any fail, fix immediately.

## Step 5: Generate README

Every scaffolded project gets a README with:
- Project description
- Prerequisites
- How to install
- How to run (dev, build, test)
- Project structure overview
- Environment variables needed
- How to deploy

## Templates Quick Reference

| Template | Command | Stack |
|----------|---------|-------|
| Next.js App | `npx create-next-app@latest` | React, Tailwind, TypeScript |
| Vite React | `npm create vite@latest -- --template react-ts` | React, TypeScript |
| Vite Vue | `npm create vite@latest -- --template vue-ts` | Vue, TypeScript |
| Express API | Manual scaffold | Express, TypeScript, Prisma |
| FastAPI | Manual scaffold | Python, Pydantic, SQLAlchemy |
| Expo RN | `npx create-expo-app@latest` | React Native, Expo Router |
| Flutter | `flutter create` | Dart, Material Design |
| Tauri | `npm create tauri-app@latest` | Rust backend, Web frontend |
| Turborepo | `npx create-turbo@latest` | Monorepo, shared packages |

When the official CLI exists (create-next-app, create-vite, etc.), use it. When it doesn't, scaffold manually following the patterns above.

## Constraints

- ALWAYS use TypeScript over JavaScript when available
- ALWAYS include .env.example — never hardcode secrets
- ALWAYS include a .gitignore appropriate for the stack
- ALWAYS scaffold tests alongside source code
- ALWAYS include Docker setup if the project has a database
- README must be genuinely helpful, not boilerplate
