import { Router } from 'express';
import {
  getAvailableTools,
  getIntegrationStatus,
  initiateOAuth,
  initiateGroupOAuth,
  handleOAuthCallback,
  disconnectIntegration,
  fetchData,
  fetchMultiSource,
  processWithAgents,
  fetchAndProcessWithAgents,
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
 * POST /api/v1/mcp/oauth/initiate-group
 * Initiate OAuth flow for a group of tools (connects multiple tools at once)
 * Body: { groupType: 'atlassian' | 'microsoft' }
 */
router.post('/oauth/initiate-group', authMiddleware, initiateGroupOAuth);

/**
 * GET /api/v1/mcp/callback/:toolType
 * OAuth callback endpoint (called by external services)
 * Supports individual tools (github, jira, etc.) and groups (atlassian, microsoft)
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

/**
 * POST /api/v1/mcp/fetch-multi-source
 * Fetch and organize data from multiple tools using AI (unified results)
 * Body: { toolTypes: MCPToolType[], dateRange?: {...}, consentGiven: boolean }
 */
router.post('/fetch-multi-source', authMiddleware, fetchMultiSource);

/**
 * POST /api/v1/mcp/process-agents
 * Process fetched data with AI agents progressively
 * Body: { stage: 'analyze'|'correlate'|'generate', sessionId?: string, data?: any, options?: {...} }
 */
router.post('/process-agents', authMiddleware, processWithAgents);

/**
 * POST /api/v1/mcp/fetch-and-process
 * Fetch from tools and process with AI agents in one call (convenience endpoint)
 * Body: { toolTypes: MCPToolType[], dateRange?: {...}, consentGiven: boolean, quality?: string, generateContent?: boolean, workspaceName?: string }
 */
router.post('/fetch-and-process', authMiddleware, fetchAndProcessWithAgents);

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