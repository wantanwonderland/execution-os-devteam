UI design guidance. Dispatches Ochaco for aesthetic direction, design systems, or component design.

Usage:
- `/design {description}` — get aesthetic direction for a page or component
- `/design system` — create or audit design tokens
- `/design review {file}` — review existing UI for design quality
- `/design component {name}` — design a specific component

## Steps

### Mode: Aesthetic Direction (default)

1. **Dispatch Ochaco**: Send description to Ochaco with the `frontend-design` skill.
2. Ochaco returns: tone, typography, colors, layout approach, one memorable detail.
3. Present to user for approval before implementing.

### Mode: System

1. **Dispatch Ochaco**: Use the `design-system` skill.
2. Generate: CSS variables file with OKLCH tokens, typography scale, spacing scale, color palette.
3. If project has existing CSS: audit for hardcoded values, propose migration to tokens.

### Mode: Review

1. **Dispatch Ochaco**: Read the file, score on zero-gravity scale (1-10).
2. Check: typography, color, spacing, motion, accessibility.
3. Flag generic patterns. Suggest specific improvements.

### Mode: Component

1. **Dispatch Ochaco**: Design the component with aesthetic direction.
2. Include: all states (hover, focus, active, disabled, loading, error, empty).
3. Include: responsive behavior at 3 breakpoints.
4. Include: accessibility (ARIA, keyboard, contrast).
