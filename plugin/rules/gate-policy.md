# Agent Gate Policy

Per-agent classification of which actions are auto-approved vs require human review.
Referenced by Wantan before executing any agent action.

## Gate Matrix

| Agent | Action | Gate | Reason |
|-------|--------|------|--------|
| **Diablo** | Read PR diff, analyze code | Auto | Read-only |
| **Diablo** | Post review comment on GitHub | Review-required | External side effect |
| **Diablo** | Write review to vault | Auto | Internal |
| **Killua** | Execute browser tests | Auto | Read-only, no side effects |
| **Killua** | Write test report to vault | Auto | Internal |
| **Killua** | Write test results to DB | Auto | Internal |
| **Itachi** | Scan dependencies, read alerts | Auto | Read-only |
| **Itachi** | Open GitHub security issue | Review-required | External side effect |
| **Itachi** | Write security report to vault | Auto | Internal |
| **Shikamaru** | Check CI status, deploy history | Auto | Read-only |
| **Shikamaru** | Trigger deploy | Review-required | Destructive |
| **Shikamaru** | Trigger rollback | Blocked | High-risk destructive |
| **Shikamaru** | Write deploy record to vault | Auto | Internal |
| **L** | Generate ADR, runbook, postmortem | Auto | Draft to vault |
| **L** | Write documentation to vault | Auto | Internal |
| **Kazuma** | Query sprint data, compute metrics | Auto | Read-only |
| **Kazuma** | Post sprint summary externally | Review-required | Visible to team |
| **Kazuma** | Write sprint review to vault | Auto | Internal |
| **Kazuma** | Compute contribution review | Auto | Draft to vault |
| **Wiz** | Research via web/vault | Auto | Read-only |
| **Senku** | Create/modify agent definitions | Review-required | System change |
| **Sai** | Update dashboard HTML | Auto | Internal |
| **Byakuya** | Run vault audit | Auto | Read-only |
| **Conan** | Scaffold new project | Auto | Internal |
| **Conan** | Write components, routes, schemas | Auto | Internal |
| **Conan** | Install packages (npm/pip) | Review-required | External side effect |
| **Conan** | Modify existing auth flow | Review-required | Security-sensitive |
| **Conan** | Apply database migration | Review-required | Destructive |
| **Rohan** | Generate design tokens, components | Auto | Internal |
| **Rohan** | Write CSS/styled-components | Auto | Internal |
| **Rohan** | Modify existing design system | Review-required | Affects all components |
| **Rohan** | Install design dependencies | Review-required | External side effect |
| **Yomi** | Query BigQuery (SELECT/WITH only) | Auto | Read-only |
| **Yomi** | List datasets/tables, show metadata | Auto | Read-only, free |
| **Yomi** | Sample rows via bq head | Auto | Read-only, free |
| **Yomi** | Dry-run cost estimation | Auto | Read-only, free |
| **Yomi** | Check gcloud project config | Auto | Read-only |
| **Yomi** | Write research output to vault | Auto | Internal |
| **Chiyo** | Data exploration, EDA, profiling | Auto | Read-only compute |
| **Chiyo** | Train models (CPU) | Auto | Local compute, creates artifacts |
| **Chiyo** | Evaluate models, generate plots | Auto | Local compute |
| **Chiyo** | Export model artifacts (joblib/ONNX) | Auto | Internal |
| **Chiyo** | Write ML report to vault | Auto | Internal |
| **Chiyo** | Install Python packages (pip) | Review-required | External side effect |
| **Chiyo** | Train models (GPU / long-running) | Review-required | Resource-intensive |
| **Chiyo** | Hyperparameter tuning (50+ trials) | Review-required | Resource-intensive |
| **Chiyo** | Deploy model to production | Blocked | Shikamaru's domain |

## Rules

1. **Vault writes are always Auto** — they are internal and git-reversible
2. **DB writes are always Auto** — they are internal and queryable
3. **GitHub writes are always Review-required** — they are external and visible to the team
4. **Deploys and rollbacks are Blocked** — require explicit CONFIRM
5. **Agent/system changes are Review-required** — they affect all future behavior

## Overrides

The user can override gate policy inline:
- "Just do it" / "go ahead" / "auto-approve Diablo's reviews for this session" → temporarily upgrade to Auto
- "Double-check everything" → temporarily downgrade all to Review-required

Overrides last for the current session only. They are NOT persisted.
