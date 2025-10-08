import { Router } from 'express';
import {
  getAvailableTools,
  getIntegrationStatus,
  initiateOAuth,
  handleOAuthCallback,
  disconnectIntegration,
  fetchData,
  getSession,
  clearSession,
  clearAllSessions,
  getPrivacyStatus,
  getAuditHistory,
  deleteAllMCPData
} from '../controllers/mcp.controller';
import { authenticate as authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * MCP Routes - All routes require authentication
 *
 * PRIVACY-FIRST DESIGN:
 * - All endpoints require user authentication
 * - No data is persisted without explicit consent
 * - Session-based temporary storage only
 */

// ============================================================================
// Tool Management
// ============================================================================

/**
 * GET /api/v1/mcp/tools
 * Get available MCP tools and their connection status
 */
router.get('/tools', authMiddleware, getAvailableTools);

/**
 * GET /api/v1/mcp/integrations
 * Get user's integration status for all tools
 */
router.get('/integrations', authMiddleware, getIntegrationStatus);

// ============================================================================
// OAuth Flow
// ============================================================================

/**
 * POST /api/v1/mcp/oauth/initiate
 * Initiate OAuth flow for a tool
 * Body: { toolType: MCPToolType }
 */
router.post('/oauth/initiate', authMiddleware, initiateOAuth);

/**
 * GET /api/v1/mcp/callback/:toolType
 * OAuth callback endpoint (called by external services)
 * Query: { code: string, state: string }
 */
router.get('/callback/:toolType', handleOAuthCallback);

/**
 * DELETE /api/v1/mcp/integrations/:toolType
 * Disconnect a tool integration
 */
router.delete('/integrations/:toolType', authMiddleware, disconnectIntegration);

// ============================================================================
// Data Fetching (Memory-Only)
// ============================================================================

/**
 * POST /api/v1/mcp/fetch
 * Fetch data from connected tools (temporary storage only)
 * Body: { toolTypes: MCPToolType[], dateRange?: {...}, consentGiven: boolean }
 */
router.post('/fetch', authMiddleware, fetchData);

// ============================================================================
// Session Management
// ============================================================================

/**
 * GET /api/v1/mcp/sessions/:sessionId
 * Get session data (memory-only, auto-expires)
 */
router.get('/sessions/:sessionId', authMiddleware, getSession);

/**
 * DELETE /api/v1/mcp/sessions/:sessionId
 * Clear specific session data
 */
router.delete('/sessions/:sessionId', authMiddleware, clearSession);

/**
 * DELETE /api/v1/mcp/sessions
 * Clear all user sessions
 */
router.delete('/sessions', authMiddleware, clearAllSessions);

// ============================================================================
// Privacy & Audit
// ============================================================================

/**
 * GET /api/v1/mcp/privacy/status
 * Get MCP privacy status and policies
 */
router.get('/privacy/status', getPrivacyStatus);

/**
 * GET /api/v1/mcp/audit
 * Get user's audit history
 * Query: { limit?: number, toolType?: MCPToolType }
 */
router.get('/audit', authMiddleware, getAuditHistory);

/**
 * DELETE /api/v1/mcp/data
 * Delete all MCP data for user (GDPR compliance)
 */
router.delete('/data', authMiddleware, deleteAllMCPData);

export default router;