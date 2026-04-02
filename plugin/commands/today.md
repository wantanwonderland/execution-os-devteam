Daily briefing for {{OWNER_NAME}}. Scan the vault and present a structured overview.

**Integration note**: This command works without any MCP integrations. Steps that require Gmail, Calendar, or NotebookLM will skip gracefully when those integrations are not configured.

**First-run detection**: Before running the full briefing, count files in `08-inbox/captures/` and `04-decisions/log/` (excluding example files and templates). If both counts are 0, this is likely the user's first session. Say: "Your vault is brand new — let's get you started! Running `/start` to guide your first conversation." Then run the `/start` command flow instead of the full briefing.

## Pre-Briefing: Chain Executor

**Step 0.0 — Process Inbox Chains** (runs FIRST, before all other steps):

1. **Git pull**: Run `git pull --ff-only` to fetch any remote agent commits. If pull fails (diverged branches), warn: "Git pull failed — remote agent commits may be pending. Resolve manually." Continue with local-only inbox.

2. **Scan inbox**: Read all `.md` files in `.claude/owner-inbox/` (excluding README.md, archive/, and any file without frontmatter). Filter to files where `status: unprocessed`.

3. **Deduplicate**: For files where `priority: low` AND `chain` is empty (`[]`), check if a file from the same `from` agent already exists this ISO week (Monday–Sunday) with the same priority. If so, mark it `status: actioned` silently (suppressed duplicate). Do not display in briefing.

4. **Sort**: Order remaining unprocessed items: `priority: urgent` first, then `normal`, then `low`. Within each priority, sort by `type`: `alert` → `intel` → `audit` → `draft`.

