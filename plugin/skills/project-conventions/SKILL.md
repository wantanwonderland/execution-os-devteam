---
name: project-conventions
description: Vault conventions and patterns for {{OWNER_NAME}}Tay-Brain knowledge system. Use when creating, editing, or sorting any vault file.
---

# Vault Conventions

## Frontmatter Template

Every new .md file must start with this YAML header (7 required + 2 optional fields):

```yaml
---
title: "Human-readable title"
created: YYYY-MM-DD
type: task | decision | note | framework | plan | capture | review | template
tags: []
status: active | done | draft | archived | completed | blocked | deferred
project: {{PROJECT_1}} | {{PROJECT_2}} | {{PROJECT_3}} | personal | all
related: []
due: YYYY-MM-DD          # optional — for tasks with deadlines
priority: high            # optional — critical | high | medium | low
---
```

## Common Patterns

- Captures land in `vault/08-inbox/captures/` first, then get sorted
- Decisions always go to `vault/04-decisions/log/` with date prefix
- Sprint reviews go to `vault/06-ceremonies/sprint-review/` with date prefix
- Retros go to `vault/06-ceremonies/retro/` with date prefix
- Use `related` field to cross-reference files instead of duplicating content
- Add `needs-review` tag for items that need strategic review in the web app
- See `.claude/rules/tagging.md` for auto-tag rules
- See `.claude/rules/routing.md` for auto-sort rules

## Common Gotchas

- Frontmatter has 7 required fields + 2 optional (`due`, `priority`) — no id, linked_goals, linked_decisions, needs_strategic_review, or confidence fields
- Tags are the primary retrieval mechanism — be generous with tagging
- `related` is an array of file paths relative to repo root
- Use `project` (not `venture`) in frontmatter — this is a dev team vault
