# Deep Dive: Google Workspace Participation Signals

## TL;DR

Google Calendar and Drive APIs provide deterministic participant signals. Calendar has `attendees[]` array with clear organizer/attendee distinction. Drive comments include `mentionedUsers` array. Google Meet requires Admin SDK (not B2C viable).

---

## What It Is

Google Workspace APIs for B2C:
- **Google Calendar API** - Events with attendees
- **Google Drive API** - Files with comments, sharing
- **Google Docs/Sheets/Slides** - Accessed via Drive API for comments
- **Google Meet** - ❌ Admin SDK only

---

## Why It Matters

Google Workspace is ubiquitous. Missing it means:
- No meeting participation evidence
- No document collaboration signals
- Gap in cross-tool linking (Google Docs mentioned in Jira)

---

## OAuth Scopes for B2C

| Scope | Purpose | Sensitivity |
|-------|---------|-------------|
| `calendar.readonly` | Read calendar events | Low |
| `drive.readonly` | Read files, comments | Low |
| `drive.file` | Access files created/opened by app | Narrower, preferred |

**Recommended minimal set:**
```
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/drive.readonly
```

---

## Google Calendar: Participation Signals

### Event Resource

```
GET https://www.googleapis.com/calendar/v3/calendars/primary/events/{eventId}
```

Response:
```json
{
  "id": "abc123",
  "summary": "Sprint Planning",
  "organizer": {
    "email": "pm@company.com",
    "displayName": "Product Manager",
    "self": false
  },
  "creator": {
    "email": "pm@company.com",
    "self": false
  },
  "attendees": [
    {
      "email": "user@company.com",
      "displayName": "Current User",
      "self": true,
      "responseStatus": "accepted",
      "organizer": false
    },
    {
      "email": "pm@company.com",
      "displayName": "Product Manager",
      "self": false,
      "responseStatus": "accepted",
      "organizer": true
    }
  ],
  "start": { "dateTime": "2026-01-29T10:00:00Z" },
  "end": { "dateTime": "2026-01-29T11:00:00Z" }
}
```

### Extracting Participation

```typescript
interface CalendarParticipation {
  type: 'organizer' | 'attendee';
  eventId: string;
  eventTitle: string;
  timestamp: Date;
  responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction';
}

function extractCalendarParticipation(event: any, userEmail: string): CalendarParticipation {
  const isOrganizer = event.organizer?.email === userEmail || event.organizer?.self === true;
  const userAttendee = event.attendees?.find((a: any) => a.self === true || a.email === userEmail);

  return {
    type: isOrganizer ? 'organizer' : 'attendee',
    eventId: event.id,
    eventTitle: event.summary,
    timestamp: new Date(event.start?.dateTime || event.start?.date),
    responseStatus: userAttendee?.responseStatus || 'needsAction',
  };
}
```

### Listing Events

```
GET https://www.googleapis.com/calendar/v3/calendars/primary/events
    ?timeMin=2025-01-01T00:00:00Z
    &timeMax=2026-01-29T00:00:00Z
    &singleEvents=true
    &orderBy=startTime
```

**Note:** `singleEvents=true` expands recurring events.

---

## Google Drive: Participation Signals

### Comments Resource

```
GET https://www.googleapis.com/drive/v3/files/{fileId}/comments
```

Response:
```json
{
  "comments": [
    {
      "id": "comment123",
      "author": {
        "displayName": "Jane Doe",
        "emailAddress": "jane@company.com",
        "me": false
      },
      "content": "@John Smith please review this section",
      "htmlContent": "...",
      "createdTime": "2026-01-28T15:30:00Z",
      "resolved": false,
      "quotedFileContent": {
        "value": "original text being commented on"
      }
    }
  ]
}
```

### New: Mentioned Users Field

