Review gated agent actions awaiting your approval.

## Steps

1. **Scan inbox**: Read all `.md` files in `.claude/owner-inbox/` (excluding README.md and archive/). Filter to files where `status: pending` in frontmatter.

2. **Sort**: Order by risk level (`blocked` first, then `review-required`), then by date (oldest first).

3. **Present**: Show each pending item:

```markdown
## Pending Approvals ({count} items)

### 1. [BLOCKED] Shikamaru: Production rollback for frontend-app
   Risk: blocked | Project: frontend-app | From: shikamaru
   Action: Rollback production to v1.3.9
   → Reply "CONFIRM 1" to approve, "no 1" to reject

### 2. [REVIEW] Levi: PR #142 review comment
   Risk: review-required | Project: frontend-app | From: levi
   Action: Post review comment with 2 critical, 1 warning findings
   → Reply "go 2" to approve, "no 2" to reject, "edit 2" to modify
```

4. **Process responses**:
   - `"go {n}"` or `"yes {n}"` → Approve item n: execute the action, set `status: approved`
   - `"go all"` → Approve all review-required items (NOT blocked items — those need CONFIRM)
   - `"CONFIRM {n}"` → Approve a blocked item (explicit confirmation required)
   - `"no {n}"` or `"skip {n}"` → Reject: set `status: rejected`
   - `"edit {n}"` → Show full content, allow modifications, then approve
   - Ambiguous → ask for clarification

5. **After processing**: For each approved action, execute it and log to wantan-mem. For each rejected action, log the rejection.

6. **Archive**: Move files with `status: approved` or `status: rejected` that are 7+ days old to `.claude/owner-inbox/archive/`.

If no pending items: "Inbox clear. No actions awaiting approval."
