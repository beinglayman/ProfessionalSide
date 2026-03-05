import crypto from 'crypto';
import { PrismaClient, PragmaLink } from '@prisma/client';
import { filterSources } from '../utils/source-filter';

const prisma = new PrismaClient();

// 30-char alphabet: no ambiguous chars (0/O, 1/l/I)
const SHORT_CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
const SHORT_CODE_LENGTH = 8;
const MAX_COLLISION_RETRIES = 3;
const MAX_ACTIVE_LINKS_PER_STORY = 20;
const MAX_ACTIVE_LINKS_PER_USER = 100;

const VALID_TIERS = ['public', 'recruiter', 'mentor'] as const;
type Tier = (typeof VALID_TIERS)[number];

export function generateShortCode(): string {
  const result: string[] = [];
  for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
    let byte: number;
    // Rejection sampling to avoid modulo bias (256 % 30 = 16)
    do {
      byte = crypto.randomBytes(1)[0];
    } while (byte >= 240); // 240 = 30 * 8, largest multiple of 30 <= 255
    result.push(SHORT_CODE_CHARS[byte % SHORT_CODE_CHARS.length]);
  }
  return result.join('');
}

export function generateToken(): string {
  return crypto.randomBytes(24).toString('base64url'); // 32 chars
}

export async function createLink(
  userId: string,
  storyId: string,
  tier: string,
  label?: string,
  expiresAt?: Date | null
): Promise<PragmaLink> {
  // Validate tier
  if (!VALID_TIERS.includes(tier as Tier)) {
    throw new Error(`Invalid tier: ${tier}. Must be one of: ${VALID_TIERS.join(', ')}`);
  }

  // Validate story exists + owned by user
  const story = await prisma.careerStory.findUnique({
    where: { id: storyId },
    select: { id: true, userId: true, sourceMode: true },
  });
  if (!story) {
    throw new Error('Story not found');
  }
  if (story.userId !== userId) {
    throw new Error('Story not owned by user');
  }
  if (story.sourceMode === 'demo') {
    throw new Error('Cannot create share links for demo stories');
  }

  // Check per-story limit
  const storyLinkCount = await prisma.pragmaLink.count({
    where: {
      storyId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  if (storyLinkCount >= MAX_ACTIVE_LINKS_PER_STORY) {
    throw new Error(`Maximum ${MAX_ACTIVE_LINKS_PER_STORY} active links per story reached`);
  }

  // Check per-user limit
  const userLinkCount = await prisma.pragmaLink.count({
    where: {
      userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  if (userLinkCount >= MAX_ACTIVE_LINKS_PER_USER) {
    throw new Error(`Maximum ${MAX_ACTIVE_LINKS_PER_USER} active links per user reached`);
  }

  // Generate shortCode + token, retry on collision
  const token = generateToken();
  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
    const shortCode = generateShortCode();
    try {
      const link = await prisma.pragmaLink.create({
        data: {
          userId,
          storyId,
          shortCode,
          token,
          tier,
          label: label || null,
          expiresAt: expiresAt || null,
        },
      });
      return link;
    } catch (error: any) {
      // P2002 = unique constraint violation (shortCode collision)
      if (error.code === 'P2002' && attempt < MAX_COLLISION_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('Failed to generate unique short code after retries');
}

export async function listLinks(userId: string, storyId: string) {
  const links = await prisma.pragmaLink.findMany({
    where: { storyId, userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { views: true } },
    },
  });

  // Compute lastViewedAt per link
  const linkIds = links.map((l) => l.id);
  const lastViews = linkIds.length > 0
    ? await prisma.pragmaLinkView.groupBy({
        by: ['linkId'],
        where: { linkId: { in: linkIds } },
        _max: { viewedAt: true },
      })
    : [];

  const lastViewMap = new Map(lastViews.map((v) => [v.linkId, v._max.viewedAt]));

  return links.map((link) => ({
    id: link.id,
    shortCode: link.shortCode,
    token: link.token,
    tier: link.tier,
    label: link.label,
    views: link._count.views,
    lastViewedAt: lastViewMap.get(link.id) || null,
    expiresAt: link.expiresAt,
    revokedAt: link.revokedAt,
    createdAt: link.createdAt,
  }));
}

export async function revokeLink(userId: string, linkId: string) {
  const link = await prisma.pragmaLink.findUnique({ where: { id: linkId } });
  if (!link) {
    throw new Error('Link not found');
  }
  if (link.userId !== userId) {
    throw new Error('Link not owned by user');
  }

  const updated = await prisma.pragmaLink.update({
    where: { id: linkId },
    data: { revokedAt: new Date() },
  });
  return { success: true, revokedAt: updated.revokedAt };
}

export async function resolveLink(shortCode: string, token?: string) {
  // Find link by shortCode
  const linkByCode = await prisma.pragmaLink.findUnique({
    where: { shortCode },
    include: {
      story: {
        include: { user: { select: { id: true, isActive: true, name: true, title: true, company: true, avatar: true } } },
      },
    },
  });

  if (!linkByCode) {
    return { error: 'not_found', status: 404 };
  }

  // Check revoked
  if (linkByCode.revokedAt) {
    return { error: 'revoked', status: 410 };
  }

  // Check expired
  if (linkByCode.expiresAt && linkByCode.expiresAt < new Date()) {
    return { error: 'expired', status: 410 };
  }

  // Check story + user active
  if (!linkByCode.story || !linkByCode.story.user?.isActive) {
    return { error: 'content_unavailable', status: 410 };
  }

  // Determine tier
  let resolvedTier: Tier = 'public';
  let resolvedLinkId = linkByCode.id;

  if (token) {
    const linkByToken = await prisma.pragmaLink.findUnique({ where: { token } });
    if (!linkByToken) {
      return { error: 'invalid_token', status: 403 };
    }
    if (linkByToken.shortCode !== shortCode) {
      return { error: 'invalid_token', status: 403 };
    }
    resolvedTier = linkByToken.tier as Tier;
    resolvedLinkId = linkByToken.id;
  }

  const author = linkByCode.story.user;

  return {
    story: linkByCode.story,
    tier: resolvedTier,
    linkId: resolvedLinkId,
    author: { id: author.id, name: author.name, title: author.title, company: author.company, avatar: author.avatar },
  };
}

export async function recordView(
  linkId: string,
  ip?: string | null,
  userAgent?: string | null,
  viewerId?: string | null
) {
  // Dedup: 1 view per IP per link per hour
  if (ip) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentView = await prisma.pragmaLinkView.findFirst({
      where: {
        linkId,
        ip,
        viewedAt: { gt: oneHourAgo },
      },
    });
    if (recentView) return null;
  }

  return prisma.pragmaLinkView.create({
    data: {
      linkId,
      ip: ip || null,
      userAgent: userAgent || null,
      viewerId: viewerId || null,
    },
  });
}

export function filterByTier(
  story: any,
  sources: any[],
  annotations: any[],
  tier: Tier
) {
  const base = {
    id: story.id,
    title: story.title,
    framework: story.framework,
    archetype: story.archetype,
    category: story.category,
    publishedAt: story.publishedAt,
  };

  switch (tier) {
    case 'public':
      return {
        ...base,
        sections: truncateSections(story.sections, 200),
        sources: [],
        annotations: [],
      };
    case 'recruiter':
      return {
        ...base,
        sections: story.sections,
        sources: filterSources(sources),
        annotations: [],
      };
    case 'mentor':
      return {
        ...base,
        sections: story.sections,
        sources: filterSources(sources),
        annotations: annotations ?? [],
      };
  }
}

export function truncateSections(
  sections: Record<string, { summary?: string }>,
  maxChars = 200
): Record<string, { summary: string }> {
  if (!sections) return {};
  const truncated: Record<string, { summary: string }> = {};
  for (const [key, section] of Object.entries(sections)) {
    const text = section?.summary ?? '';
    if (text.length <= maxChars) {
      truncated[key] = { summary: text };
    } else {
      const cut = text.slice(0, maxChars);
      const lastSpace = cut.lastIndexOf(' ');
      truncated[key] = {
        summary: (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '...',
      };
    }
  }
  return truncated;
}

export async function countActiveLinks(storyId: string): Promise<number> {
  return prisma.pragmaLink.count({
    where: {
      storyId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
}
