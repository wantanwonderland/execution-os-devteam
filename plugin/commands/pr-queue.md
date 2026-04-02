PR queue status. Show open PRs, review SLA, and blockers.

## Steps

1. **Open PRs**: Dispatch Diablo to run `gh pr list --state open --json number,title,author,createdAt,reviewRequests,labels` for all repos in `vault/01-projects/`.

2. **SLA check**: For each PR, calculate hours since opened. Flag:
   - GREEN: <24h since opened
   - YELLOW: 24-48h, review requested but no review yet
   - RED: >48h without review (SLA violation)

3. **Blockers**: Identify PRs where:
   - Cwizs requested but no update from author (>24h)
   - Review requested from someone with 3+ pending reviews (overloaded reviewer)
   - CI failing (blocked from merge)

4. **Present**: Show as a sorted table: RED first, then YELLOW, then GREEN.

```markdown
## PR Queue -- YYYY-MM-DD

| Status | PR | Repo | Author | Age | Reviewer | Issue |
|--------|-----|------|--------|-----|----------|-------|
| RED | #142 | frontend | alice | 52h | (none) | No reviewer assigned |
| YELLOW | #138 | api | bob | 30h | charlie | Awaiting review |
| GREEN | #145 | frontend | dave | 4h | alice | On track |

**SLA Compliance**: {n}/{total} PRs reviewed within 24h ({pct}%)
```
