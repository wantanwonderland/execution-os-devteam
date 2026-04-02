Sprint review ceremony. Evaluate sprint performance against commitments.

## Steps

1. **Sprint summary**: Dispatch Kazuma to compile:
   - Velocity: committed vs completed (from `sprint_metrics`)
   - PRs merged this sprint (from `pull_requests`)
   - Deploys this sprint (from `deployments`)
   - Incidents this sprint (from `incidents`)
   - Test coverage trend (from `test_runs`)
   - Security scan status (from `security_scans`)

2. **Goal review**: For each sprint goal, mark: DONE / PARTIAL / NOT DONE. Calculate sprint goal hit rate.

3. **Highlights**: Ask: "What went well this sprint? Any demos to highlight?"

4. **Carryover**: Identify incomplete goals to carry forward. Ask: "Carry forward, deprioritize, or split?"

5. **Write sprint review**: Create `vault/06-ceremonies/sprint-review/YYYY-MM-DD-sprint-{id}-review.md` with all metrics, goal status, and highlights.

6. **Update DB**: Update `sprint_metrics` with completed values.
