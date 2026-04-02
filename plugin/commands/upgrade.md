Migrate CLAUDE.md from v2.0.x to v2.2.0+. Moves system behavior out of CLAUDE.md into plugin rules (which auto-update).

**When to run**: After updating the plugin to v2.2.0+, if your CLAUDE.md still contains agent delegation tables, SDD pipeline definitions, or operating principles. These now live in `plugin/rules/` and auto-update with the plugin.

## Steps

### 1. Check if migration is needed

Read the project root `CLAUDE.md`. Look for these indicators that it's an old-format CLAUDE.md:
- Contains "Agent Delegation Protocol" table
- Contains "SDD Pipeline" section
- Contains "Core Rule: Orchestrate, Don't Execute"
- Contains "Operating Principles" section
- References bare vault paths without `vault/` prefix (e.g., `08-inbox/` instead of `vault/08-inbox/`)

If NONE of these are found, say: "Your CLAUDE.md is already up to date. No migration needed." and stop.

### 2. Extract user-specific content

Read the existing CLAUDE.md and extract ONLY the user-specific content:
- **Company name** — look for it in the title or body (e.g., "# Acme Corp Execution-OS")
- **Owner name** — look for it in session management, communication style, or body text
- **Owner role** — if mentioned
- **Strategic context** — any uncommented lines in the Strategic Context section
- **Custom integrations** — any MCP configurations mentioned
- **Custom workflows** — anything the user added that isn't from the original template

Tell the user: "I found these user-specific details in your CLAUDE.md: {company}, {owner}, {role}. I'll preserve these. Everything else (delegation table, SDD pipeline, operating principles) now lives in plugin rules and auto-updates."

### 3. Backup old CLAUDE.md

```bash
cp CLAUDE.md CLAUDE.md.backup
```

Tell the user: "Backed up your old CLAUDE.md to CLAUDE.md.backup"

### 4. Generate new CLAUDE.md

Create a new `CLAUDE.md` with only user-specific content:

```markdown
# {company_name} Execution-OS

A markdown knowledge vault and AI execution system for {owner_name}'s software development team at {company_name}.

## You Are Wantan

You are **Wantan**, {owner_name}'s AI execution assistant for {company_name}. All system behavior, delegation rules, SDD pipeline, and agent definitions are loaded from the plugin (`plugin/rules/`, `plugin/agents/`, `plugin/skills/`). Those auto-update with the plugin. This file only contains project-specific configuration.

## Vault Directory Map

| Directory | Purpose |
|-----------|---------|
| `vault/00-identity/` | Core philosophy, voice, origin story, values, decision filters |
| `vault/01-projects/` | Dev projects and repositories |
| `vault/02-docs/` | ADRs, runbooks, RFCs, postmortems |
| `vault/03-research/` | Research, evaluations, market intelligence |
| `vault/04-decisions/` | Decision log, templates, reviews |
| `vault/05-goals/` | Active goals, completed goals |
| `vault/06-ceremonies/` | Sprint reviews, retros |
| `vault/07-personal/` | Reflections |
| `vault/08-inbox/` | Quick captures, raw ideas — everything lands here first |
| `vault/09-ops/` | CI/CD logs, deployment records, incident reports |

## Owner Identity

- **Name**: {owner_name}
- **Role**: {owner_role}
- **Company**: {company_name}

### Communication Preferences
- {owner_name} provides input via conversation — Claude handles everything else
- Never ask {owner_name} to manually create files, write frontmatter, or move files
- Default to **optimistic/opportunity framing** in external communications
- {owner_name}'s voice in team communications: warm but direct
- When {owner_name} says "yes" or "proceed" — full green light, don't re-confirm

## Strategic Context

{preserved strategic context from old CLAUDE.md, or comments if empty}

## Database

SQLite at `vault/data/company.db`. Query with `sqlite3 vault/data/company.db`.

Dashboard: `vault/dashboard/index.html` (open via `python3 -m http.server 8080` from vault root)

## Session Management

**Session Start** — at the start of every new conversation:
1. Review `.claude/tasks/lessons.md` for relevant patterns (silent)
2. Check `.claude/tasks/SESSION-HANDOFF.md` — if it exists, load context and delete it
3. **First-run check**: Count files in `vault/08-inbox/captures/` and `vault/04-decisions/log/`. If both are 0, run `/start` — this is the user's first session.
4. Run `/today` (skip if `/start` was run in step 3)
5. Check `.claude/tasks/todo.md` for in-progress work

**Session Breaks** — split sessions at natural breakpoints:
- After completing a major task block
- When switching between unrelated domains
- Write handoff to `.claude/tasks/SESSION-HANDOFF.md` before ending

## Integrations (Optional)

| Integration | What It Unlocks | Required For |
|-------------|-----------------|--------------|
| **GitHub MCP** | PR and issue analytics, CI/CD status | Diablo reviews, `/pr-queue` |
| **Google Calendar MCP** | Schedule view, event creation | `/calendar`, `/prep` |
| **Gmail MCP** | Email search, draft creation | `/prep` |

All integrations are optional. Commands degrade gracefully without them.

## Conflict Resolution

- {owner_name}'s explicit sprint commitments override AI-generated priorities
- When systems have conflicting information, surface the conflict — don't silently pick one
```

### 5. Also fix vault paths

If the vault directories exist at the project root (e.g., `00-identity/`, `08-inbox/`) instead of under `vault/`, inform the user:

"Your vault directories are at the project root. The new convention puts them under `vault/` to keep the root clean. Want me to move them?"

If yes:
```bash
mkdir -p vault
for dir in 00-identity 01-projects 02-docs 03-research 04-decisions 05-goals 06-ceremonies 07-personal 08-inbox 09-ops data dashboard; do
  [ -d "$dir" ] && mv "$dir" vault/
done
```

### 6. Confirm

Tell the user:
```
Migration complete!

What changed:
- CLAUDE.md slimmed from ~340 lines to ~80 lines (user-specific only)
- System behavior (delegation, SDD pipeline, AI team rules) now in plugin rules — auto-updates
- Old CLAUDE.md backed up to CLAUDE.md.backup

You can delete CLAUDE.md.backup when you're satisfied everything works.
Run /today to verify.
```
