import { prisma } from '../lib/prisma';
import {
  SUPPORTED_SOURCES,
  TEMPORAL_BUCKETS,
  TemporalBucket,
  TemporalBuckets,
  ActivityResponse,
  JournalEntryActivitiesResponse,
  SourceStatsResponse,
  TemporalStatsResponse,
  ActivityStatsResponse,
  ActivityMeta,
  ActivitySource,
  ActivityWithStory,
  AllActivitiesResponse,
  GetAllActivitiesInput,
  ActivityGroup,
  StoryMetadata,
  StoryPhase
} from '../types/activity.types';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  subDays,
  subWeeks
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum number of sources to return in stats */
const MAX_SOURCES = 20;

/** Cache control values */
export const CACHE_CONTROL = {
  ACTIVITIES: 'private, max-age=30',
  STATS: 'private, max-age=60'
} as const;

/** Default fallback color for unknown sources */
const DEFAULT_SOURCE_COLOR = '#888888';

/** Default fallback icon for unknown sources */
const DEFAULT_SOURCE_ICON = 'default';

// =============================================================================
// CUSTOM ERRORS
// =============================================================================

export class ActivityNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActivityNotFoundError';
  }
}

export class ActivityAccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActivityAccessDeniedError';
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a source is a known supported source
 */
export function isValidSource(source: string): source is ActivitySource {
  return source in SUPPORTED_SOURCES;
}

/**
 * Validate timezone string (basic validation)
 * Returns true if the timezone appears valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') return false;
  // Basic format check: UTC, or Region/City format
  if (timezone === 'UTC') return true;
  // Check for IANA timezone format (e.g., "America/New_York")
  return /^[A-Za-z_]+\/[A-Za-z_]+$/.test(timezone);
}

/**
 * Log activity service operations for debugging
 */
