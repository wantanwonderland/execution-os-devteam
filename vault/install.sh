#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# install.sh — One-command setup for Execution-OS (Dev Team Edition)
# Run: bash install.sh
# Installs: Homebrew, Node.js, GitHub CLI, Claude Code, Playwright browsers
# ============================================================================

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║    Execution-OS Installer (Dev Team)     ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "This will install everything you need to run the dev team AI execution system."
echo -e "It takes about 5 minutes. You may be asked for your Mac password once."
echo ""

# ===== Step 1: Homebrew =====
echo -e "${BOLD}${BLUE}Step 1/6: Checking Homebrew...${NC}"

if command -v brew &>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Homebrew already installed ($(brew --version | head -1))"
else
  echo -e "  ${YELLOW}Homebrew not found. Installing...${NC}"
  echo -e "  ${CYAN}(Package manager for macOS — like an app store for developer tools)${NC}"
  echo ""
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Add Homebrew to PATH for Apple Silicon Macs
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    SHELL_PROFILE="${HOME}/.zprofile"
    if ! grep -q 'homebrew' "$SHELL_PROFILE" 2>/dev/null; then
      echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$SHELL_PROFILE"
    fi
  fi

  if command -v brew &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Homebrew installed successfully"
  else
    echo -e "  ${RED}✗${NC} Homebrew installation failed."
    echo -e "  ${YELLOW}Try closing Terminal, reopening it, and running this script again.${NC}"
    exit 1
  fi
fi

# ===== Step 2: Node.js =====
echo ""
echo -e "${BOLD}${BLUE}Step 2/6: Checking Node.js...${NC}"

if command -v node &>/dev/null; then
  NODE_VERSION=$(node --version)
  echo -e "  ${GREEN}✓${NC} Node.js already installed (${NODE_VERSION})"
else
  echo -e "  ${YELLOW}Node.js not found. Installing...${NC}"
  echo -e "  ${CYAN}(Required for Claude Code and wantan-mem memory service)${NC}"
  brew install node

  if command -v node &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Node.js installed ($(node --version))"
  else
    echo -e "  ${RED}✗${NC} Node.js installation failed."
    echo -e "  ${YELLOW}Try: brew install node${NC}"
    exit 1
  fi
fi

# ===== Step 3: GitHub CLI =====
echo ""
echo -e "${BOLD}${BLUE}Step 3/6: Checking GitHub CLI...${NC}"

if command -v gh &>/dev/null; then
  echo -e "  ${GREEN}✓${NC} GitHub CLI already installed ($(gh --version | head -1))"
else
  echo -e "  ${YELLOW}GitHub CLI not found. Installing...${NC}"
  echo -e "  ${CYAN}(Required for PR reviews, CI monitoring, and security scanning)${NC}"
  brew install gh

  if command -v gh &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} GitHub CLI installed ($(gh --version | head -1))"
  else
    echo -e "  ${RED}✗${NC} GitHub CLI installation failed."
    echo -e "  ${YELLOW}Try: brew install gh${NC}"
    exit 1
  fi
fi

# Check gh auth status
if gh auth status &>/dev/null; then
  echo -e "  ${GREEN}✓${NC} GitHub CLI authenticated"
else
  echo -e "  ${YELLOW}⚠${NC} GitHub CLI not authenticated. Run after install: ${CYAN}gh auth login${NC}"
fi

# ===== Step 4: Claude Code =====
echo ""
echo -e "${BOLD}${BLUE}Step 4/6: Checking Claude Code...${NC}"

if command -v claude &>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Claude Code already installed ($(claude --version 2>/dev/null || echo 'installed'))"
else
  echo -e "  ${YELLOW}Claude Code not found. Installing...${NC}"
  echo -e "  ${CYAN}(The AI engine powering your dev squad)${NC}"
  npm install -g @anthropic-ai/claude-code 2>/dev/null || {
    echo -e "  ${YELLOW}Retrying with elevated permissions...${NC}"
    sudo npm install -g @anthropic-ai/claude-code
  }

  if command -v claude &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Claude Code installed"
  else
    echo -e "  ${RED}✗${NC} Claude Code installation failed."
    echo -e "  ${YELLOW}Try: sudo npm install -g @anthropic-ai/claude-code${NC}"
    exit 1
  fi
fi

# ===== Step 5: SQLite =====
echo ""
echo -e "${BOLD}${BLUE}Step 5/6: Checking SQLite...${NC}"

if command -v sqlite3 &>/dev/null; then
  echo -e "  ${GREEN}✓${NC} SQLite already installed ($(sqlite3 --version | cut -d' ' -f1))"
else
  echo -e "  ${YELLOW}SQLite not found. Installing...${NC}"
  brew install sqlite3

  if command -v sqlite3 &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} SQLite installed"
  else
    echo -e "  ${RED}✗${NC} SQLite installation failed."
    exit 1
  fi
fi

# ===== Step 6: API Key =====
echo ""
echo -e "${BOLD}${BLUE}Step 6/6: Setting up your API key...${NC}"

SHELL_RC="${HOME}/.zshrc"

if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  echo -e "  ${GREEN}✓${NC} API key already configured"
elif grep -q 'ANTHROPIC_API_KEY' "$SHELL_RC" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} API key found in ${SHELL_RC}"
  source "$SHELL_RC" 2>/dev/null || true
else
  echo -e "  ${CYAN}Your API key starts with 'sk-ant-' and is about 100 characters long.${NC}"
  echo ""
  echo -n "  Paste your API key here (or press Enter to skip): "
  read -r API_KEY

  if [[ -z "$API_KEY" ]]; then
    echo -e "  ${YELLOW}⚠ No API key entered. Add later:${NC}"
    echo -e "  ${CYAN}  echo 'export ANTHROPIC_API_KEY=your-key-here' >> ~/.zshrc && source ~/.zshrc${NC}"
  else
    echo "" >> "$SHELL_RC"
    echo "# Anthropic API Key (Execution-OS)" >> "$SHELL_RC"
    echo "export ANTHROPIC_API_KEY=${API_KEY}" >> "$SHELL_RC"
    export ANTHROPIC_API_KEY="$API_KEY"
    echo -e "  ${GREEN}✓${NC} API key saved"
  fi
fi

# ===== Done! =====
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║         Installation Complete!            ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Final verification
echo -e "  Homebrew:    ${GREEN}✓${NC} $(brew --version 2>/dev/null | head -1 || echo 'installed')"
echo -e "  Node.js:     ${GREEN}✓${NC} $(node --version 2>/dev/null || echo 'installed')"
echo -e "  GitHub CLI:  ${GREEN}✓${NC} $(gh --version 2>/dev/null | head -1 || echo 'installed')"
echo -e "  Claude Code: ${GREEN}✓${NC} $(claude --version 2>/dev/null || echo 'installed')"
echo -e "  SQLite:      ${GREEN}✓${NC} $(sqlite3 --version 2>/dev/null | cut -d' ' -f1 || echo 'installed')"
if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  echo -e "  API Key:     ${GREEN}✓${NC} configured"
else
  echo -e "  API Key:     ${YELLOW}⚠${NC} not set yet"
fi

echo ""
echo -e "${BOLD}Next step:${NC}"
echo ""
echo -e "  ${CYAN}bash setup-wizard.sh${NC}"
echo ""
echo -e "This will personalize your dev team OS with your team and repo details."
echo ""
