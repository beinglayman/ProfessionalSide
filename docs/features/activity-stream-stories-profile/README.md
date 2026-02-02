# Activity Stream, Stories & Profile

## Overview

Three-tab architecture for career evidence management:

| Tab | Content | Visibility |
|-----|---------|------------|
| **Journal** | Raw activities + draft stories | Private |
| **Stories** | STAR-based career narratives | Private until published |
| **Profile** | Published stories | Shareable link |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  JOURNAL TAB                                                    │
│  Raw work log + AI-generated drafts                             │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Activity Stream (DemoToolActivity)                        │ │
│  │ • Instant render with tool logos                          │ │
│  │ • Temporal: Today / Yesterday / This Week                 │ │
│  │ • Source: GitHub / Jira / Figma / Outlook                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Draft Stories (DemoJournalEntry)                          │ │
│  │ • Auto-generated in background                            │ │
│  │ • User edits and curates                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STORIES TAB                                                    │
│  Evidence-backed STAR narratives                                │
│                                                                 │
│  DemoCareerStory:                                               │
│  • Situation → Task → Action → Result                          │
│  • Evidence links to activities                                 │
│  • Themes: Technical Leadership, Mentorship, etc.              │
│  • STAR Progress indicator                                      │
│                                                                 │
│  Actions: [Publish to Workspace] [Publish to Network]          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PROFILE TAB                                                    │
│  Shareable career portfolio                                     │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Workspace    │  │ Network      │  │ Profile Link         │  │
│  │ (B2B collab) │→ │ (LinkedIn-   │→ │ yourname.app.io      │  │
│  │              │  │  like)       │  │ Interviews/promos    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
ToolActivity (raw)
    │
    ├──→ Render immediately in Journal tab
    │
    └──→ Background: Generate DemoJournalEntry (draft)
              │
              └──→ User curates → Create DemoCareerStory (STAR)
                        │
                        └──→ Publish → Workspace/Network → Profile
```

## Key Features

### Journal Tab
- **Activity Stream**: Raw `DemoToolActivity` with demo-v2 style
  - Tool-specific icons and colors
  - Temporal filters (Today/Yesterday/This Week/Last 15 Days)
  - Source filters (GitHub/Jira/Figma/Outlook/Slack/Teams)
- **Draft Stories**: AI-generated `DemoJournalEntry` in background
  - No wait time for users
  - Edit and group activities
  - "Promote to Story" action

### Stories Tab
- **STAR Framework**: Situation, Task, Action, Result
- **Evidence-backed**: Links to source activities
- **Themes**: Technical Leadership, Mentorship, Cross-team Collaboration
- **Progress Tracking**: STAR completion percentage
- **Export**: PDF, copy to clipboard

### Profile Tab
- **Publishing targets**:
  - Workspace (required, B2B collaboration)
  - Network (optional, cross-company visibility)
- **Auto-aggregation**: Published stories land on Profile
- **Shareable link**: For interviews, promotions, negotiations

## Implementation Phases

1. **Phase 1**: Activity Stream UI (render DemoToolActivity)
2. **Phase 2**: Background draft generation
3. **Phase 3**: Stories tab with STAR editor
4. **Phase 4**: Publishing flow to Profile

## Current Stage

**CONCEPT** - Problem exploration and architecture definition
