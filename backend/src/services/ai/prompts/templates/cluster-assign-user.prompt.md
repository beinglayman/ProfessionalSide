{{#if existingClusters.length}}
EXISTING CLUSTERS (last 30 days + referenced by candidates):
{{#each existingClusters}}
- clusterId: {{this.id}}
  name: "{{this.name}}"
  activityCount: {{this.activityCount}}
  dateRange: {{this.dateRange}}
  tools: {{this.toolSummary}}
  {{#if this.isReferenced}}(referenced by a candidate below){{/if}}
  topActivities: {{this.topActivities}}
{{/each}}
{{else}}
No existing clusters. All candidates will need NEW cluster assignments.
{{/if}}

CANDIDATE ACTIVITIES:
{{#each candidates}}
{{this.id}}. [{{this.source}}] "{{this.title}}" ({{this.date}})
   currentClusterId: {{#if this.currentClusterId}}{{this.currentClusterId}}{{else}}null{{/if}}
   confidence: {{#if this.confidence}}{{this.confidence}}{{else}}null{{/if}}
   {{#if this.description}}   {{truncate this.description 100}}{{/if}}
{{/each}}

Respond as JSON:
{
  "<activity_id>": "KEEP:<clusterId>" | "MOVE:<clusterId>" | "NEW:<name>"
}
