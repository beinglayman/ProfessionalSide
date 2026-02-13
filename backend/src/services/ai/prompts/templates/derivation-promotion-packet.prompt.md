Generate a promotion packet from the following career stories. This document should make the case for advancement with receipts.

## Stories

{{#each stories}}
### {{this.title}} ({{this.framework}})
{{#each this.sections}}
**{{@key}}**: {{this.summary}}
{{/each}}
{{#if this.metrics}}
Key metrics: {{this.metrics}}
{{/if}}
{{#if this.dateRange}}
Time period: {{this.dateRange}}
{{/if}}
---
{{/each}}

## Instructions

Structure the packet as:

**Summary of Impact** (2-3 sentences)
A single paragraph distilling the cumulative impact across all stories. Lead with the biggest number.

**Key Achievements**
One bullet per story. Each bullet: what you did → measurable result. No filler.

**Metrics Dashboard**
A clean list of every concrete metric from the stories. If a story has no metric, write "No metric available" — don't fake one.

**Growth Narrative** (2-3 sentences)
Connect the stories into a trajectory: what pattern do they show? What level of work do they demonstrate?

Rules:
- Every claim needs a receipt. If a story has no metric, say so.
- Anti-inflation: "contributed to" → "built/shipped/led". No weasel words.
- First person throughout.
- Keep it under 800 words total.

Return as JSON with these exact section keys:
{"sections": [
  {"key": "impact-summary", "title": "Summary of Impact", "content": "..."},
  {"key": "key-achievements", "title": "Key Achievements", "content": "..."},
  {"key": "metrics-dashboard", "title": "Metrics Dashboard", "content": "..."},
  {"key": "growth-narrative", "title": "Growth Narrative", "content": "..."}
]}

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
