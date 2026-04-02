# Output Directory Ownership

> Each writable directory has exactly one owning agent. Non-owners must not write.

## Ownership Map

| Directory | Owner | Purpose | File Pattern |
|-----------|-------|---------|-------------|
| `.claude/agents/` | Senku | Agent definitions | `{name}.md` |
| `.claude/team/` | Senku | Team profiles and roster | `roster.md` |
| `02-docs/adr/` | L | Architecture Decision Records | `YYYY-MM-DD-adr-{n}-{title}.md` |
| `02-docs/runbooks/` | L | Operational runbooks | `{topic}-runbook.md` |
| `02-docs/test-scenarios/` | Killua | Test scenario definitions | `{scenario-name}.md` |
| `09-ops/incidents/` | L | Incident postmortems | `YYYY-MM-DD-{incident}.md` |
| `09-ops/deploys/` | Shikamaru | Deployment records | `YYYY-MM-DD-deploy-{env}.md` |
| `09-ops/test-reports/` | Killua | Test run summaries | `YYYY-MM-DD-test-summary.md` |
| `09-ops/sprint-reports/` | Erwin | Sprint reviews | `YYYY-MM-DD-sprint-{id}.md` |
| `09-ops/security-reports/` | Itachi | Security scan reports | `YYYY-MM-DD-security-{repo}.md` |
| `09-ops/contribution-reviews/` | Erwin | Developer performance reviews | `YYYY-MM-DD-{name}-review.md` |
| `09-ops/dashboards/` | Sai | Standalone visual reports | `{name}.html` |
| `dashboard/` | Sai | Dev Performance Hub | `index.html` + assets |
| `.claude/tasks/checkpoints/` | Wantan | Checkpoint files | `{name}.md` |

## Wantan's Write Scope

Wantan writes to:
- `08-inbox/captures/` -- Quick captures
- `04-decisions/log/` -- Decision records
- `06-ceremonies/` -- Standup logs, sprint ceremonies
- `.claude/tasks/` -- Task tracking, handoffs
- Any vault content directory per routing rules

Wantan does NOT write to agent-owned output directories.

## Conflict Resolution

1. Exclusive ownership wins
2. Wantan delegates, never overrides
3. New directories: Senku approves and updates this map
