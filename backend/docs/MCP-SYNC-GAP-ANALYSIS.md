# MCP Real Data Sync - Gap Analysis

> **Status:** Documentation only (2026-02-02)
> **Author:** Analysis from code review
> **Purpose:** Document the gap between demo data flow and production MCP sync

## Current Architecture

### Data Flow Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEMO MODE (Working)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  seedDemoData()                                                             │
│       │                                                                     │
│       ▼                                                                     │
│  DemoToolActivity ──────► ClusteringService ──────► JournalEntry            │
│  (Persisted)              (crossToolRefs)           (sourceMode: 'demo')    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION MCP (Current)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OAuth Token ──► Tool.fetchActivity() ──► Memory Session ──► AI Processing  │
│                  (GitHub, Jira, etc.)     (30-min expiry)         │         │
│                                                                   ▼         │
│                                                            Format7 Entry    │
│                                                                             │
│  ⚠️ NO PERSISTENCE TO ToolActivity TABLE                                    │
│  ⚠️ NO CLUSTERING POSSIBLE                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION MCP (Target)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OAuth Token ──► Tool.fetchActivity() ──► ActivityPersistenceService        │
│                  (GitHub, Jira, etc.)              │                        │
│                                                    ▼                        │
│                                             ToolActivity ──► ClusteringService
│                                             (Persisted)           │         │
│                                                                   ▼         │
│                                                            JournalEntry     │
│                                                     (sourceMode: 'production')
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Storage Tables

### DemoToolActivity (Demo Mode)
- **Location:** `prisma/schema.prisma` lines 1473-1500
- **Used by:** `seedDemoData()`, demo sync endpoint
- **Queried by:** `ActivityService` when `isDemoMode=true`

### ToolActivity (Production Mode)
- **Location:** `prisma/schema.prisma` lines 1360-1392
- **Used by:** `ActivityPersistenceService` (but not called from MCP flow)
- **Queried by:** `ActivityService` when `isDemoMode=false`
- **Status:** Table exists but not populated by MCP sync

### Schema Comparison

Both tables have identical structure:

```prisma
model ToolActivity / DemoToolActivity {
  id            String   @id @default(cuid())
  userId        String
  source        String   // github, jira, confluence, etc.
  sourceId      String   // Original ID from source system
  sourceUrl     String?  // Link back to source
  title         String
  description   String?
  timestamp     DateTime
  crossToolRefs String[] // ["PROJ-123", "org/repo#42"]
  rawData       Json?    // Original activity data
  clusterId     String?  // Links to StoryCluster (ToolActivity only)
  createdAt     DateTime @default(now())

  @@unique([userId, source, sourceId])
  @@index([userId, timestamp])
}
```

## Services Analysis

### ActivityPersistenceService
- **Location:** `src/services/career-stories/activity-persistence.service.ts`
- **Purpose:** Persist activities to `ToolActivity` table
- **Methods:**
  - `persistActivity(userId, activity)` - Single upsert
  - `persistActivities(userId, activities[])` - Batch upsert with transaction
  - `getActivities(userId, options)` - Query with filters
  - `getUnclusteredActivities(userId)` - Get activities without cluster

**Current Usage:**
- Only called from `/career-stories/mock/seed-activities` endpoint
- **NOT called from MCP fetch-and-process flow**

### ActivityService
- **Location:** `src/services/activity.service.ts`
- **Supports both modes:**
  - `isDemoMode=true` → queries `DemoToolActivity`
  - `isDemoMode=false` → queries `ToolActivity`
- **Status:** Ready for production use once `ToolActivity` is populated

### MCP Tools
- **Location:** `src/services/mcp/tools/*.tool.ts`
- **Implemented:**
  - `github.tool.ts` - Commits, PRs, Issues
  - `jira.tool.ts` - Issues, Sprints
  - `figma.tool.ts` - Files, Comments
  - `outlook.tool.ts` - Meetings, Emails
  - `confluence.tool.ts` - Pages, Blog Posts
  - `slack.tool.ts` - Messages, Threads
  - `teams.tool.ts` - Messages, Meetings
  - `onedrive.tool.ts` - Files
  - `onenote.tool.ts` - Notebooks, Pages
  - `sharepoint.tool.ts` - Sites, Files
  - `zoom.tool.ts` - Meetings, Recordings
  - `google-workspace.tool.ts` - Drive, Docs, Sheets, Meet

