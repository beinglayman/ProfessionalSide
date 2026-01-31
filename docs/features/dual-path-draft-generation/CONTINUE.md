# Dual-Path Draft Generation - Implementation Progress

## Current Status: Phase 5 Complete

### Completed Phases

#### Phase 0: Activity Fetch (DONE)
- **File**: `backend/src/services/journal-auto-generator.service.ts`
- **Change**: `fetchMCPToolActivity()` now queries `ToolActivity` table instead of returning `[]`

#### Phase 1: Cadence Support (DONE)
- **Schema**: Added `cadence` field to `WorkspaceJournalSubscription`
  - Migration: `20260131071209_add_cadence_to_subscription`
  - Values: `daily` (default), `weekly`, `sprint`
- **Types**: Added `LOOKBACK_DAYS`, `validateCadence()`, `calculateLookbackStart()`

#### Phase 2: Grouping Method (DONE)
- **Schema**: Added `groupingMethod` and `preferredFramework` fields
- **Service**: Added `groupActivities()`, `groupByTemporal()`, `groupByCluster()` methods

#### Phase 3: Framework Integration (DONE)
- **Types**: Added `JOURNAL_FRAMEWORKS`, `JOURNAL_FRAMEWORK_COMPONENTS`
- **Service**: Added `getFrameworkComponents()` method

#### Phase 4: Framework Application in Generation (DONE + HARDENED)
- **Service**: Modified `generateJournalEntry()` to accept and use `preferredFramework`
- **New Methods**: `generateTitle()`, `generateDescription()`, `generateFullContent()`, `generateActivitySummaryContent()`, `capitalize()`

#### Phase 5: Grouping Method Integration (DONE)
- **Types**: Added `validateGroupingMethod()` utility and `DEFAULT_GROUPING_METHOD` constant
- **Service**: Modified `generateJournalEntry()` to accept and use `groupingMethod`
- **New Methods**: `groupAllActivities()` - flattens and groups activities from all tools
- **Wired into**: `processSubscription()` now passes `subscription.groupingMethod`

**Implementation Details:**

```typescript
// New type utility
export function validateGroupingMethod(value: string | null | undefined): GroupingMethod {
  if (value && VALID_GROUPING_METHODS.includes(value as GroupingMethod)) {
    return value as GroupingMethod;
  }
  return DEFAULT_GROUPING_METHOD; // 'temporal'
}

// generateJournalEntry now accepts groupingMethod
private async generateJournalEntry(
  activityData: ToolActivityData[],
  customPrompt: string | null,
  defaultCategory: string | null,
  defaultTags: string[],
  workspaceId: string,
  preferredFramework?: string | null,
  groupingMethod?: string | null  // NEW parameter
): Promise<GeneratedEntry>

// New method to group all activities from all tools
private groupAllActivities(
  activityData: ToolActivityData[],
  method: GroupingMethod
): GroupedActivities {
  const allActivities = activityData.flatMap(tool =>
    tool.activities.map(activity => ({
      id: activity.id,
      timestamp: activity.timestamp,
      crossToolRefs: activity.crossToolRefs || [],
      source: tool.toolType,
    }))
  );
  return this.groupActivities(allActivities, method);
}

// format7Data now includes grouping info
if (validatedGroupingMethod && groupedActivities) {
  format7Data.grouping = {
    method: validatedGroupingMethod,
    groups: groupedActivities.groups,
  };
}

// fullContent shows grouped activities
if (groupedActivities && groupedActivities.groups.length > 0) {
  content += `*Grouped by ${groupedActivities.method}*\n\n`;
  for (const group of groupedActivities.groups) {
    content += `### ${group.key}\n`;
    content += `- ${group.activityIds.length} activities\n\n`;
  }
}
```

**Wired into processSubscription:**
```typescript
const entryData = await this.generateJournalEntry(
  activityData,
  customPrompt,
  defaultCategory,
  defaultTags,
  workspaceId,
  subscription.preferredFramework,
  subscription.groupingMethod  // NEW - passed from subscription
);
```

---

## All Phases Complete!

The dual-path draft generation feature is now fully implemented with:

1. **Cadence-based lookback**: Daily (1 day), Weekly (7 days), Sprint (14 days)
2. **Grouping methods**: Temporal (by date) or Cluster (by cross-tool refs)
3. **Framework-structured content**: Journal + Career-story frameworks
4. **Full integration**: All options wired from subscription to generation

---

## Test Results

```
86 tests | 82 passed | 4 skipped

Full suite: 463 passed | 4 skipped | 50 todo
```

### Running Tests
```bash
# Unit tests only
npm test -- --run src/services/journal-auto-generator.service.test.ts

