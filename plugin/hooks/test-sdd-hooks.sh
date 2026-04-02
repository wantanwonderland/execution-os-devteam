#!/bin/bash
# Test suite for SDD pipeline enforcement hooks
# Run: bash plugin/hooks/test-sdd-hooks.sh

set -e

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
GATE="$HOOK_DIR/sdd-gate.sh"
UPDATE="$HOOK_DIR/sdd-state-update.sh"
TEST_DIR=$(mktemp -d)
PASS=0
FAIL=0

cd "$TEST_DIR"

green() { printf "\033[32m✓ %s\033[0m\n" "$1"; PASS=$((PASS+1)); }
red() { printf "\033[31m✗ %s\033[0m\n" "$1"; FAIL=$((FAIL+1)); }

run_gate() {
  local desc="$1" prompt="$2" expected_exit="$3"
  export CLAUDE_TOOL_NAME=Agent
  local actual_exit=0
  echo "$prompt" | bash "$GATE" > /dev/null 2>&1 || actual_exit=$?
  if [ "$actual_exit" -eq "$expected_exit" ]; then
    green "$desc (exit $actual_exit)"
  else
    red "$desc (expected exit $expected_exit, got $actual_exit)"
  fi
}

run_update() {
  local desc="$1" input="$2" check_field="$3" check_value="$4"
  export CLAUDE_TOOL_NAME=Agent
  echo "$input" | bash "$UPDATE" > /dev/null 2>&1
  local actual=$(python3 -c "
import json
with open('.claude/sdd-state.json') as f:
    state = json.load(f)
# Navigate nested fields like 'gates.rohan_delivered'
parts = '$check_field'.split('.')
val = state
for p in parts:
    val = val.get(p, {}) if isinstance(val, dict) else {}
print(val)
" 2>/dev/null)
  if [ "$actual" = "$check_value" ]; then
    green "$desc ($check_field=$actual)"
  else
    red "$desc (expected $check_field=$check_value, got $actual)"
  fi
}

write_state() {
  mkdir -p .claude
  cat > .claude/sdd-state.json << STATEEOF
$1
STATEEOF
}

echo ""
echo "═══════════════════════════════════════════════"
echo "  SDD Pipeline Enforcement — Test Suite"
echo "═══════════════════════════════════════════════"
echo ""

# ─── GATE TESTS (sdd-gate.sh) ───

echo "── Gate Hook Tests ──"
echo ""

# 1. No state file → allow everything
rm -rf .claude
run_gate "No state file → ALLOW" \
  '{"prompt":"dispatch conan frontend","description":"build page"}' 0

# 2. UI=YES, Rohan not delivered, frontend dispatch → BLOCK
write_state '{
  "task":"test","current_phase":2,"ui_classification":"YES",
  "gates":{"spec_approved":true,"rohan_delivered":false},
  "phases":{}
}'
run_gate "Frontend dispatch without Rohan → BLOCK" \
  '{"prompt":"dispatch conan to build the landing page frontend","description":"build landing page"}' 2

# 3. UI=YES, Rohan delivered, frontend dispatch → ALLOW
write_state '{
  "task":"test","current_phase":3,"ui_classification":"YES",
  "gates":{"spec_approved":true,"rohan_delivered":true,"tests_written":true},
  "phases":{}
}'
run_gate "Frontend dispatch with Rohan done → ALLOW" \
  '{"prompt":"dispatch conan to build the landing page frontend","description":"build landing page"}' 0

# 4. UI=NO, frontend dispatch without Rohan → ALLOW (no design needed)
write_state '{
  "task":"test","current_phase":2,"ui_classification":"NO",
  "gates":{"spec_approved":true,"rohan_delivered":false},
  "phases":{}
}'
run_gate "Frontend dispatch with UI=NO → ALLOW" \
  '{"prompt":"dispatch conan to build the page","description":"build page"}' 0

# 5. Deploy without review → BLOCK
write_state '{
  "task":"test","current_phase":4,"ui_classification":"NO",
  "gates":{"spec_approved":true,"review_approved":false},
  "phases":{}
}'
run_gate "Deploy without review → BLOCK" \
  '{"prompt":"dispatch shikamaru to deploy to production","description":"deploy"}' 2

# 6. Deploy with review → ALLOW
write_state '{
  "task":"test","current_phase":5,"ui_classification":"NO",
  "gates":{"spec_approved":true,"review_approved":true},
  "phases":{}
}'
run_gate "Deploy with review approved → ALLOW" \
  '{"prompt":"dispatch shikamaru to deploy to production","description":"deploy"}' 0

# 7. Implementation before spec approved → BLOCK
write_state '{
  "task":"test","current_phase":1,"ui_classification":"NO",
  "gates":{"spec_approved":false},
  "phases":{}
}'
run_gate "Implement before spec approved → BLOCK" \
  '{"prompt":"dispatch conan to implement the feature","description":"implement feature"}' 2

