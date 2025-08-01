import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  globalSearch,
  getSearchSuggestions,
  getSearchHistory,
  saveSearch,
  deleteSavedSearch,
  recordSearchInteraction
} from '../controllers/search.controller';

const router = Router();

/**
 * @route   GET /api/search
 * @desc    Global search across all content
 * @access  Private
 * @query   q (required) - Search query
 * @query   type - Filter by content type (journal_entry, user, workspace, file)
 * @query   category - Filter by category
 * @query   workspace - Filter by workspace ID
 * @query   author - Filter by author ID
 * @query   dateFrom - Filter by date range start
 * @query   dateTo - Filter by date range end
 * @query   tags - Filter by tags (can be multiple)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 * @query   sortBy - Sort field (relevance, date, title)
 * @query   sortOrder - Sort order (asc, desc)
 */
router.get('/', authenticate, globalSearch);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions/autocomplete
 * @access  Private
 * @query   q (required) - Partial search query
 */
router.get('/suggestions', authenticate, getSearchSuggestions);

/**
 * @route   GET /api/search/history
 * @desc    Get user's search history
 * @access  Private
 */
router.get('/history', authenticate, getSearchHistory);

/**
 * @route   POST /api/search/save
 * @desc    Save a search query
 * @access  Private
 * @body    { name: string, query: string, filters?: object }
 */
router.post('/save', authenticate, saveSearch);

/**
 * @route   DELETE /api/search/saved/:searchId
 * @desc    Delete a saved search
 * @access  Private
 * @params  searchId - ID of the saved search to delete
 */
router.delete('/saved/:searchId', authenticate, deleteSavedSearch);

/**
 * @route   POST /api/search/interaction
 * @desc    Record search interaction (for analytics)
 * @access  Private
 * @body    { query: string, resultId: string, action: string }
 */
router.post('/interaction', authenticate, recordSearchInteraction);

export default router;