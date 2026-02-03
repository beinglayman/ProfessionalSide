import { Request, Response } from 'express';
import { JournalService } from '../services/journal.service';
import { sendSuccess, sendError, sendPaginated, asyncHandler } from '../utils/response.utils';
import { createNotificationForEvent } from '../routes/notification.routes';
import {
  createJournalEntrySchema,
  updateJournalEntrySchema,
  getJournalEntriesSchema,
  publishJournalEntrySchema,
  addCommentSchema,
  updateCommentSchema,
  addArtifactSchema,
  linkToGoalSchema,
  recordAnalyticsSchema,
  rechronicleSchema,
  createDraftStorySchema,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  GetJournalEntriesInput,
  PublishJournalEntryInput,
  AddCommentInput,
  UpdateCommentInput,
  AddArtifactInput,
  LinkToGoalInput,
  RecordAnalyticsInput,
  RechronicleInput,
  CreateDraftStoryInput
} from '../types/journal.types';

/**
 * Get the request-scoped JournalService.
 * Falls back to production service if middleware not applied.
 */
function getJournalService(req: Request): JournalService {
  if (!req.journalService) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ attachJournalService middleware not applied, using production fallback');
    }
    return new JournalService(false);
  }
  return req.journalService;
}

/**
 * Create a new journal entry
 */
export const createJournalEntry = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 createJournalEntry called with:', {
    userId: req.user?.id,
    bodyKeys: Object.keys(req.body),
    payloadSize: JSON.stringify(req.body).length
  });
  
  const userId = req.user?.id;
  
  if (!userId) {
    console.log('❌ User not authenticated');
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    console.log('🔍 Validating payload with Zod schema...');
    const validatedData: CreateJournalEntryInput = createJournalEntrySchema.parse(req.body);
    console.log('✅ Payload validation passed');

    console.log('🔍 Calling journal service...');
    const entry = await getJournalService(req).createJournalEntry(userId, validatedData);
    console.log('✅ Journal entry created successfully');
    sendSuccess(res, entry, 'Journal entry created successfully', 201);
  } catch (error: any) {
    console.error('❌ Error in createJournalEntry:', {
      message: (error as any).message,
      name: (error as any).name,
      code: (error as any).code,
      issues: error.issues || error.errors,
      stack: error.stack?.split('\n').slice(0, 3)
    });
    
    if ((error as any).name === 'ZodError') {
      console.log('❌ Zod validation failed:', error.issues);
      return void sendError(res, 'Validation failed: ' + error.issues.map((i: any) => i.message).join(', '), 400);
    }
    
    if ((error as any).message.includes('Access denied')) {
      return void sendError(res, (error as any).message, 403);
    }
    throw error;
  }
});

/**
 * Get journal entries with filtering and pagination
 */
export const getJournalEntries = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Parse and validate query parameters
  const queryParams = {
    ...req.query,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    // Activity stream enhancements
    includeActivityMeta: req.query.includeActivityMeta === 'true',
    filterBySource: req.query.filterBySource as string | undefined
  };

  const validatedData: GetJournalEntriesInput = getJournalEntriesSchema.parse(queryParams);

  try {
    const result = await getJournalService(req).getJournalEntries(userId, validatedData);
    sendPaginated(res, result.entries, result.pagination, 'Journal entries retrieved');
  } catch (error: any) {
    if ((error as any).message.includes('Access denied')) {
      return void sendError(res, (error as any).message, 403);
    }
    throw error;
  }
});

/**
 * Get single journal entry by ID
 */
export const getJournalEntryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!id) {
    return void sendError(res, 'Entry ID is required', 400);
  }

  try {
    const entry = await getJournalService(req).getJournalEntryById(id, userId);
    sendSuccess(res, entry);
  } catch (error: any) {
    if ((error as any).message === 'Journal entry not found') {
      return void sendError(res, (error as any).message, 404);
    }
    if ((error as any).message === 'Access denied') {
      return void sendError(res, (error as any).message, 403);
    }
    throw error;
  }
});

/**
 * Update journal entry
 */
export const updateJournalEntry = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!id) {
    return void sendError(res, 'Entry ID is required', 400);
  }

  const validatedData: UpdateJournalEntryInput = updateJournalEntrySchema.parse(req.body);

  try {
    const entry = await getJournalService(req).updateJournalEntry(id, userId, validatedData);
    sendSuccess(res, entry, 'Journal entry updated successfully');
  } catch (error: any) {
    if ((error as any).message === 'Journal entry not found') {
      return void sendError(res, (error as any).message, 404);
    }
    if ((error as any).message.includes('Access denied')) {
      return void sendError(res, (error as any).message, 403);
    }
    throw error;
  }
});

/**
 * Delete journal entry
 */
