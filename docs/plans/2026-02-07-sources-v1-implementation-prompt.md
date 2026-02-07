# Sources v1: Implementation Prompt

> Use this prompt with `/superpowers:writing-plans` in a fresh session to generate a step-by-step implementation plan.

---

## Prompt

```
Implement the Sources v1 feature for inChronicle career stories. The full design doc is at docs/plans/2026-02-07-sources-design.md — read it thoroughly before planning. The domain model is at docs/domain/career-story-domain-model.md.

## What We're Building (v1 scope only)

Extract evidence from CareerStory.sections JSON into a new StorySource table. Display sources inline below each narrative section. Show gap warnings for unsourced sections. Two user actions: add a note, exclude a source (with 5-second undo).

## 23 Decisions Already Made (DO NOT revisit)

1. Feature name: "Sources" — not "citations"
2. Core change: StorySource table replaces evidence[] in sections JSON (RH simplification)
3. One table for all three source types (activity, user_note, wizard_answer) with sourceType discriminator
4. Sources survive regeneration — separate table, text rewrites don't destroy sources
5. onDelete: SetNull on activityId FK — source row survives activity deletion with label/url intact
6. v1 = read-only display + add note + exclude with undo (~4.25 days)
7. v2 = curation + manual story authoring + Practice Mode + published view (DEFERRED)
8. Schema is full from day 1 — annotation, sortOrder, questionId, excludedAt all in schema but dormant in v1 UI
9. No Practice Mode separation in v1 — typography decoration stays active alongside sources
10. Exclude uses 5-second "Undo" link, not a full excluded-toggle view
11. Wizard answers (wizard_answer type) stored in DB but not rendered in v1 UI
12. Published stories don't show sources to viewers in v1
13. excludedAt DateTime? (not excluded Boolean) — null = included, non-null = timestamp of exclusion
14. annotation field populated during backfill from evidence[].description, not rendered/editable in v1
15. sortOrder auto-set to LLM evidence order, not user-changeable in v1
16. verification Json? column: leave dormant, add code comment only
17. Backfill edge cases: null activityId for missing activities, UPSERT for dedup, both demo+production
18. defaultEvidence shotgun fix: sectionKey = "unassigned" instead of duplicating across all sections
19. Section key migration on framework switch: equivalence map + "unassigned" fallback for unmapped
20. Concurrent edit safety: regeneration MUST NOT delete user_note or wizard_answer sources
21. Coverage header: "3 of 4 sections have sources" replaces "30 activities" on StoryCard + detail view
22. Vague metric detection: simple regex, no LLM — "significantly improved" flagged with suggestion
23. createFromJournalEntry() bug: must set journalEntryId (currently missing)

## v1 Build Order (from design doc)

Step 0: Prerequisite bug fixes (0.5d)
- Fix journalEntryId not set in createFromJournalEntry()
- Fix regenerate() to use journalEntryId FK, fall back to activity overlap
- Fix defaultEvidence shotgun → sectionKey = "unassigned"

Step 1: Schema + migration (0.5d)
- Create story_sources table with ALL columns (full schema, including dormant fields)
- Add lastGenerationPrompt String? and wizardAnswers Json? to CareerStory
- Add reverse relation storySources on ToolActivity
- Backfill from existing sections.evidence with edge case handling

Step 2: Backend source read + two writes (0.5d)
- New StorySourceService: read, create (user_note only), exclude/restore via excludedAt
- Include sources in story GET response
- Source coverage computation (total, sourced, gaps, vagueMetrics)
- Controller: POST for user_note, PATCH for excludedAt only

Step 3: Backend generation wiring (1d)
- On story creation from journal: populate StorySource rows from LLM evidence mapping
- On story creation via wizard: populate activity + wizard_answer rows, store wizardAnswers JSON
- On regeneration: overwrite sections text only, re-map sectionKeys on activity sources, preserve user sources
- Section key migration on framework switch (STAR→SOAR etc.)
- Store lastGenerationPrompt on regeneration

Step 4: Frontend display + two actions (1d)
- New SourceList.tsx (~80 lines): display source rows, exclude with 5s undo, add note button
- New SourceGapWarning.tsx (~40 lines): "No sources" + vague metric suggestions + add note CTA
- New SourceCoverageHeader.tsx (~30 lines): "3 of 4 sections have sources"
- Modify NarrativePreview.tsx: remove old evidence toggle, add SourceList after each section
- Modify StoryCard.tsx: "3/4 sourced" replaces "30 activities"
- Two React Query mutations: useAddStorySource, useUpdateStorySource
- StorySource and SourceCoverage types in career-stories.ts

Step 5: Vague metric detection (0.25d)
- Regex patterns for "significantly improved" etc.
- Show suggestions in SourceGapWarning

Step 6: Tests (0.5d)
- Update broken unified-flow.integration.test.ts (evidence assertions)
- New tests per test plan in design doc appendix

## Key Files to Read First

- backend/prisma/schema.prisma (CareerStory lines 1422-1482, ToolActivity 1367-1399)
- backend/src/services/career-stories/career-story.service.ts (full — createFromJournalEntry, regenerate, generateSectionsWithLLM)
- backend/src/services/story-wizard.service.ts (answersToContext, generateStory)
- backend/src/controllers/career-stories.controller.ts (existing endpoints)
- src/components/career-stories/NarrativePreview.tsx (evidence rendering lines 987-1035, 1565-1571)
- src/types/career-stories.ts (CareerStorySection, WizardAnswer types)
- src/hooks/useCareerStories.ts (existing React Query hooks)
- src/services/career-stories.service.ts (existing API client)

## Constraints

- Prisma ORM for all DB operations
- React Query for data fetching/mutations with invalidation
- neverthrow Result types on backend services
- Handlebars templates for LLM prompts
- Demo/production mode isolation (sourceMode column)
- Existing NarrativePreview.tsx is 1620 lines — new components MUST be separate files
- No LLM changes — source population is post-generation, not part of prompt engineering
```

---

## How to Use

1. Start a fresh Claude Code session
2. Run `/superpowers:writing-plans`
3. Paste the prompt above (or point to this file)
4. The skill will read the design doc and codebase, then produce a detailed step-by-step implementation plan
5. Review and approve, then execute with `/superpowers:executing-plans`
