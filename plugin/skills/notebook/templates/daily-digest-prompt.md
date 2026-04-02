# Daily Digest Prompt

Use this prompt with NotebookLM's Operating Brain notebook at end-of-day or during `/today` briefing.

## Prompt

```
Based on all the content in this notebook, answer the following for today ({date}):

1. What are the key unresolved commitments, open loops, or pending decisions that need attention?
2. What patterns are emerging across recent content — especially tensions between stated priorities and actual execution?
3. Which 90-day sprint goals ({{PRODUCT_NAME}} adoption, 6 core processes, {{CURRENCY}} (amount)K pipeline) have the most momentum? Which are stalling?
4. Are there any contradictions between recent decisions and the stated strategic direction?
5. What is the single most important thing {{OWNER_NAME}} should focus on tomorrow?

Be specific. Cite sources. No generic advice.
```

## When to Use

- During `/today` briefing (Step 14 — Strategic Synthesis)
- During `/war-room-close` (Step 9 — NotebookLM Digest)
- Adapt the date and any specific context before querying
