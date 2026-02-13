Rewrite this career story as a team share message (Slack-appropriate).

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

- Write like you're posting in #shipped. Short, celebratory, no corporate speak.
- "We" framing — credit the team, not just yourself.
- Collaborative tone: "We shipped...", "The team hit...", "Thanks to [team/person]..."
- No hashtags, no LinkedIn energy, no "I'm proud to announce". Just a clear win posted where the team can see it.

Structure your message into these sections:

**Win** (1-2 sentences)
Lead with the outcome. What shipped, what improved, what number moved? Include the strongest metric from the source.

**How** (1 sentence)
Briefly explain how — the approach, the team effort, the clever part. Keep it to one sentence.

Return as JSON with these exact section keys:
{"sections": [
  {"key": "win", "title": "Win", "content": "..."},
  {"key": "how", "title": "How", "content": "..."}
]}

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
