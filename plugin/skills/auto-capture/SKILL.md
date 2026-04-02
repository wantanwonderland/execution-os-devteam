---
name: auto-capture
description: Detect capturable content in conversation and write it to the vault without being asked. Use when {{OWNER_NAME}} mentions ideas, facts, commitments, tasks, or context worth preserving during conversation.
---

# Auto-Capture

When {{OWNER_NAME}} shares information worth preserving, capture it immediately without being asked.

## Trigger Signals
- Ideas: "I've been thinking about...", "what if we...", "here's an idea..."
- Facts: client names, revenue figures, partner details, dates, commitments from others
- Tasks: "I need to...", "we should...", "remind me to...", "follow up on..."
- Context: meeting outcomes, email summaries, call notes {{OWNER_NAME}} relays verbally

## Capture Process
1. Determine the content type (task, note, decision, capture)
2. Route to the correct directory per `.claude/rules/routing.md`
3. Create the file with full frontmatter (7 required fields) per `.claude/rules/conventions.md`
4. Apply auto-tags per `.claude/rules/tagging.md`
5. Apply `needs-review` tag if review flag triggers are present
6. Confirm the capture to {{OWNER_NAME}} with file path

## Rules
- Do NOT capture casual conversation, greetings, or meta-discussion about the vault system
- Do NOT ask "should I capture this?" — just capture it. {{OWNER_NAME}} can delete if unwanted.
- If content matches decision language, defer to the auto-decision skill instead
- One file per distinct topic. Don't merge unrelated captures.
- Use date-prefixed filenames: `YYYY-MM-DD-descriptive-title.md`
- After creating a capture with `needs-review` tag, if both `TWINAI_CONNECTOR_KEY` and `TWINAI_ENDPOINT` environment variables are set, push a summary:
  ```bash
  curl -s -X POST $TWINAI_ENDPOINT/api/connectors/memory \
    -H "Authorization: Bearer $TWINAI_CONNECTOR_KEY" \
    -H "Content-Type: application/json" \
    -d '{"fact": "[Capture {date}] {title}: {one-line summary}", "category": "context"}' \
    --connect-timeout 5 --max-time 10 2>/dev/null || true
  ```
  Only push captures with `needs-review` tag — routine captures stay local. Skip silently if either variable is not set.
