# InChronicle: Career Stories Implementation

## CD6 Concept Document

**Created:** January 2026
**Stage:** Concept → Design
**Goal:** Build the Career Stories pipeline on top of our live platform

---

## Current State

**InChronicle is live at inchronicle.com with users.**

### What's Built

| Component | Status | Description |
|-----------|--------|-------------|
| **Core Platform** | Live | Professional journaling, workspaces, goals, skills |
| **OAuth Integrations** | Live | 12 tools: GitHub, Jira, Confluence, Figma, Outlook, Teams, Slack, etc. |
| **MCP Pipeline** | Live | Fetch-on-demand, memory-only sessions, privacy-first |
| **Multi-Source Organizer** | Live | AI correlates across tools, generates journal content |
| **Real-time** | Live | Socket.io + Redis for live updates |

### Tech Stack (Production)

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS |
| Backend | Express.js + TypeScript + Prisma |
| Database | PostgreSQL |
| AI | OpenAI API (GPT-4o, GPT-4o-mini) |
| Real-time | Socket.io + Redis |

### OAuth Tools Live Today

All 12 integrations use OAuth 2.0 with privacy-first design:

| Tool | Data Fetched | B2C Ready |
|------|--------------|-----------|
| GitHub | Commits, PRs, Issues, Repos | Yes |
| Jira | Issues, Projects, Sprints | Yes |
| Confluence | Pages, Blogs, Comments | Yes |
| Figma | Files, Components, Comments | Yes |
| Outlook | Meetings, Emails | Yes |
| Teams | Channels, Chats, Messages | Enterprise |
| Slack | Messages, Threads | Needs Marketplace |
| OneDrive | Files | Low value |
| SharePoint | Sites, Documents | Enterprise |
| OneNote | Notebooks | Low value |
| Zoom | Recordings | Yes |
| Google Workspace | Docs, Drive, Calendar | Yes |

---

## Market

### The Problem

Engineers can't prove what they did.

- **Brag docs are weak:** "Worked on search. Helped with API stuff." — vague, forgettable
- **Memory fails:** After 3 months, you can't remember what you shipped
- **Evidence is scattered:** PRs in GitHub, tickets in Jira, meetings in Outlook
- **Stakes are high:** Promotions, raises, interviews — $45K+ on the line

### Market Size

| Segment | Size | Source |
|---------|------|--------|
| Performance Management Software | $6.5B | Industry reports |
| Professional Development | $6.4B | Industry reports |
| **Serviceable Obtainable Market** | $225M | Engineers with high-stakes career moments |

### ICP

**Target:** Senior Software Engineer targeting Staff promotion

- 3-5 years at current company
- Works across 5-7 tools daily
- Has high-stakes career conversations (promo, review, interview)
- Knows they did good work but can't articulate it
- Doesn't have time to maintain a brag doc

**Their goal:** Walk into Thursday's promotion conversation with evidence that holds up.

---

## Team

| Founder | Background | Role |
|---------|------------|------|
| **Ketan** | 22 years in tech, passed over for promotion 3 times | Engineering, Product |
| **Honey** | IIM Ahmedabad MBA, 16 years corporate | Business, GTM |

**Why us:** We lived this problem. Ketan was passed over 3 times despite doing the work — couldn't prove it when it mattered.

---

## What We're Building (Roadmap)

The Career Stories pipeline transforms raw tool activity into evidence-backed career narratives.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THE PIPELINE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────┐   │
│   │ RAW ENTRIES │ →  │ ENHANCED ENTRIES │ →  │ NER / TOPIC EXTRACTION │   │
│   │   (LIVE)    │    │   + METADATA     │    │      CLUSTERING        │   │
│   └─────────────┘    └──────────────────┘    └─────────────────────────┘   │
│         │                    │                          │                   │
│         ▼                    ▼                          ▼                   │
│   GitHub PRs           + entryType              Entity extraction          │
│   Jira tickets         + actor                  Topic modeling             │
│   Confluence pages     + impactSignals          Temporal clustering        │
│   Outlook emails       + effortSignals          Participant overlap        │
│   Teams meetings       + crossToolRefs          Hard link detection        │
│   Figma comments       + skills                                            │
│                        + importance                                        │
│                                                                             │
│                              │                                              │
│                              ▼                                              │
│                    ┌─────────────────┐                                      │
│                    │    CLUSTERS     │                                      │
│                    │                 │                                      │
│                    │ Same tickets    │                                      │
│                    │ Same people     │                                      │
│                    │ Same timeframe  │                                      │
│                    │ Same topics     │                                      │
│                    └─────────────────┘                                      │
│                              │                                              │
│                              ▼                                              │
│                    ┌─────────────────┐                                      │
│                    │ CAREER STORIES  │                                      │
│                    │                 │                                      │
│                    │ • Search Infra  │                                      │
│                    │ • API Standards │                                      │
│                    │ • Onboarding    │                                      │
│                    └─────────────────┘                                      │
│                              │                                              │
│                              ▼                                              │
│                    ┌─────────────────┐                                      │
│                    │ STAR GENERATOR  │                                      │
│                    │ + VERIFICATION  │                                      │
│                    └─────────────────┘                                      │
│                                                                             │
│   ════════════════════════════════════════════════════════════════════     │
│   LIVE TODAY ▲                                 ▼ BUILDING NEXT              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What's Live vs What's Next

