Sprint planning ceremony. Set goals for the upcoming sprint based on velocity data.

## Steps

1. **Velocity baseline**: Dispatch Erwin to query `sprint_metrics` for the last 3 sprints. Show: committed vs completed, velocity trend (up/down/flat).

2. **Capacity check**: Ask: "Any PTO, holidays, or reduced capacity this sprint?" Adjust available capacity.

3. **Backlog review**: Show open issues/PRs and tech debt items from `tech_debt` table. Group by priority.

4. **Sprint goals**: Ask: "What are the 3-5 sprint goals?" For each, identify:
   - Owner (squad or individual)
   - Estimated story points
   - Dependencies

5. **Commitment**: Based on velocity baseline and capacity, recommend a realistic commitment level. Flag if proposed work exceeds historical velocity by >20%.

6. **Write sprint plan**: Create `06-ceremonies/sprint-review/YYYY-MM-DD-sprint-{id}-plan.md` with goals, commitments, and velocity context. Write sprint goals to `sprint_metrics` table.

7. **Update sprint_metrics**: Insert new sprint record with committed values.
