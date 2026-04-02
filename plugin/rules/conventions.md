# Vault Conventions

## Frontmatter Standard (7 required + 2 optional)

```yaml
---
title: "Human-readable title"
created: YYYY-MM-DD
type: task | decision | note | framework | plan | capture | review | template | adr | incident
tags: [tag1, tag2]
status: active | done | draft | archived | completed | blocked | deferred
project: {{PROJECT_FRONTMATTER_LIST}}
related: []
due: YYYY-MM-DD          # optional — for tasks with deadlines
priority: high            # optional — critical | high | medium | low
---
```

- `due` and `priority` are optional. Include them on tasks and time-sensitive items.
- `status: done` is for completed tasks. `status: completed` is for completed goals/decisions.
- `status: blocked` and `deferred` are for tasks that can't proceed or are postponed.

## File Naming
- All files: `lowercase-kebab-case.md`
- Date-prefixed: `YYYY-MM-DD-descriptive-title.md`
- Decision logs: `YYYY-MM-DD-decision-short-name.md`

## Tagging
- Apply tags based on content signals (see CLAUDE.md auto-tagging table)
- Add `needs-review` tag when decision language, goal references, new commitments, or priority shifts detected
- Detect venture from content and set `venture` field accordingly

## Sort Rules
- Route files by content signal (see CLAUDE.md auto-sort table)
- Decision language takes priority over other signals
- Single location per file + `related` links for cross-references
- Never duplicate files across directories

## Retrieval
1. Search tags first
2. Search titles second
3. Full-text search third
4. Rank by most recently modified
5. Always show directory path for context
