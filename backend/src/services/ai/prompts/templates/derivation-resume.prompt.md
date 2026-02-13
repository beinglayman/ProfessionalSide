Rewrite this career story as resume bullet points.

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

- XYZ format: "Accomplished [X] by doing [Y], resulting in [Z]".
- Start each bullet with a strong action verb: Led, Designed, Implemented, Reduced, Increased, Built, Migrated, Optimized, Shipped, Architected.
- No soft verbs: "Helped", "Assisted", "Participated", "Contributed to", "Worked on" are banned.
- No first person pronouns — resume convention omits "I".
- Metric in parentheses at the end when available: "(40% reduction in login failures, from 12% to 7.2%)"
- Each bullet under 200 characters. If it doesn't fit, cut process details, keep the outcome.
- Monochrome and factual. No adjectives without numbers to back them.

Generate 2-3 distinct bullet points from this story, each highlighting a different angle:

**Primary Bullet**
The headline achievement — the single most impressive outcome from this story. Lead with the biggest metric.

**Technical Bullet**
The engineering/technical contribution — what you built, designed, or architected. Emphasize the approach and technical scope.

**Impact Bullet**
The broader business or team impact — how this work affected users, revenue, team velocity, or organizational outcomes.

If the story only supports 2 strong bullets, omit the weakest one. Never pad — 2 strong bullets beat 3 mediocre ones.

Return as JSON with these section keys (omit a section if the story doesn't support it):
{"sections": [
  {"key": "primary-bullet", "title": "Primary Bullet", "content": "..."},
  {"key": "technical-bullet", "title": "Technical Bullet", "content": "..."},
  {"key": "impact-bullet", "title": "Impact Bullet", "content": "..."}
]}

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
