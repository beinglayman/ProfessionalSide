Rewrite this career story as a LinkedIn post (max 1300 characters including spaces).

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

- Tone: confident but not boastful. Share the learning, not just the win.
- No emoji spam. One or two if they add meaning, zero is fine.
- Hard limit: 1300 characters total across all sections.

Structure your post into these three sections:

**Hook** (1 sentence)
The first line — a number, a surprising fact, or a question. This shows before "...see more". No "I'm excited to share" or "Thrilled to announce". Make them click.

**Body** (2-4 short paragraphs)
Short paragraphs (1-2 sentences each). White space matters on LinkedIn. Tell the story: what happened, what you did, the outcome. End with an insight or reflection, not a call to action. No "What do you think?" or "Drop a comment below".

**Hashtags** (1 line)
3-5 relevant hashtags. No fluff tags like #leadership or #growth — pick specific ones that match the story's domain.

Return as JSON with these exact section keys:
{"sections": [
  {"key": "hook", "title": "Hook", "content": "..."},
  {"key": "body", "title": "Body", "content": "..."},
  {"key": "hashtags", "title": "Hashtags", "content": "..."}
]}

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
