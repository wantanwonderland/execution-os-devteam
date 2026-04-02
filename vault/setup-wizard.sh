#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# setup-wizard.sh — Personalize your Execution-OS dev team vault
# Run: bash setup-wizard.sh
# ============================================================================

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if already run
if [[ -f "${SCRIPT_DIR}/.wizard-complete" ]]; then
  echo -e "${YELLOW}This vault has already been set up.${NC}"
  echo -n "Run again to overwrite? (y/N): "
  read -r confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
fi

# Detect OS for sed compatibility
if [[ "$(uname)" == "Darwin" ]]; then
  sed_inplace() { sed -i '' "$@"; }
else
  sed_inplace() { sed -i "$@"; }
fi

# Escape special characters for sed
escape_sed() {
  printf '%s\n' "$1" | sed -e 's/[\/&]/\\&/g'
}

# Slugify: lowercase, spaces to hyphens
slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-'
}

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║    Execution-OS Setup (Dev Team)         ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "Welcome! This will personalize your dev team AI execution vault."
echo -e "It takes about 3 minutes. Press Enter to accept defaults.\n"

# ===== Phase 1: Your Team =====
echo -e "${BOLD}${BLUE}── Phase 1: Your Team ──${NC}\n"

echo -n "[1/12] What is your company/team name? "
read -r COMPANY_NAME
if [[ -z "$COMPANY_NAME" ]]; then
  echo -e "${YELLOW}Team name is required.${NC}"
  echo -n "[1/12] What is your company/team name? "
  read -r COMPANY_NAME
  [[ -z "$COMPANY_NAME" ]] && { echo "Cannot continue without a team name."; exit 1; }
fi

echo -n "[2/12] What is your name? "
read -r OWNER_NAME
[[ -z "$OWNER_NAME" ]] && { echo "Name is required."; exit 1; }

echo -n "[3/12] What is your role/title? (default: Engineering Lead) "
read -r OWNER_ROLE
OWNER_ROLE="${OWNER_ROLE:-Engineering Lead}"

# ===== Phase 2: Your Repos =====
echo ""
echo -e "${BOLD}${BLUE}── Phase 2: Your Repositories ──${NC}\n"

echo -n "[4/12] How many repositories does your team maintain? (1-10, default: 1) "
read -r REPO_COUNT
REPO_COUNT="${REPO_COUNT:-1}"
if ! [[ "$REPO_COUNT" =~ ^[0-9]+$ ]] || [[ "$REPO_COUNT" -lt 1 ]] || [[ "$REPO_COUNT" -gt 10 ]]; then
  echo -e "${YELLOW}Using default: 1${NC}"
  REPO_COUNT=1
fi

declare -a PROJECT_NAMES=()
declare -a PROJECT_SLUGS=()
declare -a PROJECT_URLS=()

for ((i=1; i<=REPO_COUNT; i++)); do
  echo -n "  Repo ${i} name? (e.g., frontend-app) "
  read -r pname
  [[ -z "$pname" ]] && pname="repo-${i}"
  echo -n "  Repo ${i} GitHub URL? (e.g., https://github.com/org/repo, or press Enter to skip) "
  read -r purl
  PROJECT_NAMES+=("$pname")
  PROJECT_SLUGS+=("$(slugify "$pname")")
  PROJECT_URLS+=("${purl:-}")
done

# Build project frontmatter list
PROJECT_FM_LIST=""
for slug in "${PROJECT_SLUGS[@]}"; do
  [[ -n "$PROJECT_FM_LIST" ]] && PROJECT_FM_LIST="${PROJECT_FM_LIST} | "
  PROJECT_FM_LIST="${PROJECT_FM_LIST}${slug}"
done
PROJECT_FM_LIST="${PROJECT_FM_LIST} | all"

# ===== Phase 3: Your Team Members =====
echo ""
echo -e "${BOLD}${BLUE}── Phase 3: Your Team Members ──${NC}\n"

echo -n "[5/12] How many developers on your team? (0-30, default: 0) "
read -r TEAM_SIZE
TEAM_SIZE="${TEAM_SIZE:-0}"
if ! [[ "$TEAM_SIZE" =~ ^[0-9]+$ ]]; then
  TEAM_SIZE=0
fi

declare -a TEAM_MEMBER_NAMES=()
declare -a TEAM_MEMBER_ROLES=()
declare -a TEAM_MEMBER_GITHUB=()

INTERACTIVE_LIMIT=10
ENTRY_COUNT=$TEAM_SIZE
if [[ "$ENTRY_COUNT" -gt "$INTERACTIVE_LIMIT" ]]; then
  echo -e "  ${YELLOW}Entering first ${INTERACTIVE_LIMIT} interactively. Edit staff DB for the rest.${NC}"
  ENTRY_COUNT=$INTERACTIVE_LIMIT
