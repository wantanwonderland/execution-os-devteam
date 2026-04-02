Generate or view the current week's metrics pulse. Computes execution patterns and system health from vault data.

## Steps

1. **Determine current week**: Calculate ISO week number and date range (Monday to Sunday) for today's date.

2. **Check for existing pulse**: Look for `vault/06-ceremonies/pulse-YYYY-WNN.md` for the current week. If it exists and was updated today, show it and skip to Step 8. If it exists but is stale (not updated today), proceed to recompute.

3. **Compute dev execution metrics** (use subagent for vault-wide scans):
   - Query `vault/data/company.db` sprints table — extract sprint goal completion rate for current and last sprint
   - Query pull_requests table — count PRs opened, merged, and closed this week; compute PR throughput
   - Query deployment_logs table — count deploys this week per environment (staging, production)
   - Query incidents table — count incidents this week by severity (P0/P1/P2/P3); compute MTTR if resolved
   - Query kpi_metrics table — extract latest test_pass_rate and security_posture values
   - Count `vault/06-ceremonies/standup/` files for current week's weekdays (standup attendance proxy)
   - Count files in `vault/04-decisions/log/` created this week

4. **Compute system health metrics** (use subagent):
   - Count correction rows in `.claude/tasks/lessons.md` for current week, grouped by Category
   - Count `.md` files with `created` date in current week (excluding `.claude/`, `.git/`)
   - Count routing-category corrections
   - Grep all vault `.md` files for `needs-review` tag — count total

5. **Detect patterns**:
   - Sprint goal completion trend (improving, declining, flat over last 3 sprints)
   - PR throughput streaks (3+ days high or low PR merge rate)
   - Deploy frequency trend vs previous week
   - Incident count trend — flag if P0/P1 count increased vs prior week
   - Test pass rate trend — flag if dropped below threshold
   - Correction categories with 3+ all-time occurrences
   - Needs-review backlog trend (compare to last week if prior pulse exists)
   - Grep standup logs for "blocked", "slipping", "at risk", "dependency"

6. **Load previous week's pulse** (if exists): Extract last week's metrics for trend comparison.

7. **Generate pulse file**: Write `vault/06-ceremonies/pulse-YYYY-WNN.md` using the template from `.claude/skills/metrics-pulse/SKILL.md`. Include all computed data, trends, patterns, and 1-3 recommendations.

8. **Display summary**: Show a compact dashboard:
   ```
   ## Weekly Pulse — WNN
   Sprint goal: X% | PR throughput: N merged | Deploys: N | Incidents: N
   Test pass rate: X% | Security posture: {status} | Standup: N/5
   Corrections: N (top: category) | Backlog: N needs-review
   Recommendations: [1-liner each]
   ```

9. **Set previous pulse to done**: If a pulse exists for the prior week, set its `status: done`.
