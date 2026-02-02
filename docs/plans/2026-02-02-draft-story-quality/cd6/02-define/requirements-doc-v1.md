# Requirements Document: Draft Story Generation Quality Enhancement v1

**Stage:** Define (D₁)
**Date:** 2026-02-02
**Status:** Draft

---

## Project Context

The Stories tab shows draft journal entries created from raw activities via two grouping methods:
1. **Temporal** - Bi-weekly time windows
2. **Cluster** - Activities sharing cross-tool references (Jira tickets, PRs)

Current draft story generation has quality issues:
- Category always hardcoded to "achievement"
- Description is generic ("7 activities across 3 github, 2 jira")
- LLM prompt is basic with no examples or structured output
- Rich activity metadata (rawData) not passed to LLM
- No topic extraction, skill identification, or phase detection

---

## 1. Scope Statement

### In Scope
- Enhanced LLM prompt with examples and structured JSON schema
- Templated prompts in external files (not embedded in code)
- Include rawData context in activity formatting
- Dynamic category detection from LLM
- Topic and skill extraction from LLM
- Activity phases grouping from LLM
- Participation role detection (Led/Contributed/Participated)
- Store enhanced metadata in JournalEntry
- Update API to return enhanced StoryMetadata
- Update StoryGroupHeader to display new fields

### Out of Scope
- STAR narrative framework (future - for career story promotion)
- Interactive narrative editing/brainstorming
- AI-powered category suggestions without regeneration
- Network sanitization for publishing
- Version history for regenerated narratives

---

## 2. User Stories

### US-1: Templated Prompt Files

```
AS A developer
I WANT prompts stored in external template files
SO THAT they can be edited without code changes and version controlled separately

ACCEPTANCE CRITERIA:
- GIVEN the prompts directory
  WHEN I look for templates
  THEN I find .prompt.md files for system and user prompts
- GIVEN a template file
  WHEN it uses variables (title, activities)
  THEN Handlebars syntax is used for interpolation
- GIVEN the prompt loader
  WHEN templates are loaded
  THEN they are compiled once at startup and cached

EDGE CASES:
- If template file missing, throw clear error at startup (fail fast)
- If template has syntax error, log full error with file path

OUT OF SCOPE:
- Hot-reloading templates without restart
- Template validation at build time
```

### US-2: Enhanced Activity Data for Prompt

```
AS A developer
I WANT activity rawData included in LLM prompt
SO THAT the LLM can generate contextually rich narratives

ACCEPTANCE CRITERIA:
- GIVEN activities are fetched for narrative generation
  WHEN the query runs
  THEN rawData, crossToolRefs, and sourceUrl are included
- GIVEN a GitHub activity
  WHEN formatting for prompt
  THEN I see: state, additions/deletions, reviews count
- GIVEN a Jira activity
  WHEN formatting for prompt
  THEN I see: status, priority, story points
- GIVEN a meeting activity (Outlook/Teams/Google)
  WHEN formatting for prompt
  THEN I see: duration, attendee count

EDGE CASES:
- If rawData is null, format activity without context line
- If rawData has unknown fields, ignore them gracefully

OUT OF SCOPE:
- All possible rawData fields for all sources
```

### US-3: Structured JSON Output Schema

```
AS a developer
I WANT the LLM to return structured JSON with all metadata
SO THAT I can store and display rich information

ACCEPTANCE CRITERIA:
- GIVEN the user prompt
  WHEN LLM generates response
  THEN JSON includes: description, category, topics, skills, impactHighlights, fullContent, phases, dominantRole
- GIVEN the JSON schema in prompt
  WHEN LLM returns response
  THEN all required fields are present (fail if missing)
- GIVEN an example output in prompt
  WHEN LLM generates
  THEN format matches example structure

EDGE CASES:
- If LLM returns markdown code blocks, strip them before parsing
- If required field missing, throw descriptive error
- If phases array empty, default to single phase with all activities

OUTPUT SCHEMA:
{
  "description": "string (max 200 chars)",
  "category": "feature|bug-fix|optimization|documentation|learning|collaboration|problem-solving|achievement",
  "topics": ["string"],
  "skills": ["string"],
  "impactHighlights": ["string"],
  "fullContent": "markdown string",
  "phases": [{ "name": "string", "activityIds": ["string"], "summary": "string" }],
  "dominantRole": "Led|Contributed|Participated"
}

OUT OF SCOPE:
- JSON schema validation library integration
```

### US-4: A+ Quality System Prompt

```
AS a demo user
I WANT narratives that feel professionally written
SO THAT they're useful for performance reviews and job applications

ACCEPTANCE CRITERIA:
- GIVEN the system prompt
  WHEN read by LLM
  THEN it establishes expert professional journal writer persona
- GIVEN instructions in prompt
  WHEN LLM generates
  THEN it writes in first person ("I implemented...")
- GIVEN instructions in prompt
  WHEN LLM generates
  THEN it focuses on achievements and measurable outcomes
- GIVEN instructions in prompt
  WHEN LLM groups activities into phases
  THEN phase names are meaningful (Planning, Implementation, Review, etc.)

EDGE CASES:
- If activities have no clear phases, use single "Work" phase

OUT OF SCOPE:
- Multiple tone options (professional/casual/technical)
```

### US-5: Grouping Context in Prompt

```
AS a developer
I WANT the prompt to know if activities are temporal or cluster-based
SO THAT narrative structure matches the grouping context

ACCEPTANCE CRITERIA:
- GIVEN a temporal entry
  WHEN formatting prompt
  THEN context says "activities span a time period"
- GIVEN a cluster entry
  WHEN formatting prompt
  THEN context says "activities grouped by shared reference {ref}"
- GIVEN cluster entry with clusterRef
  WHEN formatting prompt
  THEN the reference name (e.g., "AUTH-123") is included

EDGE CASES:
- If clusterRef is null for cluster entry, omit reference name

OUT OF SCOPE:
- Different prompts for different entry types
```

