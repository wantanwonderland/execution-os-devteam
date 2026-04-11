Sprint closeout ceremony. Audits completion, scans for unimplemented stubs, forces explicit carryover decisions, and stages context for the next sprint plan.

Run this AFTER `/sprint-review` and `/retro` but BEFORE starting the next sprint.

## Steps

### Step 1: Velocity audit

Dispatch **Kazuma** to pull the closing sprint's data from `sprint_metrics`:
- Committed vs completed stories and points
- Goal-by-goal status: DONE / PARTIAL / NOT DONE
- Completion rate and trend vs previous sprint

Present the summary table. Kazuma opens with: "I'm Kazuma — here's how the party actually performed."

### Step 2: Stub scan

Dispatch **Kazuma** to scan the project for unimplemented code left in the sprint. Run these searches across the repo (exclude `node_modules/`, `dist/`, `.git/`, and test fixture directories):

**Patterns to grep for:**
```
throw new Error\(.*[Nn]ot [Ii]mplemented
TODO:|FIXME:|HACK:
\/\/ stub|\/\/ placeholder|\/\/ not implemented
NotImplementedException|raise NotImplementedError
return null;?\s*\/\/ TODO
^\s*\{\s*\}\s*$   (empty function body — check .ts/.js files only)
```

For each match, record:
- File path
- Line number
- Pattern matched
- Nearest enclosing function/class name (from context lines)

Group results by file. Filter out any match inside a `*.spec.ts`, `*.test.ts`, `*.spec.js`, or `*.test.js` file — test stubs are expected.

Present as:
```
## Stub Scan Results — Sprint {id}

| File | Line | Pattern | Context |
|------|------|---------|---------|
| src/khitbah/khitbah.service.ts | 42 | throw new Error('not implemented') | KhitbahService.create() |
```

If zero stubs found: "Clean scan — no unimplemented stubs detected."

### Step 3: Carryover decisions

For every item in either of these lists:
- Sprint goals marked PARTIAL or NOT DONE (from Step 1)
- Stub scan findings (from Step 2)

Ask the user to decide per item:

```
[story_id] {title}
  Status: PARTIAL / NOT DONE / STUB
  File: {stub_path if applicable}
  Agent: {assigned agent}
  Decision: (1) Carry forward  (2) Deprioritize  (3) Split into sub-tasks
  Reason (optional):
```

Collect all decisions before proceeding.

### Step 4: Write carryover ledger

Create `vault/06-ceremonies/sprint-review/YYYY-MM-DD-sprint-{id}-carryover.md`:

```markdown
---
title: Sprint {id} Carryover Ledger
sprint: {id}
date: YYYY-MM-DD
type: carryover-ledger
tags: [sprint, carryover, ceremony]
---

## Sprint {id} — Carryover Decisions

| Story ID | Title | Status | Decision | To Sprint | Agent | Stub Path | Reason |
|----------|-------|--------|----------|-----------|-------|-----------|--------|
| SC-10 | Khitbah service | NOT DONE | carry_forward | {next_sprint_id} | Conan | src/khitbah/khitbah.service.ts | Session ran long |

## Stub Scan Summary
- Total stubs found: {n}
- Carried forward: {n}
- Deprioritized: {n}
- Split: {n}

## Root Cause Notes
{any patterns observed — e.g., "TDD scaffold pattern leaves service stubs unfilled when session exceeds 3 sprints"}
```

### Step 5: Insert to DB

For each carryover decision, insert a row into `sprint_carryover`:

```sql
INSERT INTO sprint_carryover
  (story_id, title, from_sprint, to_sprint, decision, reason, stub_path, agent)
VALUES
  ('{story_id}', '{title}', '{from_sprint}', '{to_sprint_or_NULL}', '{decision}', '{reason}', '{stub_path_or_NULL}', '{agent}');
```

Run: `sqlite3 vault/data/company.db < insert_carryover.sql` (write the SQL to a temp file, execute, then delete).

Confirm row count matches decision count.

### Step 6: Stage next sprint context

Write `.claude/tasks/sprint-carryover-pending.md`:

```markdown
## Carryover from Sprint {id} — {date}

The following items were not completed in Sprint {id} and are staged for next sprint planning.
Review each item: include as a sprint goal, fold into an existing goal, or deprioritize again.

### Carry-Forward Items

| Story ID | Title | Agent | Stub Path | Reason Incomplete |
|----------|-------|-------|-----------|-------------------|
| SC-10 | Khitbah service — implement service body | Conan | src/khitbah/khitbah.service.ts | Session ran long, TDD scaffold left stub unfilled |

### Context for Next Sprint Plan
- Carryover rate this sprint: {pct}% ({n} of {committed} stories)
- Stubs found: {n} (carried forward: {n}, deprioritized: {n})
- If carryover rate > 15%: consider reducing sprint commitment next sprint
```

This file is read automatically by `/sprint-plan` Step 0 and deleted after loading.

### Step 7: Final report

```
## Sprint {id} Close Report

### Velocity
- Committed: {n} stories / {pts} pts
- Completed: {n} stories / {pts} pts  
- Rate: {pct}%

### Stub Scan
- Files scanned: {n}
- Stubs found: {n}
- Carried forward: {n}

### Carryover Decisions
| Story ID | Decision |
|----------|----------|
| SC-10 | carry_forward → Sprint {next} |
| VR-05 | carry_forward → Sprint {next} |

### Files Written
- vault/06-ceremonies/sprint-review/{date}-sprint-{id}-carryover.md
- .claude/tasks/sprint-carryover-pending.md

### DB Updated
- sprint_carryover: {n} rows inserted

Sprint {id} is closed. Run `/sprint-plan` to begin Sprint {next}.
```
