import { Router } from 'express';
import {
  getAvailableTools,
  getIntegrationStatus,
  validateIntegrations,
  initiateOAuth,
  initiateGroupOAuth,
  handleOAuthCallback,
  disconnectIntegration,
  fetchData,
  fetchMultiSource,
  processWithAgents,
  fetchAndProcessWithAgents,
  generateFormat7Entry,
  transformFormat7,
  sanitizeForNetwork,
  getSession,
  clearSession,
  clearAllSessions,
  getPrivacyStatus,
  getAuditHistory,
  deleteAllMCPData
} from '../controllers/mcp.controller';
import { getTestActivities } from '../controllers/mcp-test.controller';
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

/**
 * GET /api/v1/mcp/integrations/validate
 * Validate OAuth tokens for all connected integrations
 * Returns validation status (valid, expired, invalid) for each tool
 */
router.get('/integrations/validate', authMiddleware, validateIntegrations);

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

/**
 * POST /api/v1/mcp/generate-format7-entry
 * Fetch from tools, process with AI, and transform to Format7 journal entry structure
 * Body: { toolTypes: MCPToolType[], dateRange?: {...}, consentGiven: boolean, quality?: string, privacy?: 'private'|'team'|'network'|'public', workspaceName?: string }
 * Returns: Complete Format7JournalEntry ready for display
 */
router.post('/generate-format7-entry', authMiddleware, generateFormat7Entry);

/**
 * POST /api/v1/mcp/transform-format7
 * Transform organized MCP data to Format7 journal entry
 * Body: { activities, organizedData, correlations, generatedContent, selectedActivityIds, options }
 * Returns: Complete Format7JournalEntry with rich collaborator/reviewer data
 */
router.post('/transform-format7', authMiddleware, transformFormat7);

/**
 * POST /api/v1/mcp/sanitize-for-network
 * Sanitize workspace content for network/public view (IPR stripping)
 * Body: { title: string, description: string, fullContent: string, format7Data: object }
 * Returns: { networkTitle, networkContent, format7DataNetwork, sanitizationLog }
 */
router.post('/sanitize-for-network', authMiddleware, sanitizeForNetwork);

/**
 * POST /api/v1/mcp/test-activities
 * Get realistic mock test data for all tools (for development/testing purposes)
 * Body: { toolTypes?: MCPToolType[], dateRange?: {...} }
 */
router.post('/test-activities', authMiddleware, getTestActivities);

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