import { Request } from 'express';

/**
 * Check if the request is in demo mode based on X-Demo-Mode header.
 * Demo mode routes requests to demo tables instead of real user data.
 */
export function isDemoModeRequest(req: Request): boolean {
  return req.headers['x-demo-mode'] === 'true';
}