# 8. Backend work while Rohan not done → ALLOW (backend not blocked)
write_state '{
  "task":"test","current_phase":2,"ui_classification":"YES",
  "gates":{"spec_approved":true,"rohan_delivered":false},
  "phases":{}
}'
run_gate "Backend dispatch without Rohan → ALLOW" \
  '{"prompt":"dispatch conan to build the backend API and database schema","description":"build backend API"}' 0

# 9. Research/Wiz dispatch → ALLOW (not gated)
write_state '{
  "task":"test","current_phase":1,"ui_classification":"NO",
  "gates":{"spec_approved":false},
  "phases":{}
}'
run_gate "Wiz research dispatch → ALLOW" \
  '{"prompt":"dispatch wiz to research authentication options","description":"research auth"}' 0

# 10. Rohan dispatch → ALLOW (design agent is never blocked)
write_state '{
  "task":"test","current_phase":2,"ui_classification":"YES",
  "gates":{"spec_approved":true,"rohan_delivered":false},
  "phases":{}
}'
run_gate "Rohan dispatch → ALLOW" \
  '{"prompt":"dispatch rohan to design the landing page","description":"design landing page"}' 0

echo ""

# ─── STATE UPDATE TESTS (sdd-state-update.sh) ───

echo "── State Update Hook Tests ──"
echo ""

# 11. Rohan completes → rohan_delivered = true
write_state '{
  "task":"test","current_phase":2,"ui_classification":"YES",
  "gates":{"spec_approved":true,"rohan_delivered":false,"tests_written":false},
  "phases":{"3_frontend":{"status":"blocked","agent":"conan"}}
}'
run_update "Rohan completes → rohan_delivered=True" \
  '{"tool_name":"Agent","tool_input":{"prompt":"rohan design the aesthetic direction","description":"design landing page"}}' \
  "gates.rohan_delivered" "True"

# 12. Killua completes tests → tests_written = true
write_state '{
  "task":"test","current_phase":2,"ui_classification":"YES",
  "gates":{"spec_approved":true,"rohan_delivered":true,"tests_written":false},
  "phases":{"3_frontend":{"status":"blocked","agent":"conan"}}
}'
run_update "Killua completes tests → tests_written=True" \
  '{"tool_name":"Agent","tool_input":{"prompt":"killua write failing tests from spec","description":"write tests"}}' \
  "gates.tests_written" "True"

# 13. After Rohan + Killua both done → frontend unblocked
write_state '{
  "task":"test","current_phase":2,"ui_classification":"YES",
  "gates":{"spec_approved":true,"rohan_delivered":true,"tests_written":false},
  "phases":{"3_frontend":{"status":"blocked","agent":"conan"}}
}'
run_update "Rohan+Killua done → frontend unblocked" \
  '{"tool_name":"Agent","tool_input":{"prompt":"killua write unit tests","description":"write tests"}}' \
  "phases.3_frontend.status" "pending"

# 14. Diablo review → review_approved = true
write_state '{
  "task":"test","current_phase":4,"ui_classification":"NO",
  "gates":{"spec_approved":true,"review_approved":false},
  "phases":{}
}'
run_update "Diablo review → review_approved=True" \
  '{"tool_name":"Agent","tool_input":{"prompt":"diablo code review the PR","description":"code review"}}' \
  "gates.review_approved" "True"

# 15. Itachi security scan → security_clear = true
write_state '{
  "task":"test","current_phase":4,"ui_classification":"NO",
  "gates":{"security_clear":false},
  "phases":{}
}'
run_update "Itachi scan → security_clear=True" \
  '{"tool_name":"Agent","tool_input":{"prompt":"itachi security scan the codebase","description":"security scan"}}' \
  "gates.security_clear" "True"

# 16. Non-Agent tool → no state change
write_state '{
  "task":"test","current_phase":2,"ui_classification":"NO",
  "gates":{"spec_approved":true,"rohan_delivered":false},
  "phases":{}
}'
export CLAUDE_TOOL_NAME=Bash
echo '{"tool_name":"Bash","tool_input":{"command":"npm test"}}' | bash "$UPDATE" > /dev/null 2>&1
actual=$(python3 -c "import json; print(json.load(open('.claude/sdd-state.json'))['gates']['rohan_delivered'])" 2>/dev/null)
if [ "$actual" = "False" ]; then
  green "Non-Agent tool → no state change (rohan_delivered=$actual)"
  PASS=$((PASS+1))
else
  red "Non-Agent tool → unexpected state change (rohan_delivered=$actual)"
  FAIL=$((FAIL+1))
fi
# Fix double count
PASS=$((PASS-1))

echo ""
echo "═══════════════════════════════════════════════"
printf "  Results: \033[32m%d passed\033[0m, \033[31m%d failed\033[0m\n" $PASS $FAIL
echo "═══════════════════════════════════════════════"
echo ""

# Cleanup
rm -rf "$TEST_DIR"

if [ $FAIL -gt 0 ]; then exit 1; fi
exit 0
