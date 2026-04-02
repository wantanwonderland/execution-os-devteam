First-run onboarding for new Execution-OS users. Guides the first conversation with your AI assistant.

**This command requires no integrations — it works immediately after setup.**

## Detection

Check if this is a genuinely new vault:
1. Count `.md` files in `08-inbox/captures/` (excluding example files)
2. Count `.md` files in `04-decisions/log/` (excluding templates)
3. If BOTH counts are 0, this is a first-run — proceed with onboarding
4. If either count > 0, say: "Looks like you've already started using your vault! Run `/today` for your daily briefing." and stop.

## Onboarding Flow

### Step 1: Welcome (read and present)

Read `.claude/business-profile.json` to get the company name, business type, and team size. Read `CLAUDE.md` to find the owner name (substituted from `{{OWNER_NAME}}` during setup — look for it in the system description or session management section). The assistant name is also in `CLAUDE.md` (substituted from `{{ASSISTANT_NAME}}`). Read `.claude/team/roster.md` for team member details.

Present:

```
Welcome to your Execution-OS vault, {owner_name}.

I'm {assistant_name}, your AI execution assistant for {company_name}.
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
- Use the auto-capture skill to create a capture in `08-inbox/captures/`
- Show them the file path and explain: "That's now in your vault, tagged and filed. You'll never lose it."

### Step 3: First Decision (interactive)

Ask: "What's one decision you've made recently — even a small one? Something like 'I decided to focus on X this quarter' or 'I chose to delay hiring until May.'"

When they respond:
- Use the auto-decision skill to create a decision record in `04-decisions/log/`
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
See INTEGRATIONS.md — all optional, your vault works great without them.
```

## End of Onboarding

After presenting the What's Next section, say: "That's it — you're ready. Your vault is live with real content. Run `/today` whenever you want to start a working session."
