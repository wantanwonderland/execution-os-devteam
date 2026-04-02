Analyze and refactor a file or module. Levi + Senku collaboration.

Usage: `/refactor {file path or module name}`

## Steps

### Step 1: Read the Target

Load the full target:

- If a file path is given: `Read {file-path}`
- If a module name is given: `Glob` to locate all files in the module, then read each
- Note: lines of code, function count, dependency count

### Step 2: Dispatch Levi — Code Smell Detection

Levi reads the target and identifies code smells. Look for:

| Smell | Signal |
|-------|--------|
| Long function | Function > 30 lines |
| Deep nesting | Indentation level > 3 |
| Duplicate logic | Same block repeated 2+ times |
| God object | Class/module does >3 unrelated things |
| Feature envy | Function accesses another module's data more than its own |
| Magic numbers | Numeric literals without named constants |
| Dead code | Unreachable branches, unused variables, commented-out blocks |
| Primitive obsession | Raw strings/numbers representing concepts that deserve a type |

Levi returns a ranked list of smells: CRITICAL (blocks readability/maintainability) → WARNING (worth fixing) → NIT (optional).

### Step 3: Dispatch Senku — Architecture Improvement Proposals

Senku reads the target and Levi's smell report, then proposes architectural improvements:

| Pattern | When to Apply |
|---------|--------------|
| Extract function | Long function > 30 lines; repeated logic |
| Extract class | God object with unrelated responsibilities |
| Split module | File > 300 lines with distinct concerns |
| Introduce interface | Multiple implementations of the same concept |
| Replace conditional with polymorphism | Long switch/if-else on type |
| Introduce parameter object | Function with >4 parameters |
| Move function | Feature envy — function belongs to the class it envies |

Senku returns: a prioritized list of refactoring proposals, each with:
- Type of refactoring
- Before snapshot (current shape)
- After snapshot (proposed shape)
- Estimated complexity: S / M / L

### Step 4: Present Plan to Wantan

Compile Levi and Senku's findings into a refactoring plan:

```markdown
## Refactoring Plan: {file/module}

**Target**: `{file-path}`
**Lines**: {count} | **Functions**: {count}
**Smells found**: {count} ({critical} critical, {warning} warnings, {nit} nits)

### Proposed Changes

#### 1. {Refactoring type} — {Complexity: S/M/L}

**Why**: {Levi smell that motivates this}

**Before**:
```{language}
{current code shape}
```

**After**:
```{language}
{proposed code shape}
```

#### 2. {Next change...}

### What We Are NOT Changing

- {Behavior/interface that stays the same}
- {Scope boundary: what is out of scope for this refactoring}

### Risk Assessment

| Change | Risk | Mitigation |
|--------|------|-----------|
| {change} | {risk} | {mitigation} |
```

**Wait for Wantan's approval before executing.**

### Step 5: Execute (After Approval)

Once Wantan says "proceed" or "yes":

1. Apply each change in order, smallest scope first
2. After each change: verify the file still parses (no syntax errors)
3. Preserve all existing public interfaces — refactoring must not break callers

### Step 6: Dispatch Killua — Regression Check

After all changes are applied:

- Dispatch Killua to run existing test scenarios for the affected module
- If no test scenarios exist: flag this as a coverage gap and proceed with manual verification guidance

Killua returns: PASS or FAIL with details.

### Step 7: Commit

If Killua returns PASS (or no tests existed and changes are verified):

```bash
git add {changed files}
git commit -m "refactor: {brief description of what was improved}

- {change 1}
- {change 2}
- Tests: {pass count} passed, no regressions"
```

Commit prefix is always `refactor:`.

## Constraints

- Never change behavior — refactoring is structural, not functional
- Always get Wantan's approval on the plan before executing Step 5
- If Killua finds regressions: STOP. Report to Wantan. Do not commit.
- Scope creep rule: if you discover additional smells during execution, note them but do not fix them in this pass — keep the PR focused
- If the target file is >500 lines, recommend splitting into multiple refactoring passes
