Tech radar management. Display the current radar, add or move technologies between rings, and dispatch Hange to research and recommend a ring.

Usage:
- `/radar` — display the current tech radar (all rings)
- `/radar add {tech} {ring} {reason}` — add a technology to a ring with rationale
- `/radar move {tech} {ring} {reason}` — move a technology to a different ring
- `/radar assess {tech}` — dispatch Hange to research the technology and recommend a ring

Rings: `adopt`, `trial`, `assess`, `hold`

## Steps

### Mode: Default (no arguments)

Dispatch Hange with:
- Instruction to follow `plugin/skills/tech-radar/SKILL.md` — Mode 1 (Display)
- Source: `04-decisions/log/` files where `type: tech-radar`

Present the full radar table grouped by ring (Adopt → Trial → Assess → Hold).

### Mode: add (with tech, ring, and reason)

1. **Validate ring**: Must be one of `adopt`, `trial`, `assess`, `hold`. If invalid, report valid options and stop.

2. **Check for duplicate**: Search `04-decisions/log/` for an existing radar entry for `{tech}`:
   ```bash
   grep -rl "{tech}" 04-decisions/log/
   ```
   If found, surface it: "A radar entry for {tech} already exists at {path}. Use `/radar move` to change its ring."

3. **Dispatch Hange** with:
   - Technology name, ring, and reason
   - Instruction to follow `plugin/skills/tech-radar/SKILL.md` — Mode 2 (Add)
   - Instruction to write decision record to `04-decisions/log/`

4. **Confirm**: "Added {tech} to {Ring}. Decision record: `{path}`."

### Mode: move (with tech, ring, and reason)

1. **Validate ring**: Must be one of `adopt`, `trial`, `assess`, `hold`. If invalid, report valid options and stop.

2. **Find existing entry**: Search `04-decisions/log/` for the technology. If not found, suggest `/radar add` instead.

3. **Detect no-op**: If the technology is already in the target ring, report: "{tech} is already in {Ring}. No change made."

4. **Dispatch Hange** with:
   - Technology name, old ring, new ring, and reason
   - Instruction to follow `plugin/skills/tech-radar/SKILL.md` — Mode 3 (Move)
   - Instruction to update the existing decision record (append to Movement History)

5. **Confirm**: "Moved {tech} from {old-ring} to {ring}. Updated: `{path}`."

### Mode: assess (with tech name)

1. **Dispatch Hange** with:
   - Technology name
   - Instruction to follow `plugin/skills/tech-radar/SKILL.md` — Mode 4 (Assess)
   - Use vault search + WebSearch + Context7 MCP (if available)

2. **Present research briefing**: Show Hange's full assessment: recommendation, evidence table, confidence level, gaps.

3. **Prompt for action**:
   ```
   Hange recommends: {Ring} ({confidence} confidence)

   Add to radar?
   - `/radar add {tech} {recommended-ring} "{rationale}"`
   - Or specify a different ring if you disagree.
   ```

   Do NOT automatically add to the radar — wait for confirmation.