## The Gap

### What's Missing

1. **MCP → ToolActivity persistence bridge**

   The MCP controller fetches data but doesn't persist it:
   ```typescript
   // Current: mcp.controller.ts line ~1090
   const sessionService = MCPSessionService.getInstance();
   const sessionId = sessionService.createSession(userId, 'agent-processed', {...});
   // Data stored in memory, expires in 30 minutes

   // Missing: Persist to ToolActivity
   // const persistenceService = new ActivityPersistenceService(prisma);
   // await persistenceService.persistActivities(userId, transformedActivities);
   ```

2. **Tool data transformers**

   Each tool returns different structures. Need normalization to `ActivityInput`:
   ```typescript
   // GitHub returns:
   { commits: [...], pullRequests: [...], issues: [...] }

   // Need to transform to:
   interface ActivityInput {
     source: 'github';
     sourceId: string;      // commit SHA, PR number, issue number
     sourceUrl: string;     // GitHub URL
     title: string;         // "Merged PR #123: Feature X"
     description?: string;
     timestamp: Date;
     rawData?: object;      // Original data for reference
   }
   ```

3. **Production clustering trigger**

   Clustering service needs to run on `ToolActivity` after sync.

## Implementation Plan

### Phase 1: Persistence Bridge (Medium)

Add option to persist MCP data to `ToolActivity`:

```typescript
// New endpoint or option on existing endpoint
POST /api/v1/mcp/sync-and-persist
{
  toolTypes: ['github', 'jira'],
  dateRange: { start, end },
  consentGiven: true,
  persistToDatabase: true  // NEW: Toggle persistence
}
```

### Phase 2: Tool Transformers (Medium)

Create transformer for each tool type:

```
src/services/mcp/transformers/
├── github.transformer.ts
├── jira.transformer.ts
├── slack.transformer.ts
└── index.ts (factory)
```

Each transformer converts tool-specific response to `ActivityInput[]`.

### Phase 3: Production Clustering (Low)

Enable clustering on `ToolActivity`:
- Reuse existing `ClusteringService` logic
- Add mode parameter or create unified service

### Phase 4: Unified Sync Endpoint (Low)

Single endpoint that:
1. Fetches from OAuth tools
2. Transforms to ActivityInput
3. Persists to ToolActivity
4. Runs clustering
5. Creates JournalEntry drafts

## Effort Estimate

| Task | Effort | Dependencies |
|------|--------|--------------|
| Persistence bridge | 2-3 hours | None |
| GitHub transformer | 1-2 hours | Persistence bridge |
| Jira transformer | 1-2 hours | Persistence bridge |
| Other transformers (10) | 1 hour each | Pattern established |
| Production clustering | 1-2 hours | Transformers |
| Unified endpoint | 2-3 hours | All above |
| **Total** | **~20 hours** | |

## Testing Strategy

1. **Start with GitHub only** - Simplest OAuth, well-documented API
2. **Verify persistence** - Check ToolActivity table after sync
3. **Test clustering** - Ensure crossToolRefs extracted correctly
4. **Compare with demo** - Same JournalEntry output shape

## Files to Modify

| File | Changes |
|------|---------|
| `src/controllers/mcp.controller.ts` | Add persistence option to fetch-and-process |
| `src/services/mcp/transformers/*.ts` | NEW: Tool-specific transformers |
| `src/services/career-stories/clustering.service.ts` | Add production mode support |
| `src/routes/mcp.routes.ts` | New sync-and-persist endpoint |

## Privacy Considerations

Current MCP design is **privacy-first** with memory-only storage. Adding persistence changes this:

- **User consent required** - Explicit opt-in for data persistence
- **Data retention policy** - Define how long ToolActivity data is kept
- **Deletion support** - User can request data deletion
- **Audit logging** - Track what was persisted

## Related Documentation

- [Testing Guidelines](./TESTING.md) - Test isolation patterns
- [README-LOCAL-DEV.md](../README-LOCAL-DEV.md) - Local development setup
- MCP OAuth flow documentation (if exists)

---

*Last updated: 2026-02-02*
