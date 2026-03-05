import { Request, Response } from 'express';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';
import * as pragmaLinkService from '../services/pragma-link.service';
import { storySourceService } from '../services/career-stories/story-source.service';
import { storyAnnotationService } from '../services/career-stories/story-annotation.service';

async function enrichStoryForPragma(story: { id: string; framework: string; sections: Record<string, any> }) {
  const sources = await storySourceService.getSourcesForStory(story.id);
  const { FRAMEWORK_SECTIONS } = await import('../services/ai/prompts/career-story.prompt');
  const sectionKeys = FRAMEWORK_SECTIONS[story.framework as keyof typeof FRAMEWORK_SECTIONS] || Object.keys(story.sections);
  const sourceCoverage = storySourceService.computeCoverage(sources, story.sections, sectionKeys);
  const annotations = await storyAnnotationService.getAnnotationsForStory(story.id);
  return { ...story, sources, sourceCoverage, annotations };
}

/**
 * POST /api/v1/pragma-links
 * Create a new pragma link for a career story.
 */
export const createPragmaLink = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const { storyId, tier, label, expiresAt } = req.body;

  if (!storyId || !tier) {
    return void sendError(res, 'storyId and tier are required', 400);
  }

  try {
    const link = await pragmaLinkService.createLink(
      userId,
      storyId,
      tier,
      label,
      expiresAt ? new Date(expiresAt) : null
    );

    const baseUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL || '';
    const url = `${baseUrl}/p/${link.shortCode}?t=${link.token}`;

    sendSuccess(res, {
      id: link.id,
      shortCode: link.shortCode,
      token: link.token,
      url,
      tier: link.tier,
      label: link.label,
      expiresAt: link.expiresAt,
    }, 'Pragma link created');
  } catch (error: any) {
    const msg = error.message || 'Failed to create link';
    const status = msg.includes('not found') || msg.includes('not owned') ? 404
      : msg.includes('demo') || msg.includes('Invalid tier') ? 400
      : msg.includes('Maximum') ? 429
      : 500;
    return void sendError(res, msg, status);
  }
});

/**
 * GET /api/v1/pragma-links?storyId=xxx
 * List all pragma links for a story.
 */
export const listPragmaLinks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const storyId = req.query.storyId as string;
  if (!storyId) {
    return void sendError(res, 'storyId query parameter is required', 400);
  }

  const links = await pragmaLinkService.listLinks(userId, storyId);
  sendSuccess(res, links);
});

/**
 * POST /api/v1/pragma-links/:id/revoke
 * Revoke a pragma link.
 */
export const revokePragmaLink = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const { id } = req.params;
  try {
    const result = await pragmaLinkService.revokeLink(userId, id);
    sendSuccess(res, result);
  } catch (error: any) {
    const msg = error.message || 'Failed to revoke link';
    const status = msg.includes('not found') || msg.includes('not owned') ? 404 : 500;
    return void sendError(res, msg, status);
  }
});

/**
 * GET /api/v1/pragma/resolve/:shortCode
 * Public resolve endpoint — no auth required.
 */
export const resolvePragmaLink = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { shortCode } = req.params;
  const token = req.query.t as string | undefined;

  const result = await pragmaLinkService.resolveLink(shortCode, token);

  if ('error' in result) {
    const messages: Record<string, string> = {
      not_found: 'Link not found',
      revoked: 'This share link has been revoked',
      expired: 'This share link has expired',
      content_unavailable: 'This story is no longer available',
      invalid_token: 'Invalid access token',
    };
    const errorKey = result.error as string;
    return void sendError(res, messages[errorKey] || errorKey, result.status);
  }

  // Record view (best-effort, don't fail on error)
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;
  const viewerId = req.user?.id || null;

  try {
    await pragmaLinkService.recordView(result.linkId, ip, userAgent, viewerId);
  } catch {
    // View tracking is supplementary — don't fail the request
  }

  // Enrich story with sources + annotations
  const enriched = await enrichStoryForPragma(result.story as any);

  // Apply tier filter
  const filtered = pragmaLinkService.filterByTier(
    enriched,
    enriched.sources || [],
    enriched.annotations || [],
    result.tier as 'public' | 'recruiter' | 'mentor'
  );

  // Set security headers
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');

  sendSuccess(res, {
    content: filtered,
    tier: result.tier,
    author: result.author,
  });
});
