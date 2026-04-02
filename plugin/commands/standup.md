Daily standup for the dev team. Quick status check and commitment setting.

## Steps

1. **Yesterday's commitments**: Read `06-ceremonies/standup/` for the most recent entry. Show commitments and completion status. If no entries yet, say "First standup -- no history."

2. **Open PRs**: Dispatch Erwin to run `gh pr list --state open --json number,title,author,createdAt,reviewRequests` for all registered repos in `01-projects/`. Show: PR number, title, author, age in hours, review status. Flag any PR open >48h as "STALE".

3. **CI Health**: Dispatch Erwin to check `gh run list --limit 5` for each repo. Show pass/fail status. Flag any failing workflows.

4. **Blockers from yesterday**: Ask the user: "Any blockers from yesterday?"

5. **Today's focus**: Ask the user: "What are your 3 priorities for today?" Each should connect to a sprint goal or PR.

6. **Write standup log**: Create `06-ceremonies/standup/YYYY-MM-DD-standup.md` with frontmatter (type: review, status: active, project: all) containing: yesterday's status, today's commitments, open PRs snapshot, blockers.

Present everything in a clean dashboard format. This should take under 5 minutes.
