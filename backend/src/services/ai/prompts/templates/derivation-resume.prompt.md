Rewrite this career story as a single resume bullet point.

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

- XYZ format: "Accomplished [X] by doing [Y], resulting in [Z]". One bullet, max 2 lines.
- Start with a strong action verb: Led, Designed, Implemented, Reduced, Increased, Built, Migrated, Optimized, Shipped, Architected.
- No soft verbs: "Helped", "Assisted", "Participated", "Contributed to", "Worked on" are banned.
- No first person pronouns — resume convention omits "I".
- Metric in parentheses at the end: "(40% reduction in login failures, from 12% to 7.2%)"
- Under 200 characters total. If it doesn't fit, cut process details, keep the outcome.
- Monochrome and factual. No adjectives without numbers to back them.

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
