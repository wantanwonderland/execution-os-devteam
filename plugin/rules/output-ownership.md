# Output Directory Ownership

> Each writable directory has exactly one owning agent. Non-owners must not write.

## Ownership Map

| Directory | Owner | Purpose | File Pattern |
|-----------|-------|---------|-------------|
| `.claude/agents/` | Senku | Agent definitions | `{name}.md` |
| `.claude/team/` | Senku | Team profiles and roster | `roster.md` |
| `vault/02-docs/adr/` | L | Architecture Decision Records | `YYYY-MM-DD-adr-{n}-{title}.md` |
| `vault/02-docs/runbooks/` | L | Operational runbooks | `{topic}-runbook.md` |
| `vault/02-docs/test-scenarios/` | Killua | Test scenario definitions | `{scenario-name}.md` |
| `vault/09-ops/incidents/` | L | Incident postmortems | `YYYY-MM-DD-{incident}.md` |
| `vault/09-ops/deploys/` | Shikamaru | Deployment records | `YYYY-MM-DD-deploy-{env}.md` |
| `vault/09-ops/test-reports/` | Killua | Test run summaries | `YYYY-MM-DD-test-summary.md` |
| `vault/09-ops/sprint-reports/` | Kazuma | Sprint reviews | `YYYY-MM-DD-sprint-{id}.md` |
| `vault/09-ops/security-reports/` | Itachi | Security scan reports | `YYYY-MM-DD-security-{repo}.md` |
| `vault/09-ops/contribution-reviews/` | Kazuma | Developer performance reviews | `YYYY-MM-DD-{name}-review.md` |
| `vault/09-ops/dashboards/` | Sai | Standalone visual reports | `{name}.html` |
| `vault/dashboard/` | Sai | Dev Performance Hub | `index.html` + assets |
| `.claude/tasks/checkpoints/` | Wantan | Checkpoint files | `{name}.md` |

## Wantan's Write Scope

Wantan writes to:
- `vault/08-inbox/captures/` -- Quick captures
- `vault/04-decisions/log/` -- Decision records
- `vault/06-ceremonies/` -- Standup logs, sprint ceremonies
- `.claude/tasks/` -- Task tracking, handoffs
- Any vault content directory per routing rules

Wantan does NOT write to agent-owned output directories.

## Conflict Resolution

1. Exclusive ownership wins
2. Wantan delegates, never overrides
3. New directories: Senku approves and updates this map
