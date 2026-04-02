---
title: "Responsive Layout — Navigation"
created: 2026-04-02
type: test-scenario
tags: [e2e, browser, responsive, layout]
status: draft
project: example-app
priority: high
related: []
---

# Scenario: Responsive Layout — Navigation

## Target
- **URL**: https://staging.example.com/
- **Viewports**: [1920x1080, 768x1024, 375x812]
- **Browsers**: [chromium, webkit]

## Preconditions
- No login required (public page)

## Steps
1. Navigate to homepage at each viewport size
2. **Desktop (1920x1080)**:
   - Assert: horizontal navigation bar is visible
   - Assert: all nav links are visible (Home, Features, Pricing, Docs)
   - Assert: hamburger menu is NOT visible
3. **Tablet (768x1024)**:
   - Assert: horizontal navigation bar is visible
   - Assert: hamburger menu may or may not be visible (depends on design)
4. **Mobile (375x812)**:
   - Assert: hamburger menu IS visible
   - Assert: horizontal nav links are NOT visible
   - Click hamburger menu
   - Assert: mobile nav drawer opens
   - Assert: all nav links visible in drawer

## Assertions
- [ ] No horizontal scroll at any viewport
- [ ] Text is readable without zooming at all viewports
- [ ] Interactive elements have minimum 44px tap targets on mobile
- [ ] No layout shift (CLS) when menu opens on mobile
- [ ] No console errors at any viewport

## On Failure
- **Severity**: high
- **Route to**: Diablo (PR review on layout/CSS changes)
- **Context**: Responsive issues affect mobile users (typically 60%+ of traffic).

## Notes
- Take screenshots at each viewport for comparison
- Run on Chromium and WebKit only (Firefox responsive behavior matches Chromium)
