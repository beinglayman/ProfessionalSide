Generate a portfolio brief from the following career stories. This is an external-facing 1-pager for recruiters and hiring managers — compact, no internal jargon.

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

Structure the brief as:

**Headline** (1 sentence)
One punchy line that captures what you bring. Format: "[Role-level descriptor] who [biggest proven capability]." Lead with the strongest metric. No buzzwords.

**Proof Points** (3-5 bullets)
Each bullet: one achievement → one measurable result. Pick the most impressive outcomes across all stories. If a story has no metric, skip it — only include bullets with receipts. Order by impact, strongest first.

**Technical Breadth**
One paragraph (2-3 sentences). What's the range of technical domains you've operated in? Name specific technologies, systems, and problem types. Don't list skills — show them through the work.

**Working Style** (1-2 sentences)
Based on the stories, what's your signature approach? "I tend to X" backed by pattern across the stories. Don't self-describe traits — show them through evidence.

Rules:
- External audience. No internal team names, no project codenames, no org-specific jargon.
- Anti-inflation: "contributed to" → "built/shipped/led". No weasel words.
- Every claim needs a receipt. If a story has no metric, don't include it in proof points.
- First person throughout.
- No section headers in the output — use the bold labels above as-is.
- Keep it under 400 words total. This is a 1-pager, not an essay.
- Optimize for skimmability. A recruiter will spend 30 seconds on this.

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
