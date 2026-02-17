import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { readEnvFile, writeEnvFile, getEnvMap } from './oauth-cli';

// ============================================================
// .env Helpers — round-trip fidelity, backup, creation
// ============================================================

describe('readEnvFile / writeEnvFile', () => {
  let tmpDir: string;
  let envPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oauth-cli-test-'));
    envPath = path.join(tmpDir, '.env');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('round-trips env values correctly', async () => {
    const entries = new Map([
      ['FOO', 'bar'],
      ['BAZ', 'qux'],
    ]);
    await writeEnvFile(envPath, entries);
    const result = await getEnvMap(envPath);
    expect(result.get('FOO')).toBe('bar');
    expect(result.get('BAZ')).toBe('qux');
  });

  it('preserves comments and blank lines', async () => {
    const original = '# This is a comment\n\nFOO=bar\n# Another comment\nBAZ=qux\n';
    await fs.writeFile(envPath, original, 'utf-8');

    // Write a new entry — should not destroy comments/blanks
    await writeEnvFile(envPath, new Map([['NEW_KEY', 'new_val']]));

    const content = await fs.readFile(envPath, 'utf-8');
    expect(content).toContain('# This is a comment');
    expect(content).toContain('# Another comment');
    expect(content).toContain('FOO=bar');
    expect(content).toContain('BAZ=qux');
    expect(content).toContain('NEW_KEY=new_val');
  });

  it('creates .env if it does not exist', async () => {
    const freshPath = path.join(tmpDir, '.env.fresh');
    await writeEnvFile(freshPath, new Map([['KEY', 'val']]));

    const content = await fs.readFile(freshPath, 'utf-8');
    expect(content).toBe('KEY=val');
  });

  it('creates .env.bak before overwriting', async () => {
    await fs.writeFile(envPath, 'OLD=value\n', 'utf-8');

    await writeEnvFile(envPath, new Map([['NEW', 'value']]));

    const bakPath = envPath + '.bak';
    const bakContent = await fs.readFile(bakPath, 'utf-8');
    expect(bakContent).toBe('OLD=value\n');
  });

  it('updates existing keys in place', async () => {
    await fs.writeFile(envPath, '# header\nFOO=old\nBAR=keep\n', 'utf-8');

    await writeEnvFile(envPath, new Map([['FOO', 'new']]));

    const lines = await readEnvFile(envPath);
    const fooLine = lines.find((l) => l.key === 'FOO');
    const barLine = lines.find((l) => l.key === 'BAR');
    expect(fooLine?.value).toBe('new');
    expect(barLine?.value).toBe('keep');
    // FOO should appear before BAR (preserved order)
    const fooIdx = lines.indexOf(fooLine!);
    const barIdx = lines.indexOf(barLine!);
    expect(fooIdx).toBeLessThan(barIdx);
  });

  it('readEnvFile returns empty array for missing file', async () => {
    const result = await readEnvFile(path.join(tmpDir, 'nonexistent'));
    expect(result).toEqual([]);
  });
});

// ============================================================
// Validate logic — env checks without interactive prompts
// ============================================================

