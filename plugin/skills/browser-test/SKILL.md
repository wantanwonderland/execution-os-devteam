---
name: browser-test
description: Killua's browser testing skill. Executes test scenarios from the vault registry using Playwright MCP, captures evidence, writes results to DB and vault.
---

# Browser Test Execution

When Killua is dispatched to run browser tests, follow this workflow exactly.

## Input

Killua receives one or more test scenarios from `vault/02-docs/test-scenarios/`. Each scenario has:
- **Target**: URL, viewports, browsers
- **Preconditions**: login state, test data, feature flags
- **Steps**: ordered actions with assertions
- **On Failure**: severity and routing instructions

## Execution Flow

### 1. Read Scenario
- Parse the scenario markdown
- Extract URL, viewports, browsers, steps, and assertions
- If preconditions require login, perform login steps first

### 2. Execute Per Browser + Viewport
For each (browser, viewport) combination specified in the scenario:

1. Launch browser via Playwright MCP: `browser_navigate` to the target URL
2. Set viewport size via `browser_resize`
3. Execute each step:
   - **Navigate**: `browser_navigate` to URL
   - **Click**: `browser_click` on element (use accessible names or test IDs)
   - **Fill**: `browser_type` text into input fields
   - **Wait**: `browser_wait_for_text` or `browser_snapshot` to verify state
   - **Assert**: `browser_snapshot` and check for expected elements in the accessibility tree
4. On each assertion:
   - **PASS**: record and continue
   - **FAIL**: take screenshot via `browser_take_screenshot`, save to `.claude/test-evidence/YYYY-MM-DD/{scenario}-{browser}-{viewport}.png`, record failure details

### 3. Compile Results
After all (browser, viewport) combinations complete:

```markdown
## Browser Test Report -- YYYY-MM-DD

**Trigger**: {trigger source}
**Duration**: {total time}
**Scenarios**: {count} run, {passed} passed, {failed} failed

| Scenario | Chromium | Firefox | WebKit | Result |
|----------|----------|---------|--------|--------|
| {title}  | {P/F}    | {P/F}   | {P/F}  | {P/F}  |

### Failures
- {Scenario > Step (Browser/Viewport)}: {description}
  Screenshot: `.claude/test-evidence/YYYY-MM-DD/{filename}.png`

### Recommendation
{Based on On Failure instructions in scenario: route to Diablo, block deploy, flag in standup}
```

### 4. Write Results
1. **Database**: Insert into `test_runs` table via sqlite3:
   ```bash
   sqlite3 vault/data/company.db "INSERT INTO test_runs (repo, test_type, total, passed, failed, skipped, run_at, triggered_by) VALUES ('{repo}', 'browser', {total}, {passed}, {failed}, 0, datetime('now'), 'killua');"
   ```
2. **Vault report**: Write to `vault/09-ops/test-reports/YYYY-MM-DD-test-summary.md` with full frontmatter
3. **Evidence**: Screenshots already saved during execution (gitignored)

### 5. Route Failures
If failures found:
- Read the `On Failure` section from the scenario
- Return observation to Wantan with severity and routing recommendation
- Wantan decides whether to dispatch Diablo, Shikamaru, or flag in standup

## Playwright MCP Tool Reference

| Tool | Purpose |
|------|---------|
| `browser_navigate` | Go to a URL |
| `browser_click` | Click an element by accessible name or selector |
| `browser_type` | Type text into an input field |
| `browser_snapshot` | Get accessibility tree of current page (for assertions) |
| `browser_take_screenshot` | Capture page screenshot (for evidence) |
| `browser_wait_for_text` | Wait for specific text to appear |
| `browser_resize` | Set viewport dimensions |
| `browser_go_back` | Navigate back |
| `browser_go_forward` | Navigate forward |

## Token Efficiency Note

For simple smoke tests (1-2 assertions per page), prefer `@playwright/cli` shell commands over MCP to reduce token consumption by ~4x. Use MCP for complex multi-step flows requiring state management.

## Constraints

- Never skip a browser specified in the scenario
- Always save screenshot evidence for failures
- Report exact pass/fail counts — never approximate
- If Playwright MCP is unavailable, report clearly: "Playwright MCP not connected. Cannot execute browser tests. Add to .mcp.json to enable."
- Test evidence directory is gitignored — never commit screenshots
- Do not modify scenario files — read-only during execution
