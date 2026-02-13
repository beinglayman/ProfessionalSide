Rewrite this career story as a structured self-assessment for a performance review.

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

- Anti-hedging: "contributed to" → "built/shipped/led". "Helped with" → what you actually did. "Was involved in" → your specific role.
- Evidence-backed: every claim has a metric or observable outcome from the source.
- Professional but not stiff. Written for someone who knows the work but needs the summary.

Structure your self-assessment into these sections:

**Contribution** (2-3 sentences)
What you did and the evidence. Structure: what you did → evidence → impact. Align language to common performance competencies: impact, leadership, technical excellence, collaboration. Every sentence earns its place.

**Competency** (1-2 sentences)
Which competency does this story demonstrate? Name it explicitly (e.g., "Technical Leadership", "Cross-Team Impact", "Operational Excellence") and show how this story proves it.

**Growth** (1 sentence)
Forward-looking: what this experience positions you for next. Ground it in the work — not aspiration, evidence.

Return as JSON with these exact section keys:
{"sections": [
  {"key": "contribution", "title": "Contribution", "content": "..."},
  {"key": "competency", "title": "Competency", "content": "..."},
  {"key": "growth", "title": "Growth", "content": "..."}
]}

{{#if tone}}
Writing tone: {{tone}}
{{/if}}

{{#if customPrompt}}
Additional direction: {{customPrompt}}
{{/if}}
