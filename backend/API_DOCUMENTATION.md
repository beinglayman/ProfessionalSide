# InChronicle API Documentation

## Base URL
```
http://localhost:3001/api/v1
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Test Credentials
```
Email: sarah.chen@techcorp.com
Password: password123
```

## Available Users
- sarah.chen@techcorp.com (Main user with full data)
- emily.chen@techcorp.com 
- alex.wong@techcorp.com
- sarah.johnson@techcorp.com
- marcus.williams@techcorp.com
- jason.park@techcorp.com

All users have password: `password123`

---

## Authentication Endpoints

### POST /api/v1/auth/register
Register a new user
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "title": "Software Engineer",
  "company": "TechCorp",
  "location": "San Francisco, CA"
}
```

### POST /api/v1/auth/login
Login user
```json
{
  "email": "sarah.chen@techcorp.com",
  "password": "password123"
}
```

### POST /api/v1/auth/refresh
Refresh access token
```json
{
  "refreshToken": "<refresh_token>"
}
```

### GET /api/v1/auth/me
Get current user profile (Protected)

### POST /api/v1/auth/logout
Logout user (Protected)

### PUT /api/v1/auth/change-password
Change password (Protected)
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## User Management Endpoints

### GET /api/v1/users/profile/me
Get current user's full profile (Protected)

### GET /api/v1/users/:userId
Get user profile by ID (Public with privacy controls)

### PUT /api/v1/users/profile
Update user profile (Protected)
```json
{
  "name": "Updated Name",
  "title": "New Title",
  "bio": "Updated bio",
  "location": "New Location",
  "company": "New Company",
  "showEmail": false,
  "showLocation": true,
  "showCompany": true
}
```

### GET /api/v1/users/search
Search users (Public)
Query parameters:
- `query`: Search term
- `skills`: Comma-separated skills
- `location`: Location filter
- `company`: Company filter
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)

### GET /api/v1/users/skills/all
Get all available skills (Public)

### GET /api/v1/users/:userId/skills
Get user skills (Public)

### POST /api/v1/users/skills
Add skill to user (Protected)
```json
{
  "skillName": "React.js",
  "category": "Technical",
  "level": "expert",
  "yearsOfExp": 5,
  "projects": 15,
  "startDate": "2020-01-15T00:00:00.000Z"
}
```

### PUT /api/v1/users/skills/:skillId
Update user skill (Protected)

### DELETE /api/v1/users/skills/:skillId
Remove user skill (Protected)

### POST /api/v1/users/:userId/skills/:skillId/endorse
Endorse user skill (Protected)

---

## Journal Entry Endpoints

### GET /api/v1/journal/entries
Get journal entries with filtering (Protected)
Query parameters:
- `workspaceId`: Filter by workspace
- `visibility`: private, workspace, network
- `category`: Entry category
- `tags`: Comma-separated tags
- `skills`: Comma-separated skills
- `authorId`: Filter by author
- `search`: Search term
- `sortBy`: createdAt, updatedAt, likes, comments, views
- `sortOrder`: asc, desc
- `page`: Page number
- `limit`: Results per page

### POST /api/v1/journal/entries
Create new journal entry (Protected)
```json
{
  "title": "My Journal Entry",
  "description": "Short description",
  "fullContent": "Full content of the entry...",
  "abstractContent": "Public summary",
  "workspaceId": "workspace_id",
  "visibility": "workspace",
  "category": "Engineering",
  "tags": ["react", "typescript"],
  "skills": ["React.js", "TypeScript"],
  "collaborators": [
    {
      "userId": "user_id",
      "role": "Frontend Engineer"
    }
  ],
  "reviewers": [
    {
      "userId": "user_id",
      "department": "Engineering"
    }
  ],
  "artifacts": [
    {
      "name": "code-sample.ts",
      "type": "code",
      "url": "https://github.com/example/repo",
      "size": "5 KB"
    }
  ],
  "outcomes": [
    {
      "category": "performance",
      "title": "Improved performance",
      "description": "Reduced load time by 50%",
      "highlight": "50% improvement"
    }
  ]
}
```

### GET /api/v1/journal/entries/:id
Get single journal entry (Protected)

### PUT /api/v1/journal/entries/:id
Update journal entry (Protected)

### DELETE /api/v1/journal/entries/:id
Delete journal entry (Protected)

### POST /api/v1/journal/entries/:id/publish
Publish journal entry (Protected)
```json
{
  "visibility": "network",
  "abstractContent": "Public summary for network view"
}
```

### POST /api/v1/journal/entries/:id/like
Like/unlike journal entry (Protected)

### POST /api/v1/journal/entries/:id/appreciate
Appreciate journal entry (Protected)

### GET /api/v1/journal/entries/:id/comments
Get entry comments (Protected) - Coming soon

### POST /api/v1/journal/entries/:id/comments
Add comment to entry (Protected) - Coming soon

### POST /api/v1/journal/entries/:id/artifacts
Add artifact to entry (Protected) - Coming soon

### POST /api/v1/journal/entries/:id/analytics
Record analytics (Protected)
```json
{
  "readTime": 180,
  "engagementType": "view",
  "referrer": "dashboard"
}
```

---

## Workspace Endpoints (Coming Soon)

### GET /api/v1/workspaces
Get user workspaces (Protected)

### GET /api/v1/workspaces/:id
Get workspace details (Protected)

---

## Network Management Endpoints (Coming Soon)

### GET /api/v1/network/connections
Get network connections (Protected)

### POST /api/v1/network/connections/request
Send connection request (Protected)

---

## Goals & Achievements Endpoints (Coming Soon)

### GET /api/v1/goals
Get user goals (Protected)

### POST /api/v1/goals
Create new goal (Protected)

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "Error message",
  "details": {} // Optional additional details
}
```

## Success Responses

All endpoints return success responses in this format:
```json
{
  "success": true,
  "data": {}, // Response data
  "message": "Optional success message"
}
```

Paginated responses include pagination info:
```json
{
  "success": true,
  "data": [],
  "message": "Results found",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

## Rate Limiting

- General API: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes
- File uploads: 10 requests per minute

## Sample Data Available

The database is seeded with:
- 6 users with complete profiles
- 2 workspaces (Frontend Innovation, Design System)
- 2 journal entries with full metadata
- 1 goal with milestones
- 2 achievements with attestations
- 3 network connections
- 401 analytics entries
- All social interactions (likes, appreciates)

Perfect for testing the frontend integration!