Generate a skip-level meeting prep document from the following career stories. This is for a director/VP-level audience — altitude matters more than detail.

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

Structure the document as:

**Strategic Themes** (3-4 themes)
Don't list individual stories. Instead, identify cross-cutting themes that emerge across the stories. Each theme: one-line label → 1-2 sentence explanation with the strongest metric that backs it.

**Cross-Cutting Metrics**
A clean list of the 4-6 most impressive numbers from across all stories. Group related metrics. If a theme has no metric, write "Qualitative impact — no metric available."

**Patterns Worth Noting** (2-3 sentences)
What does this body of work say about operating level? Name the pattern: are you operating at staff level? Principal level? Show, don't claim.

**What I Need From Leadership** (2-3 bullets)
Based on the work shown, what would accelerate impact? Be specific: "Access to X team's roadmap" not "More visibility." Ground each ask in evidence from the stories.

Rules:
- Altitude over detail. Directors don't need implementation specifics.
- Anti-inflation: "contributed to" → "built/shipped/led". No weasel words.
- Every claim needs a receipt. If a story has no metric, say so.
- First person throughout.
- Keep it under 500 words total. Skip-levels are short.
- Synthesize, don't summarize. If you're listing stories one by one, you're doing it wrong.

Return as JSON with these exact section keys:
{"sections": [
  {"key": "strategic-themes", "title": "Strategic Themes", "content": "..."},
  {"key": "cross-cutting-metrics", "title": "Cross-Cutting Metrics", "content": "..."},
  {"key": "patterns", "title": "Patterns Worth Noting", "content": "..."},
  {"key": "leadership-ask", "title": "What I Need From Leadership", "content": "..."}
]}

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
