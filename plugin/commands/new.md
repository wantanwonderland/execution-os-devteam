Project scaffolding wizard. Dispatches Conan to create a new project.

Usage:
- `/new` — interactive wizard (asks category, stack, options)
- `/new next.js` — scaffold a Next.js app with defaults
- `/new express-api` — scaffold an Express API with defaults
- `/new expo` — scaffold a React Native (Expo) app
- `/new flutter` — scaffold a Flutter app

## Steps

1. **Parse input**: If a template name is provided, skip the wizard and use defaults. Otherwise, run the interactive wizard.

2. **Dispatch Conan**: Send to Conan with the `project-scaffold` skill. Provide: project type, user's answers to wizard questions.

3. **Scaffold**: Conan creates the project directory structure, configuration files, and starter code.

4. **Verify**: Conan runs: install deps → build → test → dev server start. All must pass.

5. **Report**: Show files created, how to run, and suggested next steps.

Templates shorthand:
| Shorthand | Full Template |
|-----------|-------------|
| `next.js` | Next.js + TypeScript + Tailwind + Prisma |
| `react` | Vite React + TypeScript + Tailwind |
| `vue` | Vite Vue + TypeScript + Tailwind |
| `express-api` | Express + TypeScript + Prisma + Zod |
| `fastapi` | FastAPI + Python + SQLAlchemy + Pydantic |
| `expo` | Expo + TypeScript + NativeWind + Expo Router |
| `flutter` | Flutter + Material Design |
| `t3` | T3 Stack (Next.js + tRPC + Prisma + NextAuth) |
| `monorepo` | Turborepo + shared packages |
| `tauri` | Tauri + Vite React frontend |