### LIVE: Raw Entry Types (from OAuth APIs)

Each tool returns structured activity data. These are the **raw entries** we fetch today:

#### GitHub Raw Entry (Live)

```typescript
interface GitHubActivity {
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    timestamp: Date;
    url: string;
  }>;
  pullRequests: Array<{
    id: number;
    title: string;
    state: string;           // open, closed, merged
    author: string;
    createdAt: Date;
    url: string;
  }>;
  issues: Array<{
    id: number;
    title: string;
    state: string;
    assignee?: string;
    createdAt: Date;
    url: string;
  }>;
  repositories: Array<{
    name: string;
    language: string;
    lastActivity: Date;
  }>;
}
```

#### Jira Raw Entry (Live)

```typescript
interface JiraActivity {
  issues: Array<{
    key: string;             // PROJ-123
    summary: string;
    status: string;          // To Do, In Progress, Done
    assignee?: string;
    updated: Date;
    timeSpent?: number;      // seconds logged
    url: string;
  }>;
  projects: Array<{
    key: string;
    name: string;
    lead?: string;
  }>;
  sprints: Array<{
    id: number;
    name: string;
    state: string;           // active, future, closed
    startDate?: Date;
    endDate?: Date;
  }>;
}
```

#### Confluence Raw Entry (Live)

```typescript
interface ConfluenceActivity {
  pages: Array<{
    id: string;
    title: string;
    space: { key: string; name: string };
    version: number;
    lastModified: string;
    lastModifiedBy: string;
    url: string;
    excerpt?: string;
  }>;
  blogPosts: Array<{
    id: string;
    title: string;
    publishedDate: string;
    author: string;
    url: string;
  }>;
  comments: Array<{
    id: string;
    pageId: string;
    pageTitle: string;
    author: string;
    content: string;
  }>;
}
```

#### Outlook Raw Entry (Live)

```typescript
interface OutlookActivity {
  meetings: Array<{
    id: string;
    subject: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    isOrganizer: boolean;    // Did user organize or just attend?
  }>;
  emails: Array<{
    id: string;
    subject: string;
    sender: string;
    receivedAt: Date;
    hasAttachments: boolean;
  }>;
}
```

#### Figma Raw Entry (Live)

```typescript
interface FigmaActivity {
  files: Array<{
    key: string;
    name: string;
    lastModified: Date;
    thumbnailUrl?: string;
    url: string;
  }>;
  components: Array<{
    key: string;
    name: string;
    description?: string;
  }>;
  comments: Array<{
    id: string;
    message: string;
    fileKey: string;
    createdAt: Date;
  }>;
}
```

**Source files:**
- `backend/src/types/mcp.types.ts` — All 12 tool type definitions
- `backend/src/services/mcp/tools/*.tool.ts` — Per-tool fetchers

---

### LIVE: AI Analysis Pipeline (AnalyzerAgent)

Raw entries are analyzed by the **AnalyzerAgent** which extracts structured insights:

```
┌─────────────────────────────────────────────────────────────────┐
│                      ANALYZER AGENT (LIVE)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Raw Activity (Map<MCPToolType, Activity>)                      │
│      │                                                          │
│      ├──► quickAnalyze() — GPT-4o-mini, fast categorization    │
│      │                                                          │
│      └──► deepAnalyze() — GPT-4o, nuanced understanding        │
│                                                                 │
│      ▼                                                          │
│  AnalyzedActivity[]                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### AnalyzedActivity (Live Output)

```typescript
interface AnalyzedActivity {
  id: string;
  source: MCPToolType;       // github, jira, confluence, etc.
  type: 'code_change' | 'issue' | 'meeting' | 'design' | 'documentation' | 'discussion';
  title: string;
  description: string;
  timestamp: Date;

