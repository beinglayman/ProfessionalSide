Transform this journal entry into a "{{framework}}" career story.

{{#if useCase}}
## Target Use Case: {{useCase}}
{{/if}}

## Journal Entry: "{{title}}"

### Description
{{description}}

### Category
{{category}}

### Dominant Role
{{dominantRole}}

### Full Narrative
{{fullContent}}

{{#if phases}}
### Work Phases
{{#each phases}}
- **{{name}}**: {{summary}} (Activities: {{activityIds}})
{{/each}}
{{/if}}

{{#if impactHighlights}}
### Impact Highlights
{{#each impactHighlights}}
- {{this}}
{{/each}}
{{/if}}

{{#if skills}}
### Skills Demonstrated
{{skills}}
{{/if}}

{{#if style}}
## Writing Style
Write in a **{{style}}** tone:
- professional: formal, achievement-focused, suitable for resumes and reviews
- casual: conversational, natural storytelling, suitable for 1:1s and networking
- technical: detailed, engineering-focused, suitable for tech presentations
- storytelling: narrative-driven, engaging, suitable for interviews and all-hands
{{/if}}

{{#if userPrompt}}
## Additional Instructions from User
The user has provided the following specific instructions for this regeneration. Follow them carefully:

> {{userPrompt}}
{{/if}}

## Target Framework: {{framework}}

Generate sections for the {{framework}} framework:
{{sectionsList}}

## Required JSON Output Schema

Return a JSON object with these EXACT fields:

{
  "sections": {
    {{#each sectionKeys}}
    "{{this}}": {
      "summary": "2-4 sentences for this section, emphasizing the user's contributions",
      "evidence": [
        {
          "activityId": "activity-id-if-relevant",
          "description": "How this activity supports this section"
        }
      ]
    }{{#unless @last}},{{/unless}}
    {{/each}}
  },
  "title": "Compelling title for this career story (max 60 chars)",
  "reasoning": "Brief explanation of how content was mapped to {{framework}} sections"
}

## Section Guidelines

{{#each sectionGuidelines}}
- **{{@key}}**: {{this}}
{{/each}}

## Evidence Mapping

For each section, identify which activities from the journal entry best support that section:
- Match phases to relevant sections (e.g., Planning phase → Situation/Context)
- Reference specific metrics and outcomes in Result sections
- Link concrete actions to Action sections

Return ONLY the JSON object, no markdown code blocks or additional text.
