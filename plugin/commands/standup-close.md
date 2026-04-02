End-of-day standup close. Score today's commitments and capture decisions.

## Steps

1. **Today's commitments check**: Read today's standup log from `06-ceremonies/standup/`. For each commitment, ask: "Done, in-progress, or blocked?"

2. **Say-do score**: Calculate: commitments completed / commitments made. Show as percentage.

3. **PRs updated**: Check if any PRs were merged or updated today via `gh pr list --state all --json number,title,mergedAt,updatedAt`.

4. **Decision capture**: Ask: "Did you make any decisions today that should be logged?" If yes, capture to `04-decisions/log/`.

5. **Update standup log**: Update today's entry in `06-ceremonies/standup/` with completion status and say-do score.

6. **Tomorrow preview**: Show any tasks due tomorrow and upcoming sprint deadlines.

Keep this under 3 minutes. Status check, not a deep dive.