  // AI-assessed complexity and impact
  technicalComplexity: 1 | 2 | 3 | 4 | 5;
  businessImpact: 'high' | 'medium' | 'low';

  // Extracted skills per activity
  skills: string[];          // ["TypeScript", "API Design", "Code Review"]

  // Estimated time investment
  timeInvestment: number;    // minutes

  // Categorization
  category: 'achievement' | 'learning' | 'collaboration' | 'documentation' | 'problem_solving';
  importance: 'high' | 'medium' | 'low';

  metadata?: any;            // Source-specific data (URL, etc.)
}
```

**Source file:** `backend/src/services/mcp/agents/analyzer-agent.ts`

---

### LIVE: Multi-Source Organizer

The **MCPMultiSourceOrganizer** correlates activities across tools:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-SOURCE ORGANIZER (LIVE)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                │
│  │ GitHub │  │  Jira  │  │ Figma  │  │Outlook │                │
│  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘                │
│      │           │           │           │                      │
│      └───────────┴───────────┴───────────┘                      │
│                        │                                        │
│                        ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    AI Agent Pipeline                      │  │
│  │                                                           │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │ Analyzer     │─►│ Correlator   │─►│ Generator    │    │  │
│  │  │ Agent        │  │ Agent        │  │ Agent        │    │  │
│  │  │ (GPT-4o-mini)│  │ (GPT-4o-mini)│  │ (GPT-4o)     │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  │                                                           │  │
│  │  Categorize          Find Connections    Generate Content │  │
│  │  Extract Skills      Cross-Tool Links    Professional     │  │
│  │  Rank Importance     Business Impact     Journal Entry    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                        │                                        │
│                        ▼                                        │
│              ┌─────────────────┐                                │
│              │ OrganizedActivity│                               │
│              │  • categories    │                               │
│              │  • correlations  │                               │
│              │  • artifacts     │                               │
│              │  • skills        │                               │
│              └─────────────────┘                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### OrganizedActivity (Live Output)

```typescript
interface OrganizedActivity {
  // AI-suggested journal entry
  suggestedEntryType: 'achievement' | 'learning' | 'reflection' | 'challenge';
  suggestedTitle: string;
  contextSummary: string;
  extractedSkills: string[];

  // Cross-tool correlations (LIVE)
  correlations: Array<{
    id: string;
    type: 'pr_to_jira' | 'meeting_to_code' | 'design_to_code' | 'discussion_to_doc' | 'general';
    source1: { tool: MCPToolType; id: string; title: string; url?: string };
    source2: { tool: MCPToolType; id: string; title: string; url?: string };
    confidence: number;  // 0-1
    reasoning: string;
  }>;

  // Unified categories
  categories: Array<{
    type: 'achievement' | 'learning' | 'collaboration' | 'documentation' | 'problem_solving';
    label: string;
    summary: string;
    items: Array<{
      id: string;
      source: MCPToolType;
      type: string;
      title: string;
      description: string;
      url: string;
      importance: 'high' | 'medium' | 'low';
      selected: boolean;
      skills?: string[];
    }>;
  }>;

  // Top artifacts for journal
  artifacts: Array<{
    type: string;
    source: MCPToolType;
    title: string;
    url: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
  }>;
}
```

**Source file:** `backend/src/services/mcp/mcp-multi-source-organizer.service.ts`

---

### GAP: What's Missing for Career Stories

The current pipeline produces **journal entries**. For **career stories**, we need:

| Have (Live) | Need (Building) |
|-------------|-----------------|
| Activity categorization | **entryType**: initiated vs participation |
| Skills extraction | **effortSignals**: time, lines, sessions |
| Cross-tool correlations | **impactSignals**: approvals, views, reactions |
| Single-day journal focus | **Multi-week clustering** into stories |
| AI-generated summary | **STAR format** with evidence links |
| — | **Verification** layer for claims |

---

### BUILDING: Enhanced Entry Schema

Extend AnalyzedActivity with career-story signals:

```typescript
interface EnhancedEntry extends AnalyzedActivity {
  // ══════════════════════════════════════════════════════════════
  // INHERITED FROM LIVE AnalyzedActivity
  // ══════════════════════════════════════════════════════════════
  // id, source, type, title, description, timestamp
  // technicalComplexity, businessImpact, skills, timeInvestment
  // category, importance, metadata

