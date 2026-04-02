# Versioning & Release Discipline

This vault is both a personal knowledge system AND a product template. Core system changes must be tracked, committed, and pushed like production software.

## What Constitutes a System Change

Any modification to these paths is a **system revision** that must be committed and pushed:

| Path | What It Contains |
|------|-----------------|
| `.claude/agents/` | Agent definitions |
| `.claude/skills/` | Skill files |
| `.claude/hooks/` | Hook scripts |
| `.claude/rules/` | Rules files |
| `.claude/commands/` | Slash command definitions |
| `.claude/settings.json` | Permissions and hook wiring |
| `CLAUDE.md` | System configuration |
| `dashboard/` | Dev Performance Hub |

## Commit Discipline

- **Every session** that modifies core system files: commit + push before `/close`
- **Atomic commits**: One concern per commit. Don't bundle agent changes with skill changes
- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- **Push immediately**: Don't accumulate unpushed commits. Push is part of "done"

## Tagging Convention

Use date-based tags for significant milestones:

```
git tag -a vYYYY.MM.DD -m "Brief description"
git push origin --tags
```

**Tag when**:
- New agent added to the team
- Major architecture change (new integration, restructure)
- Sprint phase completion (Phase 1 done, Phase 2 done, etc.)
- Workshop template milestone (ready for customer delivery)

**Don't tag**: routine content captures, daily vault operations, minor fixes.

## Workshop Template Awareness

When making system changes, consider:

1. **Would a workshop participant inherit this?** If yes, ensure it's clean, documented, and not company-specific
2. **Is this a personal override or a framework feature?** Personal overrides go in `CLAUDE.local.md` or `.claude/settings.local.json`, not in the template
3. **Is this well-documented?** Template users won't have your context. Agent definitions, skills, and rules should be self-explanatory

## Enforcement

- `/close` Step 7.5 auto-pushes after system file commits
- Pre-session: `git pull --ff-only` at `/today` Step 0 catches remote changes
- Stale push warning: If `git status` shows ahead of origin by 5+ commits, flag it
