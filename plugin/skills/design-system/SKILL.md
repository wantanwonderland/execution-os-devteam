---
name: design-system
description: Ochaco's design system skill. Design tokens, OKLCH theming, component library patterns, typography scales. Reverse-engineered from wilwaldon's Frontend Design Toolkit.
---

# Design System Management

Build and maintain a design token system for consistent UI across the project.

## Token Architecture

### CSS Variables (Single Source of Truth)

```css
:root {
  /* Brand — derive everything from these */
  --brand-hue: 250;
  --brand-saturation: 0.15;
  --brand-lightness: 0.55;

  /* Primary palette (OKLCH) */
  --color-primary: oklch(var(--brand-lightness) var(--brand-saturation) var(--brand-hue));
  --color-primary-light: oklch(0.75 0.1 var(--brand-hue));
  --color-primary-dark: oklch(0.35 0.15 var(--brand-hue));

  /* Accent — complementary hue (+180) */
  --color-accent: oklch(0.7 0.18 calc(var(--brand-hue) + 180));

  /* Neutral scale */
  --color-bg: oklch(0.98 0.005 var(--brand-hue));
  --color-surface: oklch(0.95 0.01 var(--brand-hue));
  --color-border: oklch(0.85 0.02 var(--brand-hue));
  --color-text: oklch(0.2 0.02 var(--brand-hue));
  --color-text-muted: oklch(0.55 0.02 var(--brand-hue));

  /* Semantic */
  --color-success: oklch(0.65 0.15 145);
  --color-warning: oklch(0.75 0.15 85);
  --color-error: oklch(0.6 0.2 25);
  --color-info: oklch(0.65 0.12 250);

  /* Typography */
  --font-display: 'Your Display Font', serif;
  --font-body: 'Your Body Font', sans-serif;
  --font-code: 'JetBrains Mono', monospace;

  /* Type scale (1.25 ratio) */
  --text-xs: 0.64rem;
  --text-sm: 0.8rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.563rem;
  --text-2xl: 1.953rem;
  --text-3xl: 2.441rem;
  --text-4xl: 3.052rem;

  /* Spacing (4px base) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;

  /* Borders */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px oklch(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px oklch(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px oklch(0 0 0 / 0.15);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 300ms ease;
  --transition-slow: 500ms ease;
}

/* Dark theme — override lightness values */
[data-theme="dark"] {
  --color-bg: oklch(0.15 0.01 var(--brand-hue));
  --color-surface: oklch(0.2 0.015 var(--brand-hue));
  --color-border: oklch(0.3 0.02 var(--brand-hue));
  --color-text: oklch(0.9 0.01 var(--brand-hue));
  --color-text-muted: oklch(0.6 0.02 var(--brand-hue));
}
```

### How to Use

1. **New project**: Generate a full token file from the brand hue
2. **Existing project**: Audit current CSS for hardcoded values, extract to tokens
3. **Theme switch**: Only override lightness/saturation in dark mode — hue stays constant
4. **Component tokens**: Extend base tokens for component-specific values (e.g., `--button-bg: var(--color-primary)`)

## Component Library Pattern

Each component follows:

```
components/
├── Button/
│   ├── Button.tsx          # Component
│   ├── Button.test.tsx     # Tests
│   ├── Button.stories.tsx  # Storybook (optional)
│   └── index.ts            # Export
```

Component checklist:
- [ ] Uses design tokens (no hardcoded colors/spacing)
- [ ] Has hover, focus, active, disabled states
- [ ] Has loading, empty, error variants where applicable
- [ ] Keyboard accessible
- [ ] Responsive
- [ ] Typed props with JSDoc descriptions

## Constraints

- ALL colors must use CSS variables — no hardcoded hex/rgb/hsl in components
- ALL spacing must use the spacing scale — no arbitrary pixel values
- Font imports go in layout/head only, never in components
- Dark mode is a first-class citizen, not an afterthought
- Test contrast ratios: 4.5:1 for normal text, 3:1 for large text (WCAG AA)
