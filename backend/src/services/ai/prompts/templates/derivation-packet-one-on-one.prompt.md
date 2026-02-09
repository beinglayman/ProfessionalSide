Generate 1:1 talking points from the following career stories. These are for a manager meeting — evidence for your impact, not a status update.

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

Structure the talking points as:

**Headlines** (2-3 bullets)
Lead with the most impressive outcomes across all stories. Each bullet: one sentence, metric-first. These are your openers — the things your manager should remember.

**Detail Bullets** (3-5 bullets)
One bullet per story worth discussing. Format: what happened → your role → impact or metric. Conversational, not formal. How you'd actually talk in a 1:1. Skip stories that are minor — only include what's worth your manager's time.

**Patterns & Themes** (1-2 bullets)
What do these stories together show about your work? Name the pattern: scope expansion, cross-team impact, technical depth, etc. Back it with specific examples.

**Ask or Next Step** (1-2 bullets)
Based on the work shown, what do you want from your manager? Be specific: "Can we discuss taking on X?" not "I'd like more opportunities." Or flag what's next: "I'm planning to do Y — does that align?"

Rules:
- This is evidence, not a diary. Each bullet = claim + proof. No fluff.
- Your manager doesn't have time for preamble. Lead every bullet with the point.
- Anti-hedging: "contributed to" → "built/shipped/led". No weasel words.
- Every claim needs a receipt. If a story has no metric, say so.
- Conversational bullets, not formal prose.
- First person throughout.
- No section headers in the output — use the bold labels above as-is.
- Keep it under 400 words total. 1:1s are short.

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
