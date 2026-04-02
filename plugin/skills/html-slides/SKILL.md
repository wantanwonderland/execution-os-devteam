---
name: html-slides
description: "Use when generating presentation slide decks. Writes canonical markdown (slides.md) first, then renders to HTML (reveal.js + Tailwind + Chart.js). Markdown source can be re-rendered to PPTX or PDF. Triggers on: 'slides', 'HTML slides', 'HTML presentation', 'HTML deck', 'browser slides', 'reveal.js', 'web presentation', 'presentation'. Route to Megumin agent. Do NOT use for: .pptx files from existing templates (use pptx skill), or dashboards (Sai)."
---

# HTML Slides Skill

Markdown-first presentation pipeline. Write content as `slides.md`, render to HTML via reveal.js + Tailwind + Chart.js + Mermaid.

**Owner agent**: Megumin

## Quick Reference

| Need | Action |
|------|--------|
| Generate slides from any input | Megumin writes `slides.md` → renders `slides.html` |
| Restyle or re-render existing slides | Edit `slides.md`, re-render to HTML |
| Convert to PPTX from slides | Pass `slides.md` to pptx skill |
| Convert PPTX to slides | Extract with `markitdown deck.pptx`, rewrite as `slides.md` |

## Architecture

**Pipeline**: Markdown → HTML (+ PPTX, PDF via other renderers)

```
┌──────────────────────────────────────────────────────────────────┐
│ slides.md (canonical source)                                     │
│                                                                  │
│  YAML frontmatter (title, theme, author, date)                   │
│  --- separated slides                                            │
│  <!-- slide: layout=X --> hints                                  │
│  Standard markdown (headings, lists, bold, links)                │
│  ```mermaid blocks for diagrams                                  │
│  Tables for chart data                                           │
│  ::: left / ::: right for columns                                │
│  <!-- notes --> for speaker notes                                │
│                                                                  │
├──────────────┬───────────────────┬───────────────────────────────┤
│              │                   │                               │
│              ▼                   ▼                               ▼
│   slides.html              slides.pptx                    slides.pdf
│   (Megumin)                (pptx skill)                   (Marp/print)
│   reveal.js + Tailwind     pptxgenjs                      ?print-pdf
│   Chart.js + Mermaid                                               │
└──────────────────────────────────────────────────────────────────┘
```

## Features

| Feature | How |
|---------|-----|
| Slide transitions | `data-transition="slide|fade|convex|concave|zoom|none"` per section |
| Auto-Animate | `data-auto-animate` morphs matching elements between consecutive slides |
| Fragment animations | `class="fragment fade-up"` + Animate.css classes for advanced effects |
| Speaker notes | `<aside class="notes">` inside sections, press S to open |
| Code highlighting | reveal.js highlight plugin, `data-line-numbers` for line stepping |
| Vertical slides | Nested `<section>` for drill-down content |
| Overview mode | Press ESC for thumbnail grid |
| PDF export | Append `?print-pdf` to URL, then Ctrl+P |
| Charts | Chart.js — bar, line, doughnut, radar, polar area with animations and tooltips |
| Diagrams | Mermaid for complex flows (5+ nodes), inline SVG for simple diagrams |
| Styling | Tailwind CSS utilities for consistent spacing, typography, and layout |
| Icons | Lucide icon font for feature cards and visual bullets |
| Responsive | Scales to viewport, works on mobile |

## Themes

10 built-in themes as CSS custom property sets:

| Theme | Vibe | Background | Best For |
|-------|------|------------|----------|
| Crimson | Bold, dramatic | Dark | Keynotes, launches |
| Midnight | Professional | Dark | Executive, strategy |
| Forest | Natural, growth | Dark | Sustainability |
| Coral | Warm, creative | Light | Marketing, creative |
| Arctic | Cool, technical | Light | Architecture, deep-dives |
| Ember | Warm, approachable | Light | Stakeholder briefs |
| Monochrome | Clean, minimal | Light | Data-heavy |
| Neon | High-energy | Dark | Tech demos, dev talks |
| Sage | Calm, balanced | Light | Healthcare, professional |
| Berry | Premium, luxury | Dark | Fintech, luxury |

## Workflow

**Markdown first.** Every presentation starts as `slides.md` — the canonical source. HTML is a rendered output.

```
INTAKE → OUTLINE → WRITE slides.md → RENDER slides.html → QA → DELIVER
```

### 1. INTAKE

Gather from user or upstream skill:
- Content / topic
- Audience (executives, developers, clients)
- Slide count (default: 10-15)
- Theme choice
- Tone (formal, creative, technical)
- Special needs (code, diagrams, charts, speaker notes)

### 2. OUTLINE

Present slide-by-slide plan. **GATE: User approves before writing.**

### 3. WRITE MARKDOWN

Write `slides.md` with all slide content. See `plugin/agents/megumin.md` for the full markdown format specification (YAML frontmatter, `---` slide separators, `<!-- slide: layout=X -->` hints, Mermaid code blocks, chart data tables, `::: left`/`::: right` columns, `<!-- notes -->` speaker notes).

This file is the **single source of truth** — it can be re-rendered to HTML, PPTX, or PDF at any time.

### 4. RENDER HTML

Parse `slides.md` and generate `slides.html`:
- YAML frontmatter → theme selection + metadata
- `---` splits → reveal.js `<section>` elements
- Mermaid blocks → `<div class="mermaid">`
- Chart tables → Chart.js `<canvas>` + config
- Column dividers → Tailwind flex layouts
- Notes → `<aside class="notes">`
- Load CDN libraries (reveal.js, Tailwind, Chart.js, Mermaid)

### 5. QA

Open HTML in browser. Verify slides render, navigate, and display correctly. Fix `slides.md` for content issues, `slides.html` for render issues.

### 6. DELIVER

Present both files:
- `slides.md` — source, editable, re-renderable to other formats
- `slides.html` — rendered presentation
- Navigation instructions
- Mention: "Pass slides.md to pptx skill for PPTX, or append `?print-pdf` for PDF export."

## Output Files

```
{output-dir}/
  ├─ slides.md    ← canonical source (always generated)
  ├─ slides.html  ← HTML render (always generated)
  ├─ slides.pptx  ← PPTX render (if requested, via pptx skill)
  └─ slides.pdf   ← PDF render (if requested, via ?print-pdf or Marp)