  // ══════════════════════════════════════════════════════════════
  // NEW: Entry Classification (for "You did X" vs "You participated in X")
  // ══════════════════════════════════════════════════════════════
  entryType: 'initiated' | 'participation';
  //   initiated    = You created the PR, organized the meeting, wrote the doc
  //   participation = You reviewed, attended, commented

  actionType: string;
  //   pr_merged, pr_opened, pr_reviewed
  //   ticket_created, ticket_closed, ticket_commented
  //   page_created, page_updated, page_commented
  //   meeting_organized, meeting_attended
  //   design_created, design_commented

  // ══════════════════════════════════════════════════════════════
  // NEW: Impact Signals (for "Prove it had impact")
  // ══════════════════════════════════════════════════════════════
  impactSignals?: {
    approvalCount?: number;     // PR approvals, ticket transitions
    commentCount?: number;      // Discussion engagement
    reactionCount?: number;     // Slack/Teams reactions
    viewCount?: number;         // Confluence page views
    mentionCount?: number;      // Times @mentioned by others
  };

  // ══════════════════════════════════════════════════════════════
  // NEW: Effort Signals (for "Show the work")
  // ══════════════════════════════════════════════════════════════
  effortSignals?: {
    timeSpentMinutes?: number;  // Jira time tracking
    linesChanged?: number;      // Git additions + deletions
    filesEdited?: number;       // Number of files touched
    sessionsCount?: number;     // From local agent (future)
    revisionCount?: number;     // Doc/design iterations
  };

  // ══════════════════════════════════════════════════════════════
  // NEW: Cross-Tool References (for clustering)
  // ══════════════════════════════════════════════════════════════
  crossToolRefs?: {
    jiraTickets?: string[];     // ["PROJ-123", "PROJ-456"]
    githubPRs?: string[];       // ["org/repo#42"]
    confluencePages?: string[]; // Page IDs
    figmaFiles?: string[];      // File keys
  };

  // ══════════════════════════════════════════════════════════════
  // NEW: For Story Clustering
  // ══════════════════════════════════════════════════════════════
  entities?: ExtractedEntity[];  // NER: people, projects, tech
  topics?: string[];             // Topic modeling output
  clusterId?: string;            // Assigned cluster

  // ══════════════════════════════════════════════════════════════
  // NEW: Actors (for "Who was involved")
  // ══════════════════════════════════════════════════════════════
  actor: string;                 // Who performed the action
  targetUser?: string;           // Who it was for (review, onboarding)
  participants?: string[];       // Everyone involved
  mentionedUsers?: string[];     // @mentioned
}
```

#### Enhancement Pipeline (To Build)

```
┌─────────────────────────────────────────────────────────────────┐
│                      ENHANCEMENT PIPELINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AnalyzedActivity (from live Analyzer Agent)                    │
│      │                                                          │
│      ├──► ClassifyEntryType()                                   │
│      │    └─► "You merged PR" = initiated                       │
│      │    └─► "You reviewed PR" = participation                 │
│      │                                                          │
│      ├──► ExtractActionType()                                   │
│      │    └─► pr_merged, ticket_closed, page_created, etc.     │
│      │                                                          │
│      ├──► ExtractImpactSignals()                               │
│      │    └─► Parse approvalCount from PR data                 │
│      │    └─► Parse viewCount from Confluence                  │
│      │                                                          │
│      ├──► ExtractEffortSignals()                               │
│      │    └─► Parse linesChanged from Git diff                 │
│      │    └─► Parse timeSpent from Jira worklog               │
│      │                                                          │
│      ├──► DetectCrossToolRefs()                                │
│      │    └─► Regex for JIRA-123 in PR body                   │
│      │    └─► URL parsing for Confluence links                 │
│      │                                                          │
│      └──► ExtractActors()                                      │
│           └─► actor = PR author                                │
│           └─► participants = reviewers + commenters            │
│                                                                 │
│      ▼                                                          │
│  EnhancedEntry[]                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### BUILDING: Clustering Engine

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLUSTERING PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EnhancedEntry[]                                                │
│      │                                                          │
│      ├──► Layer 1: Hard Link Detection (95%+ accuracy)         │
│      │    ├─ Jira ticket ID in PR description                  │
│      │    ├─ Confluence page links to Jira epic                │
│      │    └─ GitHub PR references issue number                 │
│      │                                                          │
│      ├──► Layer 2: Entity Co-occurrence (85%+ accuracy)        │
│      │    ├─ Same people in 4+ entries within 2 weeks          │
│      │    └─ Same project/component name extracted             │
│      │                                                          │
│      ├──► Layer 3: Temporal + Semantic (70-80% accuracy)       │
│      │    ├─ Entries within same 2-week sprint                 │
│      │    └─ Embed titles, cluster by similarity               │
│      │                                                          │
│      └──► Layer 4: User Correction                             │
│           └─ Drag to merge, split, rename                      │
│                                                                 │
│      ▼                                                          │
│  StoryCluster[]                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### BUILDING: STAR Generator

