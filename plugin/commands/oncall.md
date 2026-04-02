Manage on-call rotation. View current on-call, add rotations, swap shifts.

Usage:
- `/oncall` — show who is currently on-call
- `/oncall add {name} {start} {end}` — add rotation entry
- `/oncall swap {name1} {name2}` — swap two people's shifts
- `/oncall history` — show rotation history

## Steps

### Mode: Current (default)

1. Query `oncall_rotation` for active rotation:

```sql
SELECT s.name, o.squad, o.escalation_order, o.start_date, o.end_date
FROM oncall_rotation o
JOIN staff s ON s.id = o.staff_id
WHERE date('now') BETWEEN o.start_date AND o.end_date
ORDER BY o.escalation_order;
```

2. Present:

```markdown
## On-Call -- YYYY-MM-DD

| Order | Name | Squad | Since | Until |
|-------|------|-------|-------|-------|
| Primary | {name} | {squad} | {start} | {end} |
| Secondary | {name} | {squad} | {start} | {end} |
```

3. If no one is on-call: "No on-call rotation configured for today. Use `/oncall add` to set up."

### Mode: Add

1. Parse: name, start date, end date
2. Look up staff_id from `staff` table
3. Determine escalation_order (1=primary, 2=secondary)
4. Insert into `oncall_rotation`
5. Confirm: "{name} added as {primary/secondary} on-call from {start} to {end}"

### Mode: Swap

1. Find both people's current rotation entries
2. Swap their start_date/end_date values
3. Confirm: "Swapped {name1} and {name2}'s on-call shifts"

### Mode: History

1. Query last 10 rotation entries ordered by start_date DESC
2. Show as table with name, dates, and any incidents during their shift
