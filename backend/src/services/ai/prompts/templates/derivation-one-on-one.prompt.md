Rewrite this career story as structured talking points for a 1:1 with your manager.

## Source Story: "{{title}}" ({{framework}})

{{#each sections}}
**{{@key}}**: {{this.summary}}
{{/each}}

{{#if archetype}}
Story archetype: {{archetype}}
{{/if}}

{{#if metrics}}
Key metrics: {{metrics}}
{{/if}}

{{#if dateRange}}
Time period: {{dateRange}}
{{/if}}

## Instructions

- This is evidence for your manager. Each bullet = claim + proof. No fluff.
- Your manager doesn't have time for preamble. Lead every bullet with the point.
- Conversational bullets, not formal prose. How you'd actually talk in a 1:1.
- Mention specific people or teams when the source does.

Structure your talking points into these sections:

**Headline** (1 sentence)
The one-liner your manager should remember. Metric-first. This is your opener.

**What Happened** (2-3 bullets)
Structure each bullet: what happened → your role → impact or metric. Keep it concrete. If the story is simple, 2 bullets is enough.

**Why It Matters** (1-2 sentences)
Connect this to something your manager cares about — team goals, OKRs, org priorities. Don't assume they see the bigger picture.

**Ask** (1 bullet)
A question or request: "I'd like to do more of this", "Can we discuss X?", "Would it help if I shared this at the team retro?" Based on the work shown, what would you want from your manager?

Return as JSON with these exact section keys:
{"sections": [
  {"key": "headline", "title": "Headline", "content": "..."},
  {"key": "what-happened", "title": "What Happened", "content": "..."},
  {"key": "why-it-matters", "title": "Why It Matters", "content": "..."},
  {"key": "ask", "title": "Ask", "content": "..."}
]}

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
