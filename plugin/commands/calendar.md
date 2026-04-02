Calendar interaction hub. View schedule, create events, find free time.

**Requires**: Google Calendar MCP integration. If Google Calendar MCP is not configured, respond: "Google Calendar is not connected yet. See `INTEGRATIONS.md` for setup instructions." and stop.

## Instructions

Parse `$ARGUMENTS` to determine intent, then follow the matching behavior below.

### No arguments — show today's schedule

If `$ARGUMENTS` is empty:

1. Use `calendar_events_list` with today's date as the start and end range.
2. Present events in chronological order: **time range**, title, attendees count, location (if any).
3. Highlight any event starting within the next 2 hours with a "Coming up" marker.
4. If no events, say "Calendar is clear today."

### "this week" — show week view

If arguments contain "this week" or "week":

1. Use `calendar_events_list` with today as start and 7 days from today as end.
2. Group events by day.
3. Show: day header, then time, title, attendees count for each event.

### "tomorrow" — show tomorrow's schedule

If arguments contain "tomorrow":

1. Use `calendar_events_list` with tomorrow's date range.
2. Same format as today's view.

### "free time" / "when am I free" — find available slots

If arguments mention "free", "available", or "open":

1. Use `calendar_freebusy_query` for the relevant period (default: rest of this week).
2. Present free slots grouped by day: day header, then available time ranges.
3. Suggest: "Want me to block any of these for focused work?"

### "schedule" / "create" / "set up" — create an event

If arguments contain "schedule", "create", "set up", "book", or "add" with event details:

1. Parse the event details: title, date/time, duration (default 1 hour), attendees (if mentioned).
2. Confirm the details before creating: "I'll create: **{title}** on {date} at {time} for {duration}. Attendees: {list}. Go ahead?"
3. After confirmation, use `calendar_event_create` to create it.
4. Confirm with the event details and a link if available.

### "find time" / "find a slot" — find mutual availability

If arguments mention "find time" or "find a slot" with attendees:

1. Use `calendar_freebusy_query` with the specified attendees and duration.
2. Present the top 3-5 available slots.
3. Ask to pick one, then create the event.

### "block" — create a focus block

If arguments contain "block" (e.g., "block 2 hours for deep work tomorrow morning"):

1. Parse the duration, purpose, and preferred time.
2. If no specific time, use `calendar_freebusy_query` to find a suitable slot.
3. Confirm, then use `calendar_event_create` to create a focus block.
4. Mark it as a private event with the purpose as the title.

### "cancel" / "delete" — remove an event

If arguments contain "cancel" or "delete":

1. Search today's or specified day's events for the matching event.
2. Show the event details and confirm: "Cancel **{title}** on {date} at {time}?"
3. After confirmation, use `calendar_event_delete`.
4. Confirm deletion.

### "move" / "reschedule" — update an event

If arguments contain "move" or "reschedule":

1. Find the matching event.
2. Parse the new time/date.
3. Confirm the change.
4. Use `calendar_event_update` to update it.
5. Confirm the update.

## Defaults

- Duration: 1 hour unless specified
- Calendar: primary calendar unless specified
- Time zone: owner's default (from calendar settings)
