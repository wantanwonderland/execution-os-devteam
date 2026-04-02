---
name: visual-regression
description: Killua captures baseline screenshots and detects visual regressions on PR using Playwright's toHaveScreenshot() API. Multi-viewport (desktop, tablet, mobile), diff flagging, integrates with browser-test workflow.
---

# Visual Regression Testing

When Killua is dispatched to run visual regression tests, follow this workflow exactly.

## Input

Killua receives one of:
- A URL to capture/compare (e.g., `http://localhost:3000/dashboard`)
- A page name from the test scenario registry
- A "baseline" or "compare" instruction

## Execution Flow

### 1. Determine Mode

| Instruction | Mode |
|-------------|------|
| "capture baseline for {url}" | Baseline capture — save reference screenshots |
| "compare {url}" or "check {url}" | Comparison — run against saved baseline, flag diffs |
| "capture and compare {url}" | Full flow — capture if no baseline exists, else compare |

Default: if no baseline exists for the URL, capture one. If baseline exists, compare.

### 2. Viewports

Always test all three viewports unless a specific one is requested:

| Name | Width | Height |
|------|-------|--------|
| Desktop | 1280 | 800 |
| Tablet | 768 | 1024 |
| Mobile | 375 | 812 |

### 3. Playwright Visual Regression Test Structure

```typescript
// visual-regression.spec.ts
import { test, expect } from '@playwright/test';

// Playwright config for visual tests
// playwright.config.ts additions:
// expect: { toHaveScreenshot: { maxDiffPixels: 100 } }

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'mobile',  width: 375,  height: 812 },
];

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';

test.describe('Visual Regression: {page name}', () => {
  for (const viewport of VIEWPORTS) {
    test(`{page name} -- ${viewport.name}`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Navigate to target
      await page.goto(`${TARGET_URL}/{path}`);

      // Wait for page to fully render
      await page.waitForLoadState('networkidle');

      // Optionally wait for specific element to ensure content loaded
      await page.waitForSelector('[data-testid="main-content"]', { state: 'visible' });

      // Take screenshot and compare to baseline
      // On first run: saves as baseline
      // On subsequent runs: compares against saved baseline
      await expect(page).toHaveScreenshot(`{page-slug}-${viewport.name}.png`, {
        // Allow up to 100 pixel diff for anti-aliasing/font rendering differences
        maxDiffPixels: 100,
        // Or use ratio: maxDiffPixelRatio: 0.01 (1% of total pixels)
        // Mask dynamic regions (timestamps, ads, user avatars)
        mask: [
          page.locator('[data-testid="timestamp"]'),
          page.locator('[data-testid="user-avatar"]'),
          page.locator('.ad-banner'),
        ],
        // Animations must be disabled for stable screenshots
        animations: 'disabled',
      });
    });
  }
});
```

### 4. Playwright Configuration for Visual Tests

Add or verify these settings in `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Store baseline screenshots in a predictable location
  snapshotDir: '.claude/visual-baselines',

  expect: {
    toHaveScreenshot: {
      // Pixel tolerance for rendering differences
      maxDiffPixels: 100,
      // Threshold for color difference per pixel (0-1)
      threshold: 0.2,
    },
  },

  use: {
    // Disable animations globally for stability
    launchOptions: {
      args: ['--disable-animations'],
    },
  },
});
```

### 5. Baseline Capture Workflow

```bash
# First run: capture all baselines
npx playwright test visual-regression.spec.ts --update-snapshots

# Baseline files saved to: .claude/visual-baselines/
# Structure: {test-title}-{browser}/{page-slug}-{viewport}.png
```

Baseline files to commit to version control:
```bash
# Add baseline screenshots to git
git add .claude/visual-baselines/
git commit -m "chore(visual): capture visual regression baselines for {page}"
```

### 6. Comparison Run (PR / Deploy Check)

```bash
# Compare against saved baseline
npx playwright test visual-regression.spec.ts

# On failure: view diff report
npx playwright show-report
```

Playwright generates an HTML report with:
- Side-by-side comparison (baseline vs current)
- Diff overlay (highlighted changed pixels)
- Exact pixel diff count

### 7. Masking Dynamic Content

