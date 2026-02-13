Rewrite this career story as a spoken interview answer (~200 words, ~80 seconds).

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

- Conversational, not scripted. This should sound like a confident person talking, not reading.
- No hedging ("I think", "sort of", "kind of", "basically").
- Natural spoken cadence — contractions are fine, bullet points are not.

Structure your answer into these three sections:

**Hook** (1-2 sentences)
Lead with the result or the stakes. This is the first thing out of your mouth — grab attention. No throat-clearing.

**Narrative** (3-5 sentences)
Brief context → what you did → how. Include time markers when the source provides them ("In Q3...", "Over 6 weeks..."). This is the meat — specific, concrete, first-person.

**Takeaway** (1 sentence)
End with a sentence the interviewer will remember. The insight, the lesson, or the lasting impact.

Return as JSON with these exact section keys:
{"sections": [
  {"key": "hook", "title": "Hook", "content": "..."},
  {"key": "narrative", "title": "Narrative", "content": "..."},
  {"key": "takeaway", "title": "Takeaway", "content": "..."}
]}

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