As of 2024, Drive API comments include:
```json
{
  "content": "@John Smith please review",
  "mentionedUsers": [
    {
      "kind": "drive#user",
      "displayName": "John Smith",
      "emailAddress": "john@company.com"
    }
  ]
}
```

✅ **Deterministic** - no text parsing needed!

### Extracting Comment Participation

```typescript
interface DocCommentParticipation {
  fileId: string;
  fileName: string;
  commentId: string;
  role: 'author' | 'mentioned' | 'replied';
  author: { name: string; email: string };
  mentionedUsers: string[]; // emails
  timestamp: Date;
}

function extractCommentParticipation(
  file: any,
  comment: any,
  userEmail: string
): DocCommentParticipation | null {
  const isAuthor = comment.author?.emailAddress === userEmail || comment.author?.me === true;
  const wasMentioned = comment.mentionedUsers?.some(
    (u: any) => u.emailAddress === userEmail
  );

  if (!isAuthor && !wasMentioned) return null;

  return {
    fileId: file.id,
    fileName: file.name,
    commentId: comment.id,
    role: isAuthor ? 'author' : 'mentioned',
    author: {
      name: comment.author?.displayName || 'Unknown',
      email: comment.author?.emailAddress || '',
    },
    mentionedUsers: comment.mentionedUsers?.map((u: any) => u.emailAddress) || [],
    timestamp: new Date(comment.createdTime),
  };
}
```

---

## Google Meet: NOT B2C Viable

### Why?

- Meet attendance data requires **Google Workspace Admin SDK**
- `meet.spaces.get` and `conferenceRecords.list` need admin consent
- Individual users cannot access participant lists

### Workaround

Use **Calendar attendees** as proxy:
- Most Meet calls are created from Calendar events
- Calendar event `attendees[]` shows who was invited
- `responseStatus: 'accepted'` suggests they attended

```typescript
function inferMeetParticipation(calendarEvent: any): boolean {
  // If event has Meet link and user accepted, assume they participated
  const hasMeetLink = calendarEvent.conferenceData?.entryPoints?.some(
    (ep: any) => ep.entryPointType === 'video'
  );
  const userAttendee = calendarEvent.attendees?.find((a: any) => a.self);
  const accepted = userAttendee?.responseStatus === 'accepted';

  return hasMeetLink && accepted;
}
```

---

## When to Use / Not Use

| Use When | Don't Use When |
|----------|----------------|
| Extracting meeting attendance | Verifying actual Meet presence (not available) |
| Finding doc comment @mentions | Building comprehensive doc edit history |
| Showing calendar collaboration | Tracking time spent in meetings |

---

## Gotchas

| Gotcha | Symptom | Fix |
|--------|---------|-----|
| `mentionedUsers` empty | Older comments may not have this field | Fall back to text parsing `@` patterns |
| Recurring events | Base event vs instances | Use `singleEvents=true` to expand |
| Drive file types | Docs/Sheets/Slides are Drive files | Check `mimeType` for file type |
| Comment pagination | Large threads may paginate | Handle `nextPageToken` |

---

## Rate Limits

| API | Quota |
|-----|-------|
| Calendar | 1,000,000 queries/day |
| Drive | 20,000 queries/100 seconds |

Both are very generous for B2C usage.

---

## Implementation Checklist

- [ ] Add `google` tool type to ToolType enum ✅ (done)
- [ ] Create Google Calendar pattern for Meet links ✅ (done)
- [ ] Add OAuth scopes to integration setup
- [ ] Implement Calendar event sync with participation extraction
- [ ] Implement Drive comments sync with mention detection
- [ ] Add fallback parsing for comments without `mentionedUsers`

---

## Sources

- [Google Calendar API - Events](https://developers.google.com/calendar/api/v3/reference/events)
- [Google Drive API - Comments](https://developers.google.com/drive/api/guides/manage-comments)
- [Google Workspace OAuth Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Drive API Comments Resource](https://developers.google.com/drive/api/v3/reference/comments)