Dynamic regions that must be masked to prevent false positives:

| Content Type | Selector Strategy |
|-------------|-------------------|
| Timestamps / "last updated" | `[data-testid="timestamp"]` or `.timestamp` |
| User-specific content | `[data-testid="user-name"]`, `.avatar` |
| Ads / banners | `.ad`, `.banner`, `[data-ad]` |
| Animated loaders | `.spinner`, `.skeleton` |
| Random/rotating content | `[data-testid="carousel"]` |

Always use `data-testid` attributes over CSS classes for masking — class names change, test IDs are stable.

### 8. Diff Flagging

When a comparison run produces diffs:

**Flag criteria:**
- Any screenshot diff exceeding `maxDiffPixels` threshold
- Layout shifts affecting primary content areas (nav, hero, CTA)
- Color changes in interactive elements (buttons, links)
- Missing content (element visible in baseline but absent in current)

**Do NOT flag:**
- Anti-aliasing differences (sub-pixel rendering)
- Font kerning differences across OS/browser versions (expected on CI)
- Dynamic masked regions

When diffs are found:
```markdown
### Visual Regression Failures

| Page | Viewport | Diff Pixels | Screenshot |
|------|----------|-------------|------------|
| {page} | {viewport} | {n} px | {path to diff} |

Diff evidence saved to: `.claude/test-evidence/YYYY-MM-DD/visual-diff-{page}-{viewport}.png`
```

### 9. Integration with Browser-Test Workflow

Visual regression tests run alongside functional browser tests:

1. After functional test run (`/test run {scenario}`), Killua checks if visual baselines exist for tested pages
2. If yes: runs visual comparison as a second pass
3. If visual diff found: appended to the standard Browser Test Report
4. Evidence saved to same `.claude/test-evidence/YYYY-MM-DD/` directory

Combined report section:

```markdown
### Visual Regression Results

| Page | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| {page} | PASS | PASS | FAIL (42px diff) |

Diffs: `.claude/test-evidence/YYYY-MM-DD/visual-diff-{page}-mobile.png`
```

### 10. Write Results

1. **Test file**: Write to `vault/02-docs/test-scenarios/visual-regression-{page-slug}.spec.ts`
2. **Baselines**: Stored in `.claude/visual-baselines/` (commit to git)
3. **Diffs/evidence**: Stored in `.claude/test-evidence/YYYY-MM-DD/` (gitignored)
4. **Insert into DB**:
   ```bash
   sqlite3 vault/data/company.db "INSERT INTO test_runs (repo, test_type, total, passed, failed, skipped, run_at, triggered_by) VALUES ('{repo}', 'visual', {total}, {passed}, {failed}, 0, datetime('now'), 'killua');"
   ```
5. **Vault report**: Write to `vault/09-ops/test-reports/YYYY-MM-DD-visual-regression.md`:

```markdown
---
title: "Visual Regression -- {page} -- YYYY-MM-DD"
created: YYYY-MM-DD
type: note
tags: [testing, visual-regression]
status: active
project: []
related: []
---

## Visual Regression Report -- YYYY-MM-DD

**Target URL**: {url}
**Mode**: {baseline capture / comparison}
**Viewports**: Desktop (1280x800), Tablet (768x1024), Mobile (375x812)

| Page | Desktop | Tablet | Mobile | Status |
|------|---------|--------|--------|--------|
| {page} | {PASS/FAIL (Npx)} | {PASS/FAIL} | {PASS/FAIL} | {PASS/FAIL} |

### Failures
{List of failed viewports with diff pixel counts and evidence paths}

### Recommendation
{PASS: No visual regressions. / FAIL: Review diffs. Route to Diablo before merge.}
```

## Constraints

- Always disable animations before capturing screenshots — animated elements cause false positives
- Always mask dynamic content regions — timestamps, user names, avatars
- Baseline screenshots must be committed to git — they are the source of truth
- Test evidence (diffs) is gitignored — save for review only
- Never update baselines on a failing PR — only update when visual change is intentional
- If Playwright is not installed, report clearly: "Playwright not configured. Run `npx playwright install` to enable visual regression tests."
- Report exact pixel diff counts — never approximate