function logOperation(operation: string, details: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[ActivityService] ${operation}:`, JSON.stringify(details));
  }
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class ActivityService {
  private readonly isDemoMode: boolean;

  constructor(isDemoMode = false) {
    this.isDemoMode = isDemoMode;
  }

  /**
   * Get the sourceMode based on isDemoMode flag
   */
  private get sourceMode(): 'demo' | 'production' {
    return this.isDemoMode ? 'demo' : 'production';
  }

  // ===========================================================================
  // PUBLIC METHODS
  // ===========================================================================

  /**
   * Get activities for a specific journal entry (sub-resource pattern)
   *
   * Note: sourceMode is derived from the journal entry, not the request header.
   * This prevents header/data mismatches.
   */
  async getActivitiesForJournalEntry(
    journalEntryId: string,
    userId: string,
    options: { page: number; limit: number; source?: string }
  ): Promise<JournalEntryActivitiesResponse> {
    logOperation('getActivitiesForJournalEntry', {
      journalEntryId,
      userId,
      page: options.page,
      limit: options.limit,
      source: options.source
    });

    // 1. Fetch journal entry to get activityIds and sourceMode
    const journalEntry = await prisma.journalEntry.findFirst({
      where: { id: journalEntryId }
    });

    if (!journalEntry) {
      throw new ActivityNotFoundError('Journal entry not found');
    }

    // 2. Validate user ownership
    if (journalEntry.authorId !== userId) {
      throw new ActivityAccessDeniedError('Access denied: You can only view activities for your own journal entries');
    }

    // 3. Validate source filter if provided (warn but don't block for unknown sources)
    if (options.source && !isValidSource(options.source)) {
      logOperation('getActivitiesForJournalEntry:unknownSource', {
        source: options.source,
        journalEntryId
      });
    }

    // 4. Get activityIds from journal entry
    const activityIds = journalEntry.activityIds || [];

    if (activityIds.length === 0) {
      return {
        data: [],
        pagination: {
          page: options.page,
          limit: options.limit,
          total: 0,
          totalPages: 0,
          hasMore: false
        },
        meta: {
          journalEntryId,
          sourceMode: journalEntry.sourceMode as 'demo' | 'production'
        }
      };
    }

    // 5. Determine which table to query based on journal entry's sourceMode
    const isDemoEntry = journalEntry.sourceMode === 'demo';

    // 6. Build where clause
    const whereClause: any = {
      id: { in: activityIds }
    };
    if (options.source) {
      whereClause.source = options.source;
    }

    // 7. Query activities with pagination
    const skip = (options.page - 1) * options.limit;

    let activities: any[];
    let total: number;

    if (isDemoEntry) {
      [activities, total] = await Promise.all([
        prisma.demoToolActivity.findMany({
          where: whereClause,
          orderBy: { timestamp: 'desc' },
          skip,
          take: options.limit
        }),
        prisma.demoToolActivity.count({ where: whereClause })
      ]);
    } else {
      [activities, total] = await Promise.all([
        prisma.toolActivity.findMany({
          where: whereClause,
          orderBy: { timestamp: 'desc' },
          skip,
          take: options.limit
        }),
        prisma.toolActivity.count({ where: whereClause })
      ]);
    }

    // 8. Transform to response format
    const data: ActivityResponse[] = activities.map(a => ({
      id: a.id,
      source: a.source,
      sourceId: a.sourceId,
      sourceUrl: a.sourceUrl,
      title: a.title,
      description: a.description,
      timestamp: a.timestamp.toISOString(),
      crossToolRefs: a.crossToolRefs || [],
      rawData: a.rawData as ActivityResponse['rawData'] ?? null
    }));

    const totalPages = Math.ceil(total / options.limit);

    return {
      data,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages,
        hasMore: options.page < totalPages
      },
      meta: {
        journalEntryId,
        sourceMode: journalEntry.sourceMode as 'demo' | 'production'
      }
    };
  }

  /**
   * Get activity stats grouped by source or temporal bucket
   *
   * Note: This uses isDemoMode from the header since there's no journal entry context.
   */
  async getActivityStats(
    userId: string,
    groupBy: 'source' | 'temporal',
    timezone?: string
  ): Promise<ActivityStatsResponse> {
    const effectiveTimezone = timezone || 'UTC';

    logOperation('getActivityStats', {
      userId,
      groupBy,
      timezone: effectiveTimezone,
      isDemoMode: this.isDemoMode
    });

    // Validate timezone for temporal grouping
    if (groupBy === 'temporal' && !isValidTimezone(effectiveTimezone)) {
      logOperation('getActivityStats:invalidTimezone', {
        timezone: effectiveTimezone,
        fallback: 'UTC'
      });
    }

    if (groupBy === 'source') {
      return this.getStatsGroupedBySource(userId);
    } else {
      return this.getStatsGroupedByTemporal(userId, effectiveTimezone);
    }
  }

  /**
   * Get activity metadata for a list of journal entries (batch operation)
   * Used to enrich journal entries with activity counts/sources
   */
  async getActivityMetaForEntries(
    userId: string,
    entryIds: string[]
  ): Promise<Map<string, ActivityMeta>> {
    const result = new Map<string, ActivityMeta>();

    // Fetch all journal entries with their activityIds
    const entries = await prisma.journalEntry.findMany({
      where: {
        id: { in: entryIds },
        authorId: userId
      },
      select: {
        id: true,
        activityIds: true,
        sourceMode: true
      }
    });

    // Group by sourceMode to batch queries
    const demoEntries = entries.filter(e => e.sourceMode === 'demo');
    const prodEntries = entries.filter(e => e.sourceMode === 'production');

    // Fetch demo activities
    if (demoEntries.length > 0) {
      const allDemoActivityIds = demoEntries.flatMap(e => e.activityIds || []);
      if (allDemoActivityIds.length > 0) {
        const demoActivities = await prisma.demoToolActivity.findMany({
          where: { id: { in: allDemoActivityIds } },
          select: { id: true, source: true, timestamp: true }
        });

        // Build activity lookup
        const activityLookup = new Map(demoActivities.map(a => [a.id, a]));

        for (const entry of demoEntries) {
          const entryActivities = (entry.activityIds || [])
            .map(id => activityLookup.get(id))
            .filter(Boolean) as typeof demoActivities;

          result.set(entry.id, this.computeActivityMeta(entryActivities));
        }
      }
    }

    // Fetch production activities
    if (prodEntries.length > 0) {
      const allProdActivityIds = prodEntries.flatMap(e => e.activityIds || []);
      if (allProdActivityIds.length > 0) {
        const prodActivities = await prisma.toolActivity.findMany({
          where: { id: { in: allProdActivityIds } },
          select: { id: true, source: true, timestamp: true }
        });

        const activityLookup = new Map(prodActivities.map(a => [a.id, a]));

        for (const entry of prodEntries) {
          const entryActivities = (entry.activityIds || [])
            .map(id => activityLookup.get(id))
            .filter(Boolean) as typeof prodActivities;

          result.set(entry.id, this.computeActivityMeta(entryActivities));
        }
      }
    }

    // Set empty meta for entries with no activities
    for (const entry of entries) {
      if (!result.has(entry.id)) {
        result.set(entry.id, {
          totalCount: 0,
          sources: [],
          dateRange: { earliest: null, latest: null }
        });
      }
    }

    return result;
  }

  /**
   * Get all activities for a user with optional grouping
   * Used for journal tab views (Timeline, By Source, By Story)
   */
  async getAllActivities(
    userId: string,
    options: GetAllActivitiesInput
  ): Promise<AllActivitiesResponse> {
    logOperation('getAllActivities', {
      userId,
      groupBy: options.groupBy,
      page: options.page,
      limit: options.limit,
      isDemoMode: this.isDemoMode
    });

    const skip = (options.page - 1) * options.limit;

    // Build where clause
    const whereClause: any = { userId };
    if (options.source) {
      whereClause.source = options.source;
    }

    // Fetch activities
    let activities: any[];
    let total: number;

    if (this.isDemoMode) {
      [activities, total] = await Promise.all([
        prisma.demoToolActivity.findMany({
          where: whereClause,
          orderBy: { timestamp: 'desc' },
          skip,
          take: options.limit
        }),
        prisma.demoToolActivity.count({ where: whereClause })
      ]);
    } else {
      [activities, total] = await Promise.all([
        prisma.toolActivity.findMany({
          where: whereClause,
          orderBy: { timestamp: 'desc' },
          skip,
          take: options.limit
        }),
        prisma.toolActivity.count({ where: whereClause })
      ]);
    }

    // Get story assignments for activities
    const storyAssignments = await this.getStoryAssignmentsForActivities(
      userId,
      activities.map(a => a.id)
    );

    // Transform to response format with story info
    const activitiesWithStory: ActivityWithStory[] = activities.map(a => {
      const storyInfo = storyAssignments.get(a.id);
      return {
        id: a.id,
        source: a.source,
        sourceId: a.sourceId,
        sourceUrl: a.sourceUrl,
        title: a.title,
        description: a.description,
        timestamp: a.timestamp.toISOString(),
        crossToolRefs: a.crossToolRefs || [],
        rawData: a.rawData as ActivityWithStory['rawData'] ?? null,
        storyId: storyInfo?.storyId || null,
        storyTitle: storyInfo?.storyTitle || null
      };
    });

    const totalPages = Math.ceil(total / options.limit);
    const pagination = {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
      hasMore: options.page < totalPages
    };

    // If no grouping requested, return flat list
    if (!options.groupBy) {
      return {
        data: activitiesWithStory,
        pagination,
        meta: {
          groupBy: null,
          sourceMode: this.sourceMode
        }
      };
    }

    // For story grouping, use a different approach that shows ALL journal entries
    // This ensures all stories are visible even when activities overlap
    if (options.groupBy === 'story') {
      const groups = await this.getStoryGroupsFromEntries(userId, activities);
      return {
        groups,
        pagination,
        meta: {
          groupBy: options.groupBy,
          sourceMode: this.sourceMode
        }
      };
    }

    // Group activities for temporal/source grouping
    const groups = this.groupActivities(
      activitiesWithStory,
      options.groupBy,
      options.timezone
    );

    return {
      groups,
      pagination,
      meta: {
        groupBy: options.groupBy,
        sourceMode: this.sourceMode,
        timezone: options.groupBy === 'temporal' ? options.timezone : undefined
      }
    };
  }

  /**
   * Get story groups by fetching all journal entries first
   * This ensures ALL entries are shown, even when activities overlap between entries
   */
  private async getStoryGroupsFromEntries(
    userId: string,
    fetchedActivities: any[]
  ): Promise<ActivityGroup[]> {
    // Fetch ALL journal entries for user (both temporal and cluster)
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        authorId: userId,
        sourceMode: this.sourceMode
      },
      select: {
        id: true,
        title: true,
        description: true,
        timeRangeStart: true,
        timeRangeEnd: true,
        category: true,
        skills: true,
        tags: true,
        createdAt: true,
        isPublished: true,
        activityIds: true,
        groupingMethod: true,
        format7Data: true
      },
      orderBy: [
        // Cluster entries first, then by recency
        { groupingMethod: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Get ALL activity IDs from all journal entries
    const allEntryActivityIds = new Set<string>();
    for (const entry of journalEntries) {
      for (const actId of entry.activityIds || []) {
        allEntryActivityIds.add(actId);
      }
    }

    // Fetch all activities that belong to any journal entry
    // Note: Activities can appear in multiple stories (m:n relationship)
    let allEntryActivities: any[];
    if (this.isDemoMode) {
      allEntryActivities = await prisma.demoToolActivity.findMany({
        where: {
          id: { in: Array.from(allEntryActivityIds) },
          userId // Ensure we only fetch user's activities
        }
      });
    } else {
      allEntryActivities = await prisma.toolActivity.findMany({
        where: {
          id: { in: Array.from(allEntryActivityIds) },
          userId // Ensure we only fetch user's activities
        }
      });
    }

    // Build activity lookup map from fetched entry activities
    const activityMap = new Map(allEntryActivities.map(a => [a.id, a]));

    const groups: ActivityGroup[] = [];
    // Track activities shown in any story (for unassigned calculation only)
    const activitiesInAnyStory = new Set<string>();

    // Process each journal entry as a group
    // Note: Same activity CAN appear in multiple stories (m:n relationship)
    for (const entry of journalEntries) {
      // Get activities for this entry
      const entryActivities: ActivityWithStory[] = [];

      for (const actId of entry.activityIds || []) {
        const activity = activityMap.get(actId);
        if (activity) {
          // Activity can appear in multiple stories - no deduplication here
          entryActivities.push({
            id: activity.id,
            source: activity.source,
            sourceId: activity.sourceId,
            sourceUrl: activity.sourceUrl,
            title: activity.title,
            description: activity.description,
            timestamp: activity.timestamp.toISOString(),
            crossToolRefs: activity.crossToolRefs || [],
            rawData: activity.rawData as ActivityWithStory['rawData'] ?? null,
            storyId: entry.id,
            storyTitle: entry.title
          });
          // Track for unassigned calculation
          activitiesInAnyStory.add(actId);
        }
      }

      // Add group for every journal entry (even if no activities found - could be data issue)
      // Show total count from activityIds, not just fetched activities
      const totalActivityCount = (entry.activityIds || []).length;

      // Extract enhanced fields from format7Data
      const format7Data = entry.format7Data as Record<string, unknown> | null;
      const phases = format7Data?.phases as StoryPhase[] | undefined;
      const impactHighlights = format7Data?.impactHighlights as string[] | undefined;
      const dominantRole = format7Data?.dominantRole as 'Led' | 'Contributed' | 'Participated' | undefined;
      const activityEdges = format7Data?.activityEdges as Array<{
        activityId: string;
        type: 'primary' | 'supporting' | 'contextual' | 'outcome';
        message: string;
      }> | undefined;

      // Extract topics from tags (tags with topic: prefix)
      const topics = (entry.tags || [])
        .filter(tag => tag.startsWith('topic:'))
        .map(tag => tag.slice(6));

      groups.push({
        key: entry.id,
        label: entry.title,
        count: totalActivityCount,
        activities: entryActivities,
        storyMetadata: {
          id: entry.id,
          title: entry.title,
          description: entry.description,
          timeRangeStart: entry.timeRangeStart?.toISOString() || null,
          timeRangeEnd: entry.timeRangeEnd?.toISOString() || null,
          category: entry.category,
          skills: entry.skills || [],
          createdAt: entry.createdAt.toISOString(),
          isPublished: entry.isPublished || false,
          type: 'journal_entry' as const,
          groupingMethod: entry.groupingMethod as 'time' | 'cluster' | 'manual' | 'ai' | undefined,
          // Enhanced fields from LLM generation
          topics: topics.length > 0 ? topics : undefined,
          impactHighlights: impactHighlights && impactHighlights.length > 0 ? impactHighlights : undefined,
          phases: phases && phases.length > 0 ? phases : undefined,
          dominantRole: dominantRole || null,
          activityEdges: activityEdges && activityEdges.length > 0 ? activityEdges : undefined
        }
      });
    }

    // Add unassigned activities (from original fetch, not in any journal entry)
    const fetchedActivityIds = new Set(fetchedActivities.map(a => a.id));
    const unassignedActivities: ActivityWithStory[] = [];

    for (const activity of fetchedActivities) {
      if (!allEntryActivityIds.has(activity.id)) {
        unassignedActivities.push({
          id: activity.id,
          source: activity.source,
          sourceId: activity.sourceId,
          sourceUrl: activity.sourceUrl,
          title: activity.title,
          description: activity.description,
          timestamp: activity.timestamp.toISOString(),
          crossToolRefs: activity.crossToolRefs || [],
          rawData: activity.rawData as ActivityWithStory['rawData'] ?? null,
          storyId: null,
          storyTitle: null
        });
      }
    }

    if (unassignedActivities.length > 0) {
      groups.push({
        key: 'unassigned',
        label: 'Unassigned',
        count: unassignedActivities.length,
        activities: unassignedActivities
      });
    }

    return groups;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Get activity counts grouped by source
   */
  private async getStatsGroupedBySource(userId: string): Promise<SourceStatsResponse> {
    // Aggregate by source (limited to prevent unbounded response)
    let groups: Array<{ source: string; _count: { id: number } }>;

    if (this.isDemoMode) {
      const result = await prisma.demoToolActivity.groupBy({
        by: ['source'],
        where: { userId },
        _count: { id: true }
      });
      // Sort by count descending and take top MAX_SOURCES
      groups = result
        .sort((a, b) => b._count.id - a._count.id)
        .slice(0, MAX_SOURCES);
    } else {
      const result = await prisma.toolActivity.groupBy({
        by: ['source'],
        where: { userId },
        _count: { id: true }
      });
      groups = result
        .sort((a, b) => b._count.id - a._count.id)
        .slice(0, MAX_SOURCES);
    }

    // Count journal entries per source
    const journalEntryCounts = await this.getJournalEntryCountsBySource(userId);

    const totalActivities = groups.reduce((sum: number, g) => sum + g._count.id, 0);
    const totalJournalEntries = Object.values(journalEntryCounts).reduce((a, b) => a + b, 0);

    return {
      data: groups.map((g) => {
        const sourceInfo = isValidSource(g.source)
          ? SUPPORTED_SOURCES[g.source]
          : null;
        return {
          source: g.source,
          displayName: sourceInfo?.displayName || g.source,
          color: sourceInfo?.color || DEFAULT_SOURCE_COLOR,
          icon: sourceInfo?.icon || DEFAULT_SOURCE_ICON,
          activityCount: g._count.id,
          journalEntryCount: journalEntryCounts[g.source] || 0
        };
      }),
      meta: {
        groupBy: 'source',
        totalActivities,
        totalJournalEntries,
        sourceCount: groups.length,
        maxSources: MAX_SOURCES
      }
    };
  }

  /**
   * Get activity counts grouped by temporal bucket (mutually exclusive)
   */
  private async getStatsGroupedByTemporal(
    userId: string,
    timezone: string
  ): Promise<TemporalStatsResponse> {
    const now = new Date();
    const buckets = this.computeMutuallyExclusiveBuckets(now, timezone);

    // Get all user's activities to classify into buckets
    // Note: For large datasets, this could be optimized with raw SQL CASE statements
    let activities: Array<{ timestamp: Date }>;

    if (this.isDemoMode) {
      activities = await prisma.demoToolActivity.findMany({
        where: { userId },
        select: { timestamp: true }
      });
    } else {
      activities = await prisma.toolActivity.findMany({
        where: { userId },
        select: { timestamp: true }
      });
    }

    // Classify each activity into a bucket
    const bucketCounts: Record<TemporalBucket, number> = {
      today: 0,
      yesterday: 0,
      this_week: 0,
      last_week: 0,
      this_month: 0,
      older: 0
    };

    for (const activity of activities) {
      const bucket = this.classifyTimestamp(activity.timestamp, buckets);
      bucketCounts[bucket]++;
    }

    // Get journal entry counts per bucket
    const journalEntryCounts = await this.getJournalEntryCountsByTemporal(userId, buckets);

    const totalActivities = Object.values(bucketCounts).reduce((a, b) => a + b, 0);
    const totalJournalEntries = Object.values(journalEntryCounts).reduce((a, b) => a + b, 0);

    return {
      data: TEMPORAL_BUCKETS.map(bucket => ({
        bucket,
        displayName: buckets[bucket].displayName,
        dateRange: {
          start: buckets[bucket].start?.toISOString() || null,
          end: buckets[bucket].end?.toISOString() || null
        },
        activityCount: bucketCounts[bucket],
        journalEntryCount: journalEntryCounts[bucket] || 0
      })),
      meta: {
        groupBy: 'temporal',
        timezone,
        totalActivities,
        totalJournalEntries
      }
    };
  }

  /**
   * Compute mutually exclusive temporal bucket boundaries
   * Each activity belongs to exactly one bucket
   */
  private computeMutuallyExclusiveBuckets(now: Date, timezone: string): TemporalBuckets {
    // Convert to user's timezone for accurate day boundaries
    let zonedNow: Date;
    try {
      zonedNow = toZonedTime(now, timezone);
      // Check if the result is a valid date
      if (isNaN(zonedNow.getTime())) {
        zonedNow = now;
      }
    } catch {
      // Fallback to UTC if invalid timezone
      zonedNow = now;
    }

    const todayStart = startOfDay(zonedNow);
    const todayEnd = endOfDay(zonedNow);
    const yesterdayStart = startOfDay(subDays(zonedNow, 1));
    const yesterdayEnd = endOfDay(subDays(zonedNow, 1));

    // This week: Monday through day-before-yesterday (excludes today and yesterday)
    const weekStart = startOfWeek(zonedNow, { weekStartsOn: 1 });
    const dayBeforeYesterdayEnd = endOfDay(subDays(zonedNow, 2));

    // Last week
    const lastWeekStart = startOfWeek(subWeeks(zonedNow, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(zonedNow, 1), { weekStartsOn: 1 });

    // This month: First of month through day before last week started
    const monthStart = startOfMonth(zonedNow);
    const beforeLastWeekEnd = subDays(lastWeekStart, 1);

    return {
      today: {
        displayName: 'Today',
        start: todayStart,
        end: todayEnd
      },
      yesterday: {
        displayName: 'Yesterday',
        start: yesterdayStart,
        end: yesterdayEnd
      },
      this_week: {
        displayName: 'This Week',
        start: weekStart > dayBeforeYesterdayEnd ? null : weekStart,
        end: dayBeforeYesterdayEnd < weekStart ? null : dayBeforeYesterdayEnd
      },
      last_week: {
        displayName: 'Last Week',
        start: lastWeekStart,
        end: lastWeekEnd
      },
      this_month: {
        displayName: 'This Month',
        start: monthStart > beforeLastWeekEnd ? null : monthStart,
        end: beforeLastWeekEnd < monthStart ? null : beforeLastWeekEnd
      },
      older: {
        displayName: 'Older',
        start: null,
        end: subDays(monthStart, 1)
      }
    };
  }

  /**
   * Classify a timestamp into a temporal bucket
   */
  private classifyTimestamp(timestamp: Date, buckets: TemporalBuckets): TemporalBucket {
    // Check in order of specificity (most recent first)
    for (const bucket of TEMPORAL_BUCKETS) {
      const range = buckets[bucket];

      // Skip buckets that are disabled (both start and end are null)
      // This happens for "this_week" on Monday or "this_month" early in month
      if (range.start === null && range.end === null) {
        continue;
      }

      const afterStart = range.start === null || timestamp >= range.start;
      const beforeEnd = range.end === null || timestamp <= range.end;

      if (afterStart && beforeEnd) {
        return bucket;
      }
    }

    // Default to older if no match
    return 'older';
  }

  /**
   * Get journal entry counts grouped by source
   */
  private async getJournalEntryCountsBySource(userId: string): Promise<Record<string, number>> {
    // Get all journal entries with their activityIds
    const entries = await prisma.journalEntry.findMany({
      where: {
        authorId: userId,
        sourceMode: this.sourceMode
      },
      select: {
        activityIds: true
      }
    });

    // Get all activity IDs
    const allActivityIds = entries.flatMap(e => e.activityIds || []);
    if (allActivityIds.length === 0) return {};

    // Get sources for these activities
    let activities: Array<{ id: string; source: string }>;

    if (this.isDemoMode) {
      activities = await prisma.demoToolActivity.findMany({
        where: { id: { in: allActivityIds } },
        select: { id: true, source: true }
      });
    } else {
      activities = await prisma.toolActivity.findMany({
        where: { id: { in: allActivityIds } },
        select: { id: true, source: true }
      });
    }

    // Build activity -> source lookup
    const activitySources = new Map(activities.map((a) => [a.id, a.source]));

    // Count entries per source
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      const sources = new Set((entry.activityIds || [])
        .map((id: string) => activitySources.get(id))
        .filter((s): s is string => Boolean(s)));

      for (const source of sources) {
        counts[source] = (counts[source] || 0) + 1;
      }
    }

    return counts;
  }

  /**
   * Get journal entry counts grouped by temporal bucket
   */
  private async getJournalEntryCountsByTemporal(
    userId: string,
    buckets: TemporalBuckets
  ): Promise<Record<TemporalBucket, number>> {
    const entries = await prisma.journalEntry.findMany({
      where: {
        authorId: userId,
        sourceMode: this.sourceMode
      },
      select: {
        timeRangeStart: true,
        timeRangeEnd: true,
        createdAt: true
      }
    });

    const counts: Record<TemporalBucket, number> = {
      today: 0,
      yesterday: 0,
      this_week: 0,
      last_week: 0,
      this_month: 0,
      older: 0
    };

    for (const entry of entries) {
      // Use timeRangeStart if available, otherwise createdAt
      const timestamp = entry.timeRangeStart || entry.createdAt;
      const bucket = this.classifyTimestamp(timestamp, buckets);
      counts[bucket]++;
    }

    return counts;
  }

  /**
   * Get story assignments for a list of activity IDs
   * Returns a map of activityId -> { storyId, storyTitle }
   */
  private async getStoryAssignmentsForActivities(
    userId: string,
    activityIds: string[]
  ): Promise<Map<string, { storyId: string; storyTitle: string }>> {
    const result = new Map<string, { storyId: string; storyTitle: string }>();

    if (activityIds.length === 0) return result;

    // Find all career stories and journal entries that contain these activities
    const [careerStories, journalEntries] = await Promise.all([
      prisma.careerStory.findMany({
        where: {
          userId,
          sourceMode: this.sourceMode,
          activityIds: { hasSome: activityIds }
        },
        select: { id: true, title: true, activityIds: true }
      }),
      prisma.journalEntry.findMany({
        where: {
          authorId: userId,
          sourceMode: this.sourceMode,
          activityIds: { hasSome: activityIds }
        },
        select: { id: true, title: true, activityIds: true, groupingMethod: true }
      })
    ]);

    // Map activities to their stories
    // Priority: CareerStory > Cluster JournalEntry > Temporal JournalEntry
    // This ensures cluster-based stories are visible even when activities overlap with temporal entries

    // 1. Career stories have highest priority
    for (const story of careerStories) {
      for (const activityId of story.activityIds) {
        if (activityIds.includes(activityId)) {
          result.set(activityId, { storyId: story.id, storyTitle: story.title });
        }
      }
    }

    // 2. Cluster-based journal entries (semantic grouping) take priority over temporal
    const clusterEntries = journalEntries.filter(e => e.groupingMethod === 'cluster');
    const temporalEntries = journalEntries.filter(e => e.groupingMethod !== 'cluster');

    for (const entry of clusterEntries) {
      for (const activityId of entry.activityIds || []) {
        if (activityIds.includes(activityId) && !result.has(activityId)) {
          result.set(activityId, { storyId: entry.id, storyTitle: entry.title });
        }
      }
    }

    // 3. Temporal entries get remaining unassigned activities
    for (const entry of temporalEntries) {
      for (const activityId of entry.activityIds || []) {
        if (activityIds.includes(activityId) && !result.has(activityId)) {
          result.set(activityId, { storyId: entry.id, storyTitle: entry.title });
        }
      }
    }

    return result;
  }

  /**
   * Group activities by temporal bucket, source, or story
   */
  private groupActivities(
    activities: ActivityWithStory[],
    groupBy: 'temporal' | 'source' | 'story',
    timezone: string = 'UTC'
  ): Array<{ key: string; label: string; count: number; activities: ActivityWithStory[] }> {
    if (groupBy === 'temporal') {
      return this.groupByTemporal(activities, timezone);
    } else if (groupBy === 'source') {
      return this.groupBySource(activities);
    } else {
      return this.groupByStory(activities);
    }
  }

  /**
   * Group activities by temporal bucket
   */
  private groupByTemporal(
    activities: ActivityWithStory[],
    timezone: string
  ): Array<{ key: string; label: string; count: number; activities: ActivityWithStory[] }> {
    const now = new Date();
    const buckets = this.computeMutuallyExclusiveBuckets(now, timezone);

    const groups: Record<TemporalBucket, ActivityWithStory[]> = {
      today: [],
      yesterday: [],
      this_week: [],
      last_week: [],
      this_month: [],
      older: []
    };

    for (const activity of activities) {
      const timestamp = new Date(activity.timestamp);
      const bucket = this.classifyTimestamp(timestamp, buckets);
      groups[bucket].push(activity);
    }

    // Return only non-empty buckets in order
    return TEMPORAL_BUCKETS
      .filter(bucket => groups[bucket].length > 0)
      .map(bucket => ({
        key: bucket,
        label: buckets[bucket].displayName,
        count: groups[bucket].length,
        activities: groups[bucket]
      }));
  }

  /**
   * Group activities by source
   */
  private groupBySource(
    activities: ActivityWithStory[]
  ): Array<{ key: string; label: string; count: number; activities: ActivityWithStory[] }> {
    const groups: Record<string, ActivityWithStory[]> = {};

    for (const activity of activities) {
      if (!groups[activity.source]) {
        groups[activity.source] = [];
      }
      groups[activity.source].push(activity);
    }

    // Sort by count descending
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([source, sourceActivities]) => {
        const sourceInfo = isValidSource(source)
          ? SUPPORTED_SOURCES[source]
          : null;
        return {
          key: source,
          label: sourceInfo?.displayName || source,
          count: sourceActivities.length,
          activities: sourceActivities
        };
      });
  }

  /**
   * Group activities by story assignment
   * Note: Story metadata is fetched separately and attached in getAllActivities
   */
  private groupByStory(
    activities: ActivityWithStory[]
  ): ActivityGroup[] {
    const groups: Record<string, { label: string; activities: ActivityWithStory[] }> = {
      unassigned: { label: 'Unassigned', activities: [] }
    };

    for (const activity of activities) {
      const storyId = activity.storyId || 'unassigned';
      if (!groups[storyId]) {
        groups[storyId] = {
          label: activity.storyTitle || 'Unknown Story',
          activities: []
        };
      }
      groups[storyId].activities.push(activity);
    }

    // Sort: stories with activities first, then unassigned
    return Object.entries(groups)
      .filter(([_, group]) => group.activities.length > 0)
      .sort((a, b) => {
        // Unassigned goes last
        if (a[0] === 'unassigned') return 1;
        if (b[0] === 'unassigned') return -1;
        // Sort by count descending
        return b[1].activities.length - a[1].activities.length;
      })
      .map(([key, group]) => ({
        key,
        label: group.label,
        count: group.activities.length,
        activities: group.activities
      }));
  }

  /**
   * Fetch story metadata for a list of story IDs
   * Currently only fetches from JournalEntry (draft stories)
   * CareerStory is for published narratives and handled separately
   */
  private async getStoryMetadata(
    userId: string,
    storyIds: string[]
  ): Promise<Map<string, StoryMetadata>> {
    const result = new Map<string, StoryMetadata>();

    if (storyIds.length === 0) return result;

    // Fetch journal entries (draft stories)
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        id: { in: storyIds },
        authorId: userId,
        sourceMode: this.sourceMode
      },
      select: {
        id: true,
        title: true,
        description: true,
        timeRangeStart: true,
        timeRangeEnd: true,
        category: true,
        skills: true,
        createdAt: true,
        isPublished: true
      }
    });

    // Map journal entries
    for (const entry of journalEntries) {
      result.set(entry.id, {
        id: entry.id,
        title: entry.title,
        description: entry.description,
        timeRangeStart: entry.timeRangeStart?.toISOString() || null,
        timeRangeEnd: entry.timeRangeEnd?.toISOString() || null,
        category: entry.category || null,
        skills: entry.skills || [],
        createdAt: entry.createdAt.toISOString(),
        isPublished: entry.isPublished || false,
        type: 'journal_entry'
      });
    }

    return result;
  }

  /**
   * Compute activity metadata from a list of activities
   */
  private computeActivityMeta(
    activities: Array<{ source: string; timestamp: Date }>
  ): ActivityMeta {
    if (activities.length === 0) {
      return {
        totalCount: 0,
        sources: [],
        dateRange: { earliest: null, latest: null }
      };
    }

    // Count by source
    const sourceCounts: Record<string, number> = {};
    let earliest = activities[0].timestamp;
    let latest = activities[0].timestamp;

    for (const a of activities) {
      sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1;
      if (a.timestamp < earliest) earliest = a.timestamp;
      if (a.timestamp > latest) latest = a.timestamp;
    }

    return {
      totalCount: activities.length,
      sources: Object.entries(sourceCounts).map(([source, count]) => ({
        source,
        count
      })),
      dateRange: {
        earliest: earliest.toISOString(),
        latest: latest.toISOString()
      }
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a request-scoped ActivityService instance
 */
export function createActivityService(isDemoMode: boolean): ActivityService {
  return new ActivityService(isDemoMode);
}
