# Routing Rules

## Auto-Sort

When processing captures, route by content signal:

| Content Signal | Destination |
|---------------|-------------|
| Decision language (decided, chose, committed) | `04-decisions/log/` |
| Architecture decision, ADR, RFC | `02-docs/adr/` |
| Runbook, playbook, how-to | `02-docs/runbooks/` |
| Postmortem, incident review | `09-ops/incidents/` |
| Sprint review, retro output | `06-ceremonies/sprint-review/` |
| Standup log, daily update | `06-ceremonies/standup/` |
| Research, tech evaluation, library comparison | `03-research/` |
| Test scenario, test plan | `02-docs/test-scenarios/` |
| Deploy record, release notes | `09-ops/deploys/` |
| Personal reflection, 1-on-1 notes | `07-personal/reflections/` |
| Cannot classify | `08-inbox/ideas/` |

## Multi-Signal Resolution

When content matches multiple signals, apply this priority:
1. Decision > architecture > incident
2. Single location per file + `related` links for cross-references
3. Never duplicate files across directories