```typescript
interface CareerStory {
  id: string;
  clusterId: string;
  intent: 'promotion' | 'interview' | 'negotiation' | 'review';

  situation: { text: string; evidence: EvidenceLink[] };
  task: { text: string; evidence: EvidenceLink[] };
  action: { items: ActionItem[] };
  result: { metrics: string[]; evidence: EvidenceLink[] };

  verification: VerificationItem[];
  verificationScore: number;  // 0-100
}

interface VerificationItem {
  claim: string;
  status: 'verified' | 'needs_evidence' | 'needs_context';
  suggestion?: string;
}
```

---

## Demo Flow (From YC Pitch Script)

The demo shows Alex Chen, Senior Engineer with a promotion conversation Thursday.

### Act 1: The Problem (20s)
Empty brag doc with 3 vague bullets. $45K raise on the line.

### Act 2: The Firehose (25s)
24 entries stream in from 7 tools — PRs with line counts, tickets with outcomes.

### Act 3: AI Clusters Stories (35s)
Same tickets + same people = same story. Three stories emerge:
- Search Infrastructure Migration (7 entries, 3 PRs)
- API Standards (6 entries, 3 team meetings)
- Onboarding Sarah (5 entries, 1 thank-you email)

### Act 4: Generate STAR (45s)
User picks story + intent (promotion). STAR generated with evidence links.

### Act 5: AI Challenges (40s)
Verification catches BS:
- "10x faster — who says so?"
- "Led — did you lead or participate?"

User adds evidence. Story becomes bulletproof.

### Act 6: The Ask (15s)
"You did the work. Now prove it."

---

## Implementation Plan (Pragmatic — Post Innovation Review)

### Key Decisions

**1. Persistence in Postgres**
- RJ/GSE called it: Can't cluster multi-week data with memory-only sessions
- Decision: Store entries in Postgres via Prisma
- Accept privacy tradeoff for MVP — tackle with user consent flow later

**2. Hard Links Only (Rich Hickey Simplification)**
- Skip LLM-based enhancement for clustering
- Use deterministic regex-based cross-tool reference detection
- Defer: effortSignals estimation, importance/category classification, semantic similarity

**3. Build A, Demo B**
- Build MVP (hard-link clustering) — ships fast, deterministic, testable
- For YC demo, curate entries that show "intent-aware" grouping
- Post-demo, build actual intent-aware layer

---

### Innovation Review Summary

| Approach | Build Time | Risk | Selected |
|----------|-----------|------|----------|
| **A: MVP (Hard Links)** | 1 week | Low | ✓ **Build** |
| B: Moonshot (Intent-Aware) | 3-4 weeks | High | Demo concept |
| C: Pivot (Verification-First) | 2 weeks | Medium | Consider later |

**Rich Hickey verdict:** "You had 15 fields. You need 8. Ship the 8."

---

### Phase 1: Persist Entries (Simplified Schema)

**Goal:** Store entries with cross-tool references for clustering.

#### 1.1 Simplified Prisma Schema

