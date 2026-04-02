Debug an error or unexpected behavior. Wiz + Diablo collaboration.

Usage: `/debug {error message, stack trace, or description}`

## Steps

### Step 1: Parse Input

Extract from the user's message:
- **Error message**: exact error text (if provided)
- **Stack trace**: file paths, line numbers, function calls (if provided)
- **Description**: what the user observed vs expected
- **Repo**: which repository (if mentioned; otherwise ask or infer from recent context)

### Step 2: Recent Cwiz Context

Check what changed recently — many bugs are regressions:

```bash
git log --since=yesterday --oneline
git log --since="7 days ago" --oneline --all
```

If a stack trace names specific files, check recent changes to those files:

```bash
git log --since="7 days ago" --oneline -- {file-path}
git diff HEAD~5 -- {file-path}
```

### Step 3: CI Status Check

Check if the error is already surfacing in CI:

```bash
gh run list --limit 5
gh run view {most-recent-run-id} --log-failed
```

Surface any failing test names — they narrow the search radius.

### Step 4: Search wantan-mem for Similar Errors

Before researching externally, check if this or a similar error has been seen before:

- Search wantan-mem for the error message or key terms
- If a prior resolution exists, surface it first with confidence: "**Known error** — we've seen this before: {resolution}"

### Step 5: Route to Specialist

Analyze the error type and dispatch accordingly:

| Error Type | Route To |
|-----------|----------|
| External library error, unknown API behavior, third-party SDK issue | Wiz |
| Code in active PRs or modules recently reviewed | Diablo |
| Both internal code AND external dependency | Wiz first, then Diablo |

**Dispatch Wiz** (if external library involved):
- Search for the exact error in library docs, GitHub issues, Stack Overflow
- Check the library's changelog for breaking changes near the version in use
- Return: root cause hypothesis, confidence level, suggested fix

**Dispatch Diablo** (if error is in codebase code):
- Read the relevant file(s) from the stack trace
- Check for null/undefined access, missing error handling, race conditions, type mismatches
- Cross-reference with recent PRs that touched these files
- Return: root cause hypothesis, confidence level, line-specific fix suggestion

### Step 6: Synthesize Root Cause

Compile findings from both agents into a structured debug report:

```markdown
## Debug Report: {error-slug}

**Error**: `{error message}`
**Date**: YYYY-MM-DD
**Repo**: {repo}

### Root Cause (Confidence: HIGH / MEDIUM / LOW)

{1-3 sentence explanation of what is failing and why}

### Evidence

| Signal | Finding |
|--------|---------|
| Recent change | {git log finding or "no recent changes to affected files"} |
| CI status | {passing / failing — test name if failing} |
| Prior occurrence | {wantan-mem finding or "first time seen"} |
| Wiz research | {external finding if applicable} |
| Diablo analysis | {code finding if applicable} |

### Suggested Fix

```{language}
{before/after code snippet, or specific change to make}
```

### Alternative Hypotheses

- {Lower-confidence alternative root cause 1}
- {Lower-confidence alternative root cause 2}

### Next Steps

- [ ] {Concrete action to apply fix}
- [ ] {Verification step: how to confirm fix worked}
- [ ] {If fix doesn't work: next thing to try}
```

### Step 7: Write to wantan-mem

After resolving (or even mid-investigation if finding is significant):

Log an observation to wantan-mem:
- Topic: `debug/{error-slug}`
- Content: error signature, root cause, fix applied, confidence
- This feeds future Step 4 (prior occurrence search)

### Step 8: Present to Wantan

Deliver the full debug report in conversation. If confidence is HIGH, lead with the fix. If confidence is MEDIUM or LOW, lead with the most promising hypothesis and the verification path.

## Constraints

- Never guess without evidence — every hypothesis needs a supporting signal
- Confidence levels must be honest: HIGH = confirmed in code/docs, MEDIUM = probable, LOW = speculative
- If the stack trace points to node_modules or vendor code, Wiz takes primary
- If no stack trace is provided, ask Wantan for one before proceeding past Step 2
- Always check wantan-mem before searching externally