export const deleteJournalEntry = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!id) {
    return void sendError(res, 'Entry ID is required', 400);
  }

  try {
    await getJournalService(req).deleteJournalEntry(id, userId);
    sendSuccess(res, null, 'Journal entry deleted successfully');
  } catch (error: any) {
    if ((error as any).message === 'Journal entry not found') {
      return void sendError(res, (error as any).message, 404);
    }
    if ((error as any).message.includes('Access denied')) {
      return void sendError(res, (error as any).message, 403);
    }
    throw error;
  }
});

/**
 * Bulk delete auto-generated draft entries
 */
export const bulkDeleteAutoGeneratedDrafts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { workspaceId } = req.query;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    const result = await getJournalService(req).bulkDeleteAutoGeneratedDrafts(
      userId,
      workspaceId as string | undefined
    );
    sendSuccess(res, result, `Successfully deleted ${result.deletedCount} auto-generated draft entries`);
  } catch (error: any) {
    throw error;
  }
});

/**
 * Clear all data (entries + activities) for the user's current mode.
 * Uses X-Demo-Mode header to determine which data to clear.
 * Safety: Only demo mode clear is allowed (production clear is blocked).
 */
export const clearAllData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const journalService = getJournalService(req);

  // Safety: Only allow clearing demo data, not production
  if (!(journalService as any).isDemoMode) {
    return void sendError(res, 'Bulk clear only allowed in demo mode. Use X-Demo-Mode: true header.', 400);
  }

  const result = await journalService.clearAllBySourceMode(userId);
  sendSuccess(res, result, `Cleared ${result.deletedEntries} entries and ${result.deletedActivities} activities`);
});

// Alias for backward compatibility
export const clearDemoData = clearAllData;

/**
 * Publish journal entry
 */
export const publishJournalEntry = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!id) {
    return void sendError(res, 'Entry ID is required', 400);
  }

  const validatedData: PublishJournalEntryInput = publishJournalEntrySchema.parse(req.body);

  try {
    const entry = await getJournalService(req).publishJournalEntry(id, userId, validatedData);
    sendSuccess(res, entry, 'Journal entry published successfully');
  } catch (error: any) {
    if ((error as any).message === 'Journal entry not found') {
      return void sendError(res, (error as any).message, 404);
    }
    if ((error as any).message.includes('Access denied')) {
      return void sendError(res, (error as any).message, 403);
    }
    throw error;
  }
});

/**
 * Like/unlike journal entry
 */
export const toggleLike = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!id) {
    return void sendError(res, 'Entry ID is required', 400);
  }

  try {
    const result = await getJournalService(req).toggleLike(id, userId);
    
    // Create notification if liked (not when unliking)
    if (result.liked && (result as any).entry) {
      await createNotificationForEvent(
        'LIKE',
        (result as any).entry.authorId,
        userId,
        'Someone liked your journal entry',
        `${req.user!.name} liked your entry "${(result as any).entry.title}"`,
        'JOURNAL_ENTRY',
        id
      );
    }
    
    sendSuccess(res, result, result.liked ? 'Entry liked' : 'Entry unliked');
  } catch (error: any) {
    if ((error as any).message === 'Journal entry not found') {
      return void sendError(res, (error as any).message, 404);
    }
    throw error;
  }
});

/**
 * Appreciate journal entry
 */
export const toggleAppreciate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!id) {
    return void sendError(res, 'Entry ID is required', 400);
  }

  try {
    const result = await getJournalService(req).toggleAppreciate(id, userId);
    sendSuccess(res, result, result.appreciated ? 'Entry appreciated' : 'Appreciation removed');
  } catch (error: any) {
    if ((error as any).message === 'Journal entry not found') {
      return void sendError(res, (error as any).message, 404);
    }
    throw error;
  }
});

/**
 * Record analytics
 */
export const recordAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!id) {
    return void sendError(res, 'Entry ID is required', 400);
  }

  const validatedData: RecordAnalyticsInput = recordAnalyticsSchema.parse(req.body);

  try {
    await getJournalService(req).recordAnalytics(id, userId, validatedData);
    sendSuccess(res, null, 'Analytics recorded');
  } catch (error: any) {
    // Analytics errors shouldn't fail the request
    console.error('Analytics recording error:', error);
    sendSuccess(res, null, 'Analytics recorded');
  }
});

/**
 * Get entry comments
 */
export const getEntryComments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  console.log('🔍 getEntryComments called with ID:', id, 'isDemoMode:', req.isDemoMode);

  if (!id) {
    console.log('❌ No entry ID provided');
    return void sendError(res, 'Entry ID is required', 400);
  }

  try {
    console.log('🔄 Calling getJournalService(req).getEntryComments...');
    const comments = await getJournalService(req).getEntryComments(id);
    console.log('✅ Comments retrieved, sending response');
    sendSuccess(res, comments, 'Comments retrieved successfully');
  } catch (error: any) {
    console.error('❌ Error in getEntryComments controller:', error);
    if ((error as any).message === 'Journal entry not found') {
      return void sendError(res, (error as any).message, 404);
    }
    if ((error as any).message.includes('Failed to fetch comments')) {
      return void sendError(res, (error as any).message, 500);
    }
    throw error;
  }
});

