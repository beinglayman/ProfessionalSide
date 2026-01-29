# Evidence Matrix: Interaction Types × Tools × Detection Method

**Date**: 2026-01-29
**Purpose**: Final mapping of all career evidence signals across tools with detection method

---

## How to Read This Matrix

- ✅ **API** = Direct API field, deterministic
- ⚠️ **Parse** = Requires parsing (ADF, text)
- 🔗 **Ref** = Cross-tool reference extraction
- ❌ = Not available

---

## Evidence Matrix

| Evidence Type | GitHub | Jira | Confluence | Outlook | Slack | Google | Figma |
|---------------|--------|------|------------|---------|-------|--------|-------|
| **CREATED** | | | | | | | |
| Created/authored | ✅ `author` | ✅ `creator` | ✅ `creator` | ✅ `from` | ✅ `user` | ✅ `owner` | ✅ `owner` |
| **CONTRIBUTED** | | | | | | | |
| Commits | ✅ commits API | N/A | N/A | N/A | N/A | N/A | N/A |
| Edits/updates | ✅ commits | ✅ changelog | ✅ versions | N/A | ❌ | ✅ revisions | ✅ versions |
| **REVIEWED** | | | | | | | |
| Code review given | ✅ reviews API | N/A | N/A | N/A | N/A | N/A | N/A |
| Doc review/comments | ✅ comments | ✅ comments | ✅ comments | N/A | N/A | ✅ comments | ✅ comments |
| **APPROVED** | | | | | | | |
| PR approved | ✅ `APPROVED` state | N/A | N/A | N/A | N/A | N/A | N/A |
| **MENTIONED** | | | | | | | |
| @mentioned | ✅ notifications | ⚠️ ADF parse | ⚠️ ADF parse | ❌ | ✅ `mentions[]` | ✅ `mentionedUsers` | ❌ |
| **ASSIGNED** | | | | | | | |
| Assigned to | ✅ notifications | ✅ `assignee` | N/A | N/A | N/A | N/A | N/A |
| Review requested | ✅ `requested_reviewers` | N/A | N/A | N/A | N/A | N/A | N/A |
| **INVITED** | | | | | | | |
| Meeting attendee | N/A | N/A | N/A | ✅ `attendees[]` | N/A | ✅ `attendees[]` | N/A |
| **WATCHED** | | | | | | | |
| Watching/subscribed | ✅ subscriptions | ✅ `watchers` | ✅ watchers API | N/A | N/A | N/A | N/A |
| **REACTED** | | | | | | | |
| Emoji/reaction | ✅ reactions API | ❌ | ✅ likes API | N/A | ✅ `reactions[]` | N/A | ❌ |
| **CROSS-TOOL** | | | | | | | |
| Jira ticket refs | 🔗 regex | ✅ self-key | 🔗 regex | 🔗 regex | 🔗 regex | 🔗 regex | 🔗 regex |
| GitHub PR refs | ✅ self-ref | 🔗 regex | 🔗 regex | 🔗 regex | 🔗 regex | 🔗 regex | 🔗 regex |
| Confluence refs | 🔗 regex | 🔗 regex | ✅ self-id | 🔗 regex | 🔗 regex | 🔗 regex | 🔗 regex |

---

## Detection Method by Tool

### GitHub
| Signal | API Endpoint | Field |
|--------|--------------|-------|
| Created PR | `/repos/{owner}/{repo}/pulls` | `user.login` |
| PR review received | `/repos/{owner}/{repo}/pulls/{n}/reviews` | `user.login`, `state` |
| @mentioned | `/notifications` | `reason: 'mention'` |
| Review requested | `/notifications` | `reason: 'review_requested'` |
| Assigned | `/notifications` | `reason: 'assign'` |
| Comments on my PR | `/repos/{owner}/{repo}/pulls/{n}/comments` | compare `user` |

### Jira
| Signal | API Endpoint | Field |
|--------|--------------|-------|
| Created ticket | JQL `creator = currentUser()` | `fields.creator` |
| Assigned to me | JQL `assignee = currentUser()` | `fields.assignee` |
| Watching | `/issue/{key}/watchers` | watchers list |
| @mentioned | `/issue/{key}` | ⚠️ Parse ADF `mention` nodes |
| Comment on my ticket | `/issue/{key}/comment` | compare `author.accountId` |

