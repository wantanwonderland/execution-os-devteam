First-run onboarding for new Execution-OS users. Guides the first conversation with your AI assistant.

**This command requires no integrations — it works immediately after setup.**

> **CRITICAL**: Do NOT create a generic CLAUDE.md yourself. Do NOT skip steps. Do NOT delegate to a shell wizard. Follow the full scaffold flow below exactly. The setup-wizard.sh is for standalone CLI use — ignore it entirely when running inside Claude Code.

## Step 0: Vault Scaffold Check

Before anything else, check if the vault structure exists. Look for these indicators:
- `CLAUDE.md` exists in the project root
- `.claude/business-profile.json` exists
- Directory `vault/08-inbox/captures/` and `vault/04-decisions/log/` exist

**If ALL of these exist** → skip to Detection below.

**If ANY are missing** → the vault hasn't been scaffolded yet. Execute the full setup now:

### Setup: Clone vault template

Tell the user: "Welcome! Your vault structure isn't set up yet. Let me clone the template and configure it for you."

Run this bash command to clone the vault template:
```bash
git clone --depth 1 https://github.com/wantanwonderland/execution-os-devteam.git /tmp/eos && cp -rn /tmp/eos/vault/ ./vault/ && rm -rf /tmp/eos
```

If `vault/` already exists (e.g., user is working inside the repo), skip the clone.

### Setup: Collect configuration (ask the user — one question at a time)

Ask these questions directly in conversation. Wait for each answer before asking the next:

1. "What's your company or project name?" (required)
2. "What's your name?" (required)
3. "What's your role? (default: Engineering Lead)" — use default if they press Enter/skip
4. "How many developers on your team? (default: 0)" — use default if they press Enter/skip
5. "What's one repository name your team works on? (e.g., my-app — press Enter to skip)" — optional
6. "Sprint duration in weeks? (default: 2)" — use default if skipped

Store these answers as: COMPANY_NAME, OWNER_NAME, OWNER_ROLE, TEAM_SIZE, REPO_NAME, SPRINT_WEEKS

Use today's date as SPRINT_START (YYYY-MM-DD format).

### Setup: Create configuration files

**Create `.claude/business-profile.json`** at the project root with the collected values:
```json
{
  "company_name": "<COMPANY_NAME>",
  "owner_name": "<OWNER_NAME>",
  "owner_role": "<OWNER_ROLE>",
  "team_size": <TEAM_SIZE>,
  "sprint_duration_weeks": <SPRINT_WEEKS>,
  "sprint_start_date": "<SPRINT_START>",
  "review_sla_hours": 24,
  "test_coverage_target": 80,
  "mttr_target_minutes": 240
}
```

**Create `vault/dashboard/config.json`** (create the directory first if needed):
```json
{
  "company_name": "<COMPANY_NAME>",
  "sprint_duration_weeks": <SPRINT_WEEKS>,
  "review_sla_hours": 24,
  "deploy_frequency_target": 3,
  "test_coverage_target": 80,
  "mttr_target_minutes": 240
}
```

If REPO_NAME was provided, **create `vault/01-projects/<repo-slug>.md`**:
```markdown
---
title: "<REPO_NAME>"
created: <SPRINT_START>
type: project
tags: [<repo-slug>]
status: active
project: <repo-slug>
related: []
---

## Repository
- URL: https://github.com/your-org/<repo-slug>
- Default branch: main
- CI: GitHub Actions
```

### Setup: Replace placeholders across vault files

Run this bash command to replace all template placeholders (non-interactive sed):
```bash
find ./vault \( -name "*.md" -o -name "*.json" -o -name "*.sql" \) -type f \
  ! -path "*/node_modules/*" ! -name "setup-wizard.sh" ! -name "package-lock.json" | \
while read -r file; do
  sed -i '' \
    -e "s/{{COMPANY_NAME}}/<COMPANY_NAME_ESCAPED>/g" \
    -e "s/{{OWNER_NAME}}/<OWNER_NAME_ESCAPED>/g" \
    -e "s/{{OWNER_ROLE}}/<OWNER_ROLE_ESCAPED>/g" \
    -e "s/{{ASSISTANT_NAME}}/Wantan/g" \
    -e "s/{{TEAM_SIZE}}/<TEAM_SIZE>/g" \
    -e "s/{{SPRINT_START_DATE}}/<SPRINT_START>/g" \
    -e "s/{{SPRINT_DURATION_WEEKS}}/<SPRINT_WEEKS>/g" \
    -e "s/{{REVIEW_SLA_HOURS}}/24/g" \
    -e "s/{{TEST_COVERAGE_TARGET}}/80/g" \
    -e "s/{{MTTR_TARGET_MINUTES}}/240/g" \
    -e "s/{{PROJECT_FRONTMATTER_LIST}}/<REPO_NAME_OR_ALL>/g" \
    "$file" 2>/dev/null || true
done
```

> Note: On macOS use `sed -i ''`; on Linux use `sed -i`. The command above uses macOS syntax.

### Setup: Move vault config to project root

```bash
mv vault/CLAUDE.md ./CLAUDE.md
cp -rn vault/.claude/ ./.claude/ 2>/dev/null || true
rm -rf vault/.claude/
```

