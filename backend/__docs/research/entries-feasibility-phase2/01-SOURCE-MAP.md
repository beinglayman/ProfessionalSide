# Source Map: Participant Detection Determinism

**Date**: 2026-01-29
**Purpose**: Verify which APIs expose participant signals deterministically vs. requiring text parsing
**Builds on**: `entries-mcp-deep-dive/` research (Phase 1)

---

## Executive Summary

Based on existing deep-dives + new API verification:

| Tool | Participant Detection | Method | Deterministic? |
|------|----------------------|--------|----------------|
| **GitHub** | @mentions, review requests, assignments | `GET /notifications` with `reason` field | ✅ YES |
| **Jira** | Watchers, assignments | API fields | ✅ YES |
| **Jira** | @mentions in comments | Text parsing required | ⚠️ PARTIAL |
| **Confluence** | Watchers | API field | ✅ YES |
| **Confluence** | @mentions in pages | Text parsing required | ⚠️ PARTIAL |
| **Outlook** | Meeting attendee vs organizer | `attendees[]` array | ✅ YES |
| **Slack** | @mentions | `mentions` array in message | ✅ YES |
| **Slack** | Thread participants | `reply_users` field | ✅ YES |
| **Google Docs** | Comment @mentions | `mentionedEmailAddresses` field | ✅ YES |
| **Google Calendar** | Attendee vs organizer | `attendees[]` array | ✅ YES |
| **Google Meet** | Participants | Requires Admin SDK | ❌ B2C NOT VIABLE |
| **Figma** | Comment participants | Comment authors list | ✅ YES |

---

## Tier 1: Primary Sources (Official API Docs)

| Source | Type | Updated | Key Value |
|--------|------|---------|-----------|
| [GitHub REST API - Notifications](https://docs.github.com/en/rest/activity/notifications) | Official | Current | `reason` field: mention, review_requested, assign |
| [GitHub REST API - Reviews](https://docs.github.com/en/rest/pulls/reviews) | Official | Current | `requested_reviewers` array |
| [Jira REST API v3 - Issue](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/) | Official | Current | `watchers`, `assignee`, `reporter` fields |
| [Jira REST API v3 - Watchers](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-watchers/) | Official | Current | GET/POST watchers list |
| [Confluence REST API - Content Watches](https://developer.atlassian.com/cloud/confluence/rest/v1/api-group-content-watches/) | Official | Current | Watcher list per page |
| [Microsoft Graph - Event](https://learn.microsoft.com/en-us/graph/api/resources/event) | Official | Current | `attendees[]` with `type` (required/optional/organizer) |
| [Slack API - Conversations](https://api.slack.com/methods/conversations.history) | Official | Current | `mentions` array in messages |
| [Google Drive API - Comments](https://developers.google.com/drive/api/guides/manage-comments) | Official | Current | `mentionedEmailAddresses` in comment replies |
| [Google Calendar API - Event](https://developers.google.com/calendar/api/v3/reference/events) | Official | Current | `attendees[]` array with `organizer` flag |
| [Figma API - Comments](https://www.figma.com/developers/api#comments) | Official | Current | `user` field per comment |

---

## Tier 2: Practitioner Insights

| Source | Context | Key Insight |
|--------|---------|-------------|
| Existing deep-dive: `github.md` | Project research | Notifications API `reason` field is deterministic |
| Existing deep-dive: `jira.md` | Project research | JQL `issueFunction in commented()` works but @mentions need parsing |
| Existing deep-dive: `slack.md` | Project research | Rate limits severe for non-Marketplace apps |
| Stack Overflow: Jira mentions | Community | Atlassian Document Format (ADF) stores mentions as structured JSON |

---

## Tier 3: Critical/Gaps

| Gap | Impact | Workaround |
|-----|--------|------------|
| **Jira @mentions** | Need to parse ADF JSON, not plain text | ADF has `mention` nodes with `id` field |
| **Confluence @mentions** | Same as Jira - ADF format | Parse ADF `mention` nodes |
| **Google Meet participants** | Admin SDK only, not B2C | Skip or use Calendar attendees as proxy |
| **Slack rate limits** | 1 req/min without Marketplace | Events API or Marketplace listing required |

---

## Key Finding: Atlassian Document Format (ADF)

Jira and Confluence store rich content in ADF JSON, NOT plain text. Mentions are structured:

```json
{
  "type": "mention",
  "attrs": {
    "id": "5b10ac8d82e05b22cc7d4ef5",
    "text": "@John Smith",
    "accessLevel": "CONTAINER"
  }
}
```

**Implication**: We can extract mentions deterministically by parsing ADF nodes, NOT regex on text.

---

## Key Finding: Google Workspace

### Google Docs Comments
The Drive API comment resource includes:
```json
{
  "author": { "displayName": "...", "emailAddress": "..." },
  "content": "...",
  "mentionedUsers": [
    { "displayName": "...", "emailAddress": "..." }
  ]
}
```

✅ **Deterministic** - no text parsing needed.

### Google Calendar Events
```json
{
  "organizer": { "email": "...", "self": true/false },
  "attendees": [
    { "email": "...", "responseStatus": "accepted", "organizer": false }
  ]
}
```

✅ **Deterministic** - `organizer` vs `attendee` clearly distinguished.

### Google Meet
- Requires Workspace Admin SDK for participant reports
- **NOT B2C FEASIBLE** - use Calendar attendees as proxy

---

## Decision: What Needs Text Parsing?

| Tool | Signal | Method |
|------|--------|--------|
| GitHub | - | All deterministic via API |
| Jira | @mentions in description | Parse ADF JSON nodes |
| Jira | @mentions in comments | Parse ADF JSON nodes |
| Confluence | @mentions in pages | Parse ADF JSON nodes |
| Outlook | - | All deterministic via API |
| Slack | - | All deterministic via API |
| Google | - | All deterministic via API |
| Figma | - | All deterministic via API |

**Only Atlassian tools require special handling (ADF parsing).**

---

## Next: Gold Seam Map

Focus areas for deep implementation:
1. **ADF mention extraction** - Jira/Confluence shared utility
2. **Notification-based participation** - GitHub, Outlook
3. **Google Workspace integration** - New addition to pipeline
