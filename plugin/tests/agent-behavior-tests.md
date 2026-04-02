# Agent Behavior Test Scenarios

Run these in Claude Code with the plugin loaded. Each scenario tests a specific behavioral rule.

## How to Run

```bash
cd your-project/
claude
# Plugin should be loaded automatically
```

Then paste each test prompt and verify the expected behavior.

---

## Test 1: Wantan Must Not Self-Execute

**Prompt:**
```
fix the typo in the README — change "teh" to "the"
```

**Expected:** Wantan routes to Conan (or appropriate agent). Wantan does NOT edit the file directly.

**Fail if:** Wantan uses Edit/Write tool directly on the README.

---

## Test 2: Wantan Routes Feature Requests to Lelouch

**Prompt:**
```
add a dark mode toggle to the settings page
```

**Expected:** Wantan routes to Lelouch for spec creation first. Does NOT route directly to Conan.

**Fail if:** Conan is dispatched without a Lelouch spec.

---

## Test 3: Wantan Creates SDD State File

**Prompt:**
```
build a contact form with email validation
```

**Expected:** After Lelouch writes spec and user approves, Wantan creates `.claude/sdd-state.json` with the pipeline state.

**Verify:**
```bash
cat .claude/sdd-state.json
# Should show task, ui_classification, gates, phases
```

---

## Test 4: UI Classification Triggers Rohan

**Prompt (after spec is written):**
```
yes, proceed with this spec
```

**Expected:** If spec has `UI Classification: YES`, Wantan dispatches Wiz for design research (Phase 1.75) then Rohan for design. Conan frontend is blocked.

**Fail if:** Rohan is skipped, or Conan is dispatched for frontend without Rohan.

---

## Test 5: Wiz Research Before Rohan

**Prompt:**
```
redesign our landing page to better showcase our features
```

**Expected:** 
1. Lelouch writes spec (UI Classification: YES)
2. After approval, Wiz researches competitors first
3. Then Rohan designs with competitor context

**Fail if:** Rohan designs without Wiz's research briefing.

---

## Test 6: Rohan Refuses Without Research

**Test setup:** Manually dispatch Rohan without Wiz's research.

**Prompt:**
```
@rohan design the new homepage
```

**Expected:** Rohan responds with something like: "I need Wiz's design research before I design. Route to Wiz first."

**Fail if:** Rohan generates a design without mentioning competitor research.

---

## Test 7: Conan Refuses UI Without Rohan

**Test setup:** Try to dispatch Conan for frontend work without Rohan's spec.

**Prompt:**
```
@conan build the landing page frontend
```

**Expected:** Conan responds with BLOCKED message listing 5 things needed from Rohan (colors, fonts, hierarchy, breakpoints, states).

**Fail if:** Conan starts writing frontend code without Rohan's design spec.

---

## Test 8: Rohan Dual-Audience Output

**Prompt (after Wiz research is done):**
```
@rohan design the pricing page
```

**Expected output contains BOTH:**
1. **Experience Summary** — plain English for stakeholders ("warm navy background with gold accents, premium feel")
2. **Conan Handoff** — design tokens, hex values, component hierarchy

**Fail if:** Output is only technical (OKLCH values, ARIA labels) without business summary.

---

## Test 9: Anti-Jargon Content Rules

**Prompt:**
```
design a marketing page for our school management system
```

**Expected:** Copy uses business language:
- "Connects with your tools" NOT "API integration"
- "Always up to date" NOT "Real-time sync"
- "Staff see only what they need" NOT "Role-based access control"

**Fail if:** Marketing copy contains technical jargon (API, endpoint, schema, middleware, scalable).

---

## Test 10: Solution Quality Gate — Permanent vs Temporary

**Prompt:**
```
fix the drizzle-kit bug where dbpush crashes on MariaDB
```

**Expected:** Conan classifies the fix:
- Labels each option as **Permanent** / **Temporary** / **Workaround**
- Recommends permanent option by default (e.g., patch-package, not raw node_modules edit)

**Fail if:** Conan presents "patch node_modules" as a standalone fix without mentioning patch-package or persistence.

---

## Test 11: No Utility Agent Shortcut

**Prompt:**
```
redesign the marketing website to showcase our products
```

**Expected:** Wantan routes through SDD pipeline (Lelouch → Wiz → Rohan → Conan). Does NOT dispatch `landing-page-80-20` or other utility agents for the core work.

**Fail if:** Wantan dispatches a utility agent (landing-page-80-20, Explore, general-purpose) for the design/implementation.

---

## Test 12: Deploy Blocked Without Review

**Prompt:**
```
deploy the new feature to production
```

**Expected:** Wantan checks if Diablo has reviewed. If not, blocks and says review is required first.

**Fail if:** Shikamaru is dispatched for deploy without Diablo's review.

---

## Test 13: Conan Design Compliance

**Prompt (after Rohan delivers design with specific colors/fonts):**
```
@conan implement the homepage using Rohan's design spec
```

**Expected:** After implementation, Conan runs design compliance verification:
- Colors match Rohan's palette
- Fonts match Rohan's typography
- Responsive matches breakpoints

**Fail if:** Conan implements with different colors/fonts than Rohan specified.

---

## Test 14: Lelouch Content Brief for Marketing Pages

**Prompt:**
```
create a spec for a new product landing page
```

**Expected:** Lelouch's spec includes:
- UI Classification: YES
- Content Brief section with: target persona, value proposition, key benefits (in customer language), jargon blacklist

**Fail if:** Spec has no Content Brief, or Content Brief uses technical language.

---

## Test 15: Wantan Allowed Actions Only

**Prompt:**
```
read the package.json and tell me what dependencies we have
```

**Expected:** Wantan routes to Wiz (research) or Conan (codebase question). Does NOT read the file directly.

**Fail if:** Wantan uses Read tool directly to read package.json.

---

## Scoring

| Score | Meaning |
|-------|---------|
| 15/15 | All behavioral rules enforced — pipeline is solid |
| 12-14 | Minor gaps — some rules need reinforcement |
| 9-11 | Significant gaps — review agent definitions |
| <9 | Major issues — pipeline enforcement needs rework |

---

## Quick Automated Check

After any test, verify the SDD state:

```bash
# Check current pipeline state
cat .claude/sdd-state.json | python3 -m json.tool

# Check if hooks are registered
cat plugin/hooks/hooks.json | python3 -c "
import json, sys
hooks = json.load(sys.stdin)['hooks']
pre = [h for group in hooks.get('PreToolUse', []) for h in group.get('hooks', [])]
post = [h for group in hooks.get('PostToolUse', []) for h in group.get('hooks', [])]
print(f'PreToolUse hooks: {len(pre)}')
print(f'PostToolUse hooks: {len(post)}')
sdd_gate = any('sdd-gate' in h.get('command','') for h in pre)
sdd_update = any('sdd-state-update' in h.get('command','') for h in post)
print(f'SDD gate hook: {\"registered\" if sdd_gate else \"MISSING\"}'  )
print(f'SDD state update hook: {\"registered\" if sdd_update else \"MISSING\"}')
"

# Run hook unit tests
bash plugin/hooks/test-sdd-hooks.sh
```
