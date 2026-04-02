---
name: tech-debt-tracker
description: Senku's tech debt management skill. Inventory, prioritization, and resolution tracking across repos.
---

# Tech Debt Tracker

Senku manages the tech debt inventory, prioritizes items, and tracks resolution.

## Mode 1: Inventory

List all open tech debt items:

```sql
SELECT id, repo, title, severity, category, created_at, owner,
  julianday('now') - julianday(created_at) as age_days
FROM tech_debt
WHERE resolved_at IS NULL
ORDER BY
  CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
  age_days DESC;
```

Present as:

```markdown
## Tech Debt Inventory

| # | Repo | Title | Severity | Category | Age (days) | Owner |
|---|------|-------|----------|----------|------------|-------|

**Summary**: {total} items ({critical} critical, {high} high, {medium} medium, {low} low)
**Oldest unresolved**: {title} ({age} days)
```

## Mode 2: Add Item

When a new tech debt item is identified (from Diablo's review, Itachi's scan, or manual capture):

```sql
INSERT INTO tech_debt (repo, title, severity, category, created_at, owner)
VALUES ('{repo}', '{title}', '{severity}', '{category}', datetime('now'), '{owner}');
```

Categories: `dependency`, `architecture`, `testing`, `documentation`, `performance`, `security`

## Mode 3: Resolve Item

When tech debt is resolved:

```sql
UPDATE tech_debt SET resolved_at = datetime('now') WHERE id = {id};
```

If an ADR exists for the resolution, link it:
```sql
UPDATE tech_debt SET decision_path = '{adr_path}' WHERE id = {id};
```

## Mode 4: Prioritize

Senku evaluates priority using:

1. **Impact**: How much does this affect velocity, reliability, or security?
2. **Effort**: How much work to resolve? (T-shirt: S/M/L/XL)
3. **Risk of delay**: What happens if we don't fix this for another quarter?
4. **Dependencies**: Does other work depend on this being fixed first?

Score = (Impact x Risk) / Effort — highest score = highest priority

## Mode 5: Sprint Recommendation

At sprint planning, recommend which tech debt items to include:

1. Query items by priority score
2. Filter to items that fit the sprint's capacity allocation for tech debt (typically 10-20%)
3. Present top 3-5 candidates with rationale

## Constraints

- Tech debt is never "added silently" — always announce to the user
- Every item MUST have a severity and category
- Resolved items are kept as records (resolved_at set, not deleted)
- Link ADRs when decisions drive resolution