### Confluence
| Signal | API Endpoint | Field |
|--------|--------------|-------|
| Created page | `/wiki/api/v2/pages` | `ownerId` |
| Page watcher | `/wiki/rest/api/content/{id}/notification` | watchers list |
| @mentioned | `/wiki/api/v2/pages/{id}?body-format=atlas_doc_format` | ⚠️ Parse ADF |
| Comment on my page | `/wiki/api/v2/pages/{id}/footer-comments` | compare `authorId` |

### Outlook (Microsoft Graph)
| Signal | API Endpoint | Field |
|--------|--------------|-------|
| Organized meeting | `/me/events` | `organizer.self = true` |
| Invited to meeting | `/me/events` | `attendees[]` where `self = true` |
| Meeting response | `/me/events` | `responseStatus` |

### Slack
| Signal | API Endpoint | Field |
|--------|--------------|-------|
| Sent message | `conversations.history` | `user` field |
| @mentioned | `conversations.history` | `mentions[]` array |
| Thread reply received | `conversations.history` | `reply_users[]` |
| Reaction received | `reactions.get` | `reactions[].users[]` |

### Google Workspace
| Signal | API Endpoint | Field |
|--------|--------------|-------|
| Organized meeting | `/calendar/v3/calendars/primary/events` | `organizer.self = true` |
| Invited to meeting | `/calendar/v3/calendars/primary/events` | `attendees[].self = true` |
| Comment author | `/drive/v3/files/{id}/comments` | `author.me = true` |
| @mentioned in comment | `/drive/v3/files/{id}/comments` | `mentionedUsers[]` |

### Figma
| Signal | API Endpoint | Field |
|--------|--------------|-------|
| Created file | `/v1/me` + `/v1/files/{key}` | file ownership |
| Comment author | `/v1/files/{key}/comments` | `user` field |
| Comment received | `/v1/files/{key}/comments` | compare file owner vs comment author |

---

## Implementation Priority

Based on B2C feasibility × Career evidence value:

| Priority | Tool | Signals | Effort |
|----------|------|---------|--------|
| **P0** | GitHub | All | LOW (existing patterns work) |
| **P0** | Jira | Created, assigned, watching | LOW |
| **P1** | Outlook | Meeting attendee | LOW (Graph API direct) |
| **P1** | Google Calendar | Meeting attendee | LOW (Calendar API direct) |
| **P1** | Jira/Confluence | @mentions | MEDIUM (ADF parsing) |
| **P2** | Google Docs | Comment mentions | LOW |
| **P2** | Figma | Comments | LOW |
| **P3** | Slack | @mentions | HIGH (rate limits, needs Marketplace) |

---

## Ref Extraction Pattern Status

| Pattern | Status | Notes |
|---------|--------|-------|
| `jira-ticket-v2` | ✅ Active | `[A-Z]{2,10}-\d+` |
| `github-ref-v1` | ✅ Active | `org/repo#42` |
| `github-url-v1` | ✅ Active | `github.com/.../pull/42` |
| `confluence-page-v1` | ✅ Active | `/pages/{id}` |
| `figma-url-v1` | ✅ Active | `figma.com/file/{key}` |
| `figma-rawdata-v1` | ✅ Active | `file_key` in JSON |
| `slack-channel-url-v1` | ✅ Active | `slack.com/archives/{id}` |
| `google-docs-v1` | ✅ Active | `docs.google.com/document/d/{id}` |
| `google-sheets-v1` | ✅ Active | `docs.google.com/spreadsheets/d/{id}` |
| `google-slides-v1` | ✅ Active | `docs.google.com/presentation/d/{id}` |
| `google-drive-file-v1` | ✅ Active | `drive.google.com/file/d/{id}` |
| `google-drive-folder-v1` | ✅ Active | `drive.google.com/drive/folders/{id}` |
| `google-meet-v1` | ✅ Active | `meet.google.com/{code}` |
| `google-calendar-v1` | ✅ Active | Calendar event IDs |

---

## Next Steps

1. ✅ Google patterns added to pipeline
2. [ ] Add ADF parser utility for Jira/Confluence mentions
3. [ ] Write tests for pipeline with participant mock data
4. [ ] Add activity sync for Calendar/Drive (new MCP integration)
