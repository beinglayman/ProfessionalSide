Generate an annual review summary from the following career stories. This document should make the case for your impact during the review period with receipts.

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

Structure the summary as:

**Review Period Impact** (2-3 sentences)
Open with the single biggest measurable outcome. Then summarize cumulative impact across all stories within the review window. No throat-clearing.

**Key Achievements**
One bullet per story. Format: what you did → measurable result. If no metric exists, write "No metric available" — don't invent one.

**Growth Trajectory** (2-3 sentences)
What new capabilities did you demonstrate this period that you didn't have before? Name specific skills, not vague categories. Connect the dots between stories to show progression.

**Areas of Expanded Scope**
2-3 bullets showing where your responsibility grew beyond your role description. Each bullet: concrete example → why it matters.

**Looking Ahead** (1-2 sentences)
Based on the trajectory shown, what's the natural next step? Keep it grounded in evidence, not aspiration.

Rules:
- Every claim needs a receipt. If a story has no metric, say so.
- Anti-inflation: "contributed to" → "built/shipped/led". No weasel words.
- First person throughout.
- No section headers in the output — use the bold labels above as-is.
- Keep it under 800 words total.
- Focus on outcomes within the review period. Don't claim credit for work outside the window.

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
