# Verification Rules

- Before committing, verify all new .md files have valid YAML frontmatter (starts with ---)
- Verify files are in the correct directory per auto-sort rules
- Verify frontmatter has all 7 required fields: title, created, type, tags, status, venture, related
- Verify `due` field (if present) uses YYYY-MM-DD format and is a valid date
- Verify `priority` field (if present) is one of: critical, high, medium, low
- Verify file names are lowercase-kebab-case
- Verify date-prefixed files use YYYY-MM-DD format
- Verify no duplicate files exist (same content in multiple locations)
- Verify needs-review tag is applied when review flag triggers are present
- Verify venture tags match the directory the file lives in