```prisma
// ============================================================================
// CAREER STORIES - SIMPLIFIED (Post Innovation Review)
// ============================================================================
// NOTE: Using "ToolActivity" not "JournalEntry" since JournalEntry already exists

model ToolActivity {
  id            String   @id @default(cuid())
  userId        String

  // Source identification
  source        String    // github, jira, confluence, outlook, figma
  sourceId      String    // Original ID from source system
  sourceUrl     String?   // Link back to source

  // Core content (what we need for STAR generation)
  title         String
  description   String?
  timestamp     DateTime  // When the activity happened

  // Cross-tool references (what we need for clustering)
  crossToolRefs String[]  @default([])  // ["PROJ-123", "org/repo#42", "12345"]

  // Clustering assignment
  clusterId     String?

  // Raw data for STAR generation later
  rawData       Json?     // Original activity data

  createdAt     DateTime  @default(now())

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  cluster       StoryCluster? @relation(fields: [clusterId], references: [id])

  @@unique([userId, source, sourceId])  // Prevent duplicates
  @@index([userId, timestamp])
  @@map("tool_activities")
}

model StoryCluster {
  id        String   @id @default(cuid())
  userId    String

  // Cluster identity
  name      String?   // User can rename

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  entries   ToolActivity[]
  story     CareerStory?

  @@index([userId])
  @@map("story_clusters")
}

model CareerStory {
  id              String    @id @default(cuid())
  clusterId       String    @unique

  // Intent
  intent          String    // promotion, interview, negotiation, review

  // STAR sections (JSON for flexibility)
  situation       Json      // { text, evidence: [{ entryId, date, description }] }
  task            Json
  action          Json      // { items: [{ description, evidence }] }
  result          Json

  // Verification
  verification    Json?     // [{ claim, status, suggestion }]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  cluster         StoryCluster @relation(fields: [clusterId], references: [id], onDelete: Cascade)

  @@map("career_stories")
}
```

**What we dropped (defer to post-MVP):**
- `entryType`, `actionType` — LLM classification, not needed for clustering
- `category`, `importance` — Same
- `technicalComplexity`, `businessImpact` — Same
- `impactSignals`, `effortSignals` — Parse what's explicit only (linesChanged from rawData)
- `actor`, `participants`, `skills`, `tags` — Nice to have, not MVP
- `StoryCluster.color`, `summary`, `entryCount`, `status` — UI polish, not MVP

#### 1.2 Cross-Tool Reference Extraction (Deterministic)

No LLM needed. Pure regex:

```typescript
// New file: backend/src/services/career-stories/ref-extractor.service.ts

export class RefExtractorService {

  private readonly PATTERNS = {
    jira: /\b([A-Z]{2,10}-\d+)\b/g,
    githubPr: /(?:([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+))?#(\d+)/g,
    githubUrl: /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/g,
    confluence: /atlassian\.net\/wiki\/.*\/pages\/(\d+)/g,
  };

  extractRefs(text: string): string[] {
    const refs: string[] = [];

    // Jira tickets: PROJ-123
    for (const match of text.matchAll(this.PATTERNS.jira)) {
      refs.push(match[1]);
    }

    // GitHub PRs: org/repo#42 or #42
    for (const match of text.matchAll(this.PATTERNS.githubPr)) {
      const repo = match[1] || 'local';
      refs.push(`${repo}#${match[2]}`);
    }

    // GitHub URLs
    for (const match of text.matchAll(this.PATTERNS.githubUrl)) {
      refs.push(`${match[1]}/${match[2]}#${match[3]}`);
    }

    // Confluence page IDs
    for (const match of text.matchAll(this.PATTERNS.confluence)) {
      refs.push(`confluence:${match[1]}`);
    }

    return [...new Set(refs)]; // Dedupe
  }
}
```

#### 1.3 Persist Entries

```typescript
// New file: backend/src/services/career-stories/entry-persistence.service.ts

export class ActivityPersistenceService {
  constructor(
    private prisma: PrismaClient,
    private refExtractor: RefExtractorService,
  ) {}

  async persistFromActivity(userId: string, activity: AnalyzedActivity): Promise<void> {
    // Extract cross-tool refs from title + description + raw data
    const textToSearch = [
      activity.title,
      activity.description,
      JSON.stringify(activity.metadata),
    ].filter(Boolean).join(' ');

    const crossToolRefs = this.refExtractor.extractRefs(textToSearch);

    await this.prisma.toolActivity.upsert({
      where: {
        userId_source_sourceId: {
          userId,
          source: activity.source,
          sourceId: activity.id,
        },
      },
      create: {
        userId,
        source: activity.source,
        sourceId: activity.id,
        sourceUrl: activity.metadata?.url,
        title: activity.title,
        description: activity.description,
        timestamp: activity.timestamp,
        crossToolRefs,
        rawData: activity.metadata,
      },
      update: {
        title: activity.title,
        description: activity.description,
        crossToolRefs,
        rawData: activity.metadata,
      },
    });
  }
}
```

#### Phase 1 Deliverables

- [x] Add Prisma schema for `ToolActivity`, `StoryCluster`, `CareerStory`
- [ ] Run `prisma migrate dev`
- [x] Create `RefExtractorService` for regex-based reference detection
- [x] Create `ActivityPersistenceService` to save activities
- [x] Create `ClusteringService` with connected components algorithm
- [ ] Hook into existing MCP flow to persist on fetch
- [x] Add API endpoints (controller + routes registered in app.ts)
- [ ] Test with real GitHub + Jira data

**Success criteria:** 24 entries persisted with cross-tool refs extracted.

---

### Phase 2: Hard-Link Clustering

**Goal:** Group entries by shared references using connected components.

#### 2.1 Clustering Algorithm (Graph-Based)

```typescript
// backend/src/services/career-stories/clustering.service.ts

