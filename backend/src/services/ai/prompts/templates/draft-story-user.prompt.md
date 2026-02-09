Generate a structured journal entry for: "{{title}}"

{{#if userEmail}}
## User Identity
The user whose journal this is: {{userEmail}}
When determining dominantRole, check if this email appears as assignee, author, organizer, or sender across the activities. If they are the primary author/assignee on most activities, the role is "Led".
{{/if}}

{{#if isCluster}}
## Context
These activities are grouped by shared reference "{{clusterRef}}" - they form a cohesive project/initiative.
{{else}}
## Context
These activities span a time period - identify the common themes and group into phases.
{{/if}}

## Activities
{{activitiesText}}

## Required JSON Output Schema

Return a JSON object with these EXACT fields:

{
  "description": "1-2 sentence summary of key accomplishments (max 200 chars)",
  "category": "feature|bug-fix|optimization|documentation|learning|collaboration|problem-solving|achievement",
  "topics": ["Main topic 1", "Main topic 2", "Main topic 3"],
  "skills": ["Technology1", "Technology2", "Methodology1"],
  "impactHighlights": ["Specific measurable impact 1", "Specific measurable impact 2"],
  "fullContent": "# Title\n\nMarkdown narrative (3-5 paragraphs)...",
  "phases": [
    {
      "name": "Phase name (Planning/Implementation/Review/Deployment/etc)",
      "activityIds": ["id1", "id2"],
      "summary": "Brief description of this phase"
    }
  ],
  "dominantRole": "Led|Contributed|Participated",
  "activityEdges": [
    {
      "activityId": "activity-id-from-list",
      "type": "primary|supporting|contextual|outcome",
      "message": "5-15 word explanation of this activity's role"
    }
  ]
}

## Field Guidelines

- **description**: Concise summary focusing on KEY accomplishments (what was achieved, not what was done)
- **category**: Choose ONE that best represents the primary focus
- **topics**: 2-5 specific topics/themes (e.g., "OAuth2 Authentication", "API Rate Limiting")
- **skills**: Technical skills demonstrated (specific technologies, not generic terms)
- **impactHighlights**: Specific, measurable outcomes (e.g., "Reduced API latency by 40%")
- **fullContent**: Professional markdown narrative with Overview, Technical Approach, and Outcomes sections
- **phases**: Logical grouping of activities (use actual activity IDs from the list above)
- **dominantRole**: Based on activity patterns (author, reviewer, attendee)
- **activityEdges**: For EACH activity, classify its relationship to this story:
  - `primary`: Core work that directly delivers the outcome (the "doing")
  - `supporting`: Enables or validates primary work (reviews, specs, tests)
  - `contextual`: Background context (discussions, meetings, approvals)
  - `outcome`: Results that prove impact (metrics, fixes, follow-ups)
  - Message: Brief explanation of WHY this activity matters to the story

## Example Output
{{exampleJson}}

Return ONLY the JSON object, no markdown code blocks or additional text.
