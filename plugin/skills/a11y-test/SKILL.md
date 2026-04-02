---
name: a11y-test
description: Killua audits accessibility using Playwright + axe-core. Covers WCAG 2.1 AA: focus order, color contrast, ARIA roles, alt text, keyboard navigation. Reports with severity and WCAG criterion reference.
---

# Accessibility (a11y) Audit

When Killua is dispatched to run an accessibility audit, follow this workflow exactly.

## Input

Killua receives one of:
- A URL to audit (e.g., `http://localhost:3000/checkout`)
- A page name from the test scenario registry
- A specific WCAG criterion to focus on

## Execution Flow

### 1. Setup

Install required packages if not present:
```bash
# Check if axe-core playwright integration is available
npm list @axe-core/playwright 2>/dev/null || npm install --save-dev @axe-core/playwright
```

### 2. axe-core Playwright Integration

```typescript
// a11y-audit.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';

test.describe('Accessibility Audit: {page name}', () => {
  test('has no automatically detectable WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto(`${TARGET_URL}/{path}`);
    await page.waitForLoadState('networkidle');

    // Run axe against the full page with WCAG 2.1 AA rules
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Attach full results to test report for review
    expect(results.violations).toEqual([]);
  });

  test('has no critical violations', async ({ page }) => {
    await page.goto(`${TARGET_URL}/{path}`);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Separate critical from moderate/minor for severity-aware reporting
    const critical = results.violations.filter(v => v.impact === 'critical');
    const serious  = results.violations.filter(v => v.impact === 'serious');

    if (critical.length > 0 || serious.length > 0) {
      // Format violation details for readable output
      const details = [...critical, ...serious].map(v =>
        `[${v.impact.toUpperCase()}] ${v.id}: ${v.description}\n` +
        `  WCAG: ${v.tags.filter(t => t.startsWith('wcag')).join(', ')}\n` +
        `  Affected: ${v.nodes.length} element(s)\n` +
        `  Help: ${v.helpUrl}`
      ).join('\n\n');

      throw new Error(`Critical/Serious a11y violations found:\n\n${details}`);
    }
  });
});
```

### 3. WCAG 2.1 AA Checklist Focus Areas

Killua checks these criteria in every audit:

#### Focus Order (WCAG 2.4.3)
```typescript
test('focus order is logical', async ({ page }) => {
  await page.goto(`${TARGET_URL}/{path}`);

  // Tab through all focusable elements and record order
  const focusOrder: string[] = [];
  let tabCount = 0;
  const MAX_TABS = 50;

  while (tabCount < MAX_TABS) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? `${el.tagName}[${el.getAttribute('data-testid') || el.textContent?.slice(0, 30)}]` : null;
    });
    if (!focused || focusOrder.includes(focused)) break;
    focusOrder.push(focused);
    tabCount++;
  }

  // Focus order should follow visual reading order (top-to-bottom, left-to-right)
  // Manual review: log order for human inspection
  console.log('Focus order:', focusOrder.join(' → '));

  // axe will flag many focus order issues automatically
  const results = await new AxeBuilder({ page })
    .withRules(['focus-order-semantics', 'tabindex'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

#### Color Contrast (WCAG 1.4.3 / 1.4.11)
```typescript
test('text has sufficient color contrast (4.5:1 for normal, 3:1 for large)', async ({ page }) => {
  await page.goto(`${TARGET_URL}/{path}`);
  await page.waitForLoadState('networkidle');

  // axe-core handles contrast checking automatically
  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast', 'color-contrast-enhanced'])
    .analyze();

  const contrastViolations = results.violations.filter(v =>
    v.id === 'color-contrast' || v.id === 'color-contrast-enhanced'
  );

  expect(contrastViolations, formatViolations(contrastViolations)).toEqual([]);
});
```

#### ARIA Roles and Labels (WCAG 4.1.2)
```typescript
test('interactive elements have accessible names', async ({ page }) => {
  await page.goto(`${TARGET_URL}/{path}`);

  const results = await new AxeBuilder({ page })
    .withRules([
      'aria-allowed-attr',
      'aria-required-attr',
      'aria-valid-attr',
      'aria-valid-attr-value',
      'button-name',
      'link-name',
      'input-button-name',
      'label',
    ])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toEqual([]);
});
```

#### Alt Text for Images (WCAG 1.1.1)
```typescript
test('images have appropriate alt text', async ({ page }) => {
  await page.goto(`${TARGET_URL}/{path}`);

  // axe checks for missing alt attributes
  const results = await new AxeBuilder({ page })
    .withRules(['image-alt', 'input-image-alt', 'role-img-alt'])
    .analyze();

  // Also check for empty alt on decorative images (valid) vs informative images (must have text)
  const missingAlt = await page.locator('img:not([alt])').count();
  expect(missingAlt, `${missingAlt} image(s) are missing alt attributes entirely`).toBe(0);

  expect(results.violations, formatViolations(results.violations)).toEqual([]);
});
```

#### Keyboard Navigation (WCAG 2.1.1)
```typescript
test('all interactive elements are keyboard accessible', async ({ page }) => {
  await page.goto(`${TARGET_URL}/{path}`);

  // Check that no interactive content is mouse-only
  const results = await new AxeBuilder({ page })
    .withRules([
      'keyboard',
      'scrollable-region-focusable',
      'interactive-supports-focus',
    ])
    .analyze();

  // Also verify key interactive actions work via keyboard
  // Example: open a dropdown via Enter/Space
  const dropdown = page.locator('[data-testid="dropdown-trigger"]').first();
  if (await dropdown.count() > 0) {
    await dropdown.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="dropdown-menu"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="dropdown-menu"]')).not.toBeVisible();
  }

  expect(results.violations, formatViolations(results.violations)).toEqual([]);
});
```

#### Helper: Format Violations for Readable Output

```typescript
function formatViolations(violations: any[]): string {
  if (violations.length === 0) return '';
  return '\n\nAccessibility violations:\n' + violations.map(v =>
    `• [${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n` +
    `  WCAG: ${v.tags.filter((t: string) => t.startsWith('wcag')).join(', ')}\n` +
    `  Elements: ${v.nodes.slice(0, 3).map((n: any) => n.target.join(' ')).join(', ')}\n` +
    `  Fix: ${v.helpUrl}`
  ).join('\n\n');
}
```

### 4. WCAG 2.1 AA Criteria Reference

| Criterion | Level | What it Checks | axe Rule(s) |
|-----------|-------|----------------|-------------|
| 1.1.1 Non-text Content | A | Images have alt text | `image-alt`, `role-img-alt` |
| 1.3.1 Info and Relationships | A | Semantic HTML, proper headings | `heading-order`, `list`, `listitem` |
| 1.4.3 Contrast (Minimum) | AA | 4.5:1 for normal text, 3:1 for large | `color-contrast` |
| 1.4.4 Resize Text | AA | Text resizable to 200% | Manual check |
| 1.4.11 Non-text Contrast | AA | UI components 3:1 contrast | `color-contrast-enhanced` |
| 2.1.1 Keyboard | A | All functionality via keyboard | `keyboard`, `interactive-supports-focus` |
| 2.1.2 No Keyboard Trap | A | User can navigate away | Manual check |
| 2.4.1 Bypass Blocks | A | Skip-to-main link | `bypass` |
| 2.4.3 Focus Order | A | Logical tab order | `focus-order-semantics`, `tabindex` |
| 2.4.4 Link Purpose | A | Link text describes destination | `link-name`, `link-in-text-block` |
| 2.4.7 Focus Visible | AA | Focus indicator visible | `focus-order-semantics` |
| 3.1.1 Language of Page | A | `lang` attribute on `<html>` | `html-has-lang`, `html-lang-valid` |
| 4.1.1 Parsing | A | Valid HTML | `duplicate-id`, `duplicate-id-active` |
| 4.1.2 Name, Role, Value | A | ARIA roles and labels correct | `aria-*`, `button-name`, `label` |
| 4.1.3 Status Messages | AA | Status messages programmatically determined | `aria-live` regions |

### 5. Severity Classification

Killua classifies violations by axe impact level:

| axe Impact | Severity | Action |
|-----------|----------|--------|
| `critical` | P0 | Block deploy. Users cannot complete task. |
| `serious` | P1 | Must fix before launch. Major barrier. |
| `moderate` | P2 | Fix in current sprint. Significant friction. |
| `minor` | P3 | Log as tech-debt. Cosmetic or edge-case. |

### 6. Run Command

```bash
# Run full a11y audit
npx playwright test a11y-audit.spec.ts --reporter=html

