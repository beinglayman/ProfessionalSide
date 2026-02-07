Rewrite this career story as 1-2 resume bullet points.

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

## Instructions

- Each bullet: action verb + what you did + result with metric in parentheses.
- Example format: "Redesigned authentication flow, reducing login failures by 40% (from 12% to 7.2% error rate)"
- Start with a strong action verb: Led, Designed, Implemented, Reduced, Increased, Built, Migrated, Optimized.
- No first person pronouns — resume convention omits "I".
- If two bullets: first covers what you did, second covers the impact.
- If one bullet: compress everything into one line under 200 characters.
- Monochrome and factual. No adjectives without numbers to back them.

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
