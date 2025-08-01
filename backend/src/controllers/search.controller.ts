import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';
import { sendSuccess, sendError, sendPaginated, asyncHandler } from '../utils/response.utils';
import { 
  SearchParams, 
  SearchFilters, 
  SearchSuggestionsInput,
  SaveSearchInput,
  SearchInteractionInput
} from '../types/search.types';

const searchService = new SearchService();

/**
 * Global search across all content
 */
export const globalSearch = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const { q, type, category, workspace, author, dateFrom, dateTo, tags, page = 1, limit = 20, sortBy = 'relevance', sortOrder = 'desc' } = req.query;

  if (!q || typeof q !== 'string' || q.length < 2) {
    return sendError(res, 'Query must be at least 2 characters long', 400);
  }

  const filters: SearchFilters = {};
  if (type) filters.type = type as any;
  if (category) filters.category = category as string;
  if (workspace) filters.workspace = workspace as string;
  if (author) filters.author = author as string;
  if (dateFrom) filters.dateFrom = dateFrom as string;
  if (dateTo) filters.dateTo = dateTo as string;
  if (tags) filters.tags = Array.isArray(tags) ? tags as string[] : [tags as string];

  const params: SearchParams = {
    query: q,
    filters,
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    sortBy: sortBy as any,
    sortOrder: sortOrder as any
  };

  try {
    const result = await searchService.globalSearch(userId, params);
    sendSuccess(res, result);
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      return sendError(res, error.message, 403);
    }
    throw error;
  }
});

/**
 * Get search suggestions
 */
export const getSearchSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string' || q.length < 2) {
    return sendSuccess(res, []);
  }

  try {
    const suggestions = await searchService.getSearchSuggestions(userId, q);
    sendSuccess(res, suggestions);
  } catch (error: any) {
    console.error('Search suggestions error:', error);
    sendSuccess(res, []);
  }
});

/**
 * Get search history
 */
export const getSearchHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    const history = await searchService.getSearchHistory(userId);
    sendSuccess(res, history);
  } catch (error: any) {
    console.error('Search history error:', error);
    sendSuccess(res, { recent: [], popular: [], saved: [] });
  }
});

/**
 * Save a search query
 */
export const saveSearch = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const { name, query, filters } = req.body as SaveSearchInput;

  if (!name || !query) {
    return sendError(res, 'Name and query are required', 400);
  }

  try {
    const savedSearch = await searchService.saveSearch(userId, { name, query, filters });
    sendSuccess(res, savedSearch, 'Search saved successfully', 201);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return sendError(res, error.message, 409);
    }
    throw error;
  }
});

/**
 * Delete saved search
 */
export const deleteSavedSearch = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { searchId } = req.params;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  if (!searchId) {
    return sendError(res, 'Search ID is required', 400);
  }

  try {
    await searchService.deleteSavedSearch(userId, searchId);
    sendSuccess(res, null, 'Saved search deleted successfully');
  } catch (error: any) {
    if (error.message === 'Saved search not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('Access denied')) {
      return sendError(res, error.message, 403);
    }
    throw error;
  }
});

/**
 * Record search interaction (for analytics)
 */
export const recordSearchInteraction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const { query, resultId, action } = req.body as SearchInteractionInput;

  if (!query || !resultId || !action) {
    return sendError(res, 'Query, resultId, and action are required', 400);
  }

  try {
    await searchService.recordSearchInteraction(userId, { query, resultId, action });
    sendSuccess(res, null, 'Interaction recorded');
  } catch (error: any) {
    // Analytics errors shouldn't fail the request
    console.error('Search interaction recording error:', error);
    sendSuccess(res, null, 'Interaction recorded');
  }
});