/**
 * ActivityPersistenceService
 *
 * Persists tool activities to the database for later clustering.
 * Extracts cross-tool references and stores them for graph-based clustering.
 */

import { PrismaClient, ToolActivity } from '@prisma/client';
import { RefExtractorService, refExtractor } from './ref-extractor.service';
import { isUniqueConstraintError } from '../../lib/prisma-errors';

export interface ActivityInput {
  source: string;
  sourceId: string;
  sourceUrl?: string | null;
  title: string;
  description?: string | null;
  timestamp: Date;
  rawData?: Record<string, unknown> | null;
}

export class ActivityPersistenceService {
  private prisma: PrismaClient;
  private refExtractor: RefExtractorService;

  constructor(prisma: PrismaClient, extractor?: RefExtractorService) {
    this.prisma = prisma;
    this.refExtractor = extractor || refExtractor;
  }

  /**
   * Persist a single activity from MCP tool data
   *
   * @param userId - User ID
   * @param activity - Activity data from MCP tool
   * @returns Created or updated ToolActivity
   */
  async persistActivity(
    userId: string,
    activity: ActivityInput
  ): Promise<ToolActivity> {
    // Extract cross-tool refs from title, description, and raw data
    const crossToolRefs = this.refExtractor.extractRefsFromMultiple([
      activity.title,
      activity.description,
      activity.rawData ? JSON.stringify(activity.rawData) : null,
    ]);

    return this.prisma.toolActivity.upsert({
      where: {
        userId_source_sourceId: {
          userId,
          source: activity.source,
          sourceId: activity.sourceId,
        },
      },
      create: {
        userId,
        source: activity.source,
        sourceId: activity.sourceId,
        sourceUrl: activity.sourceUrl,
        title: activity.title,
        description: activity.description,
        timestamp: activity.timestamp,
        crossToolRefs,
        rawData: activity.rawData as object,
      },
      update: {
        title: activity.title,
        description: activity.description,
        sourceUrl: activity.sourceUrl,
        crossToolRefs,
        rawData: activity.rawData as object,
      },
    });
  }

  /**
   * Persist multiple activities in a batch
   *
   * @param userId - User ID
   * @param activities - Array of activity data
   * @returns Number of activities persisted
   */
  async persistActivities(
    userId: string,
    activities: ActivityInput[]
  ): Promise<number> {
    let count = 0;

    // Upsert each activity individually (no transaction — P2002 on one shouldn't abort all)
    for (const activity of activities) {
      const crossToolRefs = this.refExtractor.extractRefsFromMultiple([
        activity.title,
        activity.description,
        activity.rawData ? JSON.stringify(activity.rawData) : null,
      ]);

      try {
        await this.prisma.toolActivity.upsert({
          where: {
            userId_source_sourceId: {
              userId,
              source: activity.source,
              sourceId: activity.sourceId,
            },
          },
          create: {
            userId,
            source: activity.source,
            sourceId: activity.sourceId,
            sourceUrl: activity.sourceUrl,
            title: activity.title,
            description: activity.description,
            timestamp: activity.timestamp,
            crossToolRefs,
            rawData: activity.rawData as object,
          },
          update: {
            title: activity.title,
            description: activity.description,
            sourceUrl: activity.sourceUrl,
            crossToolRefs,
            rawData: activity.rawData as object,
          },
        });
        count++;
      } catch (err) {
        if (isUniqueConstraintError(err)) continue;
        throw err;
      }
    }

    return count;
  }

  /**
   * Get activities for a user within a date range
   *
   * @param userId - User ID
   * @param options - Query options
   * @returns Array of activities
   */
  async getActivities(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      source?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ToolActivity[]> {
    return this.prisma.toolActivity.findMany({
      where: {
        userId,
        ...(options?.source && { source: options.source }),
        ...(options?.startDate || options?.endDate
          ? {
              timestamp: {
                ...(options?.startDate && { gte: options.startDate }),
                ...(options?.endDate && { lte: options.endDate }),
              },
            }
          : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  /**
   * Get activity count for a user
   *
   * @param userId - User ID
   * @returns Count of activities
   */
  async getActivityCount(userId: string): Promise<number> {
    return this.prisma.toolActivity.count({ where: { userId } });
  }

  /**
   * Get unclustered activities (not assigned to any cluster)
   *
   * @param userId - User ID
   * @returns Array of unclustered activities
   */
  async getUnclusteredActivities(userId: string): Promise<ToolActivity[]> {
    return this.prisma.toolActivity.findMany({
      where: {
        userId,
        clusterId: null,
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}
