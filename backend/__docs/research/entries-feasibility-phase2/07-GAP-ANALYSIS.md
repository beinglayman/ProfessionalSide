# Gap Analysis: Mock Data, Ref Extraction, and Test Coverage

**Date**: 2026-01-29
**Purpose**: Identify gaps before building tests

---

## 1. Mock Data Gaps

### Current State
- 23 activities total
- 12 initiator entries (user created)
- 11 participant entries (user tagged/invited)

### Missing Scenarios

#### A. Google Workspace Entries (CRITICAL GAP)

**Current**: Only 2 Google entries
- 1 Meet (participant)
- 1 Docs (participant)

**Missing**:
| Type | Role | Description |
|------|------|-------------|
| Google Calendar | Organizer | User organized a meeting |
| Google Calendar | Attendee | User invited to meeting (with refs) |
| Google Sheets | Owner | User created spreadsheet |
| Google Sheets | Participant | User tagged in sheet comment |
| Google Slides | Owner | User created presentation |
| Google Drive | Owner | User shared file |
| Google Drive | Participant | User received shared file |

#### B. Realistic Cross-Tool Scenarios

**Missing realistic chains**:

1. **Design Review Chain** (not covered):
   - Figma file created
   - Google Doc design spec referencing Figma
   - Jira ticket referencing both
   - GitHub PR implementing
   - Slack thread discussing

2. **Incident Response Chain** (not covered):
   - Slack alert message
   - Jira incident ticket
   - Google Meet incident call
   - GitHub hotfix PR
   - Confluence post-mortem

3. **Onboarding/Knowledge Transfer** (not covered):
   - Confluence onboarding doc
   - Multiple Jira tickets tagged for new hire
   - Google Meet 1:1s
   - Slack channel mentions

#### C. Participation Type Completeness

| Participation Type | GitHub | Jira | Confluence | Outlook | Slack | Google | Figma |
|--------------------|--------|------|------------|---------|-------|--------|-------|
| @mentioned | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Assigned | ❌ | ❌ | N/A | N/A | N/A | N/A | N/A |
| Review requested | ✅ | N/A | N/A | N/A | N/A | N/A | N/A |
| Meeting invited | N/A | N/A | N/A | ✅ | N/A | ❌ | N/A |
| Watching | ❌ | ❌ | ❌ | N/A | N/A | N/A | N/A |
| Thread reply | N/A | N/A | N/A | N/A | ❌ | N/A | N/A |

**Legend**: ✅ = Has mock data | ❌ = Missing | N/A = Not applicable

---

## 2. Ref Extraction Gaps

### Current Patterns (14 total)

| Pattern | Status | Gap |
|---------|--------|-----|
| `jira-ticket-v2` | ✅ Works | - |
| `github-ref-v1` | ✅ Works | - |
| `github-url-v1` | ✅ Works | - |
| `confluence-page-v1` | ⚠️ Partial | Only matches `/pages/{id}`, misses `/wiki/display/` |
| `figma-url-v1` | ✅ Works | - |
| `figma-rawdata-v1` | ✅ Works | - |
| `slack-channel-url-v1` | ✅ Works | - |
| `google-docs-v1` | ✅ Works | - |
| `google-sheets-v1` | ✅ Works | - |
| `google-slides-v1` | ✅ Works | - |
| `google-drive-file-v1` | ✅ Works | - |
| `google-drive-folder-v1` | ✅ Works | - |
| `google-meet-v1` | ✅ Works | - |
| `google-calendar-v1` | ⚠️ Limited | Only URL-based, misses rawData event IDs |

### Missing Patterns

| Pattern | Why Needed | Priority |
|---------|------------|----------|
| **`confluence-page-v2`** | Handle display/wiki style URLs | HIGH |
| **`slack-thread-v1`** | Thread timestamp refs `p1234567890` | MEDIUM |
| **`github-commit-v1`** | Commit SHA refs in descriptions | MEDIUM |
| **`outlook-meeting-v1`** | Meeting IDs from rawData | LOW |

### Extraction Logic Gaps

1. **sourceUrl extraction**: ✅ Done (includeSourceUrl option)

2. **rawData extraction for structured refs**:
   - Figma `file_key`: ✅ Done
   - Jira `key` in rawData: ❌ Not using rawData.key
   - Confluence `pageId` in rawData: ❌ Not using rawData.pageId
   - Slack `channelId` in rawData: ❌ Not using rawData.channelId
   - Google `documentId/meetCode` in rawData: ❌ Not using

3. **ADF mention extraction**: ❌ Not implemented
   - Need `adf-parser.ts` utility
   - Integrate with RefExtractor preprocessing

