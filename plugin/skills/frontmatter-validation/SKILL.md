---
name: frontmatter-validation
description: Validate and enforce the vault frontmatter standard when creating or editing any markdown file in {{OWNER_NAME}}Tay-Brain. Use before writing any .md file to the vault.
---

# Frontmatter Validation

Before writing any vault `.md` file, validate compliance with the frontmatter standard.

## Required Fields (7)
Every vault file must have ALL of these:

| Field | Valid Values |
|-------|-------------|
| `title` | Non-empty string in quotes |
| `created` | YYYY-MM-DD format |
| `type` | task, decision, note, framework, plan, capture, review, template |
| `tags` | Array (can be empty `[]` but must exist) |
| `status` | active, done, draft, archived, completed, blocked, deferred |
| `venture` | {{VENTURE_1}}, {{VENTURE_2}}, {{VENTURE_3}}, personal, all |
| `related` | Array of file paths (can be empty `[]`) |

## Optional Fields
| Field | Valid Values | When to Include |
|-------|-------------|-----------------|
| `due` | YYYY-MM-DD format | Tasks with deadlines |
| `priority` | critical, high, medium, low | Time-sensitive items |

## File Naming Checks
- Filename must be `lowercase-kebab-case.md` (no uppercase, no spaces, no underscores)
- Date-prefixed files must use `YYYY-MM-DD-` format
- No special characters except hyphens

## Exclusions
Skip validation for files in: `.claude/`, `.git/`, and root-level files (`CLAUDE.md`, `README.md`, `CLAUDE.local.md`)

## On Failure
Fix the issue immediately — don't report it and wait for instructions. Log the correction in `.claude/tasks/lessons.md` if it reveals a recurring pattern.
