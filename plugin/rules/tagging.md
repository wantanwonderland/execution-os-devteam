# Tagging Rules

## Auto-Tagging

When creating or sorting files, detect content signals and apply tags:

| Content Signal | Tags to Apply |
|---------------|---------------|
| Pull request, PR, code review, diff, merge | `pr` |
| Deploy, deployment, rollback, release, CI/CD | `deploy` |
| Test, testing, coverage, Playwright, E2E, browser test | `testing` |
| Bug, defect, regression, fix, hotfix | `bug` |
| Incident, outage, P0, P1, downtime, MTTR | `incident` |
| Security, vulnerability, CVE, OWASP, audit, dependency | `security` |
| Sprint, velocity, standup, retro, planning | `sprint` |
| Architecture, ADR, RFC, tech debt, design | `architecture` |
| Documentation, runbook, postmortem, changelog | `docs` |
| Framework, methodology, system, model, playbook | `framework` |
| Performance, latency, throughput, optimization | `performance` |
| Infrastructure, Kubernetes, Docker, cloud, AWS, GCP | `infra` |
| Team member names | `team` |

When in doubt, add the tag. Generous tagging improves retrieval.

## Review Flag Triggers

Add `needs-review` tag when content contains ANY of:
- Decision language: "decided", "chose", "committed", "will not", "killing", "stopping", "pivoting"
- Architecture changes: "migrating", "replacing", "new stack", "deprecating"
- New commitments: "I will", "starting Monday", "by end of sprint", "shipping", "launching"
- Priority shifts: "instead of", "replacing", "deprioritizing", "new focus"
- Incident language: "outage", "rolled back", "root cause", "postmortem"
