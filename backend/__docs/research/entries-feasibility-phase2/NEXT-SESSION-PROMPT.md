# Next Session Prompt

Copy this prompt to continue the work:

---

## Prompt

```
Continue work on career-stories pipeline gap fixes.

READ FIRST:
1. __docs/research/entries-feasibility-phase2/HANDOFF.md - Context and what's done
2. __docs/research/entries-feasibility-phase2/07-GAP-ANALYSIS.md - Gaps identified

EXISTING RESEARCH (reference as needed):
- __docs/research/entries-feasibility-phase2/05-EVIDENCE-MATRIX.md - Tool × signal mapping
- __docs/research/entries-feasibility-phase2/06-EXTRACTION-SPEC.md - Implementation guidance
- __docs/research/entries-mcp-deep-dive/ - Phase 1 API deep dives

TASK: Execute Phase 1 fixes in order:

1a. Add rawData ref extraction to RefExtractor
    - File: src/services/career-stories/pipeline/ref-extractor.ts
    - Method: extractFromActivity()
    - Add extraction for: rawData.key, rawData.pageId, rawData.channelId, rawData.documentId, rawData.meetCode

1b. Add missing Google Workspace mock entries
    - File: src/services/career-stories/mock-data.service.ts
    - Add: Calendar organizer, Calendar attendee, Sheets owner, Sheets participant, Slides owner

1c. Add missing participation types to mock data
    - GitHub @mentioned (PR comment)
    - Jira assigned
    - Jira/Confluence watching
    - Google Calendar invited
    - Slack thread reply

2. Update getExpectedClusters() with new expected results

3. Write tests for pipeline directory

VERIFY before starting:
- Run: ls -la src/services/career-stories/pipeline/
- Run pattern validation check from HANDOFF.md

DO NOT include "Co-Authored-By: Claude Opus" in any commits.
```

---

## Alternative: Focused Single Task

If you want to tackle one piece at a time:

```
Continue career-stories work. Read __docs/research/entries-feasibility-phase2/HANDOFF.md first.

Task: [PICK ONE]
- "Add rawData ref extraction to RefExtractor"
- "Add missing Google mock entries"
- "Add missing participation types to mock data"
- "Write pipeline tests"

Reference 07-GAP-ANALYSIS.md for details.
```
