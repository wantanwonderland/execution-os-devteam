# Owner Inbox

Gated agent actions land here as draft files for your review.

## How It Works

1. An agent proposes an action with external side effects (GitHub comment, deploy, issue creation)
2. Wantan validates the output and writes a draft file here
3. You review via `/inbox` and approve, reject, or edit
4. Approved actions are executed; rejected actions are discarded
5. Processed files move to `archive/` after 7 days

## Draft File Format

```yaml
---
title: "{Agent}: {action description}"
created: YYYY-MM-DD
type: gate-draft
tags: [gate, {agent-name}, {action-type}]
status: pending | approved | rejected | edited
from: {agent-name}
action: {action-type}
risk: review-required | blocked
project: {project-name}
approved_at: YYYY-MM-DD    # set when approved
---
```

## Status Values

- **pending** — awaiting your review
- **approved** — you said go, action executed
- **rejected** — you said no, action discarded
- **edited** — you modified before approving

## Quick Actions

- `/inbox` — see all pending items
- "go 1" — approve item 1
- "go all" — approve all pending
- "no 2" — reject item 2
- "edit 1" — modify item 1 before approving
