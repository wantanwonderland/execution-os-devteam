---
name: live-browser-test
description: Killua's live browser testing skill. Uses Playwright CLI to interact with a running app in a real browser — navigate, click, fill forms, take screenshots, verify UI rendering. More accurate than MCP for visual/interaction testing.
---

# Live Browser Testing (Playwright CLI)

Live browser testing launches a real browser against a running dev server and interacts with the app as a real user would. This is the primary method for UI testing — it catches rendering issues, interaction bugs, and responsive breakdowns that unit tests and snapshot tests miss.

## When to Use

- After Conan implements a UI feature (Phase 3.5 — before Diablo reviews)
- When validating Rohan's design specs against the actual implementation
- When running roleplay scenarios (pair with `roleplay-scenario` skill)
- When a bug report describes visual or interaction issues
- For cross-browser and responsive verification

## Prerequisites

- Dev server must be running (e.g., `npm run dev`, `python manage.py runserver`)
- Playwright browsers must be installed (`npx playwright install chromium`)

If Playwright is not installed, run:
```bash
npm init -y 2>/dev/null
npx playwright install chromium
```

## Execution Flow

### 1. Verify Dev Server

Check if the dev server is running:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

If not running, start it in the background and wait for it to be ready:
```bash
npm run dev &
# Wait for server to be ready
for i in $(seq 1 30); do curl -s http://localhost:3000 > /dev/null 2>&1 && break; sleep 1; done
```

Adjust the port and start command based on the project (Next.js: 3000, Vite: 5173, Express: 3000, Django: 8000, etc.).

### 2. Write Test Script

Create a Playwright test script for the scenario. Write it to a temporary file:

```javascript
// test-live.spec.js
const { test, expect } = require('@playwright/test');

test('{scenario name}', async ({ page }) => {
  // Navigate
  await page.goto('http://localhost:3000/{path}');

  // Interact
  await page.click('{selector}');
  await page.fill('{selector}', '{value}');

  // Assert
  await expect(page.locator('{selector}')).toBeVisible();
  await expect(page.locator('{selector}')).toHaveText('{expected}');

  // Screenshot as evidence
  await page.screenshot({ path: '.claude/test-evidence/{name}.png', fullPage: true });
});
```

### 3. Execute Across Viewports

Run the test across multiple viewport sizes:

```bash
# Desktop (1280x800)
npx playwright test test-live.spec.js --project=chromium --reporter=list

# Tablet (768x1024) — set viewport in test or via CLI
VIEWPORT_WIDTH=768 VIEWPORT_HEIGHT=1024 npx playwright test test-live.spec.js --project=chromium --reporter=list

# Mobile (375x812)
VIEWPORT_WIDTH=375 VIEWPORT_HEIGHT=812 npx playwright test test-live.spec.js --project=chromium --reporter=list
```

Or configure viewports in a `playwright.config.js` if one exists.

### 4. Cross-Browser Testing

If multiple browsers are installed:
```bash
npx playwright test test-live.spec.js --project=chromium --reporter=list
npx playwright test test-live.spec.js --project=firefox --reporter=list
npx playwright test test-live.spec.js --project=webkit --reporter=list
```

### 5. Capture Evidence

For every test step, capture screenshots:
```javascript
await page.screenshot({
  path: `.claude/test-evidence/${Date.now()}-{step-name}.png`,
  fullPage: true
});
```

Save all evidence to `.claude/test-evidence/YYYY-MM-DD/`. This directory is gitignored.

### 6. Design Compliance Check

When Rohan's design specs are available, verify the implementation matches:
- **Colors**: Use `page.evaluate()` to read computed styles and compare against design tokens
- **Typography**: Check font-family, font-size, line-height against spec
- **Spacing**: Verify padding/margin against design system scale
- **Responsive**: Confirm layout changes at each breakpoint match Rohan's spec

```javascript
const bgColor = await page.evaluate(() =>
  getComputedStyle(document.querySelector('{selector}')).backgroundColor
);
expect(bgColor).toBe('{expected-color}');
```

### 7. Report

```markdown
## Live Browser Test Report -- YYYY-MM-DD

**Target**: {URL}
**Trigger**: {post-implementation / manual / roleplay}
**Dev server**: {running on port X}

### Results

| Scenario | Desktop (1280) | Tablet (768) | Mobile (375) | Status |
|----------|---------------|-------------|-------------|--------|
| {name}   | PASS          | PASS        | FAIL        | FAIL   |

### Failures
- {Scenario > Step (Viewport)}: {description}
  Screenshot: `.claude/test-evidence/YYYY-MM-DD/{filename}.png`

### Design Compliance
- Color palette: {PASS/FAIL — details}
- Typography: {PASS/FAIL — details}
- Responsive breakpoints: {PASS/FAIL — details}

### Recommendation
{Route to Conan for fixes / proceed to Diablo for review}
```

## Bug Fix During Live Testing

When a test fails, Killua does NOT fix the code. Route failures to **Conan** for fixes.

**Test-fix cycle:**
1. Killua reports failures with screenshots and error descriptions
2. **Conan** reads the report, fixes the code
3. Killua re-runs the failing scenarios to verify
4. Repeat until all scenarios pass
5. Proceed to Diablo for code review

This maintains separation of concerns — the tester never fixes their own findings.

## Cleanup

After testing, remove temporary test files:
```bash
rm -f test-live.spec.js
```

Do NOT stop the dev server — the user may still be working.

## Constraints

- Always verify the dev server is running before testing
- Always capture screenshots as evidence for every test
- Never fake results — if Playwright is not installed, say so clearly
- Test evidence is gitignored — never commit screenshots
- Clean up temporary test scripts after execution
- If a test fails, include the screenshot path and a clear description of what went wrong
- Report exact pass/fail counts — never approximate
