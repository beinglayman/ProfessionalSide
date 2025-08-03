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
 * @route   GET /api/search/test
 * @desc    Test search endpoint without authentication
 * @access  Public
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Search API is working',
    query: req.query
  });
});

/**
 * @route   GET /api/search
 * @desc    Network-centric global search across all content types
 * @access  Private
 * @query   q (required) - Search query
 * @query   types - Filter by content types (people, workspaces, content, skills) - can be multiple
 * @query   connectionType - Filter by connection type (core, extended, following, none) - can be multiple
 * @query   location - Filter by location
 * @query   company - Filter by company
 * @query   skills - Filter by skills - can be multiple
 * @query   workspaceId - Filter by workspace ID
 * @query   dateFrom - Filter by date range start
 * @query   dateTo - Filter by date range end
 * @query   contentTypes - Filter by content types (journal_entry, achievement, artifact) - can be multiple
 * @query   limit - Items per page (default: 20)
 * @query   offset - Items to skip (default: 0)
 * @query   sortBy - Sort field (relevance, recent, popular, network_proximity)
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