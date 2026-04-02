API contract management. Generate OpenAPI specs from route files, validate spec structure, detect breaking changes, and produce human-readable docs.

Usage:
- `/api gen {file}` — generate OpenAPI spec from a route definition file
- `/api validate {spec}` — validate spec structure and surface errors
- `/api diff {old} {new}` — detect breaking changes between two spec versions
- `/api docs {spec}` — generate human-readable API reference from a spec

## Steps

### Mode: gen (with route file path)

1. **Confirm file exists**: Read `{file}` — if not found, report and stop.
2. **Dispatch L** with:
   - The route file path
   - Instruction to follow `plugin/skills/api-spec/SKILL.md` — Mode 1 (Generate)
   - Instruction to write output to `02-docs/api-specs/`
3. **Report back**: Number of endpoints extracted, schemas inferred, TODOs flagged, output path.

### Mode: validate (with spec file path)

1. **Confirm file exists**: Read `{spec}` — if not found, report and stop.
2. **Dispatch L** with:
   - The spec file path
   - Instruction to follow `plugin/skills/api-spec/SKILL.md` — Mode 2 (Validate)
3. **Report back**: VALID or INVALID, error count, warning count, output summary.

If validation fails with errors, surface them clearly:
```
Spec validation: INVALID
Errors (2): [list]
Warnings (1): [list]
Fix errors before deploying or sharing this spec.
```

### Mode: diff (with old spec and new spec paths)

1. **Confirm both files exist**: Read `{old}` and `{new}` — report missing files and stop.
2. **Dispatch L** with:
   - Both spec file paths
   - Instruction to follow `plugin/skills/api-spec/SKILL.md` — Mode 3 (Diff)
3. **Report back**: Breaking change count, non-breaking change count, versioning recommendation.

If breaking changes are found, surface the count prominently before the detail:
```
⚠ {n} BREAKING CHANGES detected. Consumers must be notified before deploying.
```

### Mode: docs (with spec file path)

1. **Confirm file exists**: Read `{spec}` — if not found, report and stop.
2. **Validate first**: Run Mode 2 (Validate) before generating docs. If errors exist, report and ask whether to proceed.
3. **Dispatch L** with:
   - The spec file path
   - Instruction to follow `plugin/skills/api-spec/SKILL.md` — Mode 4 (Docs)
   - Instruction to write output to `02-docs/api-docs/`
4. **Report back**: Output path, endpoint count, any gaps (endpoints with missing descriptions).
