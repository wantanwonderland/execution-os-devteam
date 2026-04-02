Token usage and cost analysis. Parses Claude Code session transcripts for detailed breakdown.

Usage:
- `/cost-report` — current session summary
- `/cost-report today` — all sessions today
- `/cost-report all` — all sessions for this project

## Steps

### Mode: Current Session (default)

1. **Find the active transcript**: Find the current session's `.jsonl` file ONLY — this is the single most recently modified `.jsonl` file in the project transcript directory. Do NOT aggregate all transcript files. The transcript directory is `~/.claude/projects/-{project-path-with-dashes}/`. Pick only the one file with the latest modification time.

   For subagents in the current session, look in `~/.claude/projects/-{project-path}/{current-session-id}/subagents/` ONLY. Do not include subagent files from other sessions.

   ```bash
   PROJECT_DIR=$(echo "$PWD" | sed 's|/|-|g; s|^-||')
   TRANSCRIPT_DIR="$HOME/.claude/projects/-$PROJECT_DIR"
   # Current session = most recently modified .jsonl in the root of TRANSCRIPT_DIR
   CURRENT_SESSION=$(ls -t "$TRANSCRIPT_DIR"/*.jsonl 2>/dev/null | head -1)
   SESSION_ID=$(basename "$CURRENT_SESSION" .jsonl)
   # Current session subagents only
   SUBAGENT_DIR="$TRANSCRIPT_DIR/$SESSION_ID/subagents"
   ```

2. **Parse token usage**: Read each line of the SINGLE session JSONL transcript. For lines with `message.usage`, extract:
   - `input_tokens`
   - `output_tokens`
   - `cache_read_input_tokens`
   - `cache_creation_input_tokens`
   - `model` (from `message.model`)
   
   Then separately parse subagent files from the current session's subagent directory only.

3. **Calculate costs** using these rates (Claude 2026 pricing):

| Model | Input (per 1M) | Output (per 1M) | Cache Read (per 1M) | Cache Write (per 1M) |
|-------|----------------|------------------|---------------------|---------------------|
| claude-opus-4-6 | $15.00 | $75.00 | $1.50 | $18.75 |
| claude-sonnet-4-6 | $3.00 | $15.00 | $0.30 | $3.75 |
| claude-haiku-4-5 | $0.80 | $4.00 | $0.08 | $1.00 |

4. **Present summary** — always show main session and subagents separately so the user can see where cost is going:

```markdown
## Cost Report — Current Session

**Session ID**: {session_id}
**Duration**: {start_time} → {end_time} ({minutes} min)
**Model**: {model}
**Turns**: {main_count} main + {subagent_count} subagent

### Main Session
| Metric | Tokens | Cost |
|--------|--------|------|
| Input | {n} | ${cost} |
| Output | {n} | ${cost} |
| Cache Read | {n} | ${cost} |
| Cache Write | {n} | ${cost} |
| **Total** | **{n}** | **${cost}** |

### Subagents ({count} in this session)
| Metric | Tokens | Cost |
|--------|--------|------|
| Input | {n} | ${cost} |
| Output | {n} | ${cost} |
| Cache Read | {n} | ${cost} |
| Cache Write | {n} | ${cost} |
| **Total** | **{n}** | **${cost}** |

### Grand Total: ${main + subagent cost}

### Per-Turn Breakdown (top 5 most expensive)
| Turn | Input | Output | Cache | Cost | What |
|------|-------|--------|-------|------|------|
| {n} | {tokens} | {tokens} | {tokens} | ${cost} | {first tool used} |

### Cost Insight
{one-line observation — e.g., "Cache reads are 78% of cost — context caching is working, saving ~10x vs cold reads" or "Output is the dominant cost — consider Sonnet for procedural agents"}
```

### Mode: Today

1. Find all `.jsonl` files in the project's Claude directory modified today.
2. Parse each file separately.
3. Present a summary table with one row per session.

```markdown
## Cost Report — Today ({date})

| Session | Duration | Model | Turns | Input | Output | Cache | Total Cost |
|---------|----------|-------|-------|-------|--------|-------|------------|
| {id} | {min}m | {model} | {n} | {n} | {n} | {n} | ${cost} |
| **Total** | | | | | | | **${total}** |
```

### Mode: All

1. Find all `.jsonl` files for this project (including subagents).
2. Aggregate by date.

```markdown
## Cost Report — All Sessions

| Date | Sessions | Turns | Input | Output | Cache | Total Cost |
|------|----------|-------|-------|--------|-------|------------|
| {date} | {n} | {n} | {n} | {n} | {n} | ${cost} |
| **Total** | {n} | {n} | {n} | {n} | {n} | **${total}** |

### By Model
| Model | Turns | Tokens | Cost | % of Total |
|-------|-------|--------|------|-----------|

### By Agent (subagent transcripts)
| Agent | Turns | Tokens | Cost |
|-------|-------|--------|------|
```

## Implementation

Use bash to parse the JSONL files. **Critical**: for "current session" mode, only parse the single active session file and its subagents — never glob all files.

```bash
# Find project transcript directory
PROJECT_DIR=$(echo "$PWD" | sed 's|/|-|g; s|^-||')
TRANSCRIPT_DIR="$HOME/.claude/projects/-$PROJECT_DIR"

# Current session = most recently modified .jsonl in transcript root
CURRENT_SESSION=$(ls -t "$TRANSCRIPT_DIR"/*.jsonl 2>/dev/null | head -1)
SESSION_ID=$(basename "$CURRENT_SESSION" .jsonl)
SUBAGENT_DIR="$TRANSCRIPT_DIR/$SESSION_ID/subagents"

# For "today" mode: filter by modification date
# For "all" mode: glob all .jsonl recursively
```

The key insight is that Claude Code stores every message with full token usage in the JSONL transcript. The transcript path follows the pattern: `~/.claude/projects/-{project-path-with-dashes}/{session-id}.jsonl`.

Subagent transcripts are in: `~/.claude/projects/-{project-path}/{session-id}/subagents/{agent-id}.jsonl`.

**Common mistake**: Globbing all `.jsonl` files recursively for "current session" mode. This includes every past session and produces inflated totals. Always scope to the single active transcript file.
