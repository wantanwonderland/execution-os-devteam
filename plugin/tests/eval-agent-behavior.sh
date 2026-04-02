#!/bin/bash
# Automated agent behavior evaluation
# Tests behavioral rules by sending prompts to Claude Code and checking responses
# Usage: bash plugin/tests/eval-agent-behavior.sh [test-number]

set -e

PASS=0
FAIL=0
SKIP=0

green() { printf "\033[32m✓ %s\033[0m\n" "$1"; PASS=$((PASS+1)); }
red() { printf "\033[31m✗ %s\033[0m\n" "$1"; FAIL=$((FAIL+1)); }
yellow() { printf "\033[33m⊘ %s\033[0m\n" "$1"; SKIP=$((SKIP+1)); }

# Check if claude CLI is available
if ! command -v claude &> /dev/null; then
  echo "Error: 'claude' CLI not found. Install Claude Code first."
  exit 1
fi

TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

# Initialize a minimal project for testing
mkdir -p .claude vault
echo '{}' > package.json
echo '# Test Project' > README.md
git init -q && git add -A && git commit -q -m "init"

echo ""
echo "═══════════════════════════════════════════════"
echo "  Agent Behavior Evaluation"
echo "═══════════════════════════════════════════════"
echo ""
echo "Test directory: $TEST_DIR"
echo ""

# Helper: run claude with a prompt, capture output, check for patterns
run_eval() {
  local test_name="$1"
  local prompt="$2"
  local expect_pattern="$3"    # grep pattern that SHOULD appear
  local reject_pattern="$4"    # grep pattern that should NOT appear (optional)

  echo "  Testing: $test_name..."

  # Run claude in non-interactive mode with timeout
  local output
  output=$(echo "$prompt" | claude --print 2>&1 | head -200) || true

  # Check expected pattern
  if echo "$output" | grep -qi "$expect_pattern"; then
    if [ -n "$reject_pattern" ] && echo "$output" | grep -qi "$reject_pattern"; then
      red "$test_name (found reject pattern: $reject_pattern)"
      return
    fi
    green "$test_name"
  else
    red "$test_name (expected pattern not found: $expect_pattern)"
    echo "    Output preview: $(echo "$output" | head -5 | tr '\n' ' ')"
  fi
}

# ─── Test Suite ───

echo "── Delegation Tests ──"
echo ""

# Test 1: Feature request → Lelouch
run_eval "Feature request routes to Lelouch" \
  "add user authentication to the API" \
  "lelouch\|spec\|specification" \
  ""

# Test 2: Redesign → Lelouch (not utility agent)
run_eval "Redesign routes to Lelouch (not utility agent)" \
  "redesign the marketing page to showcase features" \
  "lelouch\|spec\|SDD" \
  "landing-page-80-20"

# Test 3: Bug fix → Conan (not Wantan direct)
run_eval "Bug fix delegates to agent" \
  "fix the typo in README.md" \
  "conan\|delegat\|route\|dispatch" \
  ""

echo ""
echo "── Pipeline Tests ──"
echo ""

# Test 4: UI task mentions Rohan
run_eval "UI task mentions Rohan requirement" \
  "I need a new settings page with dark mode toggle" \
  "rohan\|design" \
  ""

# Test 5: Deploy mentions review requirement
run_eval "Deploy mentions review requirement" \
  "deploy the latest changes to production" \
  "diablo\|review\|approved" \
  ""

echo ""
echo "═══════════════════════════════════════════════"
printf "  Results: \033[32m%d passed\033[0m, \033[31m%d failed\033[0m, \033[33m%d skipped\033[0m\n" $PASS $FAIL $SKIP
echo "═══════════════════════════════════════════════"
echo ""

# Cleanup
cd /
rm -rf "$TEST_DIR"

echo "Note: These tests verify basic routing patterns."
echo "For full behavioral testing, run the 15 manual scenarios in:"
echo "  plugin/tests/agent-behavior-tests.md"
echo ""

if [ $FAIL -gt 0 ]; then exit 1; fi
exit 0