---

## 3. Clustering Gaps

### Current Behavior
- Groups by shared refs (DFS connected components)
- Returns unclustered activities

### Missing Features

1. **Participation metadata not preserved**:
   - Cluster knows which activities are in it
   - But doesn't know which are "my work" vs "tagged in"

2. **Temporal proximity not considered**:
   - Activities 2 years apart with same ref cluster together
   - May want to split into "phases" of work

3. **Confidence scoring not implemented**:
   - Cluster based on single low-confidence ref same as high-confidence
   - Should weight by pattern confidence

---

## 4. Test Coverage Gaps

### Current State
- 0 tests for pipeline directory
- Tests existed before compaction but were in different location

### Required Test Files

| File | Tests Needed | Priority |
|------|--------------|----------|
| `pipeline/pattern-registry.test.ts` | Self-validation, supersedes logic | HIGH |
| `pipeline/ref-extractor.test.ts` | All patterns, edge cases, debug mode | HIGH |
| `pipeline/cluster-extractor.test.ts` | Clustering logic, metrics | HIGH |
| `pipeline/patterns/*.test.ts` | Individual pattern validation | MEDIUM |
| `pipeline/integration.test.ts` | Full pipeline with mock data | HIGH |

### Test Scenarios Needed

#### Pattern Tests
- [ ] Each pattern matches its examples
- [ ] Each pattern rejects negative examples
- [ ] Patterns handle null/undefined input
- [ ] Patterns handle empty string
- [ ] Multiple matches in single text
- [ ] Unicode content handling

#### RefExtractor Tests
- [ ] Extract from single text
- [ ] Extract from multiple texts
- [ ] Extract from activity with all fields
- [ ] Include/exclude sourceUrl
- [ ] Filter by pattern IDs
- [ ] Filter by tool types
- [ ] Filter by confidence
- [ ] Debug mode produces diagnostics
- [ ] Empty input handling
- [ ] rawData JSON stringification

#### ClusterExtractor Tests
- [ ] Basic clustering (2+ activities with shared ref)
- [ ] Transitive clustering (A-B, B-C → A,B,C cluster)
- [ ] No clustering (all unique refs)
- [ ] Mixed (some cluster, some don't)
- [ ] Date range filtering
- [ ] Min cluster size filtering
- [ ] Metrics accuracy
- [ ] Null refs handling

#### Integration Tests
- [ ] Full mock data produces expected clusters
- [ ] Participant entries cluster with initiator entries
- [ ] Google entries cluster via refs
- [ ] Cross-tool refs link correctly
- [ ] Standalone activities remain unclustered

---

## 5. Recommended Fix Order

### Phase 1: Fix Critical Gaps (Before Tests)

1. **Add missing Google mock entries**
   - Calendar organizer entry
   - Calendar attendee entry
   - Sheets owner/participant
   - Slides owner

2. **Add rawData ref extraction**
   - Extract `rawData.key` for Jira
   - Extract `rawData.pageId` for Confluence
   - Extract `rawData.channelId` for Slack
   - Extract `rawData.documentId` for Google Docs

3. **Fix Confluence pattern**
   - Add support for `/wiki/display/` URLs

### Phase 2: Build Tests

4. **Create test files with realistic scenarios**

### Phase 3: Enhanced Features

5. **Add ADF parser** (for Jira/Confluence mentions)
6. **Add participation metadata to clusters**
7. **Add temporal proximity consideration**

---

## 6. Updated Expected Clusters

With gaps fixed, mock data should produce:

| Cluster | Activities | Key Refs |
|---------|------------|----------|
| **Auth System** | AUTH-123, AUTH-124, PR#42, Confluence:987654, SEC-100, PR#70, Figma:Auth, Meeting:AUTH-123 | AUTH-123, AUTH-124, acme/backend#42, confluence:987654 |
| **Performance** | PERF-456, PERF-457, PR#55, PR#22, Meeting:Sprint, Slack:thread, Meet:PR-Review | PERF-456, PERF-457, acme/backend#55, acme/frontend#22 |
| **Platform/Rate Limiting** | PLAT-500, Confluence:555444, GDoc:Migration | PLAT-500, confluence:555444 |
| **Unclustered** | DOC-789, PR#60, Figma:Mobile | (no shared refs) |

---

## Next Steps

1. [ ] Update mock data with missing Google entries
2. [ ] Add rawData ref extraction to RefExtractor
3. [ ] Fix Confluence pattern for /wiki/display/
4. [ ] Update `getExpectedClusters()` with new expected results
5. [ ] Create test files
