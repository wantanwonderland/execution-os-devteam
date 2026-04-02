Search the vault for content matching the user's query.

**Input**: $ARGUMENTS

## Steps

1. **Tag search**: Search all `.md` files for the query term in `tags:` frontmatter arrays. List matches.

2. **Title search**: Search all `.md` files for the query term in `title:` frontmatter fields. List matches.

3. **Full-text search**: Search all `.md` file bodies for the query term. List matches.

4. **Present results**: For each match, show:
   - File path (relative to repo root)
   - Title (from frontmatter)
   - Tags (from frontmatter)
   - Status (from frontmatter)
   - Last modified date

5. **Sort**: Most recently modified first.

6. **Dedup**: If a file matches in multiple search phases, show it once with the strongest match type noted (tag > title > full-text).

7. If no results found, suggest alternative search terms or related tags that might help.