# All tests
npm test -- --run
```

---

## Schema Changes Summary

```prisma
model WorkspaceJournalSubscription {
  // ... existing fields ...

  // Dual-path generation options
  cadence            String  @default("daily")    // daily, weekly, sprint
  groupingMethod     String  @default("temporal") // temporal, cluster
  preferredFramework String?                      // STAR, ONE_ON_ONE, etc.
}
```

---

## Related Files

| File | Purpose |
|------|---------|
| `journal-auto-generator.service.ts` | Main service - all generation logic |
| `journal-auto-generator.service.test.ts` | 86 tests covering all phases |
| `journal-subscription.types.ts` | Types, constants, utilities |
| `clustering.service.ts` | ClusteringService for cluster grouping |
| `narrative-frameworks.ts` | Career-story NARRATIVE_FRAMEWORKS |

---

## Feature Summary

The dual-path draft generation feature now supports:

1. **Cadence-based lookback**: Daily (1 day), Weekly (7 days), Sprint (14 days)
2. **Grouping methods**:
   - `temporal`: Groups activities by date
   - `cluster`: Groups activities by shared cross-tool references (e.g., JIRA ticket IDs)
3. **Framework-structured content**:
   - Journal frameworks: ONE_ON_ONE, SKILL_GAP, PROJECT_IMPACT
   - Career-story frameworks: STAR, STARL, CAR, PAR, SAR, SOAR, SHARE, CARL
4. **Output includes**:
   - Framework-specific titles and descriptions
   - Content structured by framework sections
   - Activity summary grouped by method
   - format7Data with framework and grouping info

---

## Commands

```bash
# Run migrations
cd backend && npx prisma migrate dev --name <name>

# Type check
npx tsc --noEmit

# Run specific test file
npm test -- --run src/services/journal-auto-generator.service.test.ts

# Run all tests
npm test -- --run
```

---

## Code Masters Refactoring (9+ Score Target)

### Completed Improvements

| Expert | Concern | Resolution |
|--------|---------|------------|
| **KB** | 7 parameters in `generateJournalEntry` | Created `GenerationContext` interface |
| **KB** | 60-line format7Data construction | Extracted `buildFormat7Data()` method |
| **Fowler** | `ClusteringService` instantiated inside method | Injected via constructor |
| **Sandi** | `frameworkTitles` object violates O/C | Created `FRAMEWORK_METADATA` registry |
| **Uncle Bob** | Magic strings ('private', 'medium') | Extracted constants: `DEFAULT_VISIBILITY`, `DEFAULT_IMPORTANCE`, `DEFAULT_CATEGORY` |
| **Uncle Bob** | `subscription: any` | Added `SubscriptionForProcessing` interface |
| **DHH** | 4 nearly identical notification methods | Consolidated to single `sendNotification()` with `NOTIFICATION_CONFIGS` registry |
| **Fowler** | `preferredFramework?: string` | Use `JournalFramework` type consistently |

### New Types Added (journal-subscription.types.ts)

```typescript
// Constants
export const DEFAULT_VISIBILITY = 'private';
export const DEFAULT_IMPORTANCE = 'medium';
export const DEFAULT_CATEGORY = 'Daily Summary';
export const AUTO_GENERATED_TAGS = ['auto-generated', 'draft'];

// Framework metadata registry (O/C Principle)
export const FRAMEWORK_METADATA: Record<string, FrameworkMetadata>;

// Generation context (Parameter Object Pattern)
export interface GenerationContext { ... }
export interface GeneratedEntry { ... }
export interface Format7Data { ... }
export interface Format7Activity { ... }

// Notification handling
export type NotificationType = 'entry_ready' | 'no_activity' | 'missing_tools' | 'generation_failed';
export const NOTIFICATION_CONFIGS: Record<NotificationType, NotificationConfig>;

// Subscription typing
export interface SubscriptionForProcessing { ... }
```

### Service Improvements

1. **Constructor Dependency Injection**:
   ```typescript
   constructor(
     journalService?: JournalService,
     clusteringService?: ClusteringService
   )
   ```

2. **Single Notification Method**:
   ```typescript
   private async sendNotification(
     type: NotificationType,
     context: NotificationContext,
     data?: NotificationData
   ): Promise<void>
   ```

3. **Extracted Helper Methods**:
   - `buildFormat7Data()` - Format7 data construction
   - `buildFormat7Activities()` - Activity array building
   - `buildFormat7DataNetwork()` - Network view data
   - `isWorkspaceActive()` - Workspace validation
   - `validateFramework()` - Framework type validation
   - `fetchAndValidateActivity()` - Activity fetching

4. **Backward Compatible API**:
   ```typescript
   // Supports both new context object and legacy positional parameters
   async generateJournalEntry(
     contextOrActivityData: GenerationContext | ToolActivityData[],
     customPrompt?: string | null,
     ...
   )
   ```

---

## Test Results (After Refactoring)

```
Full suite: 463 passed | 4 skipped | 50 todo
Journal auto-generator: 86 tests | 82 passed | 4 skipped
```

---

## Future Enhancements (Optional)

- [ ] Integrate with AI service for actual content generation
- [ ] Add more journal-specific frameworks
- [ ] Support custom framework definitions per user/workspace
- [ ] Add activity importance scoring
- [ ] Support hybrid grouping (temporal + cluster)
