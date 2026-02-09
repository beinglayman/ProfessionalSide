Generate a performance self-assessment from the following career stories. This is for a review cycle — evidence-backed, no fluff.

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

Structure the self-assessment as:

**Impact Summary** (3-4 sentences)
Open with your single strongest measurable outcome. Then connect the dots across stories to show cumulative impact. Align to performance competencies: impact, leadership, technical excellence, collaboration, growth. No throat-clearing.

**Key Contributions**
One bullet per story. Format: what you did → measurable result. Map each to the competency it demonstrates (in parentheses). If no metric exists, write "No metric available" — don't invent one.

**Growth & Development** (2-3 sentences)
What new capabilities did you demonstrate across these stories? Name specific skills, not vague categories. Show progression, not a static list.

**Looking Ahead** (1-2 sentences)
Based on the trajectory shown, what's the natural next step? What do you want to do more of? Ground it in evidence from the stories above.

Rules:
- Every claim needs a receipt. If a story has no metric, say so.
- Anti-hedging: "contributed to" → "built/shipped/led". "Helped with" → what you actually did. "Was involved in" → your specific role.
- First person throughout.
- Professional but not stiff. Written for someone who knows the work but needs the summary.
- No section headers in the output — use the bold labels above as-is.
- Keep it under 600 words total.

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
