import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.utils';

const router = Router();
const prisma = new PrismaClient();

// Debug route to check database schema
router.get('/db-check', async (req, res) => {
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

export default router;
