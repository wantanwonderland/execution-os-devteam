---
name: runbook-writer
description: L's operational runbook skill. Generates step-by-step runbooks from incident postmortems and operational knowledge.
---

# Runbook Writer Workflow

When L is dispatched to create a runbook — typically from a postmortem action item or a recurring operational task.

## Input

L receives a topic (e.g., "database failover procedure", "deploy rollback steps") and optionally a postmortem file to extract steps from.

## Step 1: Gather Context

1. If postmortem provided: read timeline and resolution steps
2. Search `vault/09-ops/incidents/` for related incidents
3. Search `vault/02-docs/runbooks/` for existing runbooks on similar topics
4. Check relevant deploy/infra documentation

## Step 2: Write Runbook

```markdown
---
title: "{Topic} Runbook"
created: YYYY-MM-DD
type: note
tags: [runbook, {topic-tags}]
status: active
project: {project}
related: [{source-postmortem, related-runbooks}]
---

## Purpose

{One sentence: when to use this runbook}

## Prerequisites

- [ ] Access to {system/tool}
- [ ] Permissions: {required access level}
- [ ] Knowledge: {assumed background}

## Steps

### 1. {First action}

```bash
{exact command}
```

**Expected**: {what you should see}
**If failed**: {what to do instead}

### 2. {Second action}

```bash
{exact command}
```

**Expected**: {what you should see}
**If failed**: {what to do instead}

### 3. {Continue...}

## Verification

After completing all steps, verify:
- [ ] {Check 1}
- [ ] {Check 2}

## Rollback

If this procedure needs to be undone:
1. {Rollback step 1}
2. {Rollback step 2}

## History

| Date | Cwiz | Author |
|------|--------|--------|
| {created} | Initial version | L |

## Connections

- Source incident: {link to postmortem if applicable}
- Related runbooks: {links}
```

## Step 3: File

Save to `vault/02-docs/runbooks/{topic-slug}-runbook.md`

## Constraints

- Every step MUST have exact commands, not descriptions
- Every step MUST have "Expected" and "If failed" subsections
- ALWAYS include a Rollback section
- Source from real incidents/procedures, never fabricate steps
