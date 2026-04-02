# Checkpoint Rules

## Auto-Create Triggers

Create a checkpoint in `.claude/tasks/checkpoints/` when:

1. **5+ file operations**: Task requires creating or modifying 5 or more files
2. **5+ todo items**: A `todo.md` task has 5 or more checkable sub-items
3. **Explicit request**: the owner says "track this", "checkpoint this", "don't lose this", or similar

## Skip Triggers

Do NOT create a checkpoint for:

1. Single-file operations (captures, decisions, edits)
2. Simple multi-file edits (e.g., find-and-replace across 3 files)
3. Read-only operations (searches, reviews, audits that don't produce files)
4. Routine vault operations (tagging, routing, frontmatter fixes)

## Promotion Rule

If a `todo.md` task grows beyond 5 items mid-session, offer to promote it to a checkpoint. Do not auto-promote without asking.

## Stale Alert

At `/today`, flag any active checkpoint not updated in 7+ days as stale. This surfaces forgotten work.

## Completion Rule

A checkpoint is complete when all items are DONE or SKIPPED (with documented reasons). Set `status: done` and add completion date. Do not delete — keep as record.

## Session Integration

- `/today` Step 0: Scan and surface active checkpoints
- `/close` Step 4.5: Update all active checkpoints with session progress
- At item completion: Update checkpoint immediately (don't batch)