export class ClusteringService {
  constructor(private prisma: PrismaClient) {}

  async clusterActivities(userId: string, dateRange?: DateRange): Promise<StoryCluster[]> {
    // 1. Get all activities (optionally filtered by date)
    const activities = await this.prisma.toolActivity.findMany({
      where: {
        userId,
        ...(dateRange && {
          timestamp: { gte: dateRange.start, lte: dateRange.end }
        }),
      },
    });

    // 2. Build adjacency list: activity -> activities sharing refs
    const adjacency = this.buildAdjacencyList(activities);

    // 3. Find connected components
    const components = this.findConnectedComponents(activities, adjacency);

    // 4. Create/update cluster records
    return this.persistClusters(userId, components);
  }

  private buildAdjacencyList(activities: ToolActivity[]): Map<string, Set<string>> {
    // Map: ref -> set of activity IDs that have this ref
    const refToActivities = new Map<string, Set<string>>();

    activities.forEach(activity => {
      activity.crossToolRefs.forEach(ref => {
        if (!refToActivities.has(ref)) {
          refToActivities.set(ref, new Set());
        }
        refToActivities.get(ref)!.add(activity.id);
      });
    });

    // Map: activityId -> set of connected activity IDs
    const adjacency = new Map<string, Set<string>>();

    activities.forEach(activity => {
      adjacency.set(activity.id, new Set());
    });

    // Activities sharing a ref are connected
    refToActivities.forEach(activityIds => {
      const ids = Array.from(activityIds);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          adjacency.get(ids[i])!.add(ids[j]);
          adjacency.get(ids[j])!.add(ids[i]);
        }
      }
    });

    return adjacency;
  }

  private findConnectedComponents(
    activities: ToolActivity[],
    adjacency: Map<string, Set<string>>
  ): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];

    activities.forEach(activity => {
      if (!visited.has(activity.id)) {
        const component: string[] = [];
        this.dfs(activity.id, adjacency, visited, component);
        if (component.length > 0) {
          components.push(component);
        }
      }
    });

    return components;
  }

  private dfs(
    activityId: string,
    adjacency: Map<string, Set<string>>,
    visited: Set<string>,
    component: string[]
  ): void {
    visited.add(activityId);
    component.push(activityId);

    adjacency.get(activityId)?.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        this.dfs(neighbor, adjacency, visited, component);
      }
    });
  }
}
```

#### Phase 2 Deliverables

- [x] `ClusteringService` with connected components algorithm
- [x] API: `POST /api/v1/career-stories/clusters/generate` — run clustering
- [x] API: `GET /api/v1/career-stories/clusters` — list user's clusters with entry counts
- [x] API: `PATCH /api/v1/career-stories/clusters/:id` — rename cluster
- [x] API: `POST /api/v1/career-stories/clusters/:id/activities` — manually add activity
- [x] API: `DELETE /api/v1/career-stories/clusters/:id/activities/:activityId` — manually remove activity
- [x] API: `POST /api/v1/career-stories/clusters/merge` — merge clusters
- [x] API: `DELETE /api/v1/career-stories/clusters/:id` — delete cluster

**Success criteria:** 3 clusters generated from demo data, matching demo script.

---

### Phase 3: STAR Generation (Week 5-6)

**Goal:** Generate STAR narrative from cluster.

#### 3.1 STAR Generator Prompt

```typescript
const prompt = `
You are generating a STAR story for a ${intent} conversation.

**Cluster:** ${cluster.title}
**Entries:** ${entries.length} activities over ${dateRange}

**Entries:**
${entries.map(e => `
- [${e.timestamp}] ${e.title}
  Type: ${e.entryType} (${e.actionType})
  Impact: ${JSON.stringify(e.impactSignals)}
  Effort: ${JSON.stringify(e.effortSignals)}
  URL: ${e.sourceUrl}
