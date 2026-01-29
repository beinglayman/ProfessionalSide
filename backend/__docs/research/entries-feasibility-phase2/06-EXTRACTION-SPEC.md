# Extraction Specification: Participant Detection

**Date**: 2026-01-29
**Purpose**: Implementation guidance for extracting participant signals

---

## Summary of Findings

### What's Deterministic (API Fields)

| Tool | Participant Signal | API Field | Reliability |
|------|-------------------|-----------|-------------|
| GitHub | @mentioned | `GET /notifications` → `reason: 'mention'` | 100% |
| GitHub | Review requested | `GET /notifications` → `reason: 'review_requested'` | 100% |
| GitHub | Assigned | `GET /notifications` → `reason: 'assign'` | 100% |
| Jira | Assigned | `fields.assignee.accountId` | 100% |
| Jira | Watching | `GET /issue/{key}/watchers` | 100% |
| Confluence | Watching | `GET /content/{id}/notification` | 100% |
| Outlook | Meeting attendee | `attendees[].self = true` | 100% |
| Google Calendar | Meeting attendee | `attendees[].self = true` | 100% |
| Google Docs | Comment @mention | `comments[].mentionedUsers[]` | 100% |
| Slack | @mentioned | `messages[].mentions[]` | 100% |
| Figma | Comment author | `comments[].user` | 100% |

### What Requires Parsing (ADF)

| Tool | Signal | Parsing Method |
|------|--------|----------------|
| Jira | @mentions in description/comments | Parse ADF `mention` nodes |
| Confluence | @mentions in page body | Parse ADF `mention` nodes |

### What's Not Available

| Tool | Signal | Reason | Workaround |
|------|--------|--------|------------|
| Google Meet | Actual participants | Admin SDK only | Use Calendar attendees as proxy |
| Outlook | @mentions in email body | No API field | Skip (low value anyway) |
| Figma | @mentions in comments | No API field | Text parsing (low priority) |

---

## Implementation Tasks

### Phase 1: Existing Pipeline Enhancement

**Task 1.1: Update Mock Data ✅ DONE**
- Added participant entries to `mock-data.service.ts`
- Includes: Jira watchers/mentions, GitHub review requests, Meeting invites, Slack mentions

**Task 1.2: Google Patterns ✅ DONE**
- Added 7 Google Workspace patterns to pipeline
- All patterns self-validate with examples

**Task 1.3: Write Pipeline Tests**
- Test ref extraction with participant mock data
- Test clustering with cross-tool participant refs

### Phase 2: ADF Parser

**Task 2.1: Create ADF Parser Utility**

```typescript
// src/services/career-stories/pipeline/adf-parser.ts
export function extractMentionsFromADF(adf: unknown): ADFMention[];
export function extractLinksFromADF(adf: unknown): ADFLink[];
```

**Task 2.2: Integrate with RefExtractor**

Option A: Add as pattern (parse ADF as text)
- Pros: Fits existing pattern model
- Cons: ADF structure lost

Option B: Pre-process ADF before RefExtractor (RECOMMENDED)
- Extract mentions from ADF
- Convert to refs like `jira-mention:{accountId}`
- Then run normal ref extraction on text

```typescript
function preprocessJiraActivity(activity: ActivityInput): ActivityInput {
  const description = activity.rawData?.description;
  if (isADF(description)) {
    const mentions = extractMentionsFromADF(description);
    const mentionRefs = mentions.map(m => `jira-mention:${m.userId}`);
    // Append to description for ref extraction
    activity.description += '\n' + mentionRefs.join(' ');
  }
  return activity;
}
```

### Phase 3: Activity Sync (Future)

**Task 3.1: Add Notification-Based Sync**

For GitHub:
```
GET /notifications?all=true&participating=true
```

Returns all @mentions, review requests, assignments.

For Outlook/Google:
```
GET /me/events?$filter=organizer/self eq false
```

Returns events where user is attendee, not organizer.

---

## Participation Types for Career Stories

Map API signals to career evidence types:

| API Signal | Entry Type | Career Value |
|------------|------------|--------------|
| GitHub `review_requested` | `participation.review_requested` | Trust signal - asked for technical judgment |
| GitHub `mention` | `participation.mentioned` | Expertise signal - called out for input |
| Jira `assignee` | `participation.assigned` | Ownership signal - given responsibility |
| Jira ADF mention | `participation.mentioned` | Collaboration signal - consulted |
| Calendar attendee | `participation.meeting_invited` | Inclusion signal - in the room |
| Google Docs mention | `participation.doc_tagged` | Expertise signal - asked for review |
| Slack mention | `participation.discussed` | Active collaboration |

---

## Mock Data Validation

The updated mock data in `mock-data.service.ts` should produce these participation entries:

| Activity | Participation Type | Evidence |
|----------|-------------------|----------|
| PLAT-500 | `mentioned` | @honey.arora in description |
| SEC-100 | `mentioned` | @honey.arora in comments |
| Confluence 555444 | `mentioned` | @honey.arora in page |
| Meeting AUTH-123 Review | `meeting_invited` | attendee, not organizer |
| Slack thread | `mentioned` | mentions[] array |
| Google Meet PR Review | `meeting_invited` | Calendar attendee |
| Google Doc Migration Plan | `doc_tagged` | comments mention |
| GitHub PR #70 | `review_requested` | requestedReviewers[] |
| Figma Auth Flow | `doc_tagged` | commenters[] |

---

## Testing Strategy

### Unit Tests

1. **Pattern Registry Tests**
   - All 14 patterns register without validation errors
   - Example inputs produce expected refs
   - Negative examples don't match

2. **RefExtractor Tests**
   - Extracts refs from Jira description with PR links
   - Extracts refs from GitHub PR with ticket refs
   - Handles null/undefined gracefully

3. **ClusterExtractor Tests**
   - Groups activities by shared refs
   - Participant entries cluster with initiator entries
   - Returns unclustered list for singletons

### Integration Tests

1. **Full Pipeline Test**
   ```typescript
   // Input: mock activities with participant entries
   // Process: ref extraction → clustering
   // Assert: participant entries cluster with related work
   ```

2. **Cross-Tool Clustering Test**
   - GitHub PR (AUTH-123 in description)
   - Jira ticket (AUTH-123)
   - Jira ticket (mentions @user, links AUTH-123)
   - Meeting (AUTH-123 in title)
   - All should cluster together

---

## Conclusion

**Key Insight**: Most participant signals ARE deterministic via API fields. Only Jira/Confluence @mentions require special handling (ADF parsing).

**Recommendation**:
1. Proceed with pipeline tests using existing patterns
2. Add ADF parser in Phase 2 for Jira/Confluence mentions
3. Google patterns are ready to use

**No additional research needed** - the APIs are well-documented and the detection methods are clear. The existing deep-dives + this Phase 2 research provide sufficient guidance for implementation.
