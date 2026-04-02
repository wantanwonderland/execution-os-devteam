System dashboard. Show the current state of the vault.

## Steps

1. **File counts by directory**: Count `.md` files (excluding .gitkeep) in each top-level directory:
   - 00-identity/
   - 01-projects/
   - 02-docs/
   - 03-research/
   - 04-decisions/
   - 05-goals/
   - 06-ceremonies/
   - 07-personal/
   - 08-inbox/

2. **Total vault size**: Total `.md` files across all directories (excluding .claude/ and .git/).

3. **Needs-review items**: Search all `.md` files for the `needs-review` tag. List each with file path and title.

4. **Last sprint review**: Find the most recent review file in `06-ceremonies/sprint-review/`. Show date and sprint number if present.

5. **Recent activity**: List the 5 most recently modified `.md` files across the vault with their paths and modification dates.

6. **Inbox status**: Count files in `08-inbox/captures/` and `08-inbox/ideas/`. Flag if inbox has more than 10 unsorted items.

Present as a clean dashboard table. Keep it scannable.
