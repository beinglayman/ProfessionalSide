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
  ],
  "archetype": "firefighter|architect|diplomat|multiplier|detective|pioneer|turnaround|preventer",
  "archetypeAlternatives": ["second-best archetype", "third-best archetype"],
  "archetypeConfidence": 0.85,
  "checklistState": [
    { "row": "situation", "state": "derived", "summary": "Led a P1 outage of payments-api on Apr 22", "evidenceActivityIds": ["jira-1", "slack-2"] },
    { "row": "role",      "state": "derived", "summary": "Primary author on the rollback PR and assignee on the Jira incident", "evidenceActivityIds": ["gh-3", "jira-1"] },
    { "row": "action",    "state": "derived", "summary": "Shipped rollback, then a permanent guard; reviewed all three follow-up PRs", "evidenceActivityIds": ["gh-3", "gh-4"] },
    { "row": "result",    "state": "ask" },
    { "row": "stakes",    "state": "ask" },
    { "row": "hardest",   "state": "ask" }
  ]
}

## Field Guidelines

- **description**: Concise summary focusing on KEY accomplishments (what was achieved, not what was done)
- **category**: Choose ONE that best represents the primary focus
- **topics**: 2-5 specific topics/themes. Name the actual thing, not a category. BAD: "Debugging & Diagnostics", "Code Quality". GOOD: "Graph API Query Parameters", "Azure Container Caching", "Teams Chat Integration"
- **skills**: Technical skills demonstrated (specific technologies, not generic terms)
- **impactHighlights**: Specific, measurable outcomes (e.g., "Reduced API latency by 40%"). For debugging/fix work, frame impact as what was UNBLOCKED or RESTORED, not what was fixed. BAD: "Recovered 14 missing chats". GOOD: "Restored visibility into 14 Teams conversations"
- **fullContent**: Professional markdown narrative with Overview, Technical Approach, and Outcomes sections. The `# Title` MUST be plain English, 3-10 words, no colons, no technical prefixes (e.g., fix(mcp):). Describe what was accomplished, not categorized. BAD: "DevOps and Code Quality Maintenance: Fix(mcp): Work". GOOD: "Fixed Teams Chat Integration and Deployment Pipeline"
- **phases**: Logical grouping of activities (use actual activity IDs from the list above)
- **dominantRole**: Based on activity patterns (author, reviewer, attendee)
- **activityEdges**: For EACH activity, classify its relationship to this story:
  - `primary`: Core work that directly delivers the outcome (the "doing")
  - `supporting`: Enables or validates primary work (reviews, specs, tests)
  - `contextual`: Background context (discussions, meetings, approvals)
  - `outcome`: Results that prove impact (metrics, fixes, follow-ups)
  - Message: Brief explanation of WHY this activity matters to the story
- **archetype**: The shape of the hero moment. See the system prompt for the 8 options and their signals.
- **archetypeAlternatives**: 0–2 other archetypes that could also fit, in descending order of fit. Omit if the primary is a strong match.
- **archetypeConfidence**: 0.0–1.0. Use <0.6 when the story genuinely could fit more than one archetype; ≥0.8 when one clearly dominates.
- **checklistState**: One entry per STAR(L) row. Classify each as 'derived' (Activities cover it) or 'ask' (user input needed). See the system prompt for per-row rules. ALWAYS include all 6 rows in this order: situation, role, action, result, stakes, hardest. Do NOT include `learning` in the base schema — the wizard adds it client-side when STARL is selected. For 'derived' rows, include `summary` (one sentence) and `evidenceActivityIds`. For 'ask' rows, omit both.

## Example Output
{{exampleJson}}

Return ONLY the JSON object, no markdown code blocks or additional text.
