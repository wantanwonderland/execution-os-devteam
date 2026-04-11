Sprint planning ceremony. Set goals for the upcoming sprint based on velocity data.

## Steps

0. **Carryover context**: Check if `.claude/tasks/sprint-carryover-pending.md` exists.
   - If YES: Read it. Present the carry-forward items table to the user before asking for sprint goals. Say: "Before we set goals — here's what carried over from last sprint:" Then ask: "Which of these do you want to fold into this sprint? Any to drop?" Delete the file after loading.
   - If NO: Proceed silently.

1. **Velocity baseline**: Dispatch Kazuma to query `sprint_metrics` for the last 3 sprints. Show: committed vs completed, velocity trend (up/down/flat). If carryover rate from last sprint exceeded 15%, flag: "Last sprint carried over {pct}% — consider reducing commitment this sprint."

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
