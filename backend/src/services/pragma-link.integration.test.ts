/**
 * Pragma Link Integration Tests
 *
 * Full lifecycle tests against a running backend (localhost:3002).
 * Self-contained: creates test stories in beforeAll, tears down in afterAll.
 *
 * Prerequisites:
 *   - Backend running on localhost:3002
 *   - PostgreSQL connected
 *   - Test user yc@inchronicle.com / yc2026s exists
 *
 * Run: npx vitest run src/services/pragma-link.integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API = 'http://localhost:3002/api/v1';
let TOKEN: string;
let USER_ID: string;

// Test story IDs — unique per run to avoid collisions
const RUN_ID = Date.now().toString(36);
const STORY_PUBLISHED_1 = `pragma-test-pub1-${RUN_ID}`;
const STORY_PUBLISHED_2 = `pragma-test-pub2-${RUN_ID}`;
const STORY_DRAFT = `pragma-test-draft-${RUN_ID}`;
const STORY_DEMO = `pragma-test-demo-${RUN_ID}`;

// Track created links for cross-test references
const createdLinks: Array<{ id: string; shortCode: string; token: string; tier: string }> = [];

// Test story sections — long enough to test truncation (>200 chars)
const TEST_SECTIONS = {
  situation: {
    summary: 'Our monolithic Ruby on Rails application was struggling to handle 10x growth in traffic. Response times degraded from 200ms to 2s, and deployments took 4 hours with frequent rollbacks. The engineering team was blocked on feature delivery due to tight coupling between modules.',
  },
  task: {
    summary: 'As the tech lead, I was tasked with designing and executing a migration strategy to decompose the monolith into microservices while maintaining zero downtime and keeping the 15-person engineering team productive throughout the transition.',
  },
  action: {
    summary: 'I introduced the Strangler Fig pattern, starting with the highest-value service boundaries identified through domain-driven design workshops. We built a service mesh with Istio, implemented circuit breakers, and created a shared testing framework. I paired with each team to migrate their domain, running both old and new code paths in parallel with feature flags.',
  },
  result: {
    summary: 'Over 6 months, we decomposed the monolith into 12 microservices. P95 latency dropped from 2s to 180ms. Deploy frequency increased from weekly to 15+ times per day. Zero customer-facing incidents during migration. The team shipped 3 major features that had been blocked for months.',
  },
};

// ============================================================================
// HELPERS
// ============================================================================

async function api(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const body = await res.json();
  return { status: res.status, body, headers: res.headers };
}

async function apiPublic(path: string) {
  const res = await fetch(`${API}${path}`);
  const body = await res.json();
  return { status: res.status, body, headers: res.headers };
}

async function dbExec(sql: string) {
  const { execSync } = await import('child_process');
  return execSync(
    `docker exec inchronicle-postgres psql -U inchronicle -d inchronicle_dev -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' }
  );
}

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

beforeAll(async () => {
  // Login
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'yc@inchronicle.com', password: 'yc2026s' }),
  });
  const loginBody = await loginRes.json();
  if (!loginBody.success) throw new Error(`Login failed: ${JSON.stringify(loginBody)}`);
  TOKEN = loginBody.data.accessToken;
  USER_ID = loginBody.data.user.id;

  // Seed test stories via direct DB insert
  const sectionsJson = JSON.stringify(TEST_SECTIONS).replace(/'/g, "''");
  await dbExec(`
    INSERT INTO career_stories (id, "userId", title, framework, sections, "sourceMode", "isPublished", visibility, "createdAt", "updatedAt")
    VALUES
      ('${STORY_PUBLISHED_1}', '${USER_ID}', 'Test Story: Backend Migration', 'star', '${sectionsJson}', 'production', true, 'network', NOW(), NOW()),
      ('${STORY_PUBLISHED_2}', '${USER_ID}', 'Test Story: Analytics Dashboard', 'star', '${sectionsJson}', 'production', true, 'network', NOW(), NOW()),
      ('${STORY_DRAFT}', '${USER_ID}', 'Test Story: Draft Mentorship', 'star', '${sectionsJson}', 'production', false, 'private', NOW(), NOW()),
      ('${STORY_DEMO}', '${USER_ID}', 'Test Story: Demo Only', 'star', '${sectionsJson}', 'demo', false, 'private', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);
}, 15000);

afterAll(async () => {
  // Teardown: delete test stories (cascade deletes pragma_links + pragma_link_views)
  const ids = [STORY_PUBLISHED_1, STORY_PUBLISHED_2, STORY_DRAFT, STORY_DEMO].map(id => `'${id}'`).join(',');
  await dbExec(`DELETE FROM career_stories WHERE id IN (${ids});`);
}, 10000);

// ============================================================================
// CREATE LINK
// ============================================================================

describe('POST /pragma-links — Create', () => {
  it('creates a recruiter link with label', async () => {
    const { status, body } = await api('/pragma-links', {
      method: 'POST',
      body: JSON.stringify({ storyId: STORY_PUBLISHED_1, tier: 'recruiter', label: 'Acme Corp - Jane' }),
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.shortCode).toHaveLength(8);
    expect(body.data.token).toHaveLength(32);
    expect(body.data.tier).toBe('recruiter');
    expect(body.data.label).toBe('Acme Corp - Jane');
    expect(body.data.url).toContain(`/p/${body.data.shortCode}?t=${body.data.token}`);
    expect(body.data.expiresAt).toBeNull();

    createdLinks.push(body.data);
  });

  it('creates a mentor link', async () => {
    const { status, body } = await api('/pragma-links', {
      method: 'POST',
      body: JSON.stringify({ storyId: STORY_PUBLISHED_1, tier: 'mentor', label: 'Coach Sarah' }),
    });

    expect(status).toBe(200);
    expect(body.data.tier).toBe('mentor');
    createdLinks.push(body.data);
  });

  it('creates a public link', async () => {
    const { status, body } = await api('/pragma-links', {
      method: 'POST',
      body: JSON.stringify({ storyId: STORY_PUBLISHED_1, tier: 'public' }),
    });

    expect(status).toBe(200);
    expect(body.data.tier).toBe('public');
    expect(body.data.label).toBeNull();
    createdLinks.push(body.data);
  });

  it('creates a link with expiry', async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { status, body } = await api('/pragma-links', {
      method: 'POST',
      body: JSON.stringify({ storyId: STORY_PUBLISHED_2, tier: 'recruiter', expiresAt }),
    });

    expect(status).toBe(200);
    expect(body.data.expiresAt).not.toBeNull();
    createdLinks.push(body.data);
  });

  it('creates a link for a draft (unpublished) story', async () => {
    const { status, body } = await api('/pragma-links', {
      method: 'POST',
      body: JSON.stringify({ storyId: STORY_DRAFT, tier: 'recruiter', label: 'Draft link' }),
    });

    expect(status).toBe(200);
    expect(body.data.tier).toBe('recruiter');
    createdLinks.push(body.data);
  });

  it('rejects invalid tier', async () => {
    const { status, body } = await api('/pragma-links', {
      method: 'POST',
      body: JSON.stringify({ storyId: STORY_PUBLISHED_1, tier: 'admin' }),
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid tier');
  });

  it('rejects missing storyId', async () => {
    const { status, body } = await api('/pragma-links', {
      method: 'POST',
      body: JSON.stringify({ tier: 'recruiter' }),
    });

    expect(status).toBe(400);
    expect(body.error).toContain('required');
  });

  it('rejects non-existent story', async () => {
    const { status, body } = await api('/pragma-links', {
      method: 'POST',
      body: JSON.stringify({ storyId: 'nonexistent-story-id', tier: 'recruiter' }),
    });

    expect(status).toBe(404);
    expect(body.error).toContain('not found');
  });

  it('rejects demo story', async () => {
    const { status, body } = await api('/pragma-links', {
      method: 'POST',
      body: JSON.stringify({ storyId: STORY_DEMO, tier: 'recruiter' }),
    });

    expect(status).toBe(400);
    expect(body.error).toContain('demo');
  });

  it('requires authentication', async () => {
    const res = await fetch(`${API}/pragma-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId: STORY_PUBLISHED_1, tier: 'recruiter' }),
    });

    expect(res.status).toBe(401);
  });
});

// ============================================================================
// LIST LINKS
// ============================================================================

describe('GET /pragma-links — List', () => {
  it('lists all links for a story with expected fields', async () => {
    const { status, body } = await api(`/pragma-links?storyId=${STORY_PUBLISHED_1}`);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(3);

    const link = body.data[0];
    expect(link).toHaveProperty('id');
    expect(link).toHaveProperty('shortCode');
    expect(link).toHaveProperty('token');
    expect(link).toHaveProperty('tier');
    expect(link).toHaveProperty('views');
    expect(link).toHaveProperty('lastViewedAt');
    expect(link).toHaveProperty('createdAt');
  });

  it('returns empty array for story with no links', async () => {
    const { body } = await api(`/pragma-links?storyId=nonexistent-but-valid`);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('requires storyId query param', async () => {
    const { status, body } = await api('/pragma-links');
    expect(status).toBe(400);
    expect(body.error).toContain('storyId');
  });

  it('requires authentication', async () => {
    const res = await fetch(`${API}/pragma-links?storyId=${STORY_PUBLISHED_1}`);
    expect(res.status).toBe(401);
  });
});

// ============================================================================
// RESOLVE — Public Tier (no token)
// ============================================================================

describe('GET /pragma/resolve/:shortCode — Public Tier', () => {
  it('returns truncated teaser without token', async () => {
    const link = createdLinks[0];
    const { status, body } = await apiPublic(`/pragma/resolve/${link.shortCode}`);

    expect(status).toBe(200);
    expect(body.data.tier).toBe('public');

    const sections = body.data.content.sections;
    for (const [, section] of Object.entries(sections) as [string, any][]) {
      expect(section.summary.length).toBeLessThanOrEqual(205);
    }

    expect(body.data.content.sources).toEqual([]);
    expect(body.data.content.annotations).toEqual([]);
    expect(body.data.author.name).toBeTruthy();
  });

  it('sets security response headers', async () => {
    const link = createdLinks[0];
    const res = await fetch(`${API}/pragma/resolve/${link.shortCode}`);

    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});

// ============================================================================
// RESOLVE — Recruiter Tier (with token)
// ============================================================================

describe('GET /pragma/resolve/:shortCode?t=token — Recruiter Tier', () => {
  it('returns full sections, no annotations', async () => {
    const link = createdLinks[0]; // recruiter
    const { status, body } = await apiPublic(`/pragma/resolve/${link.shortCode}?t=${link.token}`);

    expect(status).toBe(200);
    expect(body.data.tier).toBe('recruiter');

    const sections = body.data.content.sections;
    const maxLen = Math.max(...Object.values(sections).map((s: any) => s.summary.length));
    expect(maxLen).toBeGreaterThan(200);

    expect(body.data.content.annotations).toEqual([]);
  });
});

// ============================================================================
// RESOLVE — Mentor Tier (with token)
// ============================================================================

describe('GET /pragma/resolve/:shortCode?t=token — Mentor Tier', () => {
  it('returns full sections with annotations array', async () => {
    const link = createdLinks[1]; // mentor
    const { status, body } = await apiPublic(`/pragma/resolve/${link.shortCode}?t=${link.token}`);

    expect(status).toBe(200);
    expect(body.data.tier).toBe('mentor');

    const sections = body.data.content.sections;
    const maxLen = Math.max(...Object.values(sections).map((s: any) => s.summary.length));
    expect(maxLen).toBeGreaterThan(200);

    expect(body.data.content).toHaveProperty('annotations');
    expect(Array.isArray(body.data.content.annotations)).toBe(true);
  });
});

// ============================================================================
// RESOLVE — Error States
// ============================================================================

describe('GET /pragma/resolve — Error States', () => {
  it('returns 404 for non-existent shortCode', async () => {
    const { status, body } = await apiPublic('/pragma/resolve/zzzzzzzz');
    expect(status).toBe(404);
    expect(body.success).toBe(false);
  });

  it('returns 403 for invalid token', async () => {
    const link = createdLinks[0];
    const { status, body } = await apiPublic(`/pragma/resolve/${link.shortCode}?t=invalid-token-here`);
    expect(status).toBe(403);
    expect(body.error).toContain('Invalid');
  });

  it('returns 403 for mismatched token (token from different link)', async () => {
    const link1 = createdLinks[0];
    const link2 = createdLinks[1];
    const { status } = await apiPublic(`/pragma/resolve/${link1.shortCode}?t=${link2.token}`);
    expect(status).toBe(403);
  });
});

// ============================================================================
// VIEW TRACKING
// ============================================================================

describe('View Tracking', () => {
  it('records a view on resolve and increments count', async () => {
    // Create a fresh link for clean view counting
    const { body: createBody } = await api('/pragma-links', {
      method: 'POST',
      body: JSON.stringify({ storyId: STORY_PUBLISHED_2, tier: 'public', label: 'View test' }),
    });
    const freshLink = createBody.data;

    // Resolve it
    await apiPublic(`/pragma/resolve/${freshLink.shortCode}`);
    await new Promise(r => setTimeout(r, 500));

    // Check view count
    const { body } = await api(`/pragma-links?storyId=${STORY_PUBLISHED_2}`);
    const linkData = body.data.find((l: any) => l.id === freshLink.id);
    expect(linkData.views).toBeGreaterThanOrEqual(1);
    expect(linkData.lastViewedAt).toBeTruthy();
  });

  it('deduplicates views from same IP within 1 hour', async () => {
    // Create another fresh link
    const { body: createBody } = await api('/pragma-links', {
      method: 'POST',
      body: JSON.stringify({ storyId: STORY_PUBLISHED_2, tier: 'recruiter', label: 'Dedup test' }),
    });
    const dedupLink = createBody.data;

    // Resolve 3 times rapidly from same IP
    await apiPublic(`/pragma/resolve/${dedupLink.shortCode}?t=${dedupLink.token}`);
    await apiPublic(`/pragma/resolve/${dedupLink.shortCode}?t=${dedupLink.token}`);
    await apiPublic(`/pragma/resolve/${dedupLink.shortCode}?t=${dedupLink.token}`);
    await new Promise(r => setTimeout(r, 500));

    // Should have at most 1 view (dedup by IP+linkId within 1 hour)
    const { body } = await api(`/pragma-links?storyId=${STORY_PUBLISHED_2}`);
    const linkData = body.data.find((l: any) => l.id === dedupLink.id);
    expect(linkData.views).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// REVOKE
// ============================================================================

describe('POST /pragma-links/:id/revoke — Revoke', () => {
  let revokeLink: typeof createdLinks[0];

  it('creates a link to revoke', async () => {
    const { body } = await api('/pragma-links', {
      method: 'POST',
      body: JSON.stringify({ storyId: STORY_PUBLISHED_2, tier: 'recruiter', label: 'To Revoke' }),
    });
    revokeLink = body.data;
    expect(revokeLink.id).toBeTruthy();
  });

  it('revokes a link successfully', async () => {
    const { status, body } = await api(`/pragma-links/${revokeLink.id}/revoke`, { method: 'POST' });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.revokedAt).toBeTruthy();
  });

  it('revoked link returns 410 on resolve with token', async () => {
    const { status, body } = await apiPublic(`/pragma/resolve/${revokeLink.shortCode}?t=${revokeLink.token}`);
    expect(status).toBe(410);
    expect(body.error).toContain('revoked');
  });

  it('revoked link returns 410 on resolve without token', async () => {
    const { status } = await apiPublic(`/pragma/resolve/${revokeLink.shortCode}`);
    expect(status).toBe(410);
  });

  it('revoked link appears in list with revokedAt', async () => {
    const { body } = await api(`/pragma-links?storyId=${STORY_PUBLISHED_2}`);
    const revoked = body.data.find((l: any) => l.id === revokeLink.id);
    expect(revoked).toBeTruthy();
    expect(revoked.revokedAt).toBeTruthy();
  });

  it('rejects revoking non-existent link', async () => {
    const { status, body } = await api('/pragma-links/nonexistent-id/revoke', { method: 'POST' });
    expect(status).toBe(404);
    expect(body.error).toContain('not found');
  });
});

// ============================================================================
// UNPUBLISH WARNING
// ============================================================================

describe('Unpublish — activePragmaLinkCount', () => {
  it('includes activePragmaLinkCount in unpublish response', async () => {
    const { status, body } = await api(`/career-stories/stories/${STORY_PUBLISHED_1}/unpublish`, {
      method: 'POST',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('activePragmaLinkCount');
    expect(body.data.activePragmaLinkCount).toBeGreaterThanOrEqual(3);

    // Re-publish for clean state
    await api(`/career-stories/stories/${STORY_PUBLISHED_1}/publish`, {
      method: 'POST',
      body: JSON.stringify({ visibility: 'network' }),
    });
  });
});

// ============================================================================
// TIER FILTERING — Content Correctness
// ============================================================================

describe('Tier Filtering — Content Correctness', () => {
  it('public tier truncates all sections to <=205 chars', async () => {
    const link = createdLinks[2]; // public link
    const { body } = await apiPublic(`/pragma/resolve/${link.shortCode}`);

    for (const [, section] of Object.entries(body.data.content.sections) as [string, any][]) {
      expect(section.summary.length).toBeLessThanOrEqual(205);
    }
  });

  it('recruiter tier returns full (non-truncated) sections', async () => {
    const link = createdLinks[0]; // recruiter
    const { body } = await apiPublic(`/pragma/resolve/${link.shortCode}?t=${link.token}`);

    const maxLen = Math.max(...Object.values(body.data.content.sections).map((s: any) => s.summary.length));
    expect(maxLen).toBeGreaterThan(200);
  });

  it('all tiers include story metadata (id, title, framework)', async () => {
    const link = createdLinks[0];
    const { body } = await apiPublic(`/pragma/resolve/${link.shortCode}?t=${link.token}`);

    const content = body.data.content;
    expect(content.id).toBe(STORY_PUBLISHED_1);
    expect(content.title).toBe('Test Story: Backend Migration');
    expect(content.framework).toBe('star');
  });
});

// ============================================================================
// SHORTCODE & TOKEN FORMAT
// ============================================================================

describe('ShortCode & Token Format', () => {
  it('shortCode is 8 chars from allowed alphabet (no ambiguous chars)', () => {
    for (const link of createdLinks) {
      expect(link.shortCode).toMatch(/^[a-hjkmnp-z2-9]{8}$/);
    }
  });

  it('token is 32 chars base64url', () => {
    for (const link of createdLinks) {
      expect(link.token).toHaveLength(32);
      expect(link.token).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('all shortCodes and tokens are unique', () => {
    const shortCodes = new Set(createdLinks.map(l => l.shortCode));
    const tokens = new Set(createdLinks.map(l => l.token));
    expect(shortCodes.size).toBe(createdLinks.length);
    expect(tokens.size).toBe(createdLinks.length);
  });
});

// ============================================================================
// CROSS-STORY ISOLATION
// ============================================================================

describe('Cross-Story Isolation', () => {
  it('listing links for story 2 does not include story 1 links', async () => {
    const { body: story2Links } = await api(`/pragma-links?storyId=${STORY_PUBLISHED_2}`);
    const { body: story1Links } = await api(`/pragma-links?storyId=${STORY_PUBLISHED_1}`);

    const story2Ids = new Set(story2Links.data.map((l: any) => l.id));
    const story1Ids = new Set(story1Links.data.map((l: any) => l.id));

    // No overlap
    for (const id of story1Ids) {
      expect(story2Ids.has(id)).toBe(false);
    }
  });
});
