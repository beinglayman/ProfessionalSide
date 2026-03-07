/**
 * Debug Routes Tests
 *
 * Tests for the /api/debug/infra diagnostics endpoint.
 * Validates table checking, ghost migration detection, health classification,
 * and connection/runtime info gathering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// Mock prisma before importing the router
vi.mock('../lib/prisma', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    user: { count: vi.fn() },
    workspace: { count: vi.fn() },
    workspaceMember: { count: vi.fn() },
    organization: { count: vi.fn() },
    journalEntry: { count: vi.fn() },
  },
}));

// Mock auth middleware to pass through
vi.mock('../middleware/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
}));

import { prisma } from '../lib/prisma';

// Import the router and extract the infra handler
import debugRouter from './debug.routes';

// Helper to get a route handler from an Express router
function getHandler(router: any, method: string, path: string) {
  for (const layer of router.stack) {
    if (layer.route?.path === path && layer.route?.methods[method]) {
      // Return the last handler (after middleware)
      const handlers = layer.route.stack.map((s: any) => s.handle);
      return handlers[handlers.length - 1];
    }
  }
  return null;
}

function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

function mockReq(overrides: Partial<Request> = {}) {
  return { ...overrides } as Request;
}

// Setup a default "all tables exist" mock
function setupAllTablesExist() {
  const mockQueryRaw = prisma.$queryRawUnsafe as any;
  mockQueryRaw.mockImplementation(async (sql: string, ...args: any[]) => {
    if (sql.includes('pg_tables') && sql.includes('$1')) {
      return [{ exists: true }];
    }
    if (sql.includes('count(*)')) {
      return [{ c: 5 }];
    }
    if (sql.includes('_prisma_migrations') && sql.includes('ORDER BY')) {
      return [{ migration_name: '20260305_test', finished_at: new Date().toISOString(), applied_steps_count: 1, rolled_back_at: null }];
    }
    if (sql.includes('_prisma_migrations') && sql.includes('pragma')) {
      return [];
    }
    if (sql.includes('ssl_is_used')) {
      return [{ ssl: true }];
    }
    if (sql.includes('version()')) {
      return [{ v: 'PostgreSQL 15.4' }];
    }
    return [];
  });
}

describe('GET /api/debug/infra', () => {
  const handler = getHandler(debugRouter, 'get', '/infra');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns healthy when all tables exist', async () => {
    setupAllTablesExist();
    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    const data = (res.json as any).mock.calls[0][0].data;
    expect(data.health).toBe('healthy');
    expect(data.summary.missingTables).toEqual([]);
    expect(data.summary.ghostMigrations).toEqual([]);
    expect(data.summary.totalTables).toBe(11);
    expect(data.summary.existingTables).toBe(11);
    expect(data.runtime.nodeVersion).toBe(process.version);
  });

  it('returns degraded when tables are missing', async () => {
    const mockQueryRaw = prisma.$queryRawUnsafe as any;
    mockQueryRaw.mockImplementation(async (sql: string, ...args: any[]) => {
      if (sql.includes('pg_tables') && sql.includes('$1')) {
        const table = args[0];
        if (table === 'pragma_links' || table === 'pragma_link_views') {
          return [{ exists: false }];
        }
        return [{ exists: true }];
      }
      if (sql.includes('count(*)')) return [{ c: 3 }];
      if (sql.includes('_prisma_migrations') && sql.includes('ORDER BY')) return [];
      if (sql.includes('_prisma_migrations') && sql.includes('pragma')) return [];
      if (sql.includes('ssl_is_used')) return [{ ssl: true }];
      if (sql.includes('version()')) return [{ v: 'PostgreSQL 15.4' }];
      return [];
    });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    const data = (res.json as any).mock.calls[0][0].data;
    expect(data.health).toBe('degraded');
    expect(data.summary.missingTables).toContain('pragma_links');
    expect(data.summary.missingTables).toContain('pragma_link_views');
    expect(data.tables.pragma_links.exists).toBe(false);
    expect(data.tables.pragma_links.count).toBeNull();
    expect(data.tables.users.exists).toBe(true);
    expect(data.tables.users.count).toBe(3);
  });

  it('detects ghost migrations (recorded as applied but table missing)', async () => {
    const mockQueryRaw = prisma.$queryRawUnsafe as any;
    mockQueryRaw.mockImplementation(async (sql: string, ...args: any[]) => {
      if (sql.includes('pg_tables') && sql.includes('$1')) {
        const table = args[0];
        if (table === 'pragma_links') return [{ exists: false }];
        return [{ exists: true }];
      }
      if (sql.includes('count(*)')) return [{ c: 1 }];
      if (sql.includes('_prisma_migrations') && sql.includes('ORDER BY')) {
        return [{ migration_name: '20260305010000_add_pragma_links', finished_at: new Date().toISOString(), applied_steps_count: 1, rolled_back_at: null }];
      }
      if (sql.includes('_prisma_migrations') && sql.includes('pragma')) {
        return [{ migration_name: '20260305010000_add_pragma_links' }];
      }
      if (sql.includes('ssl_is_used')) return [{ ssl: true }];
      if (sql.includes('version()')) return [{ v: 'PostgreSQL 15.4' }];
      return [];
    });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    const data = (res.json as any).mock.calls[0][0].data;
    expect(data.summary.ghostMigrations).toEqual(['20260305010000_add_pragma_links']);
    expect(data.health).toBe('degraded');
  });

  it('does not flag ghost when pragma table exists', async () => {
    const mockQueryRaw = prisma.$queryRawUnsafe as any;
    mockQueryRaw.mockImplementation(async (sql: string, ...args: any[]) => {
      if (sql.includes('pg_tables') && sql.includes('$1')) return [{ exists: true }];
      if (sql.includes('count(*)')) return [{ c: 2 }];
      if (sql.includes('_prisma_migrations') && sql.includes('ORDER BY')) return [];
      if (sql.includes('_prisma_migrations') && sql.includes('pragma')) {
        return [{ migration_name: '20260305010000_add_pragma_links' }];
      }
      if (sql.includes('ssl_is_used')) return [{ ssl: true }];
      if (sql.includes('version()')) return [{ v: 'PG' }];
      return [];
    });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    const data = (res.json as any).mock.calls[0][0].data;
    expect(data.summary.ghostMigrations).toEqual([]);
  });

  it('handles table check errors gracefully', async () => {
    const mockQueryRaw = prisma.$queryRawUnsafe as any;
    mockQueryRaw.mockImplementation(async (sql: string) => {
      if (sql.includes('pg_tables')) throw new Error('connection refused');
      if (sql.includes('_prisma_migrations') && sql.includes('ORDER BY')) return [{ error: 'connection refused' }];
      if (sql.includes('_prisma_migrations') && sql.includes('pragma')) throw new Error('nope');
      if (sql.includes('ssl_is_used')) throw new Error('nope');
      if (sql.includes('version()')) throw new Error('nope');
      return [];
    });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    const data = (res.json as any).mock.calls[0][0].data;
    expect(data.summary.failedTables.length).toBeGreaterThan(0);
    expect(data.tables.users.error).toBe('connection refused');
    expect(data.tables.users.exists).toBe(false);
    expect(data.connection.ssl).toBe('check failed');
  });

  it('reports SSL and connection info', async () => {
    const mockQueryRaw = prisma.$queryRawUnsafe as any;
    mockQueryRaw.mockImplementation(async (sql: string) => {
      if (sql.includes('pg_tables')) return [{ exists: true }];
      if (sql.includes('count(*)')) return [{ c: 0 }];
      if (sql.includes('_prisma_migrations')) return [];
      if (sql.includes('ssl_is_used')) return [{ ssl: false }];
      if (sql.includes('version()')) return [{ v: 'PostgreSQL 14.0' }];
      return [];
    });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    const data = (res.json as any).mock.calls[0][0].data;
    expect(data.connection.ssl).toBe(false);
    expect(data.connection.pgVersion).toBe('PostgreSQL 14.0');
    expect(typeof data.connection.databaseUrlSet).toBe('boolean');
    expect(typeof data.connection.databaseUrlHasSsl).toBe('boolean');
  });

  it('includes timing and runtime info', async () => {
    setupAllTablesExist();
    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    const data = (res.json as any).mock.calls[0][0].data;
    expect(data.diagnosisMs).toBeGreaterThanOrEqual(0);
    expect(typeof data.diagnosisMs).toBe('number');
    expect(data.runtime.nodeVersion).toMatch(/^v\d+/);
    expect(typeof data.runtime.uptimeSeconds).toBe('number');
    expect(typeof data.runtime.memoryMB.rss).toBe('number');
    expect(typeof data.runtime.pid).toBe('number');
  });
});
