import { describe, it, expect } from 'vitest';
import { scanAndStrip } from './secret-scanner';

describe('scanAndStrip', () => {
  // AWS
  it('strips AWS access key IDs', () => {
    const input = 'Config: AKIAIOSFODNN7EXAMPLE and secret';
    expect(scanAndStrip(input)).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(scanAndStrip(input)).toContain('[REDACTED]');
  });

  it('strips AWS secret access keys', () => {
    const input = 'aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
    expect(scanAndStrip(input)).not.toContain('wJalrXUtnFEMI');
  });

  // GitHub tokens
  it('strips GitHub personal access tokens', () => {
    const input = 'Set GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12';
    expect(scanAndStrip(input)).not.toContain('ghp_');
  });

  it('strips GitHub fine-grained tokens', () => {
    const input = 'token: github_pat_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef1234567890abc';
    expect(scanAndStrip(input)).not.toContain('github_pat_');
  });

  // npm tokens
  it('strips npm tokens', () => {
    const input = 'npm_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12345678';
    expect(scanAndStrip(input)).not.toContain('npm_');
  });

  // Connection strings
  it('strips postgres connection strings', () => {
    const input = 'DATABASE_URL=postgresql://user:pass@host:5432/db';
    expect(scanAndStrip(input)).not.toContain('postgresql://');
  });

  it('strips mongodb connection strings', () => {
    const input = 'MONGO=mongodb+srv://admin:secret@cluster.mongodb.net/prod';
    expect(scanAndStrip(input)).not.toContain('mongodb+srv://');
  });

  // Private keys
  it('strips private key headers', () => {
    const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----';
    expect(scanAndStrip(input)).not.toContain('BEGIN RSA PRIVATE KEY');
  });

  // Passwords in env
  it('strips password assignments (8+ char value)', () => {
    const input = 'DB_PASSWORD=supersecret123\nAPP_PORT=3000';
    expect(scanAndStrip(input)).not.toContain('supersecret123');
    expect(scanAndStrip(input)).toContain('APP_PORT=3000');
  });

  it('does not false-positive on prose mentioning TOKEN', () => {
    const input = 'Set the GITHUB_TOKEN to authenticate with the API';
    // "to" is only 2 chars — below 8-char threshold, should NOT be redacted
    expect(scanAndStrip(input)).toContain('GITHUB_TOKEN to authenticate');
  });

  // Email addresses (PII)
  it('strips email addresses', () => {
    const input = 'Contact john.doe@company.com for access';
    expect(scanAndStrip(input)).not.toContain('john.doe@company.com');
  });

  // IP addresses
  it('strips IPv4 addresses', () => {
    const input = 'Server at 192.168.1.100:5432';
    expect(scanAndStrip(input)).not.toContain('192.168.1.100');
  });

  // Safe content preserved
  it('preserves non-sensitive content', () => {
    const input = 'Implemented OAuth2 flow with PKCE. Added 42 tests. Reduced latency by 60%.';
    expect(scanAndStrip(input)).toBe(input);
  });

  it('handles empty/null input', () => {
    expect(scanAndStrip('')).toBe('');
    expect(scanAndStrip(null as any)).toBe('');
    expect(scanAndStrip(undefined as any)).toBe('');
  });

  // JWT tokens
  it('strips JWT tokens', () => {
    const input = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    expect(scanAndStrip(input)).not.toContain('eyJhbGciOi');
  });

  // Multiple secrets in one string
  it('strips multiple secrets in one string', () => {
    const input = 'Config: AKIAIOSFODNN7EXAMPLE and postgresql://user:pass@localhost:5432/db';
    const result = scanAndStrip(input);
    expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(result).not.toContain('postgresql://');
    expect(result).toContain('Config:');
  });

  // Repeated calls don't break global regex state
  it('works correctly on repeated calls', () => {
    const input = 'AKIAIOSFODNN7EXAMPLE';
    expect(scanAndStrip(input)).toContain('[REDACTED]');
    expect(scanAndStrip(input)).toContain('[REDACTED]');
    expect(scanAndStrip(input)).toContain('[REDACTED]');
  });
});