/**
 * Add comment (placeholder)
 */
export const addComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!id) {
    return void sendError(res, 'Entry ID is required', 400);
  }

  const validatedData: AddCommentInput = addCommentSchema.parse(req.body);

  try {
    const comment = await getJournalService(req).addComment(id, userId, validatedData);
    
    // Create notification for the journal entry author
    if (comment.entry) {
      await createNotificationForEvent(
        'COMMENT',
        comment.entry.authorId,
        userId,
        'New comment on your journal entry',
        `${req.user!.name} commented on your entry "${comment.entry.title}"`,
        'JOURNAL_ENTRY',
        id,
        { commentId: comment.id }
      );
    }
    
    sendSuccess(res, comment, 'Comment added successfully', 201);
  } catch (error: any) {
    if ((error as any).message === 'Journal entry not found') {
      return void sendError(res, (error as any).message, 404);
    }
    throw error;
  }
});

/**
 * ReChronicle (repost) journal entry
 */
export const rechronicleEntry = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!id) {
    return void sendError(res, 'Entry ID is required', 400);
  }

  const validatedData: RechronicleInput = rechronicleSchema.parse(req.body);

  try {
    const result = await getJournalService(req).rechronicleEntry(id, userId, validatedData);
    sendSuccess(res, result, result.rechronicled ? 'Entry rechronicled' : 'ReChronicle removed');
  } catch (error: any) {
    if ((error as any).message === 'Journal entry not found') {
      return void sendError(res, (error as any).message, 404);
    }
    throw error;
  }
});

/**
 * Add artifact (placeholder)
 */
export const addArtifact = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!id) {
    return void sendError(res, 'Entry ID is required', 400);
  }

  const validatedData: AddArtifactInput = addArtifactSchema.parse(req.body);

  // TODO: Implement artifact creation
  sendSuccess(res, null, 'Add artifact endpoint - coming soon');
});

/**
 * Get user rechronicles
 */
export const getUserRechronicles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    const rechronicles = await getJournalService(req).getUserRechronicles(userId);
    sendSuccess(res, rechronicles, 'User rechronicles retrieved');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get user feed including both original entries and rechronicled entries.
 * Uses unified JournalService that handles both demo and production modes.
 */
export const getUserFeed = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Parse and validate query parameters
  const queryParams = {
    ...req.query,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20
  };

  const validatedData: GetJournalEntriesInput = getJournalEntriesSchema.parse(queryParams);

  try {
    // Service handles demo/production routing internally via this.isDemoMode
    const result = await getJournalService(req).getUserFeed(userId, validatedData);
    sendPaginated(
      res,
      result.entries,
      result.pagination,
      req.isDemoMode ? 'Demo user feed retrieved' : 'User feed retrieved'
    );
  } catch (error: any) {
    if ((error as any).message.includes('Access denied')) {
      return void sendError(res, (error as any).message, 403);
    }
    throw error;
  }
});

/**
 * POST /api/v1/journal/entries/:id/regenerate
 * Regenerate narrative for a journal entry using LLM.
 * Works for both demo and production entries (based on X-Demo-Mode header).
 */
export const regenerateNarrative = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const { style = 'professional' } = req.body || {};

  try {
    const result = await getJournalService(req).regenerateNarrative(userId, id, {
      style: style as 'professional' | 'casual' | 'technical' | 'storytelling',
      maxRetries: 2,
    });
    sendSuccess(res, result, 'Journal narrative regenerated');
  } catch (error: any) {
    if (error.message === 'Journal entry not found') {
      return void sendError(res, error.message, 404);
    }
    if (error.message === 'No activities found for this journal entry') {
      return void sendError(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * POST /api/v1/journal/draft-stories
 * Create a draft story from selected activity IDs.
 * This allows users to manually select activities and create a journal entry.
 * Works for both demo and production (based on X-Demo-Mode header).
 */
export const createDraftStory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    // Parse and validate input - handle date string conversion
    const rawData = {
      ...req.body,
      timeRangeStart: req.body.timeRangeStart ? new Date(req.body.timeRangeStart) : undefined,
      timeRangeEnd: req.body.timeRangeEnd ? new Date(req.body.timeRangeEnd) : undefined,
    };

    const validatedData: CreateDraftStoryInput = createDraftStorySchema.parse(rawData);

    const entry = await getJournalService(req).createDraftStory(userId, validatedData);

    sendSuccess(res, entry, 'Draft story created from activities', 201);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return void sendError(res, 'Validation failed: ' + error.issues.map((i: any) => i.message).join(', '), 400);
    }
    if (error.message === 'No activities found for the provided IDs') {
      return void sendError(res, error.message, 404);
    }
    throw error;
  }
});