# Use Case: Handling New Ideas and Requirements

From raw idea to shipped feature — how Execution-OS captures, evaluates, plans, builds, and tracks new work.

---

## The Lifecycle

```
Idea → Capture → Evaluate → Decide → Plan → Build → Review → Ship → Retro
```

Every stage has an agent and a command.

---

## Stage 1: Capture the Idea

You're in a meeting, shower, or Slack thread and an idea hits.

```
/capture We should add real-time collaboration to the editor — multiple cursors, presence indicators, conflict resolution
```

Wantan creates a capture file in `08-inbox/captures/` with frontmatter (title, tags, date). No commitment yet — just preserved.

**Or just say it naturally:**

```
I think we need WebSocket support for live notifications instead of polling
```

The `auto-capture` skill detects capturable content and writes it to the inbox automatically.

---

## Stage 2: Evaluate the Idea

When you're ready to assess:

```
Tell Wiz to research real-time collaboration options:
- What libraries exist? (Yjs, Automerge, ShareDB, Liveblocks)
- What are the trade-offs?
- What would the architecture look like for our stack?
- How do competitors handle this?
```

**Wiz** delivers a research briefing:
- Library comparison table with pros/cons
- Architecture recommendation
- Effort estimate (S/M/L/XL)
- Gaps section (what she couldn't find)

---

## Stage 3: Make a Decision

```
/decide We'll use Yjs for real-time collaboration because it supports offline-first, has a smaller bundle, and works with our existing ProseMirror editor
```

**L** creates a structured decision record in `04-decisions/log/`:
- Context: why this was needed
- Decision: what we chose
- Alternatives considered: Automerge (heavier), Liveblocks (SaaS dependency), ShareDB (server-heavy)
- Consequences: positive (offline support) and negative (Yjs learning curve)

Or for an architecture-level decision:

```
Tell L to write an ADR for adopting Yjs as our CRDT library
```

**L** uses the `adr-writer` skill to create a full ADR in `02-docs/adr/`.

---

## Stage 4: Plan the Work

### For a small feature:

```
Tell Conan to add WebSocket-based presence indicators showing who's viewing the same document
```

Conan evaluates, designs, and builds it directly.

### For a large feature:

```
Tell Conan to plan the real-time collaboration feature using the fullstack workflow
```

Conan uses `fullstack-workflow` skill:

1. **Requirements**: Clarifies scope with you (which editor? how many concurrent users? conflict resolution strategy?)
2. **Design**:
   - Database: presence tracking table
   - Backend: WebSocket server with Yjs rooms
   - Frontend: cursor overlays, user avatars, connection status
   - **Senku** reviews the architecture
   - **Rohan** designs the collaboration UI (cursor colors, presence avatars, "typing..." indicators)
3. **Implement**: database → backend → frontend → tests (in that order)
4. **Review**: Diablo reviews code, Killua runs tests, Itachi scans security
5. **Ship**: Shikamaru deploys

---

## Stage 5: Track in Sprint

### Add to sprint planning:

```
/sprint-plan
```

**Kazuma** presents velocity baseline and asks for sprint goals. You add:
- "Implement real-time collaboration (Yjs integration)"
- "Add presence indicators"
- "Write E2E tests for multi-user editing"

### Daily tracking:

```
/standup
```

> Yesterday: Set up Yjs WebSocket server, basic document sync working
> Today: Implementing cursor sharing and presence UI
> Blockers: None

### Track tech debt from the implementation:

```
/debt add frontend-app "Yjs provider creates memory leak on unmount — needs cleanup" high architecture
```

---

## Stage 6: Handle Requirement Cwizs Mid-Sprint

Requirements change. Here's how to handle it:

### New requirement from stakeholder:

```
/capture Product wants us to add commenting in the collaborative editor — users should be able to highlight text and add comments like Google Docs
```

### Evaluate impact:

```
Tell Wiz to research how to add inline commenting to a Yjs + ProseMirror setup. What's the effort? Does it change our architecture?
```

### Decide whether to include in current sprint:

```
/decide Adding inline comments to the current sprint. Wiz confirmed Yjs supports annotation marks natively. Estimated 3 story points — fits within our remaining velocity.
```

Or defer:

```
/decide Deferring inline comments to next sprint. Current sprint is at 95% capacity and this is 5 points of work. Will add to backlog.
```

### If the requirement is a pivot:

```
/decide Stopping the real-time collaboration feature. Product has pivoted to offline-first sync instead. Capturing the work done so far for potential reuse.
```

The `auto-decision` skill detects decision language ("decided", "stopping", "pivoting") and logs it automatically with `needs-review` tag.

---

## Stage 7: Handle Bug Reports

A bug is just a requirement with urgency.

### Minor bug:

```
/capture Users report the presence indicator shows wrong avatar colors when more than 5 users are in the same document
```

Then later:

```
/debug The presence indicator uses array index for color assignment. When users leave and rejoin, their index changes but the color map doesn't update.

Tell Conan to fix this — use a hash of the user ID to assign deterministic colors instead of array index.
```

### Critical bug (production):

```
/incident P1 frontend-app "Real-time sync is dropping changes when users type simultaneously — data loss confirmed"
```

Wantan immediately dispatches:
- **Shikamaru**: Checks if recent deploy caused this, prepares rollback
- **L**: Creates incident document
- **Killua**: Runs smoke tests on the affected flow
- Summary returned with recommended action

---

## Stage 8: Retrospective

At sprint end:

```
/retro
```

**Kazuma** analyzes:
- Standup logs: "real-time collaboration" mentioned in 8/10 standups
- PRs: 12 PRs merged for the feature, avg review time 18h (within SLA)
- Incidents: 1 P1 (the sync issue — resolved, postmortem written)
- Test coverage: 78% on new code (below 80% target)

Patterns detected:
- "WebSocket testing was manual — need automated WS test patterns"
- "Yjs integration took longer than estimated — consider spike before next complex library adoption"

Action items created as tasks with owners and due dates.

---

## Command Quick Reference by Lifecycle Stage

| Stage | Command | What Happens |
|-------|---------|-------------|
| **Idea** | `/capture` or just say it | Saved to inbox, auto-tagged |
| **Research** | Tell Wiz to research... | Research briefing with sources + gaps |
| **Decision** | `/decide` | Structured decision record in vault |
| **Architecture** | Tell L to write an ADR... | ADR with context, alternatives, consequences |
| **Planning** | `/sprint-plan` | Velocity baseline, goal setting |
| **Design** | `/design` | Rohan's aesthetic direction |
| **Build** | Tell Conan to build... | Full-stack implementation |
| **Test** | `/test unit`, `/test browser` | Multi-layer testing |
| **Review** | Tell Diablo to review PR #N | 4-angle code review |
| **Security** | `/security` | Dependency + SAST scan |
| **Deploy** | `/deploy` | Pre-deploy validation + status |
| **Bug** | `/debug` | Root cause analysis |
| **Incident** | `/incident P1 repo "desc"` | Coordinated triage |
| **Track** | `/standup` | Daily progress |
| **Debt** | `/debt add` | Log tech debt |
| **Retro** | `/retro` | Sprint retrospective |
| **Metrics** | `/pulse` | Weekly health check |

---

## Tips

1. **Capture everything, decide later.** `/capture` is free — use it liberally. Review captures during `/today` briefing.

2. **Decisions are cheap to log, expensive to forget.** Use `/decide` for any choice that affects the team. Future-you will thank you.

3. **Let Wiz research before you commit.** A 5-minute research briefing prevents a 5-day wrong turn.

4. **Sprint goals are commitments.** Kazuma tracks say-do alignment. Under-promise and over-deliver.

5. **Incidents are not blame.** L writes blameless postmortems. Focus on systems, not people.

6. **Tech debt compounds.** Use `/debt` to track it. Use `/sprint-plan` to allocate 10-20% of each sprint to paying it down.
