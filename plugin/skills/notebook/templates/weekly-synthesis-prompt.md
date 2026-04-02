# Weekly Synthesis Prompt

Use with NotebookLM during Sunday `/review` to enrich the Execution Review with grounded cross-document analysis.

## Prompt

```
Synthesize everything from this past week ({start_date} to {end_date}):

1. EXECUTION SCORECARD: Based on all content, what was the say-do ratio this week? What commitments were met vs missed?

2. DECISION QUALITY: Review all decisions made this week. Which ones align with the 90-day sprint goals? Which ones are distractions?

3. PATTERN SHIFTS: What changed this week compared to previous weeks? Any new themes, risks, or opportunities emerging?

4. TEAM SIGNALS: Based on any team-related content, who is performing above expectations? Who needs intervention?

5. NEXT WEEK PRIORITIES: Given everything in the notebook, what are the 3 most critical things for next week? Why these and not others?

6. MEMORY UPDATE: What new stable facts, patterns, or context should be carried forward into future weeks?

Cite specific sources for each point. Be concise — this feeds into a 30-minute Sunday review.
```

## When to Use

- Every Sunday during `/review` (after say-do scoring, before setting next week's commitments)
- Replace {start_date} and {end_date} with the Monday-Sunday range
- Query Operating Brain for execution data, Intellectual Capital for strategic context