```

## CDN Stack

All libraries loaded from jsDelivr CDN. The HTML file requires internet on first open, then browser-cached.

| Library | CDN URL | Purpose | Required? |
|---------|---------|---------|-----------|
| reveal.js 5.x | `cdn.jsdelivr.net/npm/reveal.js@5` | Slide engine | Always |
| Tailwind CSS | `cdn.tailwindcss.com` | Utility-first styling | Always |
| Chart.js 4.x | `cdn.jsdelivr.net/npm/chart.js@4` | Data visualizations | When charts needed |
| Mermaid 11.x | `cdn.jsdelivr.net/npm/mermaid@11` | Complex diagrams | When 5+ node diagrams needed |
| Animate.css 4.x | `cdn.jsdelivr.net/npm/animate.css@4` | Entrance animations | Optional polish |
| Lucide Icons | `cdn.jsdelivr.net/npm/lucide-static@latest` | Icon font | When icon grids needed |

### Fallback: Offline Mode

If the presentation must work without internet, fall back to:
- Minimal inline slide engine (~200 lines JS) for navigation
- Inline SVG for all diagrams and charts (using Megumin's SVG Diagram Library)
- Inline CSS instead of Tailwind
- Produces a 200-500KB self-contained file

## Content Rules

- **Max 6 bullets per slide** — overflow splits into new slide
- **Max 20 words per bullet** — be concise
- **Every slide needs a visual** — layout, chart, icon, or diagram
- **Never repeat layouts** on consecutive slides — alternate patterns
- **Title + closing slides** must have gradient or solid color backgrounds
- **Code blocks max 15 lines** — split longer code
- **System fonts only** — `system-ui`, `ui-monospace`, never external fonts
- **No internal agent names** — never use Conan, Diablo, Killua, Rohan, etc. in slide content. Use role names: Developer, Reviewer, Tester, Designer
- **Design judgment over rigid rules** — Megumin sizes elements proportionally. Headings serve the content, not the other way around. See Design Principles in the agent spec.

## Diagram Integration

All diagrams are generated as **inline SVG** — no Mermaid, no D3, no external dependencies. Megumin computes coordinates and renders directly into slide HTML.

The full diagram library with templates, layout algorithms, and examples is defined in `plugin/agents/megumin.md` under **Inline SVG Diagram Library**. Available diagram types:

| Type | Use Case | Layout |
|------|----------|--------|
| **Flowchart** | Process flows, decision trees, data pipelines | Grid-based nodes with shaped boxes (rect, diamond, cylinder, pill) connected by arrows |
| **Sequence Diagram** | API interactions, auth flows, service calls | Participant columns with lifelines, solid/dashed arrows, alt/loop blocks |
| **Architecture Diagram** | System context, service maps, infrastructure | Grouped zones with service nodes, protocol-labeled connections, person actors |
| **Process Flow** | Onboarding, deploy pipeline, sprint phases | Horizontal numbered circles connected by arrows with labels |
| **Bar Chart** | Comparing values across categories | SVG rects with axes and value labels |
| **Pie Chart** | Percentage breakdowns | Arc paths with percentage labels and legend |
| **Line Chart** | Trends over time, velocity | Polyline with data point markers and optional fill area |

**Key rules:**
- All diagrams use theme colors from the selected slide theme
- Reusable arrow marker defined once per SVG via `<defs>`
- `viewBox` for responsive scaling — never fixed pixel dimensions
- System font stack only (`font-family: system-ui, sans-serif`)

## Output

- **File**: Single `.html`, 200-500KB typical
- **Location**: `vault/02-docs/stakeholder/{project-slug}/slides.html` (stakeholder context) or user-specified path
- **Compatibility**: Chrome, Firefox, Safari, Edge — works offline via `file://`
- **PDF**: Append `?print-pdf` to file URL, print from browser

## Dependencies

None. All libraries loaded from CDN at runtime — no `npm install` needed.

For offline mode only: `npm install reveal.js` to inline the engine.

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `stakeholder-docs` | Routes HTML slide requests to this skill (via Megumin) |
| `pptx` | Use for .pptx output instead of HTML |
| `frontend-design` | Can inform visual design choices |

## Constraints

- NEVER produce text-only slides
- NEVER skip the outline gate
- NEVER use internal AI agent names in slide content — use role names instead
- NEVER let headings dominate over content — the chart/diagram/grid is the star, not the title
- ALWAYS load reveal.js and Tailwind CSS from CDN (default mode)
- ALWAYS use Chart.js for data visualization (not hand-drawn SVG charts)
- ALWAYS use Mermaid for complex diagrams (5+ nodes)
- ALWAYS verify the file opens correctly before delivering
- Fall back to inline mode only if offline is explicitly requested
