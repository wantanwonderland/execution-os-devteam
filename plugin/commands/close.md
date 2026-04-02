Session close ritual. Ensure all discussions are captured, sorted, tagged, and committed before ending.

**Integration note**: This command works without any MCP integrations. Steps that require NotebookLM will skip gracefully when not configured.

## Instructions

Run through every step below. Do not skip any. Report results as a checklist.

### Step 1: Audit the conversation

Review the entire conversation history. Identify every piece of content that was discussed, created, or actioned. Categorize each into:

- **Captured**: Content that was written to a vault file
- **Mentioned but not captured**: Topics discussed but never saved (e.g., decisions made verbally, ideas floated, context shared)
- **Actions taken**: Emails sent, drafts created, tasks completed, files edited

Present the full list to the owner. Flag anything mentioned but not captured.

### Step 2: Capture gaps

For each item flagged as "mentioned but not captured":

1. Determine the correct destination using CLAUDE.md auto-sort rules
2. Create the file with proper frontmatter, tags, and project detection
3. Apply review flag triggers if applicable
4. Confirm each capture with file path

### Step 3: Verify all vault files

For every file created or modified in this session:

- [ ] Has valid YAML frontmatter (all 7 required fields)
- [ ] File is in the correct directory per auto-sort rules
- [ ] Tags are applied per auto-tagging rules
- [ ] `needs-review` tag applied where review flag triggers are present
- [ ] `project` field matches content
- [ ] File name is lowercase-kebab-case with date prefix where appropriate

Report any files that fail verification and fix them.

### Step 4: Mark completed tasks

Search for any tasks (`type: task`) discussed as done during this session. For each:

1. Set `status: done`
2. Check off completed action items in the body
3. Confirm the update

### Step 4.5: Update checkpoints & session metrics

**Checkpoints**: Scan `.claude/tasks/checkpoints/` for `status: active` files. For each active checkpoint, check if any items were progressed during this session. If so:
1. Update item Status and Session date
2. Update Progress counter
3. Add any new context to "Context for Resume"
4. Update "Last Updated" date

**Pulse metrics**: If a pulse file exists for the current week (`vault/06-ceremonies/pulse-YYYY-WNN.md`), increment these counters:
- Files created: add count of `.md` files created this session
- Corrections logged: add count of new corrections added to `lessons.md` this session
- Routing overrides: add count of routing corrections this session

If no pulse file exists yet, skip — it will be generated at Sunday `/review` or on-demand via `/pulse`.

### Step 4.6: Archive processed inbox items

Scan `.claude/owner-inbox/` for files where `status` is `actioned` or `dismissed` AND `created` date is 7+ days ago. Move each to `.claude/owner-inbox/archive/`. Report count: "Archived N processed inbox items."

If no files qualify, skip silently.

### Step 5: Sync to wantan-mem (skip if not configured)

If wantan-mem MCP is available: review the session's key findings, decisions, and patterns. Push notable observations using the `wantan-mem-session-end.sh` hook (auto-runs at session end). No manual action needed — the hook handles this.

If wantan-mem is not configured, skip with: "wantan-mem sync: not configured." and proceed to Step 5.5.

### Step 5.5: Refresh dashboard data caches

If sync logs exist in `.claude/hooks/logs/`, check the latest for errors:
- If it contains auth errors for any integration, warn accordingly.
- If no sync logs exist, skip silently.

### Step 6: Update persistent memory

Review whether this session produced any information worth saving across sessions:

- New architectural decisions or ADRs → ensure filed in `vault/02-docs/adrs/`
- New stable patterns, preferences, or conventions → update `MEMORY.md`
- Corrections to existing memory → fix at the source

Do NOT save session-specific context or speculative conclusions.

### Step 6.5: Update lessons

If any corrections were made during this session (wrong tags, wrong directory, missing frontmatter, factual errors, or user corrections):

1. Open `.claude/tasks/lessons.md`
2. Add a row to the Corrections Log table: date, what went wrong, root cause, fix applied
3. If a new pattern was discovered, add it to the Patterns Discovered table
4. Check if a rule should be updated to prevent recurrence

### Step 7: Git commit

Stage and commit all changes from this session. Follow commit conventions:

1. Run `git status` and `git diff --stat` to review
2. Group changes into logical commits if multiple concerns exist
3. Use conventional commit messages (`feat:`, `docs:`, `fix:`, `chore:`)
4. Verify clean working tree after commit

### Step 7.5: Push to remote

If any commits were made in Step 7 AND any of these core system files were modified, push to the current branch's remote:

**Core system files** (changes = revision):
- `.claude/agents/` — agent definitions
- `.claude/skills/` — skill files
- `.claude/hooks/` — hook scripts
- `.claude/rules/` — rules files
- `.claude/commands/` — slash command definitions
- `.claude/settings.json` — permissions and hook wiring
- `CLAUDE.md` — system configuration
- `vault/dashboard/` — Dev Performance Hub

Run: `git push` (uses the tracked remote for the current branch)

If push fails (diverged branches, auth error), warn the owner and include in the Final Report under "Still Pending".

For significant milestones (new agent, major architecture change, sprint phase completion), also create a git tag:
```
git tag -a vYYYY.MM.DD -m "Brief description"
git push origin --tags
```

### Step 7.7: Write session handoff

Write `.claude/tasks/SESSION-HANDOFF.md` with:

```markdown
## Session Handoff — {date} ({time of day})

### What's Done
- [key accomplishments this session]

### What's Pending
1. [numbered list from todo.md + any new items surfaced]

### Gotchas
- [any context the next session needs: auth issues, workarounds, blockers]
```

This file is read by `/today` Step 0 and deleted after presenting. It bridges the gap between sessions so no context is lost.

### Step 8: Final report

Present a session summary:

```
## Session Close Report

### Captured
- [list of files created/modified with paths]

### Synced to wantan-mem
- (list key observations pushed, or "Not configured" if wantan-mem is not set up)

### Committed
- [commit hash]: [message]

### Memory Updated
- [what was saved/updated]

### Still Pending
- [anything that couldn't be completed — e.g., awaiting response, blocked]
```

Ask: "All clear. Safe to /clear?"
