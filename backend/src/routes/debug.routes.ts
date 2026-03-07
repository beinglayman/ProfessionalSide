import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response.utils';

const router = Router();

// Debug route to check database schema
router.get('/db-check', async (req: Request, res: Response) => {
  try {
    const results = {
      tables: {},
      connections: 'OK'
    } as any;

    // Test each table existence
    try {
      const userCount = await prisma.user.count();
      results.tables['users'] = `✅ ${userCount} records`;
    } catch (e: any) {
      results.tables['users'] = `❌ ${e.message}`;
    }

    try {
      const workspaceCount = await prisma.workspace.count();
      results.tables['workspaces'] = `✅ ${workspaceCount} records`;
    } catch (e: any) {
      results.tables['workspaces'] = `❌ ${e.message}`;
    }

    try {
      const memberCount = await prisma.workspaceMember.count();
      results.tables['workspace_members'] = `✅ ${memberCount} records`;
    } catch (e: any) {
      results.tables['workspace_members'] = `❌ ${e.message}`;
    }

    try {
      const orgCount = await prisma.organization.count();
      results.tables['organizations'] = `✅ ${orgCount} records`;
    } catch (e: any) {
      results.tables['organizations'] = `❌ ${e.message}`;
    }

    try {
      const journalCount = await prisma.journalEntry.count();
      results.tables['journal_entries'] = `✅ ${journalCount} records`;
    } catch (e: any) {
      results.tables['journal_entries'] = `❌ ${e.message}`;
    }

    sendSuccess(res, results, 'Database check completed');
  } catch (error) {
    console.error('Database check failed:', error);
    sendError(res, 'Database check failed', 500);
  }
});

// Full infrastructure diagnostics for Cmd+E Infra tab
router.get('/infra', authenticate, async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    // 1. Table existence check via pg_tables (not Prisma models — catches missing tables)
    const criticalTables = [
      'users', 'workspaces', 'workspace_members', 'organizations',
      'journal_entries', 'activities', 'career_stories', 'story_sections',
      'pragma_links', 'pragma_link_views', 'mcp_connections',
    ];

    const tableResults: Record<string, { exists: boolean; count: number | null; error: string | null }> = {};
    for (const table of criticalTables) {
      try {
        const existsResult: any[] = await prisma.$queryRawUnsafe(
          `SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = $1) as exists`,
          table
        );
        const exists = existsResult[0]?.exists === true;
        let count: number | null = null;
        if (exists) {
          const countResult: any[] = await prisma.$queryRawUnsafe(
            `SELECT count(*)::int as c FROM "${table}"`
          );
          count = countResult[0]?.c ?? null;
        }
        tableResults[table] = { exists, count, error: null };
      } catch (e: any) {
        tableResults[table] = { exists: false, count: null, error: e.message };
      }
    }

    // 2. Migration status from _prisma_migrations
    let migrations: any[] = [];
    try {
      migrations = await prisma.$queryRawUnsafe(
        `SELECT migration_name, finished_at, applied_steps_count, rolled_back_at
         FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10`
      );
    } catch (e: any) {
      migrations = [{ error: e.message }];
    }

    // 3. Ghost migration detection (recorded as applied but table missing)
    const ghostMigrations: string[] = [];
    try {
      const pragmaMigrations: any[] = await prisma.$queryRawUnsafe(
        `SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%pragma%'`
      );
      if (pragmaMigrations.length > 0 && !tableResults['pragma_links']?.exists) {
        ghostMigrations.push(...pragmaMigrations.map((m: any) => m.migration_name));
      }
    } catch {
      // _prisma_migrations might not exist
    }

    // 4. Connection / SSL info
    let connectionInfo: any = {};
    try {
      const sslResult: any[] = await prisma.$queryRawUnsafe(`SELECT ssl_is_used() as ssl`);
      connectionInfo.ssl = sslResult[0]?.ssl ?? 'unknown';
    } catch {
      connectionInfo.ssl = 'check failed';
    }
    try {
      const versionResult: any[] = await prisma.$queryRawUnsafe(`SELECT version() as v`);
      connectionInfo.pgVersion = versionResult[0]?.v ?? 'unknown';
    } catch {
      connectionInfo.pgVersion = 'unknown';
    }
    connectionInfo.databaseUrlSet = !!process.env.DATABASE_URL;
    connectionInfo.databaseUrlHasSsl = (process.env.DATABASE_URL || '').includes('sslmode');

    // 5. Runtime info
    const runtime = {
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV || 'not set',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryMB: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      platform: process.platform,
      pid: process.pid,
    };

    // 6. Summary
    const missingTables = Object.entries(tableResults)
      .filter(([, v]) => !v.exists)
      .map(([k]) => k);
    const failedTables = Object.entries(tableResults)
      .filter(([, v]) => v.error)
      .map(([k]) => k);

    const health = missingTables.length === 0 && failedTables.length === 0
      ? 'healthy'
      : missingTables.length > 0
        ? 'degraded'
        : 'error';

    sendSuccess(res, {
      health,
      diagnosisMs: Date.now() - startTime,
      summary: {
        missingTables,
        failedTables,
        ghostMigrations,
        totalTables: criticalTables.length,
        existingTables: criticalTables.length - missingTables.length,
      },
      tables: tableResults,
      migrations,
      connection: connectionInfo,
      runtime,
    }, 'Infrastructure diagnostics complete');
  } catch (error: any) {
    console.error('Infra diagnostics failed:', error);
    sendError(res, `Diagnostics failed: ${error.message}`, 500);
  }
});

export default router;
