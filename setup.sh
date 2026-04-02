#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# setup.sh — Bootstrap Execution-OS from template
# Copies vault contents to project root, runs install + setup wizard
# ============================================================================

GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo -e "${BOLD}${CYAN}Setting up Execution-OS...${NC}"
echo ""

# Copy vault contents to root (skip existing files)
if [ -d "$SCRIPT_DIR/vault" ]; then
  echo -e "Copying vault structure to project root..."
  cp -rn "$SCRIPT_DIR/vault/"* "$SCRIPT_DIR/" 2>/dev/null || true
  cp -rn "$SCRIPT_DIR/vault/".* "$SCRIPT_DIR/" 2>/dev/null || true
  echo -e "  ${GREEN}✓${NC} Vault structure copied"
else
  echo "vault/ directory not found — skipping copy"
fi

# Run install
if [ -f "$SCRIPT_DIR/install.sh" ]; then
  echo ""
  bash "$SCRIPT_DIR/install.sh"
else
  echo "install.sh not found — skip prerequisites check"
fi

# Run setup wizard
if [ -f "$SCRIPT_DIR/setup-wizard.sh" ]; then
  echo ""
  bash "$SCRIPT_DIR/setup-wizard.sh"
else
  echo "setup-wizard.sh not found — skip personalization"
fi

echo ""
echo -e "${BOLD}${GREEN}Setup complete!${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Run: ${CYAN}claude${NC}"
echo -e "  2. Type: ${CYAN}/plugin marketplace add wantanwonderland/execution-os-devteam${NC}"
echo -e "  3. Type: ${CYAN}/plugin install execution-os-devteam${NC}"
echo -e "  4. Type: ${CYAN}/start${NC}"
echo ""
