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
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  GetJournalEntriesInput,
  PublishJournalEntryInput,
  AddCommentInput,
  UpdateCommentInput,
  AddArtifactInput,
  LinkToGoalInput,
  RecordAnalyticsInput,
  RechronicleInput
} from '../types/journal.types';

const journalService = new JournalService();

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
    const entry = await journalService.createJournalEntry(userId, validatedData);
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
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20
  };

  const validatedData: GetJournalEntriesInput = getJournalEntriesSchema.parse(queryParams);

  try {
    const result = await journalService.getJournalEntries(userId, validatedData);
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
    const entry = await journalService.getJournalEntryById(id, userId);
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
    const entry = await journalService.updateJournalEntry(id, userId, validatedData);
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
    await journalService.deleteJournalEntry(id, userId);
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
    const result = await journalService.bulkDeleteAutoGeneratedDrafts(
      userId,
      workspaceId as string | undefined
    );
    sendSuccess(res, result, `Successfully deleted ${result.deletedCount} auto-generated draft entries`);
  } catch (error: any) {
    throw error;
  }
});

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
    const entry = await journalService.publishJournalEntry(id, userId, validatedData);
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
    const result = await journalService.toggleLike(id, userId);
    
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
    const result = await journalService.toggleAppreciate(id, userId);
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
    await journalService.recordAnalytics(id, userId, validatedData);
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
  
  console.log('🔍 getEntryComments called with ID:', id);
  
  if (!id) {
    console.log('❌ No entry ID provided');
    return void sendError(res, 'Entry ID is required', 400);
  }

  try {
    console.log('🔄 Calling journalService.getEntryComments...');
    const comments = await journalService.getEntryComments(id);
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
    const comment = await journalService.addComment(id, userId, validatedData);
    
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
    const result = await journalService.rechronicleEntry(id, userId, validatedData);
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
    const rechronicles = await journalService.getUserRechronicles(userId);
    sendSuccess(res, rechronicles, 'User rechronicles retrieved');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get user feed including both original entries and rechronicled entries
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
    const result = await journalService.getUserFeed(userId, validatedData);
    sendPaginated(res, result.entries, result.pagination, 'User feed retrieved');
  } catch (error: any) {
    if ((error as any).message.includes('Access denied')) {
      return void sendError(res, (error as any).message, 403);
    }
    throw error;
  }
});