### Setup: Update path references in CLAUDE.md

Open `CLAUDE.md` and update all bare vault directory references to use the `vault/` prefix. Replace:
- `00-identity/` → `vault/00-identity/`
- `01-projects/` → `vault/01-projects/`
- `02-docs/` → `vault/02-docs/`
- `03-research/` → `vault/03-research/`
- `04-decisions/` → `vault/04-decisions/`
- `05-goals/` → `vault/05-goals/`
- `06-ceremonies/` → `vault/06-ceremonies/`
- `07-personal/` → `vault/07-personal/`
- `08-inbox/` → `vault/08-inbox/`
- `09-ops/` → `vault/09-ops/`
- `data/company.db` → `vault/data/company.db`
- `dashboard/` → `vault/dashboard/`

Do NOT prefix paths that already start with `vault/` or `.claude/`.

### Setup: Remove template-only files from vault/

```bash
rm -f vault/README.md vault/INTEGRATIONS.md vault/install.sh vault/setup-wizard.sh
```

### Setup: Initialize the database

```bash
sqlite3 vault/data/company.db < vault/data/schema.sql 2>/dev/null || echo "SQLite not available — run manually later"
```

### Setup: Install the plugin

Tell the user:

```
Almost done! Run these two commands in Claude Code to install your AI squad (Diablo, Killua, Conan, etc.) and enable auto-updates:

  /plugin marketplace add wantanwonderland/execution-os-devteam
  /plugin install execution-os-devteam

Then restart this session and run /start again to complete onboarding.
```

Wait for the user to confirm they've run the plugin commands, then continue to **Step 1: Welcome** below.

If the user says they already have the plugin installed or wants to skip, continue immediately.

## Detection

Check if this is a genuinely new vault:
1. Count `.md` files in `vault/08-inbox/captures/` (excluding example files named `example-*`)
2. Count `.md` files in `vault/04-decisions/log/` (excluding templates)
3. If BOTH counts are 0, this is a first-run — proceed with onboarding
4. If either count > 0, say: "Looks like you've already started using your vault! Run `/today` for your daily briefing." and stop.

## Onboarding Flow

### Step 1: Welcome (read and present)

Read `.claude/business-profile.json` to get the company name and owner name. Read `CLAUDE.md` to confirm setup is complete.

Present:

```
Welcome to your Execution-OS vault, {owner_name}.

I'm Wantan, your AI execution assistant for {company_name}.
Your vault is set up and ready. Here's what we're going to do in the
next 10 minutes:

1. Capture your first idea
2. Log your first decision
3. See your vault in action

Let's start.
```

### Step 2: First Capture (interactive)

Ask: "What's one business idea or thought you've been sitting on this week? Just tell me naturally — I'll handle the filing."

When they respond:
- Use the auto-capture skill to create a capture in `vault/08-inbox/captures/`
- Show them the file path and explain: "That's now in your vault, tagged and filed. You'll never lose it."

### Step 3: First Decision (interactive)

Ask: "What's one decision you've made recently — even a small one? Something like 'I decided to focus on X this quarter' or 'I chose to delay hiring until May.'"

When they respond:
- Use the auto-decision skill to create a decision record in `vault/04-decisions/log/`
- Show them the structured format: title, context, rationale, related goals
- Explain: "Every decision gets logged with WHY you made it. Future-you will thank present-you."

### Step 4: First Search (demonstrate)

Run `/find` on the topic from their capture or decision. Show them the result. Since this is a fresh vault, the search will likely return only the file they just created — that's fine. Frame it as a teaching moment: "See? It found the capture you just made. As you add more content — ideas, decisions, meeting notes — this search becomes your personal knowledge base. Imagine having 6 months of decisions searchable in seconds."

### Step 5: Show the Vault (demonstrate)

Run `/status` and present the output.

Say: "That's your vault dashboard. You have {N} files, {N} captures, {N} decisions."

### Step 6: What's Next

Present:

```
You're set up. Here are the 5 commands you'll use daily:

  /today      — Morning briefing (start every session with this)
  /capture    — Save an idea, note, or observation
  /decide     — Log a decision
  /find       — Search your vault
  /standup    — Daily standup (blockers, PRs, today's focus)

Just talk to me naturally — I'll auto-capture decisions and ideas
from our conversation. You don't always need slash commands.

When you're ready for your first real session, run /today.
```

If the vault has team members (team_size > 0 in business-profile.json), add:
```
Your team ({N} members) is loaded in the roster. I can track their
sprint contributions, PR throughput, and ceremony attendance when you're ready.
```

If MCP integrations exist (check for `.mcp.json`), add:
```
You also have integrations configured (GitHub, email, calendar, etc.).
These will enhance your /today briefing and unlock /email, /calendar,
and /pr-queue commands.
```

If no `.mcp.json` exists, add:
```
Want to connect GitHub, email, or calendar later?
See vault/INTEGRATIONS.md — all optional, your vault works great without them.
```

## End of Onboarding

After presenting the What's Next section, say: "That's it — you're ready. Your vault is live with real content. Run `/today` whenever you want to start a working session."
