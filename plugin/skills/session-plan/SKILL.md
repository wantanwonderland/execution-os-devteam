---
name: session-plan
description: Generate HRDF-format Session Plan and Schedule documents (DOCX) for workshops, trainings, webinars, and speaking events. Use when {{OWNER_NAME}} needs a formal session plan with modules, timing, methods, and resources.
---

# Session Plan Generator

Generate professional Session Plan and Schedule documents in DOCX format, following HRDF certification standards. This skill produces the formal planning document that accompanies any workshop, training, or speaking event designed with the `workshop-designer` skill.

## When to Use

- {{OWNER_NAME}} asks for a "session plan" or "session schedule"
- An HRDF-format session plan is needed for certification or submission
- A workshop design needs to be formalised into a structured document with timing and methods
- {{OWNER_NAME}} is preparing materials for a training programme and needs the planning document
- Any time a workshop, training, webinar, or speaking event needs a formal breakdown of modules, duration, resources, and methods

## Relationship to Workshop Designer

| Skill | Purpose |
|-------|---------|
| `workshop-designer` | Designs the workshop: content, facilitation approach, delivery markers, frameworks |
| `session-plan` | Structures the session into a formal document: modules, timing, resources, methods |

**Workflow**: Design first (`workshop-designer`), then formalise (`session-plan`). The session plan references the workshop design but is a standalone deliverable.

## Document Structure

Every session plan has two sections:

### Section 1: Header Table (2 columns)

