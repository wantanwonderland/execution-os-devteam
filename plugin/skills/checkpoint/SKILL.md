---
name: checkpoint
description: Create, update, resume, and complete checkpoints for multi-file operations that span sessions
---

# Checkpoint Continuity Skill

Track item-level progress for multi-file operations so state is never lost between sessions.

## When to Use

- **Auto-create**: Task involves 5+ files to create/modify
- **Auto-create**: `todo.md` task has 5+ checkable items
- **Manual**: {{OWNER_NAME}} says "track this", "checkpoint this", or "don't lose this"
- **Skip**: Single-file operations, captures, decisions, simple edits — never checkpoint

## Where

`.claude/tasks/checkpoints/{operation-slug}.md`

Slug = lowercase-kebab-case description of the operation (e.g., `performance-email-rollout`, `frontmatter-audit-q2`).

## Checkpoint File Format

```markdown
---
title: "Operation Name"
created: YYYY-MM-DD
type: task
tags: [execution-system, checkpoint]
status: active
project: {project}
related: [{related files}]
priority: {priority}
---

## Summary
One paragraph describing the operation, its goal, and completion criteria.

## Progress: N/M complete

| # | Item | Status | Session | Notes |
|---|------|--------|---------|-------|
| 1 | Item name | DONE | YYYY-MM-DD | Brief note |
| 2 | Item name | DRAFT | YYYY-MM-DD | In progress |
| 3 | Item name | PENDING | — | |

## Context for Resume
- Key decisions, voice/tone notes, gotchas, constraints
- Template or source files to reference
- Any rules discovered during execution
- Anything the next session needs to know to continue seamlessly

## Last Updated
YYYY-MM-DD
```

## Item Statuses

| Status | Meaning |
|--------|---------|
| DONE | Complete and verified |
| DRAFT | Started but not finished or sent |
| IN PROGRESS | Currently being worked on |
| BLOCKED | Cannot proceed — note the blocker |
| SKIPPED | Intentionally skipped — note why |
| PENDING | Not yet started |

## Lifecycle

### 1. Create

When a trigger fires (5+ files, 5+ todo items, or {{OWNER_NAME}} requests):

1. Create file at `.claude/tasks/checkpoints/{slug}.md`
2. List all items with PENDING status
3. Add summary and any known context
4. Announce to {{OWNER_NAME}}: "Created checkpoint: {name} ({N} items tracked)"

### 2. Update

Update the checkpoint when:
- An item's status changes (PENDING → DONE, etc.)
- At `/close` Step 4.5 — record session progress
- {{OWNER_NAME}} reports progress verbally
- New context is discovered that future sessions need

For each update:
1. Change the item's Status and Session date
2. Update the Progress counter in the header
3. Add any new context to "Context for Resume"
4. Update "Last Updated" date

### 3. Discover (at session start)

At `/today` Step 0:
1. Scan `.claude/tasks/checkpoints/` for files with `status: active`
2. For each active checkpoint, show: title, progress (N/M), last updated
3. If any checkpoint hasn't been updated in 7+ days, flag as stale

Format:
```
### Active Checkpoints
- **Performance Email Rollout**: 3/19 complete (last: Mar 14)
- **⚠️ Frontmatter Audit**: 12/50 complete (last: Mar 5 — STALE, 9 days)
```

### 4. Resume

When {{OWNER_NAME}} wants to continue a checkpointed operation:
1. Read the full checkpoint file
2. Load the "Context for Resume" section — this contains everything needed
3. Identify the next PENDING item
4. Begin work, updating status as items complete

### 5. Complete

When all items are DONE (or DONE + SKIPPED):
1. Set frontmatter `status: done`
2. Add a `## Completed` section with date and final summary
3. Announce: "Checkpoint complete: {name} — all items done"
4. The file remains in `checkpoints/` as a record (not deleted)

### 6. Promote from todo.md

If a task in `todo.md` grows beyond 5 items mid-session:
1. Offer to promote: "This task has grown to {N} items. Want me to create a checkpoint for it?"
2. If yes, create the checkpoint file and add a reference in todo.md: `→ Checkpoint: .claude/tasks/checkpoints/{slug}.md`

## Relationship to todo.md

| | todo.md | checkpoints/ |
|---|---------|-------------|
| **Scope** | Simple tasks, backlogs | Multi-file operations |
| **Granularity** | Task-level checkboxes | Item-level progress table |
| **Context** | Minimal | Full resume context |
| **Cross-session** | Loses context | Preserves everything |
| **Trigger** | Any task | 5+ files/items |

They coexist. Simple tasks stay in todo.md. Complex operations get checkpoints. A todo.md task can be promoted to a checkpoint when complexity warrants it.
