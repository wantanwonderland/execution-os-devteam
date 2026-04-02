# Decision Patterns Prompt

Use with NotebookLM to analyze decision quality and patterns across all logged decisions.

## Prompt

```
Analyze all decisions captured in this notebook:

1. DECISION FREQUENCY: How often am I making decisions? Are there periods of decision paralysis or decision overload?

2. REVERSALS: Have I reversed or contradicted any previous decisions? If so, what drove the change — new information or wavering conviction?

3. SPEED vs QUALITY: Which decisions were made quickly and turned out well? Which were delayed and turned out poorly? What's the pattern?

4. DOMAIN DISTRIBUTION: Am I making too many decisions in one area (e.g., product) while neglecting another (e.g., team, revenue)?

5. ALIGNMENT CHECK: Do my decisions consistently point toward the stated goals (2X revenue, 10X margin, {{CURRENCY}} (amount)M cash out)? Which ones drift?

6. DECISION DEBT: What decisions am I avoiding? What should have been decided by now but hasn't been?

7. FRAMEWORK ADHERENCE: Am I using my own frameworks and decision filters, or am I deciding ad hoc?

Be specific. Name the decisions. Show the patterns. No generic observations.
```

## When to Use

- Monthly during strategic review
- Before major pivots or M&A discussions
- When feeling like decisions are inconsistent
- Query Operating Brain (which has decision logs ingested)
