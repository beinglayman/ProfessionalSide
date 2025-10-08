// MCP Components exports
export { MCPPrivacyNotice, MCPToolPrivacyNotice, MCPSessionNotice } from './MCPPrivacyNotice';
export { MCPConsentDialog } from './MCPConsentDialog';
export { MCPDataReview } from './MCPDataReview';
export { MCPIntegrationButton } from './MCPIntegrationButton';

// Re-export types and hooks for convenience
export { MCPToolType } from '../../services/mcp.service';
export { useMCPTools, useMCPFetch, useMCPPrivacy, useMCPDataProcessor } from '../../hooks/useMCP';