# Format7 Auto Journal Entry Integration Guide

## Overview
This document explains the complete integration of Format7 journal entry display with the auto journal creation workflow from MCP tools (GitHub, Jira, Slack, etc.).

## Architecture

```
┌─────────────────┐
│   MCP Tools     │  GitHub, Jira, Slack, Teams, etc.
│   (OAuth)       │
└────────┬────────┘
         │ Fetch Data (Memory-Only)
         ▼
┌─────────────────┐
│   Tool Adapters │  Enhanced with Format7 metadata
│   (tools/*.ts)  │  - PR stats (lines, files, commits)
│                 │  - Comment counts
│                 │  - Participants
└────────┬────────┘
         │ Raw Tool Data
         ▼
┌─────────────────┐
│   AI Agents     │  3-Stage Processing
│   Pipeline      │  - Analyzer: Categorize & extract skills
│                 │  - Correlator: Link related activities
│                 │  - Generator: Create content
└────────┬────────┘
         │ Organized Activity
         ▼
┌─────────────────┐
│   Format7       │  Transform to display structure
│   Transformer   │  - Build activities with evidence
│                 │  - Extract collaborators
│                 │  - Calculate aggregations
└────────┬────────┘
         │ Format7 Entry
         ▼
┌─────────────────┐
│   Frontend      │  Pair 4 (Regular) or Pair 5 (Achievement)
│   Components    │  - feed-hybrid.tsx / feed-achievement.tsx
│                 │  - journal-hybrid.tsx / journal-achievement.tsx
└─────────────────┘
```

## Backend Components

### 1. Format7 Transformer Service
**Location:** `backend/src/services/mcp/format7-transformer.service.ts`

**Purpose:** Converts MCP organized activity data into Format7 journal entry structure.

**Key Features:**
- **Collaborator Extraction & Deduplication**
  - Extracts people from all tool sources
  - Deduplicates by name
  - Generates consistent color gradients (8 colors)
  - Creates initials from names
  - Separates collaborators from reviewers

- **Evidence Building**
  - GitHub: PR stats (additions, deletions, files_changed, commits, reviewers)
  - Jira: Comment counts, time spent
  - Slack: Message counts, reactions
  - Meeting: Duration, participants
  - Collects all related URLs per activity

- **Time Calculations**
  - Calculates time span from earliest to latest activity
  - Returns hours for "8h span" display

- **Aggregations**
  - Activities by type (code_change, issue, meeting, etc.)
  - Activities by source (github, jira, slack, etc.)
  - Technologies used (filters out soft skills)

**Example Usage:**
```typescript
import { format7Transformer } from '../services/mcp/format7-transformer.service';

const format7Entry = format7Transformer.transformToFormat7(
  organizedActivity,  // From AI agents
  rawToolData,        // Original tool responses
  {
    userId: user.id,
    workspaceName: 'Engineering Team',
    privacy: 'team',
    dateRange: { start, end }
  }
);
```

### 2. Enhanced Tool Adapters

#### GitHub Tool (`tools/github.tool.ts`)
**Enhanced Features:**
- Fetches detailed PR statistics for each PR
- Includes: additions, deletions, filesChanged, commits, reviewers[]
- Limits to 20 PRs to avoid rate limiting
- Already tracked: author, state, labels, commentsCount

**API Calls:**
```
/search/issues → Get PRs
/repos/{owner}/{repo}/pulls/{number} → Get PR details with stats
```

#### Jira Tool (`tools/jira.tool.ts`)
**Existing Features (already suitable):**
- Comment count: `commentCount`
- Time tracking: `timeSpent`, `timeEstimate`
- Participants: `assignee`, `reporter`
- Already fetches all needed metadata

### 3. Backend API Endpoint

**Endpoint:** `POST /api/v1/mcp/generate-format7-entry`