fi

for ((i=1; i<=ENTRY_COUNT; i++)); do
  echo -n "  Dev ${i} — Name, role, GitHub handle (e.g., \"Alice Chen, Senior Engineer, alicechen\"): "
  read -r member_input
  if [[ -z "$member_input" ]]; then
    TEAM_MEMBER_NAMES+=("Team Member ${i}")
    TEAM_MEMBER_ROLES+=("Engineer")
    TEAM_MEMBER_GITHUB+=("")
  else
    mname=$(echo "$member_input" | cut -d',' -f1 | xargs)
    mrole=$(echo "$member_input" | cut -d',' -f2 | xargs)
    mgithub=$(echo "$member_input" | cut -d',' -f3 | xargs)
    [[ -z "$mrole" ]] && mrole="Engineer"
    [[ -z "$mgithub" ]] && mgithub=""
    TEAM_MEMBER_NAMES+=("$mname")
    TEAM_MEMBER_ROLES+=("$mrole")
    TEAM_MEMBER_GITHUB+=("$mgithub")
  fi
done

# Build team names for tagging
TEAM_NAMES_CSV=""
if [[ ${#TEAM_MEMBER_NAMES[@]} -gt 0 ]]; then
  for name in "${TEAM_MEMBER_NAMES[@]}"; do
    [[ -n "$TEAM_NAMES_CSV" ]] && TEAM_NAMES_CSV="${TEAM_NAMES_CSV}, "
    TEAM_NAMES_CSV="${TEAM_NAMES_CSV}${name}"
  done
fi
[[ -z "$TEAM_NAMES_CSV" ]] && TEAM_NAMES_CSV="(add your team member names here)"

# ===== Phase 4: Sprint & Metrics =====
echo ""
echo -e "${BOLD}${BLUE}── Phase 4: Sprint Configuration ──${NC}\n"

echo -n "[6/12] Sprint duration in weeks? (default: 2) "
read -r SPRINT_WEEKS
SPRINT_WEEKS="${SPRINT_WEEKS:-2}"

echo -n "[7/12] Sprint start date? (YYYY-MM-DD, or press Enter for today) "
read -r SPRINT_START
SPRINT_START="${SPRINT_START:-$(date +%Y-%m-%d)}"

echo -n "[8/12] PR review SLA in hours? (default: 24) "
read -r REVIEW_SLA
REVIEW_SLA="${REVIEW_SLA:-24}"

echo -n "[9/12] Target test coverage %? (default: 80) "
read -r COVERAGE_TARGET
COVERAGE_TARGET="${COVERAGE_TARGET:-80}"

echo -n "[10/12] Target MTTR in minutes? (default: 240) "
read -r MTTR_TARGET
MTTR_TARGET="${MTTR_TARGET:-240}"

# ===== Phase 5: Integrations =====
echo ""
echo -e "${BOLD}${BLUE}── Phase 5: Integrations ──${NC}\n"

echo "[11/12] Which integrations do you want to set up?"
echo "  All are optional — the system works without any."
echo ""

echo -n "  GitHub MCP (PR reviews, CI monitoring)? (Y/n) "
read -r SETUP_GITHUB
SETUP_GITHUB="${SETUP_GITHUB:-Y}"

echo -n "  Playwright (browser testing)? (Y/n) "
read -r SETUP_PLAYWRIGHT
SETUP_PLAYWRIGHT="${SETUP_PLAYWRIGHT:-Y}"

echo -n "  Google Calendar MCP? (y/N) "
read -r SETUP_CALENDAR
SETUP_CALENDAR="${SETUP_CALENDAR:-N}"

echo -n "[12/12] Install Playwright browsers now? (Y/n) "
read -r INSTALL_BROWSERS
INSTALL_BROWSERS="${INSTALL_BROWSERS:-Y}"

# ===== Apply Replacements =====
echo ""
echo -e "${BOLD}${CYAN}Personalizing your vault...${NC}\n"

cd "$SCRIPT_DIR"

ESCAPED_COMPANY=$(escape_sed "$COMPANY_NAME")
ESCAPED_OWNER=$(escape_sed "$OWNER_NAME")
ESCAPED_ROLE=$(escape_sed "$OWNER_ROLE")
ESCAPED_FM_LIST=$(escape_sed "$PROJECT_FM_LIST")
ESCAPED_TEAM_NAMES=$(escape_sed "$TEAM_NAMES_CSV")
ESCAPED_SPRINT_START=$(escape_sed "$SPRINT_START")

# Global find-and-replace across all .md, .json, .sql files
find . \( -name "*.md" -o -name "*.sql" -o -name "*.js" -o -name "*.json" -o -name "*.py" -o -name "*.ts" \) \
  -type f ! -path "./.git/*" ! -path "./node_modules/*" ! -path "./mem/node_modules/*" ! -path "./mem/dist/*" \
  ! -name "setup-wizard.sh" ! -name "package-lock.json" | while read -r file; do
  sed_inplace \
    -e "s/{{COMPANY_NAME}}/${ESCAPED_COMPANY}/g" \
    -e "s/{{OWNER_NAME}}/${ESCAPED_OWNER}/g" \
    -e "s/{{OWNER_ROLE}}/${ESCAPED_ROLE}/g" \
    -e "s/{{ASSISTANT_NAME}}/Wantan/g" \
    -e "s/{{PROJECT_FRONTMATTER_LIST}}/${ESCAPED_FM_LIST}/g" \
    -e "s/{{TEAM_SIZE}}/${TEAM_SIZE}/g" \
    -e "s/{{TEAM_MEMBER_NAMES}}/${ESCAPED_TEAM_NAMES}/g" \
    -e "s/{{SPRINT_START_DATE}}/${ESCAPED_SPRINT_START}/g" \
    -e "s/{{SPRINT_DURATION_WEEKS}}/${SPRINT_WEEKS}/g" \
    -e "s/{{REVIEW_SLA_HOURS}}/${REVIEW_SLA}/g" \
    -e "s/{{TEST_COVERAGE_TARGET}}/${COVERAGE_TARGET}/g" \
    -e "s/{{MTTR_TARGET_MINUTES}}/${MTTR_TARGET}/g" \
    "$file" 2>/dev/null || true
done

echo -e "  ${GREEN}✓${NC} Placeholders replaced"

# ===== Update Dashboard Config =====
cat > "dashboard/config.json" <<DASHEOF
{
  "company_name": "${COMPANY_NAME}",
  "sprint_duration_weeks": ${SPRINT_WEEKS},
  "review_sla_hours": ${REVIEW_SLA},
  "deploy_frequency_target": 3,
  "test_coverage_target": ${COVERAGE_TARGET},
  "mttr_target_minutes": ${MTTR_TARGET}
}
DASHEOF
echo -e "  ${GREEN}✓${NC} Dashboard config updated"

# ===== Create Project Manifests =====
for ((i=0; i<REPO_COUNT; i++)); do
  slug="${PROJECT_SLUGS[$i]}"
  name="${PROJECT_NAMES[$i]}"
  url="${PROJECT_URLS[$i]}"

  mkdir -p "01-projects"
  cat > "01-projects/${slug}.md" <<PROJEOF
---
title: "${name}"
created: $(date +%Y-%m-%d)
type: project
tags: [${slug}]
status: active
project: ${slug}
related: []
---

## Repository
- URL: ${url:-https://github.com/your-org/${slug}}
- Default branch: main
- Squad: (assign squad)
- Environments: [staging, production]
- CI: GitHub Actions
- Test suites: [unit, integration, browser]
- Deploy target: (configure)
PROJEOF
done
echo -e "  ${GREEN}✓${NC} Project manifests created (${REPO_COUNT})"

# ===== Create Database =====
if command -v sqlite3 &>/dev/null; then
  rm -f "data/company.db"
  sqlite3 "data/company.db" < "data/schema.sql" 2>/dev/null || true

  # Insert team members into staff table
  for ((i=0; i<${#TEAM_MEMBER_NAMES[@]}; i++)); do
    name="${TEAM_MEMBER_NAMES[$i]}"
    role="${TEAM_MEMBER_ROLES[$i]}"
    github="${TEAM_MEMBER_GITHUB[$i]}"
    sqlite3 "data/company.db" "INSERT INTO staff (name, role, squad, github_handle, status) VALUES ('${name}', '${role}', 'default', '${github}', 'active');" 2>/dev/null || true
  done

  echo -e "  ${GREEN}✓${NC} Database initialized with ${#TEAM_MEMBER_NAMES[@]} team members"
else
  echo -e "  ${YELLOW}⚠${NC} SQLite not available — run 'sqlite3 data/company.db < data/schema.sql' later"
fi

# ===== Install Playwright Browsers =====
if [[ "$INSTALL_BROWSERS" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${BOLD}${BLUE}Installing Playwright browsers...${NC}"
  npx playwright install chromium 2>/dev/null && echo -e "  ${GREEN}✓${NC} Chromium installed" || echo -e "  ${YELLOW}⚠${NC} Chromium install failed — run 'npx playwright install' later"
else
  echo -e "  Skipped. Run ${CYAN}npx playwright install${NC} when ready."
fi

# ===== Setup MCP Configuration =====
echo ""
echo -e "${BOLD}${BLUE}Configuring MCP integrations...${NC}"

if [[ -f ".mcp.json.template" ]]; then
  cp ".mcp.json.template" ".mcp.json"

  # Remove integrations user didn't select
  if [[ ! "$SETUP_GITHUB" =~ ^[Yy]$ ]]; then
    # User can add later — .mcp.json has all entries from template
    echo -e "  ${CYAN}GitHub MCP: skipped (add later via INTEGRATIONS.md)${NC}"
  else
    echo -e "  ${GREEN}✓${NC} GitHub MCP configured (uses 'gh' CLI — ensure 'gh auth login' is done)"
  fi

  if [[ ! "$SETUP_PLAYWRIGHT" =~ ^[Yy]$ ]]; then
    echo -e "  ${CYAN}Playwright MCP: skipped${NC}"
  else
    echo -e "  ${GREEN}✓${NC} Playwright MCP configured"
  fi

  if [[ "$SETUP_CALENDAR" =~ ^[Yy]$ ]]; then
    echo -e "  ${GREEN}✓${NC} Calendar MCP configured (will authenticate on first use)"
  fi

  echo -e "  ${GREEN}✓${NC} .mcp.json created from template"
else
  echo -e "  ${YELLOW}⚠${NC} .mcp.json.template not found"
fi

# ===== GitHub Authentication Check =====
if [[ "$SETUP_GITHUB" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${BOLD}${BLUE}Checking GitHub authentication...${NC}"
  if gh auth status &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} GitHub CLI authenticated"
  else
    echo -e "  ${YELLOW}⚠${NC} GitHub CLI not authenticated."
    echo -e "  ${CYAN}  Run: gh auth login${NC}"
  fi
fi

# ===== Initialize Git =====
if command -v git &>/dev/null; then
  if [[ ! -d ".git" ]]; then
    git init -q
    git add -A
    git commit -q -m "feat: initialize Execution-OS vault for ${COMPANY_NAME}

Co-Authored-By: Execution-OS Setup Wizard"
    echo -e "\n  ${GREEN}✓${NC} Git initialized with first commit"
  fi
fi

# ===== Write Marker =====
echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" > ".wizard-complete"

# ===== Done! =====
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║         Setup Complete!                   ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Team:          ${BOLD}${COMPANY_NAME}${NC}"
echo -e "  Owner:         ${BOLD}${OWNER_NAME}${NC} (${OWNER_ROLE})"
echo -e "  Repos:         ${BOLD}${PROJECT_NAMES[*]}${NC}"
echo -e "  Team size:     ${BOLD}${TEAM_SIZE} members${NC}"
echo -e "  Sprint:        ${BOLD}${SPRINT_WEEKS}-week sprints from ${SPRINT_START}${NC}"
echo -e "  Review SLA:    ${BOLD}${REVIEW_SLA}h${NC}"
echo -e "  Coverage goal: ${BOLD}${COVERAGE_TARGET}%${NC}"
echo -e "  MTTR target:   ${BOLD}${MTTR_TARGET} minutes${NC}"
echo ""
echo -e "${BOLD}Getting Started:${NC}"
echo ""
echo "  1. Open this directory in your terminal"
echo "  2. Run: ${CYAN}claude${NC}"
echo "  3. Type: ${CYAN}/start${NC} — Wantan will guide your first conversation"
echo ""
echo -e "${BOLD}Daily commands:${NC}"
echo ""
echo "  /today         — Morning briefing (PRs, CI, incidents, sprint)"
echo "  /standup       — Daily standup (commitments, blockers)"
echo "  /pr-queue      — Open PRs and review SLA status"
echo "  /test          — Trigger browser tests (Killua)"
echo "  /security      — Security scan dashboard (Itachi)"
echo "  /deploy        — Deployment status (Shikamaru)"
echo "  /incident      — Declare an incident"
echo "  /capture       — Quick-capture an idea"
echo "  /decide        — Log an architecture decision"
echo ""
echo -e "${BOLD}Sprint commands:${NC}"
echo ""
echo "  /sprint-plan   — Sprint planning ceremony"
echo "  /sprint-review — Sprint review"
echo "  /retro         — Retrospective"
echo ""
echo -e "${BOLD}Dashboard:${NC}"
echo ""
echo "  python3 -m http.server 8080"
echo "  Open http://localhost:8080/dashboard/"
echo ""
echo -e "${BOLD}Install the AI plugin:${NC}"
echo ""
echo "  In Claude Code, run these commands:"
echo "  ${CYAN}/plugin marketplace add wantanwonderland/execution-os-devteam${NC}"
echo "  ${CYAN}/plugin install execution-os-devteam${NC}"
echo ""
echo "  This installs the AI squad (Diablo, Killua, Itachi, etc.) with auto-updates."
echo ""
echo -e "For full docs, see ${BOLD}README.md${NC}"
echo -e "For integrations, see ${BOLD}INTEGRATIONS.md${NC}"
echo ""
