Code ownership analysis. Show CODEOWNERS assignments, bus factor risk, and knowledge gaps. Optionally scope to a directory or write a CODEOWNERS file.

Usage:
- `/ownership` — show CODEOWNERS, bus factor report, and knowledge gaps for the whole repo
- `/ownership {dir}` — scope analysis to a specific directory
- `/ownership generate` — write CODEOWNERS file to the repo root

## Steps

### Mode: Default (no arguments or directory scope)

1. **Identify repos**: List directories in `01-projects/` to find active repos. If the working directory is a repo root, use that.

2. **Dispatch Levi** with:
   - Repo root path (or scoped directory if provided)
   - Instruction to follow `plugin/skills/code-ownership/SKILL.md`
   - Mode: analysis only (do NOT write CODEOWNERS file yet)

3. **Present summary**:

```markdown
## Code Ownership Summary — {date}

**Repo**: {repo} | **Scope**: {all / dir} | **Window**: 90 days

### Bus Factor
- CRITICAL ({n}): {dir list} — single contributor >80%
- HIGH ({n}): {dir list}
- OK ({n} directories): healthy distribution

### Knowledge Gaps
- Orphaned ({n}): {dir list} — no active staff commits
- At Risk ({n}): {dir list} — single active contributor

### Top Contributors (by commit volume)
| Contributor | Directories owned | Total commits |
|-------------|-------------------|---------------|
| {name} | {n} | {n} |

To write a CODEOWNERS file: `/ownership generate`
```

### Mode: Directory scope (`/ownership {dir}`)

Same as default but scoped to the specified directory. Levi analyzes only that directory and its subdirectories. Present the bus factor and knowledge gap reports scoped to that path.

### Mode: Generate (`/ownership generate`)

1. **Run analysis first**: Run the full ownership analysis (same as default mode) before writing anything.

2. **Show preview**: Present the proposed CODEOWNERS entries before writing:

```
Proposed CODEOWNERS:

/src/auth/       @alice
/src/payments/   @bob
/src/api/        @alice
...
# UNOWNED — /src/legacy-importer (no active contributor in last 90 days)
```

3. **Confirm**: Ask for confirmation before writing: "Write this CODEOWNERS file to the repo root?"

4. **Dispatch Levi** to write `CODEOWNERS` to the repo root once confirmed.

5. **Write vault reports**:
   - Bus factor report → `09-ops/ownership/YYYY-MM-DD-bus-factor.md`
   - Knowledge gap report → `09-ops/ownership/YYYY-MM-DD-knowledge-gaps.md`

6. **Surface tech debt**: Any CRITICAL bus factor findings are surfaced as tech debt items to add via `/debt add`.

7. **Confirm**: Report path of CODEOWNERS file written and vault report paths.
