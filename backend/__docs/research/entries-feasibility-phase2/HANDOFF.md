# Handoff: Career Stories Pipeline - Gap Fixes

**Date**: 2026-01-29
**Status**: Research complete, implementation pending
**Branch**: `feature/career-stories`

---

## Context

Building a career stories feature that extracts evidence from developer tools (GitHub, Jira, Confluence, Slack, Outlook, Google Workspace, Figma) and clusters related activities to generate compelling career narratives.

### What's Done

1. **Pipeline architecture created** (untracked, needs commit):
   ```
   src/services/career-stories/pipeline/
   ├── types.ts              # Shared interfaces
   ├── pattern-registry.ts   # Self-validating pattern registry
   ├── ref-extractor.ts      # Extract cross-tool refs
   ├── cluster-extractor.ts  # Cluster by shared refs
   ├── patterns/
   │   ├── jira.pattern.ts
   │   ├── github.pattern.ts
   │   ├── confluence.pattern.ts
   │   ├── figma.pattern.ts
   │   ├── slack.pattern.ts
   │   └── google.pattern.ts  # NEW: 7 Google patterns
   └── index.ts
   ```

2. **14 patterns registered**, all self-validate (0 errors)

3. **Mock data updated** with participant entries (user tagged, not initiator)

4. **Research complete** in `__docs/research/entries-feasibility-phase2/`:
   - `00-RESEARCH-BRIEF.md` - Mission
   - `01-SOURCE-MAP.md` - API sources verified
   - `02-GOLD-SEAM-MAP.md` - Priority areas
   - `03-DEEP-DIVE-ADF-MENTIONS.md` - Jira/Confluence parsing
   - `04-DEEP-DIVE-GOOGLE-WORKSPACE.md` - Calendar/Docs APIs
   - `05-EVIDENCE-MATRIX.md` - Complete tool × signal mapping
   - `06-EXTRACTION-SPEC.md` - Implementation guidance
   - `07-GAP-ANALYSIS.md` - **Identified gaps to fix**

---

## Gaps to Fix (Priority Order)

### Phase 1a: Add rawData Ref Extraction

**Problem**: We extract refs from `title`, `description`, `sourceUrl` but NOT from `rawData` fields that contain deterministic IDs.

**Fix**: In `ref-extractor.ts`, add extraction from:
```typescript
rawData.key         // Jira ticket key
rawData.pageId      // Confluence page ID
rawData.channelId   // Slack channel
rawData.documentId  // Google Doc ID
rawData.meetCode    // Google Meet code
rawData.file_key    // Figma (already done)
```

**Location**: `extractFromActivity()` method - add rawData field extraction.

### Phase 1b: Add Missing Google Mock Entries

**Current**: Only 2 Google entries (both participant)

**Add to `mock-data.service.ts`**:
- Google Calendar: User as organizer (with ticket ref in title)
- Google Calendar: User as attendee
- Google Sheets: User as owner
- Google Sheets: User tagged in comment
- Google Slides: User as owner (for presentation)

### Phase 1c: Add Missing Participation Types

**Missing from mock data**:
| Type | Tool | Add |
|------|------|-----|
| @mentioned | GitHub | PR comment mentioning user |
| Assigned | Jira | Ticket assigned TO user |
| Watching | Jira | User added as watcher |
| Watching | Confluence | User watching a page |
| Meeting invited | Google Calendar | Calendar invite |
| Thread reply | Slack | Reply to user's thread |

### Phase 2: Update Expected Clusters

Update `getExpectedClusters()` in `mock-data.service.ts` to reflect:
- Auth cluster should include SEC-100, PR#70, Figma:Auth, Meeting
- Perf cluster should include Slack thread, Google Meet
- New cluster: PLAT-500 + Confluence:555444 + Google Doc

### Phase 3: Write Tests

Create test files:
```
src/services/career-stories/pipeline/
├── pattern-registry.test.ts
├── ref-extractor.test.ts
├── cluster-extractor.test.ts
└── integration.test.ts
```

Test scenarios documented in `07-GAP-ANALYSIS.md`.

---

## Key Files to Read

1. **Gap Analysis**: `__docs/research/entries-feasibility-phase2/07-GAP-ANALYSIS.md`
2. **Evidence Matrix**: `__docs/research/entries-feasibility-phase2/05-EVIDENCE-MATRIX.md`
3. **Mock Data**: `src/services/career-stories/mock-data.service.ts`
4. **RefExtractor**: `src/services/career-stories/pipeline/ref-extractor.ts`
5. **Existing research**: `__docs/research/entries-mcp-deep-dive/` (Phase 1 deep dives)

---

## Commands to Verify Current State

```bash
# Check pipeline files exist
ls -la src/services/career-stories/pipeline/

# Verify patterns self-validate
./node_modules/.bin/tsx -e "
const { PatternRegistry } = require('./src/services/career-stories/pipeline/pattern-registry');
const registry = new PatternRegistry();
console.log('Patterns:', registry.getPatternIds().length);
console.log('Errors:', registry.getValidationErrors().length);
"

# Run existing tests (if any)
npm test
```

---

## User Preferences

- Do NOT include "Co-Authored-By: Claude Opus" in commits
- Use `./node_modules/.bin/prisma` (not npx) for Prisma commands
- Postgres runs on port 5433 via docker-compose
- Focus on B2C feasibility (user OAuth, no admin consent)
