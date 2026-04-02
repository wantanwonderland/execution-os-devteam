#!/bin/bash
# AutoResearch Guard — Prevents the autonomous agent from modifying eval files
#
# This hook blocks Write/Edit operations to:
# - .claude/autoresearch/evals/ (assertion definitions)
# - .claude/autoresearch/evaluate.py (the scorer)
#
# Only active when on an autoresearch/* branch (i.e., the experiment loop is running).
# On main or other branches, eval files can be edited normally for setup/maintenance.
#
# Exit codes:
# 0 = allow the operation
# 2 = block the operation

# Read the tool input from stdin
INPUT=$(cat)

# Extract the file path from the tool input
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

# If no file_path found, allow (not a file operation we care about)
if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Only enforce guard when on an autoresearch branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
if ! echo "$CURRENT_BRANCH" | grep -q "^autoresearch/"; then
    exit 0
fi

# Block writes to eval files
if echo "$FILE_PATH" | grep -q "\.claude/autoresearch/evals/"; then
    echo "BLOCKED: AutoResearch eval files are untouchable during experiment loops."
    exit 2
fi

# Block writes to the evaluator script
if echo "$FILE_PATH" | grep -q "\.claude/autoresearch/evaluate\.py"; then
    echo "BLOCKED: AutoResearch evaluator is untouchable during experiment loops."
    exit 2
fi

# Allow everything else
exit 0