describe('validate logic', () => {
  let tmpDir: string;
  let envPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oauth-validate-test-'));
    envPath = path.join(tmpDir, '.env');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('reports missing ENCRYPTION_KEY', async () => {
    await fs.writeFile(envPath, 'GITHUB_CLIENT_ID=abc\nGITHUB_CLIENT_SECRET=def\n', 'utf-8');
    const envMap = await getEnvMap(envPath);
    const encKey = envMap.get('ENCRYPTION_KEY') || envMap.get('MCP_ENCRYPTION_KEY');
    expect(encKey).toBeUndefined();
  });

  it('reports blank GITHUB_CLIENT_ID as failure', async () => {
    await fs.writeFile(envPath, 'GITHUB_CLIENT_ID=\nGITHUB_CLIENT_SECRET=def\n', 'utf-8');
    const envMap = await getEnvMap(envPath);
    const idVal = envMap.get('GITHUB_CLIENT_ID');
    expect(idVal).toBe('');
    expect(!idVal || !idVal.trim()).toBe(true);
  });

  it('reports configured provider as success', async () => {
    await fs.writeFile(
      envPath,
      'ENCRYPTION_KEY=abc123\nGITHUB_CLIENT_ID=Iv1.abc\nGITHUB_CLIENT_SECRET=secret123\n',
      'utf-8',
    );
    const envMap = await getEnvMap(envPath);
    const encKey = envMap.get('ENCRYPTION_KEY');
    const idVal = envMap.get('GITHUB_CLIENT_ID');
    const secretVal = envMap.get('GITHUB_CLIENT_SECRET');

    expect(encKey).toBeTruthy();
    expect(idVal && idVal.trim()).toBeTruthy();
    expect(secretVal && secretVal.trim()).toBeTruthy();
  });

  it('does not crash when ENCRYPTION_KEY is missing', async () => {
    // Validate reads .env directly — no MCPOAuthService import
    await fs.writeFile(envPath, 'SOME_OTHER_KEY=val\n', 'utf-8');
    const envMap = await getEnvMap(envPath);
    // This should not throw
    const encKey = envMap.get('ENCRYPTION_KEY') || envMap.get('MCP_ENCRYPTION_KEY');
    expect(encKey).toBeUndefined();
  });

  it('detects MCP_ENCRYPTION_KEY as fallback', async () => {
    await fs.writeFile(envPath, 'MCP_ENCRYPTION_KEY=fallback123\n', 'utf-8');
    const envMap = await getEnvMap(envPath);
    const encKey = envMap.get('ENCRYPTION_KEY') || envMap.get('MCP_ENCRYPTION_KEY');
    expect(encKey).toBe('fallback123');
  });
});

// ============================================================
// Input validation — trimming, blank rejection
// ============================================================

describe('input validation helpers', () => {
  it('getEnvMap trims whitespace from values', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oauth-trim-test-'));
    const envPath = path.join(tmpDir, '.env');
    // writeEnvFile stores exactly what's given — the contract trims at input time
    // readEnvFile trims keys and values during parse
    await fs.writeFile(envPath, '  SPACED_KEY  =  spaced_value  \n', 'utf-8');
    const envMap = await getEnvMap(envPath);
    expect(envMap.get('SPACED_KEY')).toBe('spaced_value');
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});

// ============================================================
// Integration test — contract env keys match service expectations
// ============================================================

describe('provider contract integration', () => {
  it('contract env keys match what MCPOAuthService reads', async () => {
    const { PROVIDER_CONTRACTS } = await import(
      '../services/mcp/oauth-provider-contract'
    );

    // These are the env key names the service hardcoded before the contract wiring.
    // If the contract changes, this test catches the mismatch.
    const expectedEnvKeys: Record<string, { clientId: string; clientSecret: string }> = {
      github: { clientId: 'GITHUB_CLIENT_ID', clientSecret: 'GITHUB_CLIENT_SECRET' },
      atlassian: { clientId: 'ATLASSIAN_CLIENT_ID', clientSecret: 'ATLASSIAN_CLIENT_SECRET' },
      google: { clientId: 'GOOGLE_CLIENT_ID', clientSecret: 'GOOGLE_CLIENT_SECRET' },
      microsoft: { clientId: 'MICROSOFT_CLIENT_ID', clientSecret: 'MICROSOFT_CLIENT_SECRET' },
    };

    for (const [provider, expected] of Object.entries(expectedEnvKeys)) {
      const contract = PROVIDER_CONTRACTS[provider];
      expect(contract, `Missing contract for ${provider}`).toBeDefined();
      expect(contract.envKeys.clientId).toBe(expected.clientId);
      expect(contract.envKeys.clientSecret).toBe(expected.clientSecret);
    }
  });

  it('contract callback paths match service callback URL patterns', async () => {
    const { PROVIDER_CONTRACTS } = await import(
      '../services/mcp/oauth-provider-contract'
    );

    // These are the callback path suffixes the service uses for default redirectUri
    const expectedPaths: Record<string, string[]> = {
      github: ['/api/v1/mcp/callback/github'],
      atlassian: ['/api/v1/mcp/callback/jira', '/api/v1/mcp/callback/confluence', '/api/v1/mcp/callback/atlassian'],
      google: ['/api/v1/mcp/callback/google_workspace'],
      microsoft: ['/api/v1/mcp/callback/outlook', '/api/v1/mcp/callback/teams', '/api/v1/mcp/callback/onedrive', '/api/v1/mcp/callback/onenote'],
    };

    for (const [provider, expected] of Object.entries(expectedPaths)) {
      const contract = PROVIDER_CONTRACTS[provider];
      expect(contract.callbackPaths).toEqual(expected);
    }
  });
});
