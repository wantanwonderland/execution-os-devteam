Log a decision to the vault. Create a structured decision record in `vault/04-decisions/log/`.

**Input**: $ARGUMENTS

## Steps

1. Generate a filename: `YYYY-MM-DD-decision-` + slugified short name + `.md`
   - Use today's date
   - Example: `2026-03-04-decision-pivot-to-gemini.md`

2. Create the file in `vault/04-decisions/log/` with this structure:

```yaml
---
title: "Decision: [short description from input]"
created: [today's date]
type: decision
tags: [auto-detect from content, always include needs-review]
status: active
venture: [auto-detect from content]
related: []
---
```

3. Body structure (fill what you can from the input, leave placeholders for what's missing):

```markdown
# Decision: [Short Description]

## What
[The specific choice made — one sentence]

## Why
[Rationale — why this over alternatives]

## Goal Alignment
[Which active goal(s) this serves — check vault/05-goals/active/ if needed]

## Revenue Impact
[Direct / indirect / none — and brief explanation]
```

4. **Apply decision filters**: Reference `vault/00-identity/values/decision-filters.md` and briefly note which of the 5 filters this decision passes. If any filter is unclear, flag it.

5. Confirm: show the file path, tags, and any filters that need attention.