5. **Execute low-risk chains**: For each chain step where `risk: low`:
   - If `agent: neo` → handle inline (e.g., update `06-ceremonies/standup/issues-list.md`, create tasks, flag items). Use the `context` field as instructions.
   - If `agent:` is any other agent → dispatch using the Agent tool with `subagent_type` matching the agent name. Build the prompt from: the inbox file body (## Finding section) + the chain step `context` field.
   - On success: update the inbox file `status: actioned`.
   - On failure: keep `status: unprocessed`, add a note to the file body: `## Chain Error\n{error description}`. Surface in briefing.

6. **Queue high-risk chains**: For each chain step where `risk: high`, do NOT dispatch. Add to the approval queue.

7. **Present briefing**: Output the consolidated Overnight Intelligence section:

```
## Overnight Intelligence

### Requires Your Decision (N items)
1. [URGENT] {title} — {agent} ready to {action}. GO?
2. {title} — {agent} ready to {action}. GO?

### Already Handled (N items)
- {description of what was auto-executed}

### No Action Needed (N items)
- {informational items with empty chains}
```

If no unprocessed items found: output "No overnight findings. Moving to daily briefing."

8. **Process approvals**: If there are high-risk items, wait for the owner's response. Accept:
   - `"go 1"` or `"yes 1"` — approve item 1, dispatch the agent
   - `"go all"` — approve all high-risk items
   - `"no 2"` or `"skip 2"` — reject item 2, set status to `dismissed`
   - `"go 1, skip 2"` — mixed response
   - Ambiguous response → ask for clarification

   After processing all decisions, update each inbox file's status accordingly, then continue to Step 0 (existing briefing).

## Steps

0. **Checkpoint, Handoff & Pulse scan**:
   - Check for `.claude/tasks/SESSION-HANDOFF.md`. If it exists, show its contents under a "**Resuming from prior session**" header, then delete the file after presenting. This ensures continuity.
   - Scan `.claude/tasks/checkpoints/` for files with `status: active` in frontmatter. For each, show: title, progress (N/M), last updated date. Flag any not updated in 7+ days as "⚠️ STALE".
   - Check for current week's pulse file (`06-ceremonies/pulse-YYYY-WNN.md`). If it exists, show a 1-line summary: "Week N pulse: Sprint goal X%, Corrections N, Backlog N needs-review". If no pulse exists, skip silently.
   - Format:
     ```
     ### Active Checkpoints
     - **{Checkpoint Name}**: N/M complete (last: {date})
     ### This Week's Pulse
     Week N: Sprint goal X% | Corrections: N | Backlog: N
     ```

1. **Overdue tasks**: Search ALL `.md` files across the vault for frontmatter with `type: task` and `status: active` where `due` date is before today. List each with: title, due date, priority (if set), file path. Sort by priority (critical first), then by due date (oldest first). If none, say "No overdue tasks."

2. **Due today**: Search for tasks where `due` equals today's date and `status: active`. Same format as above. If none, say "Nothing due today."

3. **Today's calendar**: If Google Calendar MCP is available, use `calendar_events_list` with today's date range (start of day to end of day). Show events in chronological order: time range, title, attendees count. If any event starts within the next 2 hours, highlight it with "Coming up soon". If Calendar MCP is not configured, say "Calendar: not connected (see INTEGRATIONS.md to set up)."

4. **Upcoming (next 7 days)**: Search for tasks where `due` is within the next 7 days and `status: active`. Show as a compact list with title and due date.

5. **Inbox check**: List all files in `08-inbox/captures/` and `08-inbox/ideas/` with their titles and dates. If empty, say "Inbox clear."

6. **Important emails** (requires Gmail MCP — skip this step entirely if Gmail is not configured):
   - **Gmail scan**: Use `gmail_search_messages` with query `is:unread newer_than:1d`. Show the total unread count and top 3 emails by sender and subject. If any are from key contacts (check team roster in `.claude/team/roster.md`), flag them. If no unread, say "Inbox clear."
   - If Gmail MCP is not configured, skip email intelligence entirely.
   - If Gmail MCP is not configured, say "Email: not connected (see INTEGRATIONS.md to set up)."

7. **Recent decisions**: List the 5 most recently created files in `04-decisions/log/`, showing title and date. If none, say "No decisions logged yet."

8. **Active goals**: List all files in `05-goals/active/` with their title and status. If empty, say "No active goals tracked yet."

9. **Needs review**: Search all `.md` files for the tag `needs-review` in their frontmatter tags array. List any found with file path and title.

10. **Last retro**: Find the most recent file in `06-ceremonies/retro/` (excluding template.md). Show the date and sprint if present. If none found, say "No retros logged yet — consider running /retro after your next sprint."

11. **Quick stats**: Count total `.md` files in the vault (excluding .claude/ and .git/). Count active tasks.

12. **Execution cadence check**:
    - If it is the last day of a sprint and no retro file exists in `06-ceremonies/retro/` for this sprint: add "Sprint ending — time for your retrospective. Run `/retro` when ready."
    - If the `needs-review` backlog exceeds 10 items: add "You have {N} items flagged for review. Consider triaging during this session."
    - If `04-decisions/log/` has no files created in the last 14 days: add "No decisions logged recently. If you've made strategic choices, they should be captured with `/decide`."
    - If today is a sprint review day, add: "Run `/sprint-review` to close out the sprint."
    - Review `.claude/tasks/lessons.md` for any patterns relevant to today's work.

13. **Standup Check**: Check if `06-ceremonies/standup/` has an entry for today. If not, add: "You haven't run `/standup` yet today. Start your day with it."

13.5. **Integration Health** (skip entirely if no integrations are configured):
   - Read the most recent sync log from `.claude/hooks/logs/` (latest `sync-*.log` file). If no logs exist, skip silently.
   - Check for NotebookLM errors: if "auth" or "401" appears, warn: "NotebookLM auth expired — run `nlm login --force` to fix."
   - Check `data/dashboard-health.json` freshness: if `updated_at` is older than 48 hours, warn: "Dashboard cache is stale — will refresh at next /close."
   - If all healthy, show: "Integrations: All healthy."
   - Keep this to 1-2 lines max — it's a status light, not a deep dive.

14. **Memory Synthesis** (requires wantan-mem MCP — skip if not configured):
    - If wantan-mem MCP is available, use `smart_search` with today's date context to surface relevant cross-session patterns, blockers, or open threads.
    - Present grounded observations under a "**Memory Synthesis**" header in the briefing.
    - If wantan-mem is unavailable, skip silently.

Present everything in a clean dashboard format. Be concise — this is a daily glance, not a deep dive.
