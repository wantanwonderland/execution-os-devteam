Quick capture to the vault inbox. Create a new file in `vault/08-inbox/captures/` from the user's input.

**Input**: $ARGUMENTS

## Steps

1. Generate a filename: `YYYY-MM-DD-` + slugified summary of the content (max 5 words) + `.md`
   - Use today's date
   - Example: `2026-03-04-margin-compression-response.md`

2. Create the file in `vault/08-inbox/captures/` with this frontmatter:

```yaml
---
title: "[descriptive title from content]"
created: [today's date]
type: capture
tags: [auto-detect from content using CLAUDE.md tagging rules]
status: active
venture: [auto-detect from content, default: personal]
related: []
---
```

3. Write the user's input as the body content below the frontmatter.

4. **Review flag check**: If the content contains decision language, goal references, new commitments, or priority shifts (per CLAUDE.md review flag triggers), add `needs-review` to the tags array.

5. **Sort suggestion**: Based on auto-sort rules in CLAUDE.md, suggest where this capture should eventually be moved. Example: "This looks like a decision — consider moving to `vault/04-decisions/log/` or run `/decide` to log it properly."

6. Confirm: show the file path and tags applied.
