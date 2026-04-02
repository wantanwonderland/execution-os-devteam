---
name: auto-decision
description: Detect decision language in conversation and automatically log decisions to 04-decisions/log/. Use when {{OWNER_NAME}} says he decided, chose, committed, or is stopping/killing/pivoting something.
---

# Auto-Decision Detection

When {{OWNER_NAME}} expresses a decision, log it to `04-decisions/log/` without being asked.

## Trigger Language
- "I've decided...", "we're going with...", "I chose..."
- "I committed to...", "I will not...", "we're killing..."
- "We're stopping...", "pivoting to...", "no longer doing..."
- "From now on...", "the plan is to..."

## Decision Record Format
Create file at `04-decisions/log/YYYY-MM-DD-decision-short-name.md`:

```yaml
---
title: "Short decision description"
created: YYYY-MM-DD
type: decision
tags: [needs-review, ...]
status: active
venture: (detect from content)
related: []
---
```

### Body Structure
```markdown
## Decision
(What was decided — one clear sentence)

## Context
(Why this decision was made — what prompted it)

## State at Decision Time
- **Sprint**: (current sprint name/number)
- **Team**: (relevant team status — blockers, capacity, active PR load)
- **Key metric**: (the most relevant number to this decision)
- **Context**: (what triggered this decision — incident, retro finding, planning discussion, etc.)

## Alternatives Considered
(What was rejected and why, if mentioned)

## Expected Impact
(What changes as a result)
```

### State Snapshot Rules
- Only include metrics relevant to this specific decision (not a full dashboard dump)
- 3-5 bullets max — enough to replay the decision, not enough to bloat the file
- Pull from latest standup logs, sprint data, or incident reports when available
- If metrics aren't available in conversation, capture what {{OWNER_NAME}} mentions and note "[partial snapshot]"
- This section makes the decision replayable — future {{OWNER_NAME}} can see exactly what the world looked like when this call was made

## Rules
- Always add `needs-review` tag — decisions need strategic review in the web app
- Check alignment against `05-goals/active/` goals and note any connections in `related`
- Don't ask "is this a decision?" — if it matches trigger language, log it
- If the decision grants an exception, override, or deviation from standard policy, add `exception` tag
- If the decision explicitly references a prior decision as precedent, add `precedent` tag and link the referenced decision in `related`