`).join('\n')}

**Generate STAR with evidence links:**

Return JSON:
{
  "situation": {
    "text": "Plain language description of the problem/context",
    "evidence": [{ "entryId": "...", "date": "...", "description": "Why this entry supports this" }]
  },
  "task": { ... },
  "action": {
    "items": [
      { "description": "What you did", "evidence": {...}, "effort": "4.5 hrs, 847 lines" }
    ]
  },
  "result": {
    "metrics": ["10x faster", "Zero downtime"],
    "evidence": [...]
  },
  "verification": [
    { "claim": "10x faster", "status": "needs_evidence", "suggestion": "Add Datadog link or PM confirmation" }
  ]
}
`;
```

#### Phase 3 Deliverables

- [ ] `StoryGeneratorService` with STAR prompt
- [ ] API: `POST /api/stories/generate` — generate from cluster
- [ ] STAR viewer UI with evidence links
- [ ] Verification panel
- [ ] Add evidence flow

---

### Phase 4: Demo Polish (Week 7-8)

- [ ] Entry streaming animation
- [ ] Cluster visualization
- [ ] Intent selector
- [ ] Export to markdown
- [ ] Record demo video

---

## Competitive Advantage

| Us | Brag Docs | ChatGPT |
|----|-----------|---------|
| Auto-captures from 7 tools | Manual entry | No capture |
| Evidence links to source | No evidence | Hallucinated |
| AI challenges your claims | Nothing | Accepts anything |
| Privacy-first (memory-only) | Cloud docs | Cloud AI |

**Moat:** Privacy-first architecture + verification layer. Unlike ChatGPT, every claim links to proof.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Clustering quality too low | Stories don't make sense | Start with hard links only |
| LLM output inconsistent | STAR format breaks | Structured output, few-shot |
| OAuth rate limits | Incomplete data | Exponential backoff, batching |
| Privacy concerns | User distrust | Show exactly what's captured |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Clustering accuracy | 80%+ (< 2 manual edits per story) |
| Story generation quality | 8/10 user rating |
| Time to first story | < 2 minutes from connect |
| Verification catch rate | 2+ gaps found per story |

---

## Open Questions

1. **Clustering granularity:** When is a story "too big" (20+ entries)?
2. **Orphan handling:** What to do with entries that don't cluster?
3. **Verification depth:** How aggressive should AI challenges be?
4. **Historical depth:** How far back to sync (3 months? 1 year)?

---

---

## User Model Update

Add these relations to existing `User` model in `schema.prisma`:

```prisma
model User {
  // ... existing fields ...

  // Career Stories (NEW)
  toolActivities    ToolActivity[]
  storyClusters     StoryCluster[]

  // ... rest of model ...
}
```

---

## Key Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `ToolActivity`, `StoryCluster`, `CareerStory` models |
| `src/services/mcp/mcp-multi-source-organizer.service.ts` | Hook persistence after analysis |
| `src/services/career-stories/` (NEW) | `ref-extractor.service.ts`, `activity-persistence.service.ts`, `clustering.service.ts`, `story-generator.service.ts` |
| `src/controllers/career-stories.controller.ts` (NEW) | API endpoints |
| `src/routes/career-stories.routes.ts` (NEW) | Route definitions |

**What we're NOT touching (deferred):**
- `analyzer-agent.ts` — No prompt changes for MVP
- No new LLM calls for classification

---

## References

- [Demo Script (YC Pitch)](../../research/entries-mcp-deep-dive/DEMO-SCRIPT-YC-PITCH.md)
- [B2C Feasibility](../../research/entries-mcp-deep-dive/05-B2C-FEASIBILITY.md)
- [MCP Integration (Live)](../../L3-DEEP-DIVES/MCP-INTEGRATION.md)
- [Tool Integrations (Live)](../../L3-DEEP-DIVES/TOOL-INTEGRATIONS.md)
- [Prisma Schema (Live)](../../../ProfessionalSide/backend/prisma/schema.prisma)
- [AnalyzerAgent (Live)](../../../ProfessionalSide/backend/src/services/mcp/agents/analyzer-agent.ts)
