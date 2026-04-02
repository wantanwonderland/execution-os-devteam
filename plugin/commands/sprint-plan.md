Sprint planning ceremony. Set goals for the upcoming sprint based on velocity data.

## Steps

1. **Velocity baseline**: Dispatch Kazuma to query `sprint_metrics` for the last 3 sprints. Show: committed vs completed, velocity trend (up/down/flat).

2. **Backlog review**: Show open issues/PRs and tech debt items from `tech_debt` table. Group by priority.

3. **Sprint goals**: Ask: "What are the 3-5 sprint goals?" For each, identify:
   - Assigned agent (Conan, Rohan, etc.)
   - Estimated story points
   - Dependencies (which stories must complete before this one starts)

4. **Parallel wave plan**: Organize stories into parallel execution waves based on agent capabilities and SDD pipeline dependencies. Multiple agents work simultaneously — Conan + Rohan + Killua can all run in parallel on independent stories.

5. **Sprint duration**: Default to 3-5 days for AI team. Only use longer sprints if the user explicitly requests it.

6. **Commitment**: Based on velocity baseline (if available), recommend commitment level. For first sprint, commit all stories and establish baseline. Flag dependency chains that may bottleneck.

6. **Write sprint plan**: Create `vault/06-ceremonies/sprint-review/YYYY-MM-DD-sprint-{id}-plan.md` with goals, commitments, and velocity context. Write sprint goals to `sprint_metrics` table.

7. **Update sprint_metrics**: Insert new sprint record with committed values.
