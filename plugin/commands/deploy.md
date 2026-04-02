Deployment status and history. Check environment health across repos.

## Steps

1. **Current state**: Dispatch Shikamaru to query `deployments` table for latest deploy per environment per repo. Show:

```markdown
## Deploy Status -- YYYY-MM-DD

| Repo | Environment | Version | Status | When | By |
|------|-------------|---------|--------|------|----|
```

2. **CI pipeline health**: For each repo, show last 5 GitHub Actions runs via `gh run list`.

3. **Recent rollbacks**: Query `deployments` where `rollback_of IS NOT NULL` in last 7 days.

4. **Deploy frequency**: Show deploys per week for last 4 weeks per environment.

If a specific repo is mentioned (e.g., `/deploy frontend-app`), scope all queries to that repo only.
