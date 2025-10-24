# MCP Test Data API - Usage Guide

## Overview

A test data endpoint has been created to provide realistic mock activities from all 7 MCP tools (GitHub, Jira, Figma, Outlook, Confluence, Slack, Teams) without requiring real OAuth connections or API calls to external services.

This allows you to test the complete MCP workflow end-to-end:
1. Side panel UI with tool icons
2. Multi-source data selection
3. AI organization and correlation
4. Entry preview generation

## API Endpoint

**POST** `/api/v1/mcp/test-activities`

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "toolTypes": ["github", "jira", "figma", "outlook", "confluence", "slack", "teams"],
  "dateRange": {
    "start": "2025-10-18T00:00:00Z",
    "end": "2025-10-19T23:59:59Z"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "source": "github",
        "tool": "GitHub",
        "success": true,
        "data": {
          "commits": [...],
          "pullRequests": [...],
          "issues": [...]
        }
      },
      {
        "source": "jira",
        "tool": "Jira",
        "success": true,
        "data": {
          "issues": [...]
        }
      },
      // ... other tools
    ],
    "testMode": true,
    "message": "Test data generated successfully. This is mock data for testing purposes."
  }
}
```

## Testing with cURL

### Get auth token first
```bash
# Login to get token
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'

# Save the access token from response
export TOKEN="your_access_token_here"
```

### Test the endpoint
```bash
curl -X POST http://localhost:3002/api/v1/mcp/test-activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "toolTypes": ["github", "jira", "figma", "outlook", "confluence", "slack", "teams"],
    "dateRange": {
      "start": "2025-10-18T00:00:00Z",
      "end": "2025-10-19T23:59:59Z"
    }
  }' | jq
```

### Test with specific tools only
```bash
curl -X POST http://localhost:3002/api/v1/mcp/test-activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "toolTypes": ["github", "slack"],
    "dateRange": {
      "start": "2025-10-18T00:00:00Z",
      "end": "2025-10-19T23:59:59Z"
    }
  }' | jq
```

## Mock Data Included

### GitHub
- **3 commits** with realistic messages, repos, file changes
- **1 pull request** with reviews and comments
- **1 issue** with assignees and comments

### Jira
- **3 issues/stories** across different statuses (Done, In Progress)
- Story points, sprints, priorities
- Mix of Story, Bug, and Task types

### Figma
- **2 design files** with versions and contributors
- **2 comments** with feedback

### Outlook
- **3 meetings** (sprint planning, 1:1, design review)
- Organizers, attendees, meeting notes
- **1 email** thread

### Confluence
- **2 documentation pages** with version history
- **1 comment** on architecture docs

### Slack
- **2 messages** from different channels
- Reactions, thread replies
- Emoji reactions count

### Microsoft Teams
- **2 messages** with mentions and reactions
- **1 call** (daily standup)

## Using in the Frontend

To use this endpoint instead of the real MCP fetch:

### Option 1: Temporary replacement in useMCPMultiSource hook

```typescript
// In src/hooks/useMCPMultiSource.tsx
const fetchAndProcess = async (...) => {
  // Replace this line:
  const response = await axios.post('/mcp/fetch-and-process', ...);

  // With this for testing:
  const response = await axios.post('/mcp/test-activities', {
    toolTypes,
    dateRange
  });

  // The rest of your code remains the same
};
```

### Option 2: Environment variable toggle

Add to `.env`:
```
VITE_USE_MCP_TEST_DATA=true
```

Then in your hook:
```typescript
const endpoint = import.meta.env.VITE_USE_MCP_TEST_DATA === 'true'
  ? '/mcp/test-activities'
  : '/mcp/fetch-and-process';

const response = await axios.post(endpoint, ...);
```

## Benefits

✅ **No OAuth setup required** - Test without connecting real accounts
✅ **Consistent test data** - Same realistic activities every time
✅ **All 7 tools working** - Even though only GitHub is fully implemented
✅ **Fast iteration** - No waiting for external API calls
✅ **Demo-ready** - Perfect for showcasing the complete workflow
✅ **Realistic scenarios** - Data includes commits, PRs, meetings, docs, messages

## Sample Activities Included

- **Code**: Fixed authentication bugs, added validation, optimized queries
- **Tasks**: Completed user stories, fixed critical bugs, ongoing optimization
- **Design**: Updated MCP workflow designs, profile page redesign
- **Meetings**: Sprint planning, 1:1s, design reviews
- **Docs**: Architecture documentation, authentication system docs
- **Communication**: Deployment announcements, feature updates
- **Collaboration**: Code reviews, design feedback, team discussions

## Next Steps

1. Use this endpoint to test the side panel UI
2. Verify all 7 tool icons display correctly
3. Test the AI organization of activities
4. Validate the entry preview generation
5. Test the complete workflow end-to-end

Once satisfied with the UI and workflow, you can:
- Implement remaining tool integrations (Jira, Figma, etc.)
- Switch back to real API calls by changing the endpoint
- Deploy to production with test data disabled
