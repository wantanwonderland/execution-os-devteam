---
name: adr-writer
description: L's Architecture Decision Record skill. Generates structured ADRs capturing context, decision, and consequences for the decision log.
---

# ADR Writer Workflow

When L is dispatched to write an Architecture Decision Record.

## Input

L receives a decision topic — either from a `/decide` capture, a conversation, or an explicit request.

## Step 1: Context Research

1. Search vault for related decisions: `04-decisions/log/` files with similar tags
2. Search ADRs: `02-docs/adr/` for precedents
3. If the decision involves a library/framework, research alternatives

## Step 2: Determine ADR Number

```bash
ls 02-docs/adr/ | grep -oP 'adr-\K[0-9]+' | sort -n | tail -1
```

Increment by 1. If no ADRs exist, start at 001.

## Step 3: Write ADR

```markdown
---
title: "ADR-{NNN}: {Decision Title}"
created: YYYY-MM-DD
type: adr
tags: [architecture, {topic-tags}]
status: active
project: {project}
related: [{related-files}]
---

## Status

Proposed | Accepted | Deprecated | Superseded by ADR-{NNN}

## Context

{Why this decision is needed. What problem or opportunity prompted it.
Include constraints, requirements, and forces at play.}

## Decision

{What we decided. Be specific — name the technology, pattern, or approach chosen.}

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| {Chosen option} | {pros} | {cons} |
| {Alternative 1} | {pros} | {cons} |
| {Alternative 2} | {pros} | {cons} |

## Consequences

### Positive
- {What this enables or improves}

### Negative
- {What trade-offs we accept}

### Risks
- {What could go wrong}

## Connections

- Related decisions: {links to related ADRs or decision log entries}
- Affected components: {which repos/modules are impacted}
```

## Step 4: File and Cross-Reference

1. Save to `02-docs/adr/YYYY-MM-DD-adr-{NNN}-{title-slug}.md`
2. Update `related:` fields in connected vault files
3. Log to wantan-mem as observation

## Constraints

- ALWAYS include Alternatives Considered — a decision without alternatives is not a decision
- Cross-reference related vault files in every ADR
- Status must be one of: Proposed, Accepted, Deprecated, Superseded
