# Gold Seam Map: Participant Detection

**Date**: 2026-01-29
**Purpose**: Identify high-value areas for deep implementation focus

---

## Must Understand (Core Concepts)

| Seam | Why Critical | Depth Needed |
|------|--------------|--------------|
| **Atlassian Document Format (ADF)** | Jira + Confluence both use it. @mentions are structured nodes, not text. Parsing once solves both. | DEEP - write shared utility |
| **GitHub Notifications API** | Single endpoint for all participation signals (mentions, reviews, assignments). Most efficient path. | MEDIUM - understand `reason` values |
| **Google Workspace OAuth** | Different scopes than expected. Need `drive.readonly` for Docs comments, `calendar.readonly` for events. | MEDIUM - verify B2C scopes |
| **Slack Events API** | Polling is not viable (rate limits). Events API gives real-time mentions. | LOW - defer to Marketplace phase |

---

## Must Avoid (Pitfalls)

| Pitfall | How Teams Hit It | Mitigation |
|---------|------------------|------------|
| **Text parsing for @mentions** | Regex on rich text misses ADF-structured mentions | Parse ADF JSON, not rendered text |
| **Polling Slack** | 1 req/min rate limit kills sync | Use Events API or skip for MVP |
| **Assuming Google Meet data** | Meet API needs Admin SDK | Use Calendar attendees as proxy |
| **Missing comment authors** | Focusing only on document author | Explicitly extract `comment.author` as participation |

---

## Must Decide

| Decision | Options | Criteria |
|----------|---------|----------|
| **ADF parsing strategy** | (A) Parse in ref-extractor (B) Separate ADF utility (C) Store raw, parse on-demand | B preferred: reusable, testable |
| **Google Workspace priority** | (A) Calendar first (B) Docs first (C) Both equally | A: Calendar has richest participation data |
| **Slack approach** | (A) Skip for MVP (B) Events API (C) Marketplace listing | A for speed, C for production |

---

## Must Experiment

| Unknown | Why Unknown | How to Test |
|---------|-------------|-------------|
| **ADF mention extraction accuracy** | ADF schema may vary by Jira version | Write unit tests with real ADF samples |
| **Google comment mention structure** | Docs say `mentionedUsers` but need to verify | Manual API call with OAuth token |
| **GitHub notification pagination** | Large history may have gaps | Test with >1000 notifications |

---

## Participant Signal Completeness Matrix

What evidence types can we capture per tool?

| Signal | GitHub | Jira | Confluence | Outlook | Slack | Google | Figma |
|--------|--------|------|------------|---------|-------|--------|-------|
| **Created by me** | ✅ author | ✅ creator | ✅ creator | ✅ from | ✅ user | ✅ owner | ✅ owner |
| **@mentioned** | ✅ notifications | ⚠️ ADF parse | ⚠️ ADF parse | ❌ | ✅ mentions[] | ✅ API field | ❌ |
| **Assigned to me** | ✅ notifications | ✅ assignee | N/A | N/A | N/A | N/A | N/A |
| **Requested reviewer** | ✅ requested_reviewers | N/A | N/A | N/A | N/A | N/A | N/A |
| **Meeting invited** | N/A | N/A | N/A | ✅ attendees | N/A | ✅ attendees | N/A |
| **Comment on my item** | ✅ compare author | ✅ compare author | ✅ compare author | N/A | ✅ thread | ✅ replies | ✅ replies |
| **Watching** | ✅ subscriptions | ✅ watchers | ✅ watchers | N/A | N/A | N/A | N/A |
| **Reacted to** | ✅ reactions | ❌ | ✅ likes | N/A | ✅ reactions | N/A | ❌ |

**Legend**: ✅ = Deterministic API field | ⚠️ = Needs parsing | ❌ = Not available

---

## Priority Order for Implementation

Based on B2C value × Implementation effort:

### Tier 1: Implement Now
1. **GitHub notifications** - Highest signal, single endpoint
2. **Jira watchers/assignee** - Direct API fields
3. **Outlook attendees** - Rich participation signal
4. **Google Calendar attendees** - Same as Outlook

### Tier 2: Implement Next
5. **Jira/Confluence ADF mentions** - Requires utility, but unlocks major signal
6. **Google Docs comments** - B2C friendly, good signal
7. **Figma comments** - Design collaboration evidence

### Tier 3: Defer
8. **Slack** - Rate limits require Marketplace
9. **Google Meet** - Admin SDK only

---

## Deep Dive Requirements

| Deep Dive | What to Document |
|-----------|------------------|
| `03-DEEP-DIVE-ADF-MENTIONS.md` | ADF schema, mention node structure, parsing code |
| `04-DEEP-DIVE-GOOGLE-WORKSPACE.md` | OAuth scopes, Calendar/Docs endpoints, participation fields |
| `05-DEEP-DIVE-NOTIFICATION-APIS.md` | GitHub notifications, Outlook Calendar, polling strategies |