**Request Body:**
```json
{
  "toolTypes": ["github", "jira", "slack"],
  "dateRange": {
    "start": "2025-01-15T00:00:00Z",
    "end": "2025-01-15T23:59:59Z"
  },
  "consentGiven": true,
  "quality": "balanced",  // "quick" | "balanced" | "high"
  "privacy": "team",      // "private" | "team" | "network" | "public"
  "workspaceName": "Engineering Team"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entry_metadata": {
      "title": "WebSocket Integration and Real-time Features",
      "date": "2025-01-15",
      "type": "achievement",
      "workspace": "Engineering Team",
      "privacy": "team",
      "isAutomated": true,
      "created_at": "2025-01-15T18:30:00Z"
    },
    "context": {
      "date_range": { "start": "...", "end": "..." },
      "sources_included": ["github", "jira"],
      "total_activities": 12,
      "primary_focus": "Implemented real-time collaboration features..."
    },
    "activities": [...],
    "summary": {
      "total_time_range_hours": 8,
      "activities_by_type": { "code_change": 5, "issue": 3, ... },
      "activities_by_source": { "github": 8, "jira": 4 },
      "unique_collaborators": [...],
      "unique_reviewers": [...],
      "technologies_used": ["TypeScript", "WebSocket", "React"],
      "skills_demonstrated": [...]
    },
    "correlations": [...],
    "artifacts": [...]
  }
}
```

## Frontend Components

### Format7 Display Components

**Pair 4 - Hybrid (Regular Entries)**
- `src/components/format7/feed-hybrid.tsx` - Feed view with author
- `src/components/format7/journal-hybrid.tsx` - Journal view without author

**Pair 5 - Achievement Celebration**
- `src/components/format7/feed-achievement.tsx` - Feed view with confetti
- `src/components/format7/journal-achievement.tsx` - Journal view with achievements

**Key Features:**
- Purple border and theming for achievements
- Yellow achievement badge with trophy icon
- Confetti on hover (throttled to 3 seconds)
- Toggleable time display (relative ↔ absolute)
- Three-dot menu for actions
- Privacy badges (Published/Unpublished)
- Workspace badge in footer
- Metadata cards (Tools, Tech, Team)
- Expandable activities with evidence

## Data Flow Example

### 1. User Requests Auto Journal Entry
```typescript
// Frontend makes API call
const response = await api.post('/mcp/generate-format7-entry', {
  toolTypes: ['github', 'jira'],
  dateRange: { start: today, end: today },
  consentGiven: true,
  quality: 'balanced',
  privacy: 'team',
  workspaceName: userWorkspace.name
});
```

### 2. Backend Fetches Tool Data
```typescript
// GitHub Tool fetches with enhanced metadata
const githubData = await githubTool.fetchActivity(userId, dateRange);
// Returns:
{
  pullRequests: [{
    id: 123,
    title: "Add WebSocket support",
    additions: 245,      // ← Enhanced for Format7
    deletions: 89,       // ← Enhanced for Format7
    filesChanged: 12,    // ← Enhanced for Format7
    commits: 3,          // ← Enhanced for Format7
    reviewers: ["alice", "bob"],  // ← Enhanced for Format7
    commentsCount: 5,
    author: "currentUser",
    // ... other fields
  }]
}
```

### 3. AI Agents Process Data
```typescript
// Analyzer categorizes activities
const analyzed = await analyzerAgent.analyze(toolData, 'balanced');
// Returns: { categories, suggestedTitle, suggestedEntryType, extractedSkills, ... }

// Correlator finds relationships
const correlated = await correlatorAgent.correlate(analyzed);
// Returns: { correlations: [{ type: 'pr_to_jira', source1, source2, confidence }] }
```

