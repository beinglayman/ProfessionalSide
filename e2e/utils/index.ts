/**
 * E2E Test Utilities
 *
 * Export all utilities for Playwright tests
 */

export {
  createScreenshotHelper,
  screenshotSection,
  type ScreenshotType,
  type ScreenshotConfig,
  type SectionScreenshotOptions,
} from './screenshot-helper';

export {
  login,
  getCredentials,
  getRealOAuthCredentials,
  type AuthCredentials,
  type CredentialOptions,
  type CredentialProfile,
} from './auth-helper';

export { waitForContentLoaded, waitForElement } from './wait-helper';

export {
  DEFAULT_BACKEND_API_URL,
  DEFAULT_REQUIRED_REAL_TOOLS,
  isRealOAuthEnabled,
  getRequiredRealTools,
  disableDemoMode,
  getAccessTokenFromPage,
  assertRealOAuthReadiness,
  type MCPIntegrationStatus,
  type RealOAuthReadiness,
} from './real-oauth-helper';