### US-6: Store Enhanced Metadata

```
AS a developer
I WANT enhanced metadata stored in JournalEntry
SO THAT it can be displayed and filtered

ACCEPTANCE CRITERIA:
- GIVEN LLM returns structured response
  WHEN saving to database
  THEN category field is updated (not hardcoded)
- GIVEN LLM returns skills
  WHEN saving to database
  THEN skills array is updated
- GIVEN LLM returns topics
  WHEN saving to database
  THEN topics are stored as tags with "topic:" prefix
- GIVEN LLM returns phases and impactHighlights
  WHEN saving to database
  THEN they are stored in format7Data JSON field
- GIVEN LLM returns dominantRole
  WHEN saving to database
  THEN it is stored in format7Data

EDGE CASES:
- If format7Data already has data, merge (don't overwrite)

OUT OF SCOPE:
- Separate columns for each new field (use format7Data JSON)
```

### US-7: Enhanced StoryMetadata API Response

```
AS a frontend developer
I WANT enhanced metadata in API response
SO THAT I can display rich information in StoryGroupHeader

ACCEPTANCE CRITERIA:
- GIVEN a journal entry with format7Data
  WHEN API returns StoryMetadata
  THEN topics, impactHighlights, phases, dominantRole are included
- GIVEN a journal entry without format7Data
  WHEN API returns StoryMetadata
  THEN new fields default to empty arrays/null

EDGE CASES:
- If format7Data parsing fails, log warning and return defaults

OUT OF SCOPE:
- Filtering stories by topics or role
```

### US-8: Enhanced StoryGroupHeader Display

```
AS a demo user
I WANT to see rich information in story cards
SO THAT I can quickly understand what each story covers

ACCEPTANCE CRITERIA:
- GIVEN StoryMetadata with topics
  WHEN rendering header
  THEN first 2-3 topics are shown as pills
- GIVEN StoryMetadata with dominantRole
  WHEN rendering header
  THEN role badge is shown (Led/Contributed/Participated)
- GIVEN StoryMetadata with expanded view
  WHEN user expands
  THEN phases, impactHighlights, and full skills list are shown

EDGE CASES:
- If topics empty, don't show topics section
- If dominantRole is null, don't show role badge

OUT OF SCOPE:
- Filtering by topics
- Editing topics from UI
```

---

## 3. Dependency Map

```
US-1 (Templated Prompts)
  │
  └──→ US-4 (A+ System Prompt) ───┐
                                   │
US-2 (Enhanced Activity Data) ────┼──→ US-5 (Grouping Context)
                                   │
US-3 (JSON Output Schema) ────────┤
                                   │
                                   └──→ US-6 (Store Metadata) ──→ US-7 (API Response) ──→ US-8 (UI Display)
```

---

## 4. Priority (MoSCoW)

| Story | Priority | Rationale |
|-------|----------|-----------|
| US-1 | MUST | Foundation - prompts must be templated |
| US-2 | MUST | Critical for quality - rawData enables context |
| US-3 | MUST | Core requirement - structured output |
| US-4 | MUST | Core value - quality narratives |
| US-5 | SHOULD | Improves relevance but not blocking |
| US-6 | MUST | Required to persist enhanced data |
| US-7 | MUST | Required to serve data to frontend |
| US-8 | SHOULD | Displays enhancements but basic view works |

---

## 5. Glossary

| Term | Definition |
|------|------------|
| **Draft Story** | JournalEntry created from grouped activities, not yet promoted to CareerStory |
| **Temporal Grouping** | Activities grouped by time window (bi-weekly) |
| **Cluster Grouping** | Activities grouped by shared cross-tool references |
| **rawData** | Source-specific metadata (PR stats, Jira status, meeting duration) |
| **format7Data** | JSON field for storing structured narrative data |
| **dominantRole** | User's primary participation level: Led, Contributed, or Participated |
| **Phase** | Logical grouping of activities within a story (Planning, Implementation, etc.) |

---

## 6. Recommended Implementation Order

1. US-1: Templated Prompt Files (foundation)
2. US-2: Enhanced Activity Data for Prompt
3. US-3: Structured JSON Output Schema + US-4: A+ System Prompt (parallel)
4. US-5: Grouping Context in Prompt
5. US-6: Store Enhanced Metadata
6. US-7: Enhanced StoryMetadata API Response
7. US-8: Enhanced StoryGroupHeader Display

---

## 7. Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `backend/src/services/ai/prompts/templates/draft-story-system.prompt.md` | System prompt template |
| `backend/src/services/ai/prompts/templates/draft-story-user.prompt.md` | User prompt template |
| `backend/src/services/ai/prompts/templates/draft-story-example.json` | Example JSON output |

### Modified Files
| File | Changes |
|------|---------|
| `backend/src/services/ai/prompts/journal-narrative.prompt.ts` | Template loader, enhanced formatter |
| `backend/src/services/journal.service.ts` | Include rawData in fetch, store rich output |
| `backend/src/types/journal.types.ts` | Add DraftStoryGenerationOutput types |
| `backend/src/types/activity.types.ts` | Enhanced StoryMetadata |
| `backend/src/services/activity.service.ts` | Include new fields in API response |
| `src/types/activity.ts` | Mirror enhanced types |
| `src/components/journal/story-group-header.tsx` | Display new fields |
