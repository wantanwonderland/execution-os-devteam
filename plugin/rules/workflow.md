# Vault Workflow Rules

## Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps, multi-file changes, architectural decisions, new frameworks)
- Write detailed specs upfront to reduce ambiguity — vague plans produce vague results
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Simple captures, single-file edits, and task updates skip planning

## Task Tracking (Plan-First Execution)
For any multi-step task:
1. **Plan First**: Write plan to `.claude/tasks/todo.md` with checkable items under a dated heading
2. **Check in**: Confirm plan before starting implementation (skip for routine vault ops)
3. **Track Progress**: Mark items `[x]` as you go
4. **Explain Cwizs**: Brief summary at each milestone
5. **Document Results**: Add a `### Review` section with outcome when task completes
6. **Archive**: Move completed task blocks to the `## Completed` section with date

### Checkpoint Triggers
When a task crosses the complexity threshold, promote it to a checkpoint (`.claude/tasks/checkpoints/`):
- **Auto-create**: Task involves 5+ files to create/modify
- **Auto-create**: `todo.md` task has 5+ checkable sub-items
- **Manual**: the owner says "track this", "checkpoint this", or "don't lose this"
- **Skip**: Single-file operations, captures, decisions, simple edits
- **Promote mid-session**: If a todo.md task grows beyond 5 items, offer to promote
- See `.claude/rules/checkpoint.md` for full trigger and lifecycle rules

## Verification Before Done
After any vault operation (create, move, tag, sort), verify:
- Frontmatter has all 7 required fields
- File is in correct directory per routing rules
- Tags applied per tagging rules
- needs-review flag applied where triggers are present
- Filename is lowercase-kebab-case with date prefix where appropriate
- Ask yourself: **"Would a staff engineer approve this? Would this pass a vault audit?"**
- Never mark a task complete without proving it works — diff, test, demonstrate correctness

## Self-Improvement Loop
After ANY correction from the owner (wrong tags, wrong directory, missing field, bad routing, wrong facts, bad tone):
1. Fix the immediate issue
2. Log the correction in `.claude/tasks/lessons.md` with date, what went wrong, root cause, fix applied
3. Write a rule for yourself that prevents the same mistake — be specific
4. Check if a new rule should be added to `.claude/rules/` to prevent recurrence
5. Review lessons.md at session start for relevant patterns (silent — don't dump to the owner)
6. Ruthlessly iterate on these lessons until mistake rate drops to zero

## Execution Cadence
- **Every session start**: Review lessons.md silently → run `/today` → check todo.md for in-progress work
- **Every session end**: Run `/close` for the 8-step ritual
- **Every Sunday**: Prompt for `/review` if no review exists for the current week
- **Weekly**: Triage needs-review items if backlog exceeds 10
- **After corrections**: Update `.claude/tasks/lessons.md` immediately — before continuing other work

## Session Handoff Protocol
When a session is running long (50%+ context used) or switching to a new major task:
1. Write a handoff summary to `.claude/tasks/SESSION-HANDOFF.md` covering:
   - What's done this session
   - What's pending / in-progress
   - Key decisions made
   - Gotchas or context the next session needs
2. Commit all work before ending
3. The next session's `/today` will surface the handoff file

## Post-Compaction Recovery

When a conversation is compacted ("Conversation compacted" appears), Wantan MUST do this BEFORE any other action:

1. **Re-read `CLAUDE.md`** (project root) to restore all delegation rules — the `WANTAN:DELEGATION` block is the source of truth for routing
2. **Re-establish identity**: You are an orchestrator. You do not execute. You delegate.
3. **Resume in-progress work** by checking `.claude/tasks/todo.md`
4. **Never use utility agents** (`Explore`, `general-purpose`, `landing-page-80-20`) as substitutes for squad members — consult the delegation table in CLAUDE.md

Failure mode to avoid: after compaction, defaulting to `Explore(...)` or doing work directly instead of routing to the correct squad member.

## Context Loss Prevention
- Before any batch operation (4+ emails, 5+ file creates, bulk content): create a checkpoint FIRST
- After each item in a batch: update the checkpoint immediately, don't batch updates
- If context compaction occurs: re-read CLAUDE.md FIRST to restore delegation rules, then re-read the checkpoint file to resume batch work
- Never hold more than 3 unsaved drafts in context — save incrementally
- For marathon sessions (3+ hours or 3+ distinct task types): suggest splitting into focused sub-sessions at natural breakpoints

## Subagent Strategy
Use subagents **liberally** to keep main context window clean:
- Vault-wide searches across many files (10+)
- Needs-review triage (reading and categorizing flagged items)
- Content audit operations (frontmatter validity, routing correctness)
- Meeting prep research (vault + email + calendar context)
- Parallel execution of independent tasks (e.g., create 3 files simultaneously)
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

## Autonomous Operation
- When the owner mentions a decision → log it without being asked
- When the owner shares content worth preserving → capture and file it
- When a file needs tags or routing → apply rules without asking
- When verification fails → fix it immediately, don't report and wait
- When encountering any error → read logs, trace root cause, fix it. Zero hand-holding required.
- Only ask for the owner's input on strategy, priorities, and judgment calls
