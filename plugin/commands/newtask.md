Create a new task with optional due date and priority, routed to the appropriate vault location.

**Input**: $ARGUMENTS

## Steps

1. **Parse the input** for:
   - **Task description**: The core action to take
   - **Due date**: Look for phrases like "by Friday", "next Tuesday", "March 10", "end of week", "tomorrow", "today". Convert to YYYY-MM-DD. If none found, omit the `due` field.
   - **Priority**: Look for "urgent", "critical", "high priority", "low priority", "when you get a chance". Default to `medium` if not specified. Omit field if medium (keep frontmatter clean).
   - **Project references**: Auto-detect from content

2. **Route to destination** using CLAUDE.md auto-sort rules:
   - Project-specific work → `vault/01-projects/{project}/`
   - Research task → `vault/03-research/`
   - Goal-related task → update existing file in `vault/05-goals/active/`
   - General/unclear → `vault/08-inbox/captures/`

3. **Generate filename**: `YYYY-MM-DD-` + slugified task description (max 5 words) + `.md`

4. **Create the file** with frontmatter:

```yaml
---
title: "[task description]"
created: [today's date]
type: task
tags: [auto-detect from content]
status: active
project: [auto-detect from content]
related: []
due: [parsed date if found]        # omit if no date detected
priority: [parsed priority]         # omit if medium/default
---
```

5. **Body**:

```markdown
# [Task Description]

## Next Actions
- [ ] [First concrete step parsed from input]

## Notes
[Any additional context from the input]
```

6. **Confirm**: Show the file path, due date (if set), priority, destination rationale, and tags applied.

## Examples of natural language parsing

| Input | Due | Priority |
|-------|-----|----------|
| "follow up with Acme Corp on training schedule next Tuesday" | next Tuesday's date | medium (omitted) |
| "urgent: send revised proposal to the client by Friday" | this Friday's date | critical |
| "research competitor AI course pricing" | (none) | medium (omitted) |
| "call partner team tomorrow morning" | tomorrow's date | medium (omitted) |
| "low priority: update speaker kit with new headshot" | (none) | low |
