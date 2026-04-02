# Routing Rules

## Auto-Sort

When processing captures, route by content signal:

| Content Signal | Destination |
|---------------|-------------|
| Decision language (decided, chose, committed) | `vault/04-decisions/log/` |
| Architecture decision, ADR, RFC | `vault/02-docs/adr/` |
| Runbook, playbook, how-to | `vault/02-docs/runbooks/` |
| Postmortem, incident review | `vault/09-ops/incidents/` |
| Sprint review, retro output | `vault/06-ceremonies/sprint-review/` |
| Standup log, daily update | `vault/06-ceremonies/standup/` |
| Research, tech evaluation, library comparison | `vault/03-research/` |
| Test scenario, test plan | `vault/02-docs/test-scenarios/` |
| Deploy record, release notes | `vault/09-ops/deploys/` |
| Personal reflection, 1-on-1 notes | `vault/07-personal/reflections/` |
| Cannot classify | `vault/08-inbox/ideas/` |

## Multi-Signal Resolution

When content matches multiple signals, apply this priority:
1. Decision > architecture > incident
2. Single location per file + `related` links for cross-references
3. Never duplicate files across directories
