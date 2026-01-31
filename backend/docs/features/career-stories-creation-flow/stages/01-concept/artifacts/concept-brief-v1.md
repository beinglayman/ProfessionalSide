# Career Stories Creation Flow

## Context

We have a unified `JournalEntry` table with entries that have `groupingMethod: 'time' | 'cluster'`. These are auto-generated from raw activities during sync. We also have a `CareerStory` table that is currently empty.

The promotion hierarchy is:

```
Raw Activities (DemoToolActivity)
        ↓ [Auto: Sync/Clustering]
JournalEntry (groupingMethod: 'time' | 'cluster')
        ↓ [User Action: Select entries + Choose template]
CareerStory (framework: 'STAR' | 'SOAR' | 'CAR' | ...)
```

## Current Problem

The Stories tab incorrectly displays cluster-based JournalEntries directly. It should only display explicitly user-created CareerStories.

## Required Flow

### Stories Tab Behavior

1. **List View**: Only show records from `CareerStory` table (not JournalEntries)
   - Currently empty = shows empty state with "Create Your First Story" CTA

2. **"New Career Story" Button**: Opens multi-step creation wizard

### Creation Wizard Steps

**Step 1: Select Source**
- Show available JournalEntries grouped by type:
  - **Cluster-based**: Individual entries with `groupingMethod: 'cluster'` (e.g., "AUTH-123: Oauth2 Work")
  - **Temporal**: Entries with `groupingMethod: 'time'`, with options to select:
    - Single entry (e.g., "Week of Jan 27-30")
    - Multiple entries to combine (e.g., select 3 weekly entries for a monthly story)
    - Date range picker for custom grouping
- User selects one or more journal entries as source material

**Step 2: Select Narrative Format**
- Show available templates:
  - **STAR**: Situation, Task, Action, Result
  - **SOAR**: Situation, Obstacle, Action, Result
  - **CAR**: Challenge, Action, Result
  - **PAR**: Problem, Action, Result
  - **SCAR**: Situation, Challenge, Action, Result
- Each template shows brief description of when to use it
- User selects one template

**Step 3: Generate & Review**
- System generates narrative using selected template applied to source journal content
- User can review and edit the generated sections
- Save creates a `CareerStory` record

### CareerStory Record Structure

```typescript
{
  id: string;
  userId: string;
  title: string;
  sourceMode: 'demo' | 'production';

  // Source linking
  sourceJournalEntryIds: string[];  // One or more journal entries used

  // Template & Content
  framework: 'STAR' | 'SOAR' | 'CAR' | 'PAR' | 'SCAR';
  sections: {
    situation?: string;
    task?: string;
    obstacle?: string;
    challenge?: string;
    problem?: string;
    action: string;
    result: string;
  };

  // Metadata
  intent?: string;  // User's goal: 'interview' | 'promotion' | 'portfolio'
  skills: string[];

  // Publishing
  visibility: 'private' | 'workspace' | 'network';
  isPublished: boolean;
  publishedAt?: Date;

  // Timestamps
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Implementation Tasks

### Backend

1. Update CareerStory schema if needed (add `sourceJournalEntryIds`, verify `framework` field)
2. Create endpoint: `GET /api/v1/career-stories` (list user's stories)
3. Create endpoint: `POST /api/v1/career-stories/generate`
   - Input: `{ journalEntryIds: string[], framework: string }`
   - Output: Generated CareerStory with sections
4. Create endpoint: `POST /api/v1/career-stories` (save generated story)

### Frontend

1. Fix Stories tab to query `CareerStory` table only
2. Build creation wizard component with 3 steps
3. Add "New Career Story" button to Stories tab
4. Template selection UI with descriptions

### AI Generation

1. Prompt template for each narrative framework
2. Extract relevant content from source journal entries
3. Generate structured sections based on chosen framework

## Success Criteria

- Stories tab shows empty state when no CareerStories exist
- User can create a story by selecting journal entries + template
- Generated story appears in Stories tab after creation
- Clear separation: JournalEntry = auto-generated, CareerStory = user-initiated
