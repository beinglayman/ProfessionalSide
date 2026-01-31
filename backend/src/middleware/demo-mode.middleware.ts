import { Request, Response, NextFunction } from 'express';
import { JournalService } from '../services/journal.service';

// Extend Express Request type to include journalService
declare global {
  namespace Express {
    interface Request {
      journalService?: JournalService;
      isDemoMode?: boolean;
    }
  }
}

/**
 * Check if the request is in demo mode based on X-Demo-Mode header.
 * Demo mode routes requests to demo tables instead of real user data.
 */
export function isDemoModeRequest(req: Request): boolean {
  return req.headers['x-demo-mode'] === 'true';
}

/**
 * Middleware that attaches a request-scoped JournalService instance.
 * The service is configured based on demo mode header.
 *
 * Usage in routes:
 *   router.use(attachJournalService);
 *   // Then in handlers: req.journalService.getEntries(...)
 *
 * When demo mode is dropped, simply remove this middleware and
 * use a singleton JournalService instead.
 */
export function attachJournalService(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const isDemoMode = isDemoModeRequest(req);
  req.isDemoMode = isDemoMode;
  req.journalService = new JournalService(isDemoMode);
  next();
}