### 4. Format7 Transformer Builds Entry
```typescript
const format7Entry = transformer.transformToFormat7(
  organizedActivity,
  rawToolData,
  options
);

// Transformer does:
// 1. Extract selected activities
// 2. Build evidence for each activity
  activities[0].evidence = {
    type: 'pull_request',
    url: 'https://github.com/...',
    title: 'Add WebSocket support',
    links: ['https://github...', 'https://github.../files'],
    metadata: {
      lines_added: 245,
      lines_deleted: 89,
      files_changed: 12,
      comments: 5
    }
  }

// 3. Extract collaborators
  const collaborators = extractCollaborators(activities);
  // Returns: [
  //   { id: 'alice', name: 'Alice Smith', initials: 'AS',
  //     color: 'from-purple-400 to-pink-400', ... }
  // ]

// 4. Calculate time span
  total_time_range_hours = 8  // From earliest to latest activity

// 5. Build aggregations
  activities_by_type = { code_change: 5, issue: 3, review: 2 }
  activities_by_source = { github: 8, jira: 4 }
```

### 5. Frontend Renders
```tsx
// Choose component based on entry type
{entry.entry_metadata.type === 'achievement' ? (
  <FeedAchievement entry={format7Entry} />
) : (
  <FeedHybrid entry={format7Entry} />
)}
```

## Implementation Status

### ✅ Completed
1. **Format7TransformerService** - Full transformation logic
2. **TypeScript Types** - Complete type definitions
3. **Backend Endpoint** - `/api/v1/mcp/generate-format7-entry`
4. **GitHub Tool Enhancement** - PR stats, reviewers
5. **Jira Tool Validation** - Already has needed data
6. **Collaborator System** - Extraction, deduplication, color assignment
7. **Evidence Extraction** - Tool-specific metadata
8. **Time Calculations** - Span calculation
9. **Aggregations** - By type and source

### 🔄 In Progress
1. **Full Pipeline Integration** - Connect all pieces end-to-end
2. **Frontend Integration** - Connect components to real API

### 📋 Pending
1. **Additional Tool Enhancements** - Slack, Teams, Confluence (low priority)
2. **Rate Limit Handling** - For GitHub PR details fetching
3. **Caching Layer** - Cache tool data between user edits
4. **User Testing** - Validate with real tool data
5. **Performance Optimization** - Parallel processing improvements

## Configuration

### Environment Variables
No new environment variables needed. Uses existing:
- `AZURE_OPENAI_ENDPOINT` - For AI agents
- `AZURE_OPENAI_API_KEY` - For AI agents
- Tool OAuth credentials (GitHub, Jira, etc.)

### Feature Flags
To enable Format7 generation:
```typescript
// In your journal creation flow:
const useFormat7 = true;  // Toggle for Format7 vs traditional

if (useFormat7) {
  const response = await api.post('/mcp/generate-format7-entry', ...);
  return <FeedHybrid entry={response.data} />;
} else {
  // Traditional flow
}
```

## Data Privacy & Security

**Privacy-First Design Maintained:**
- All tool data remains memory-only (30-min TTL)
- No database persistence without explicit user consent
- Format7 transformer operates on in-memory data only
- Session-based storage with auto-expiry
- User consent required for all tool fetching

## Troubleshooting

### Issue: PR stats showing as 0
**Cause:** GitHub rate limiting or PR details API failure
**Solution:** Reduce PR fetch limit or implement exponential backoff

### Issue: Missing collaborators
**Cause:** Tool API doesn't provide participant lists
**Solution:** Graceful degradation - shows available data only

### Issue: Time span is 0
**Cause:** All activities have same/missing timestamp
**Solution:** Verify tool adapters are preserving timestamps

### Issue: Achievement not detected
**Cause:** AI didn't classify as achievement type
**Solution:** Check AI prompt tuning or manually set type

## Next Steps

1. **Test with Real Data** - Connect actual GitHub/Jira accounts
2. **Performance Benchmarking** - Measure end-to-end latency
3. **Error Handling** - Add comprehensive error messages
4. **User Feedback** - Collect feedback on Format7 display
5. **Iteration** - Refine based on real usage patterns

## Contact & Support

For questions or issues with Format7 integration:
- Review this guide
- Check `backend/src/services/mcp/format7-transformer.service.ts` for implementation
- Check Frontend components in `src/components/format7/`
- Refer to CLAUDE.md for general project documentation
