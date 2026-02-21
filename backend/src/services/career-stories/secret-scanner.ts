/**
 * Secret Scanner
 *
 * Strips credentials, PII, and sensitive data from rawData text before
 * passing it to the Career Story LLM. Applied to the `body` field of
 * all body-source tool subtypes (GitHub PR, Commit, Jira, Outlook,
 * Google Docs/Sheets, Slack).
 *
 * @see docs/plans/wizard-pipeline/2026-02-12-wizard-pipeline-gap-analysis.md §14 F1, F2
 */

const REDACTED = '[REDACTED]';

/** Patterns that indicate secrets or PII. Order matters — more specific first. */
const SECRET_PATTERNS: RegExp[] = [
  // Private keys
  /-----BEGIN[\s\w]*PRIVATE KEY-----[\s\S]*?-----END[\s\w]*PRIVATE KEY-----/g,

  // AWS
  /\bAKIA[0-9A-Z]{16}\b/g,
  /(?:aws_secret_access_key|AWS_SECRET)\s*[=:]\s*\S+/gi,

  // GitHub tokens
  /\bghp_[A-Za-z0-9]{36,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{36,}\b/g,

  // npm tokens
  /\bnpm_[A-Za-z0-9]{36,}\b/g,

  // JWT tokens
  /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,

  // Connection strings
  /postgresql:\/\/[^\s"']+/gi,
  /mongodb(?:\+srv)?:\/\/[^\s"']+/gi,
  /redis:\/\/[^\s"']+/gi,
  /mysql:\/\/[^\s"']+/gi,

  // Generic secrets in env-style assignments (require = followed by 8+ non-space chars to avoid false positives on prose)
  /(?:PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY)\s*=\s*\S{8,}/gi,

  // Email addresses (PII) — kept because stories can be published to network visibility
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,

  // IPv4 addresses
  /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
];

/**
 * Scan text for secrets and replace them with [REDACTED].
 * Returns the cleaned text.
 */
export function scanAndStrip(text: string | null | undefined): string {
  if (!text) return '';

  let cleaned = text;
  for (const pattern of SECRET_PATTERNS) {
    // Reset lastIndex for global regexps used across multiple calls
    pattern.lastIndex = 0;
    cleaned = cleaned.replace(pattern, REDACTED);
  }

  return cleaned;
}
