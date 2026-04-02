Declare and track an incident. Auto-routes to Shikamaru + L.

Usage: `/incident {severity} {repo} "{description}"`
Example: `/incident P1 frontend-app "Checkout returning 500 after deploy v1.4.2"`

## Steps

1. **Parse input**: Extract severity (P0-P3), repo, and description from the user's message. If not provided, ask for each.

2. **Create incident record**: Insert into `incidents` table:
   - severity, title, repo, detected_at = now()

3. **On-call check**: Query `oncall_rotation` for current primary on-call. Report: "{name} is primary on-call."

4. **Dispatch Shikamaru**: Check latest deploy for the affected repo. Prepare rollback recommendation if recent deploy correlates with incident timing.

5. **Dispatch L**: Create incident document at `09-ops/incidents/YYYY-MM-DD-{incident-slug}.md` with:
   - Severity, repo, timeline, current status
   - Template sections: Timeline, Root Cause (TBD), Action Items, Postmortem

6. **Dispatch Killua** (if browser-testable): Run smoke tests on affected flows to confirm scope.

7. **Present summary**: Show all agent findings with recommended next action (rollback, investigate, monitor).
