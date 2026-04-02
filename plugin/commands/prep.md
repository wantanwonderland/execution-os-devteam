Meeting preparation. Pull all relevant vault, email, and calendar context for an upcoming meeting.

**Integration note**: This command works best with Gmail and Google Calendar MCP configured. Without them, it will use vault-only context (decisions, goals, team data) to build the prep briefing. Calendar event details and email thread history will be unavailable.

## Instructions

### With arguments

If `$ARGUMENTS` is provided (meeting name, person name, or topic):

1. **Find the meeting**: Use `calendar_events_list` for today (and tomorrow if late in the day). Search for an event matching `$ARGUMENTS` by title, attendee name, or topic keywords. If multiple matches, pick the closest upcoming one.

2. **Show meeting details**: Present the event's time, title, full attendee list, description/agenda (if any), and location/link.

3. **Search vault for attendee context**: For each attendee (by name or company):
   - Search vault file titles and tags for matches
   - Check `vault/01-projects/` for any project-related context
   - Check `vault/04-decisions/log/` for recent decisions involving them or their company

4. **Search vault for topic context**: Based on the meeting title and description:
   - Search tags and full-text for relevant content
   - Surface any active goals that relate to the meeting topic
   - Find related ADRs, RFCs, or frameworks in `vault/00-identity/` or `vault/02-docs/`

5. **Search recent emails**: Use `search_emails` to find recent email threads with the attendees (last 30 days). Summarize the most relevant 3-5 threads: subject, date, key points.

6. **Check recent decisions**: Search `vault/04-decisions/log/` for decisions from the last 30 days that relate to the meeting topic, attendees, or their company/venture.

7. **wantan-mem context** (optional): If wantan-mem MCP is available, search for cross-session context matching the attendee's name or meeting topic (e.g., past PR reviews, architectural decisions, prior meeting outcomes). If wantan-mem is not connected or no relevant observations are found, skip this step gracefully.

8. **Present the briefing** in this format:

   ```
   ## Meeting Prep: {title}
   **When**: {date} {time} ({how soon from now})
   **With**: {attendee list}
   **Where**: {location/link}

   ### Context from Vault
   - {relevant files, decisions, goals — bullet list with file paths}

   ### Recent Email Threads
   - {subject} ({date}) — {one-line summary}

   ### Recent Decisions
   - {decision title} ({date}) — {one-line summary}

   ### Memory Insights
   - {cross-session context from wantan-mem, if available — omit section if not connected or no match}

   ### Suggested Talking Points
   - {2-3 talking points based on the context gathered}
   ```

### No arguments — prep for next meeting

If `$ARGUMENTS` is empty:

1. Use `calendar_events_list` for the rest of today.
2. Find the next upcoming event (closest start time that hasn't passed).
3. If no more events today, check tomorrow.
4. If found, run the full prep flow above.
5. If no upcoming meetings found, say: "No upcoming meetings found today or tomorrow. Specify a meeting name or person to search for."

## Notes

- Keep the briefing concise — this is a pre-meeting glance, not a research paper.
- Prioritize actionable context: what does the owner need to know or decide in this meeting?
- If the meeting is with a team member, check team roster in `.claude/team/roster.md` and look for any tasks assigned to/from them.
