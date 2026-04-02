---
name: deploy-ops
description: Shikamaru's deployment operations skill. CI/CD monitoring, deploy validation, rollback management, environment health. Reverse-engineered from cc-devops-skills patterns.
---

# Deploy Operations Workflow

When Shikamaru is dispatched for deployment operations, follow this workflow.

## Mode 1: Deploy Check (default)

Assess the current state of all environments.

### Step 1: CI Pipeline Health
(From cc-devops-skills GitHub Actions validator pattern)

```bash
# Check last 10 workflow runs
gh run list --repo {repo} --limit 10 --json status,conclusion,name,headBranch,createdAt

# Check for failing required checks
gh pr checks {number} --repo {repo} --json name,state,conclusion
```

Validate:
- All required checks passing (no red)
- No workflows stuck in "queued" >10 minutes
- No repeated failures on the same workflow (flaky detection)

### Step 2: Environment Status

Query `deployments` table for latest deploy per environment:

```sql
SELECT environment, version, branch, status, deployed_at, deployed_by
FROM deployments
WHERE repo = '{repo}'
GROUP BY environment
HAVING deployed_at = MAX(deployed_at)
ORDER BY environment;
```

### Step 3: Drift Detection
(From cc-devops-skills IaC validator pattern — adapted for deploy context)

Check if staging and production are on different versions:
- Same version → GREEN: environments aligned
- Different version, staging is ahead → YELLOW: deploy to production pending
- Production is ahead → RED: staging rollback or deployment gap

### Step 4: Rollback Readiness

For each environment, identify the rollback target:

```sql
SELECT version, deployed_at FROM deployments
WHERE repo = '{repo}' AND environment = '{env}' AND status = 'success'
ORDER BY deployed_at DESC LIMIT 2;
```

The second row is the rollback target. If no second row, flag: "No rollback target available — first deploy."

## Mode 2: Pre-Deploy Validation

Before any deploy, Shikamaru validates:

1. **CI green**: All required checks passing on the branch being deployed
2. **Tests passing**: Latest test_runs for the repo show pass rate >95%
3. **No critical security**: Latest security_scans for the repo show critical=0
4. **No open P0/P1**: No unresolved incidents for the repo
5. **Rollback plan**: Previous successful deploy version identified

If any check fails → recommend BLOCKING the deploy with specific reason.

## Mode 3: Post-Deploy Monitoring

After a deploy:

1. **Record**: Insert into `deployments` table
2. **Smoke check**: Recommend dispatching Killua for smoke tests (priority: critical scenarios)
3. **Watch window**: Flag that the deploy is in "watch window" (first 30 minutes)
4. **Rollback trigger**: If Killua smoke tests fail or incident is reported within 30 minutes, recommend immediate rollback

## Report Format

```markdown
## Deploy Status -- YYYY-MM-DD

| Environment | Version | Branch | Status | Deployed | By |
|-------------|---------|--------|--------|----------|----|
| production  | {ver}   | {branch} | {status} | {time} | {who} |
| staging     | {ver}   | {branch} | {status} | {time} | {who} |

### CI Pipeline Health
- Last 10 runs: {pass}/{total} passed
- Failing: {list or "none"}

### Pre-Deploy Checklist
- [ ] CI green
- [ ] Tests >95% pass rate
- [ ] No critical security findings
- [ ] No open P0/P1 incidents
- [ ] Rollback target: {version}

### Drag Scale: {N}/10
{assessment}
```

## Gate Policy

- Deploy status checks → Auto
- Trigger staging deploy → Review-required
- Trigger production deploy → Blocked (CONFIRM required)
- Trigger rollback → Blocked (CONFIRM required)

## Constraints

- NEVER trigger deploy or rollback without gate approval
- ALWAYS identify rollback target before recommending any production action
- If CI is failing, recommend blocking — do not proceed
- Deploy data must reflect real `gh run` output, never fabricated
