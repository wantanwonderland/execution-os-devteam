---
name: agent-lint
description: Byakuya's agent definition linting skill. Validates agent files against PKA standard, detects stale configs, checks consistency. Reverse-engineered from agnix patterns.
---

# Agent Lint

Byakuya validates agent definition files for quality and consistency.

## Checks (derived from agnix's 53 CC-* rules, adapted for our PKA standard)

### 1. Frontmatter Validation

For each file in `.claude/agents/*.md`:

- [ ] File starts with `---`
- [ ] `name` field present and non-empty
- [ ] `description` field present, format: "{Role} — {one-line description}"
- [ ] `model` field present, value is one of: `opus`, `sonnet`, `haiku`
- [ ] `tools` field present, is a YAML list
- [ ] Each tool in `tools` list exists in the Agent Tool Registry (from senku.md)

### 2. PKA Structure Validation

- [ ] `# {Name} — {Title}` heading matches `name` field
- [ ] `## Identity` section exists and is >50 characters
- [ ] `## Persona` section exists with Personality, Communication style, Quirk
- [ ] `## Primary Role` section exists and is >100 characters
- [ ] `## Output Format` section exists
- [ ] `## Constraints` section exists with at least 3 constraints
- [ ] `## Gate Policy` section exists (added in Phase 3)
- [ ] `## Validation Expectations` section exists (added in Phase 3)

### 3. Redundancy Detection
(From agnix instruction quality rules)

Flag agent instructions that duplicate Claude's built-in behavior:
- "Be helpful and accurate" — redundant
- "Follow instructions carefully" — redundant
- "Think step by step" — redundant unless specifically required
- Generic phrases that add no domain-specific value

### 4. Consistency Checks

- Agent name in frontmatter matches heading
- Agent listed in `.claude/team/roster.md`
- Agent's model in roster matches model in frontmatter
- Agent's tools in roster match tools in frontmatter
- No two agents share the same tool set + primary role (overlap detection)

### 5. Staleness Detection

- Agent not referenced in any command file (`.claude/commands/*.md`) → possibly unused
- Agent not dispatched in `agent_usage` table in last 30 days → possibly stale
- Agent definition not modified in 90+ days → may need refresh

### 6. Naming Standards
(From agnix naming rules)

- Agent file name: lowercase letters and hyphens only
- Skill directory name: lowercase letters and hyphens only
- Command file name: lowercase letters and hyphens only

## Report Format

```markdown
## Agent Lint Report -- YYYY-MM-DD

### Summary
- Agents scanned: {N}
- Issues found: {N} ({critical} critical, {warning} warning, {info} info)

### Issues
| Agent | Check | Severity | Issue |
|-------|-------|----------|-------|
| {name} | {check} | {severity} | {description} |

### Staleness Alerts
| Agent | Last Dispatched | Last Modified | Status |
|-------|----------------|---------------|--------|
| {name} | {date or "never"} | {date} | {stale/active} |

### Consistency
- Roster alignment: {all agents match / {N} mismatches}
- Overlap detection: {none found / {agents} share responsibilities}
```

## Constraints

- Read-only — NEVER modify agent files. Report issues only.
- Run as part of Byakuya's vault audit, not independently
- Severity: critical (missing required sections), warning (staleness, redundancy), info (naming)