# View HTML report
npx playwright show-report

# Run against specific URL
TARGET_URL=http://staging.example.com npx playwright test a11y-audit.spec.ts
```

### 7. Write Results

1. **Test file**: Write to `vault/02-docs/test-scenarios/a11y-{page-slug}.spec.ts`
2. **Insert into DB**:
   ```bash
   sqlite3 vault/data/company.db "INSERT INTO test_runs (repo, test_type, total, passed, failed, skipped, run_at, triggered_by) VALUES ('{repo}', 'a11y', {total}, {passed}, {failed}, 0, datetime('now'), 'killua');"
   ```
3. **Vault report**: Write to `vault/09-ops/test-reports/YYYY-MM-DD-a11y-audit.md`:

```markdown
---
title: "a11y Audit -- {page} -- YYYY-MM-DD"
created: YYYY-MM-DD
type: note
tags: [testing, a11y, accessibility, wcag]
status: active
project: []
related: []
---

## Accessibility Audit Report -- YYYY-MM-DD

**Target URL**: {url}
**Standard**: WCAG 2.1 AA
**Tool**: axe-core + Playwright

### Summary

| Severity | Count |
|----------|-------|
| Critical (P0) | {n} |
| Serious (P1) | {n} |
| Moderate (P2) | {n} |
| Minor (P3) | {n} |
| **Total** | **{n}** |

### Violations

| ID | Severity | WCAG Criterion | Description | Elements Affected |
|----|----------|----------------|-------------|-------------------|
| `color-contrast` | serious | 1.4.3 | Text contrast ratio 2.1:1 (needs 4.5:1) | 3 |
| `image-alt` | critical | 1.1.1 | Image missing alt attribute | 1 |
| {more rows} | | | | |

### Checklist

- [ ] Focus order logical (2.4.3)
- [ ] Color contrast sufficient (1.4.3)
- [ ] All images have alt text (1.1.1)
- [ ] Interactive elements keyboard accessible (2.1.1)
- [ ] ARIA roles and labels correct (4.1.2)

### Recommendation
{PASS: No violations. / P0/P1 found: Block deploy. Route to Diablo. / P2/P3 only: Log as tech-debt. Fix in next sprint.}
```

## Constraints

- Always use `withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])` — do not narrow to a subset without instruction
- Report violations with WCAG criterion reference — never just axe rule ID
- Classify every violation by severity (critical/serious/moderate/minor)
- If `@axe-core/playwright` is not installed, generate the test file and note: "Install `@axe-core/playwright` to run audit."
- Do not suppress violations without explicit instruction from Wantan
- Keyboard navigation checks require manual verification beyond axe — always include the keyboard test
- Report exact violation counts — never approximate
