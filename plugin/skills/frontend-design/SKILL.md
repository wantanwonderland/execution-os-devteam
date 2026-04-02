---
name: frontend-design
description: Rohan's aesthetic direction skill. Bold, distinctive UI design that avoids generic AI aesthetics. Reverse-engineered from Anthropic's official frontend-design skill.
---

# Frontend Design — Aesthetic Direction

Before writing any UI code, commit to a BOLD aesthetic direction.

## Design Thinking

1. **Purpose**: What problem does this interface solve? Who uses it?
2. **Tone**: Pick an extreme — commit fully:
   - Brutally minimal (whitespace, mono font, stark contrast)
   - Maximalist chaos (layered textures, multiple typefaces, dense info)
   - Retro-futuristic (CRT glow, terminal aesthetics, neon accents)
   - Organic/natural (earth tones, rounded shapes, texture)
   - Luxury/refined (thin serifs, gold accents, generous spacing)
   - Playful/toy-like (rounded corners, bright primaries, bouncy motion)
   - Editorial/magazine (large serif headlines, column layout, pull quotes)
   - Brutalist/raw (system fonts, exposed structure, no decoration)
   - Art deco/geometric (symmetry, gold, angular patterns)
   - Soft/pastel (muted tones, rounded shapes, gentle shadows)
   - Industrial/utilitarian (monospace, high density, dashboard-like)
3. **Differentiation**: What's the ONE thing someone will remember?
4. **Constraints**: Framework, performance targets, accessibility requirements

## Anti-AI-Slop Rules

NEVER produce:
- Inter, Roboto, Arial, or system fonts as display typography
- Purple gradients on white backgrounds
- Generic card-based layouts with rounded corners and soft shadows
- Cookie-cutter hero sections with stock photo + CTA
- Evenly-distributed, timid color palettes
- The same design twice

ALWAYS produce:
- Distinctive font pairing (display + body)
- Dominant color with sharp accent
- Unexpected layout choices (asymmetry, overlap, diagonal flow)
- At least one surprising visual detail
- Atmosphere: gradients, noise, textures, depth — not flat white

## Typography Rules

- **Display font**: Choose something with CHARACTER. Browse Google Fonts filtered by category — choose serifs for editorial, display fonts for impact, monospace for technical.
- **Body font**: Refined and readable. Pair contrast: serif display + sans body, or geometric display + humanist body.
- **Scale**: Use a modular scale (1.25 or 1.333 ratio). Define: xs, sm, base, lg, xl, 2xl, 3xl, 4xl.
- **Line height**: 1.5 for body, 1.1-1.2 for headings.

## Color Rules

- Define with OKLCH for perceptual uniformity: `oklch(65% 0.15 250)`
- **Primary**: The brand color. Bold, not muted.
- **Accent**: Sharp contrast to primary. Used sparingly for CTAs and highlights.
- **Background**: Not necessarily white. Dark themes, tinted backgrounds, gradients create atmosphere.
- **Semantic**: Success (green), warning (amber), error (red), info (blue) — but in YOUR palette's tone.

## Motion Rules

- **Page load**: One well-orchestrated sequence with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.
- **Hover/focus**: Subtle but noticeable. Transform + opacity, not just color change.
- **Transitions**: CSS `transition` for simple state changes. Framer Motion (React) or GSAP for complex sequences.
- **Scroll**: Intersection Observer for reveal-on-scroll. No scroll hijacking.
- **Duration**: 150ms for micro (hover), 300ms for medium (expand), 500ms for entrance (fade-in).

## Layout Rules

- Break the grid intentionally. Asymmetry, overlap, and diagonal flow create visual interest.
- Generous negative space OR controlled density — never "average" spacing.
- Full-bleed sections with contained content create rhythm.
- Z-index layering creates depth (background → content → floating elements → overlays).

## Implementation

Produce working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Accessible (semantic HTML, ARIA, keyboard, contrast)
- Responsive (mobile-first)

## Constraints

- Match implementation complexity to aesthetic vision — maximalist designs need elaborate code
- Elegance comes from executing the vision well, not from restraint alone
- Every design gets a name and a one-sentence description of its vibe