| Field | Description |
|-------|-------------|
| **TRAINER NAME** | {{OWNER_NAME}} (or specified trainer) |
| **DATE** | Event date |
| **PROGRAMME TITLE** | Workshop/session title |
| **DURATION** | Total duration (e.g., "15 Minutes", "3 Hours", "Full Day") |
| **LEARNING OBJECTIVE** | Single paragraph: what the session aims to achieve. Start with "This session aims to..." |
| **LEARNING OUTCOMES** | Numbered list using measurable action verbs (Bloom's). Start with "At the end of this session, all participants will be able to:" |

### Section 2: Schedule Table (4 columns)

| Column | Content |
|--------|---------|
| **Modules / Learning Points** | Module title (bold) + sub-headed bullet points covering key content, facilitator actions, and participant activities |
| **Resources / Training Aids** | Slide numbers, handouts, tools, equipment needed |
| **Method(s) / Activities** | Teaching methods used (lecture, pair share, demonstration, etc.) |
| **Duration (min)** | Time allocation in minutes (bold, centred) |

**Final row**: "Total number of minutes" with the sum.

## Module Content Format

Each module in the "Modules / Learning Points" column MUST follow this structure:

1. **Module title** in bold (e.g., "KP1: AI Replaces Tasks, Not Jobs")
2. **Sub-sections** with bold sub-headers (e.g., "Core Concept (Slide 6):")
3. **Bullet points** under each sub-section covering:
   - What the facilitator says or asks (key lines in quotes)
   - What the facilitator does (cold-call, walk through, coach)
   - What participants do (reflect, share, build, answer)
   - Bridge/transition to next module (final bullet)

**Word count**: Each module should have 50-90 words of content, broken into scannable bullets. Dense enough to be useful as a glance-reference during delivery, concise enough to fit in a table cell.

**Do NOT write prose paragraphs.** Always use bullet points grouped under bold sub-headers.

### Example Module

```
**KP1: AI Replaces Tasks, Not Jobs**

**Core Concept (Slide 6):**
- Ask: "What did you actually spend time on yesterday? Not your job title — the actual tasks."
- Cold-call one person to share a specific task
- Establish principle: AI replaces tasks, not jobs — the repetitive ones go first
- Introduce Two Buckets: Bucket 1 = high-value (thinking, deciding); Bucket 2 = repetitive (formatting, summarising)
- "AI eats Bucket 2. Your title stays. What's inside changes."

**Think + Share + Harvest:**
- Participants silently identify 2–3 repetitive weekly tasks (10 sec)
- Share with neighbour (30 sec)
- Cold-call 2–3 people to harvest examples; validate each answer
- Bridge: "There are only three answers. Three types. You're already one of them."
```

## Methods / Activities Vocabulary

Use these standard terms in the Methods column:

| Method | When to Use |
|--------|------------|
| Lecture | Facilitator explains a concept (keep brief) |
| Question & answer | Facilitator poses questions, participants respond |
| Reflection | Silent thinking time (specify duration) |
| Pair share | Participants discuss with neighbour (specify duration) |
| Harvest / Cold-call | Facilitator collects answers from specific participants |
| Show of hands | Quick poll or pulse check |
| Self-assessment | Participants evaluate themselves against criteria |
| Demonstration | Facilitator shows a live example |
| Co-build activity | Facilitator and participants build something together |
| Individual coaching | Facilitator coaches one participant while room observes |
| Room say-along | Participants repeat a phrase or framework together |
| Elicitation | Facilitator draws out answers before revealing |
| Debrief | Structured discussion after an activity |
| Group activity | Participants work in groups on a task |
| Role play | Participants practise a scenario |
| Case study | Participants analyse a real or simulated scenario |
| Verbal assessment | Facilitator checks learning outcomes verbally |
| Q&A | Open question and answer session |
| Icebreaker | Opening engagement activity |
| Sharing | Participants share experiences or examples |

## Timing Guardrails

| Session Length | Suggested Module Count | Intro | Per KP | Closing |
|---------------|----------------------|-------|--------|---------|
| 15 min | 3 KPs | 3 min | 2-4 min | 2 min |
| 30 min | 3-4 KPs | 5 min | 5-7 min | 3 min |
| 1 hour | 4-5 KPs | 7 min | 8-12 min | 5 min |
| Half day (3h) | 5-7 KPs | 15 min | 20-30 min | 10 min |
| Full day (7h) | 8-12 KPs | 20 min | 30-45 min | 15 min |

Include breaks: 10 min per hour for sessions over 1 hour.

## DOCX Generation

Generate the session plan as a DOCX file using `docx-js` (npm `docx` package).

### Page Setup

- **Orientation**: Landscape (wide tables need horizontal space)
- **Page size**: US Letter landscape (width: 15840, height: 12240 DXA)
- **Margins**: 0.5 inches all sides (720 DXA)

### Table Styling

```
Header table:  2 columns (3600 + 11438 DXA = 15038 total)
Schedule table: 4 columns (5000 + 3500 + 4538 + 2000 DXA = 15038 total)

Header cells:   Grey fill (E7E6E6), bold labels
Schedule header: Blue fill (2F5496), white bold text
Content cells:  White fill (FFFFFF)
Total row:      Grey fill (E7E6E6), bold
Borders:        Single, 1pt, black (000000)
Cell margins:   60 DXA top/bottom, 100 DXA left/right
Font:           Calibri, 11pt (size: 22 half-points)
Duration:       Bold, centred
```

### Bullet Points

Use `LevelFormat.BULLET` with numbering config. NEVER use unicode bullet characters (`\u2022`) as raw text — always use the numbering system.

### Smart Quotes

Use proper typographic quotes in all content:
- `\u201C` and `\u201D` for double quotes
- `\u2018` and `\u2019` for single quotes and apostrophes
- `\u2014` for em dash
- `\u2026` for ellipsis
- `\u2013` for en dash (number ranges like "2\u20133")
- `\u2192` for arrow (transitions)
- `\u2605` for star markers (interaction highlights)

### Build Script Pattern

```javascript
const NODE_PATH = "/Users/aidev/.local/share/fnm/node-versions/v24.12.0/installation/lib/node_modules";
// Run with: NODE_PATH=<above> node build-session-plan.js

const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, WidthType, ShadingType, BorderStyle, PageOrientation,
        LevelFormat } = require("docx");
```

### Output Location

Save to the same directory as other workshop materials, typically:
- `~/Downloads/` for immediate use
- `~/Downloads/(your-materials)/` for certification materials
- Workshop-specific folders when specified

## Learning Outcomes Writing Rules

Learning outcomes MUST use measurable action verbs from Bloom's Taxonomy:

| Level | Verbs to Use |
|-------|-------------|
| Remember | list, name, recall, identify, recognise |
| Understand | explain, describe, summarise, classify |
| Apply | use, demonstrate, implement, execute |
| Analyse | compare, contrast, differentiate, examine |
| Evaluate | assess, critique, judge, justify |
| Create | design, construct, develop, produce, build |

**Format**: "At the end of this session, all participants will be able to: [verb] + [what] + [context/condition]"

**Example**:
- "Explain why AI replaces tasks, not jobs — and what that means for their role"
- "Create a meta-prompt using PCTGG that gets AI to generate the right prompt for their task"

## Checklist

Before finalising any session plan:

- [ ] All 6 header fields populated (Trainer, Date, Title, Duration, Objective, Outcomes)
- [ ] Learning outcomes use measurable Bloom's verbs
- [ ] Every module has bold title + bold sub-headers + bullet points
- [ ] Module content is 50-90 words (scannable, not prose)
- [ ] Methods column lists all teaching methods used in the module
- [ ] Resources column references correct slide numbers
- [ ] Duration column adds up to total session time
- [ ] Total row present with correct sum
- [ ] Introduction module includes opening hook and learning outcomes presentation
- [ ] Closing module includes learning outcome review and Q&A
- [ ] Bridges between modules are explicit (last bullet of each module)
- [ ] DOCX generated in landscape, Calibri 11pt, proper table formatting
- [ ] Smart quotes used throughout (no straight quotes)

## Reference Session Plan

The TTT Capstone session plan is the gold standard:
- File: `~/Downloads/(your-materials)/{{OWNER_NAME}}-Session-Plan.docx`
- 15-minute workshop with 5 modules (Introduction, KP1, KP2, KP3, Closing)
- Each module uses bold sub-headers + bullets for scannability
- Methods column is specific (not just "lecture" — includes pair share durations, cold-call, etc.)

## Related Skills

- `workshop-designer` — Design the workshop content, facilitation approach, and delivery style
- `pptx` — Create the slide deck that accompanies the session plan
- `docx` — DOCX generation reference for formatting details
