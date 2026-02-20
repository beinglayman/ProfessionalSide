/**
 * Activity Context Adapter
 *
 * Normalizes rawData from 13 tool subtypes into a uniform ActivityContext shape
 * for the Career Story LLM. Includes:
 * - Per-tool field extraction (people, body, labels, scope, container, etc.)
 * - Secret scanning on body content
 * - Heuristic ranking using 9 existing signals (no extra LLM call)
 * - Activity capping (default: top 20)
 *
 * @see docs/plans/2026-02-12-wizard-pipeline-gap-analysis.md §16-17
 */

import { scanAndStrip } from './secret-scanner';
// NOTE: escapeHandlebarsInput is NOT imported here. The adapter is a pure data
// normalizer — template escaping belongs in the prompt layer. (RH-1)

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityContext {
  title: string;
  date: string;
  source: string;
  sourceSubtype?: string;
  people: string[];
  userRole: string;
  body?: string;
  labels?: string[];
  scope?: string;
  container?: string;
  state?: string;
  linkedItems?: string[];
  sentiment?: string;
  isRoutine?: boolean;
}

interface ActivityLike {
  id: string;
  source: string;
  title: string;
  description?: string | null;
  timestamp?: Date | string;
  rawData?: Record<string, any> | null;
}

export interface RankedActivity {
  activity: ActivityLike;
  context: ActivityContext;
  score: number;
  signals: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_BODY_LENGTH = 500;
const EXCLUDED_BRANCHES = new Set(['main', 'master', 'develop']);
const EDGE_SCORES: Record<string, number> = {
  primary: 3, outcome: 2.5, supporting: 1.5, contextual: 0.5,
};

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Convert a raw ToolActivity into a normalized ActivityContext.
 */
export function toActivityContext(activity: ActivityLike, selfIdentifier: string): ActivityContext {
  const raw = (activity.rawData || {}) as Record<string, any>;
  const source = activity.source?.toLowerCase() || 'unknown';
  const selfLower = selfIdentifier.toLowerCase();

  const dateStr = activity.timestamp
    ? new Date(activity.timestamp).toISOString().split('T')[0]
    : 'unknown';

  // Dispatch to per-tool extractor — 7 dedicated + default (RJ-4)
  // Only tools with body-equivalent content or unique signals get dedicated extractors.
  // Confluence, Google Drive, Google Meet, Figma, OneDrive → default (title+date+people only)
  switch (source) {
    case 'github':
      return extractGitHub(activity, raw, selfLower, dateStr);
    case 'jira':
      return extractJira(activity, raw, selfLower, dateStr);
    case 'slack':
      return extractSlack(activity, raw, selfLower, dateStr);
    case 'outlook':
      return extractOutlook(activity, raw, selfLower, dateStr);
    case 'google-calendar':
      return extractGoogleCalendar(activity, raw, selfLower, dateStr);
    case 'google-docs':
      return extractGoogleDocs(activity, raw, selfLower, dateStr);
    case 'google-sheets':
      return extractGoogleSheets(activity, raw, selfLower, dateStr);
    default:
      // Confluence, Google Drive, Google Meet, Figma, OneDrive, and any future tools.
      // No body content, minimal unique signals — title+date+people is sufficient. (RJ-4)
      return extractDefault(activity, raw, selfLower, dateStr);
  }
}

/**
 * Rank activities by story-worthiness and return top N.
 * Uses 9 heuristic signals — zero LLM calls.
 */
export function rankActivities(
  activities: ActivityLike[],
  format7Data: Record<string, any> | null,
  selfIdentifier: string,
  maxCount: number = 20,
): RankedActivity[] {
  const scored = activities.map(activity => {
    const ctx = toActivityContext(activity, selfIdentifier);
    let score = 0;
    const signals: string[] = [];
    // RH-4: Ranker reads ONLY from ActivityContext, never from rawData directly.
    // The adapter is the single place that knows raw field shapes.

    // Signal 1: Activity edge type from format7Data
    const edge = format7Data?.activityEdges?.find(
      (e: any) => e.activityId === activity.id
    );
    if (edge?.type) {
      score += EDGE_SCORES[edge.type] || 1;
      signals.push(`edge:${edge.type}`);
    } else {
      score += 1;
    }

    // Signal 2: Has rich body content
    if (ctx.body && ctx.body.length > 50) {
      score += 2;
      signals.push(`body:${ctx.body.length}chars`);
    }

    // Signal 3: Code scope (from ctx.scope, set by GitHub extractor)
    const scopeMatch = ctx.scope?.match(/\+(\d+)\/-(\d+)/);
    const codeSize = scopeMatch ? parseInt(scopeMatch[1]) + parseInt(scopeMatch[2]) : 0;
    if (codeSize > 200) { score += 1.5; signals.push(`code:${codeSize}`); }
    else if (codeSize > 50) { score += 0.5; signals.push(`code:${codeSize}`); }

    // Signal 4: People involved
    if (ctx.people.length >= 3) { score += 1.5; signals.push(`people:${ctx.people.length}`); }
    else if (ctx.people.length >= 1) { score += 0.5; signals.push(`people:${ctx.people.length}`); }

    // Signal 5: High-signal labels
    const highLabels = (ctx.labels || []).filter(l =>
      /security|breaking|critical|urgent|p0|p1|hotfix|incident/i.test(l)
    );
    if (highLabels.length > 0) { score += 1; signals.push(`labels:${highLabels.join(',')}`); }

    // Signal 6: Completion state
    if (ctx.state === 'merged' || ctx.state === 'Done' || ctx.state === 'Resolved') {
      score += 0.5; signals.push('completed');
    }

    // Signal 7: Reactions (from ctx.sentiment, set by Slack extractor as "rocket:12, tada:8")
    if (ctx.sentiment) {
      const totalReactions = ctx.sentiment.split(', ')
        .reduce((sum, pair) => sum + parseInt(pair.split(':')[1] || '0'), 0);
      if (totalReactions >= 10) { score += 1.0; signals.push(`reactions:${totalReactions}`); }
      else if (totalReactions >= 3) { score += 0.5; signals.push(`reactions:${totalReactions}`); }
    }

    // Signal 8: Structural connections (from ctx.linkedItems)
    const linkedCount = ctx.linkedItems?.length || 0;
    if (linkedCount > 0) { score += 0.5; signals.push(`linked:${linkedCount}`); }

    // Signal 9: Routine meeting penalty (from ctx.isRoutine)
    if (ctx.isRoutine) { score -= 1.0; signals.push('routine:-1'); }

    return { activity, context: ctx, score, signals };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount);
}

// ============================================================================
// PER-TOOL EXTRACTORS
// ============================================================================

function extractGitHub(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  const isCommit = !raw.number && (raw.sha || raw.message);
  const sourceSubtype = isCommit ? 'commit' : 'pr';

  // Body: PR body + comments, or commit message
  let bodyRaw = '';
  if (raw.body) bodyRaw += raw.body;
  if (raw.comments && Array.isArray(raw.comments)) {
    bodyRaw += '\n' + raw.comments.map((c: any) => c.body || '').join('\n');
  }
  if (!bodyRaw && raw.message) bodyRaw = raw.message;

  // People
  const people = collectPeople(
    [raw.author, ...(raw.reviewers || []), ...(raw.requestedReviewers || []), ...(raw.mentions || [])],
    self
  );

  // Scope
  const scope = (raw.additions != null || raw.deletions != null)
    ? `+${raw.additions || 0}/-${raw.deletions || 0}, ${raw.changedFiles || raw.filesChanged || '?'} files`
    : undefined;

  // Container
  const headRef = typeof raw.headRef === 'string' && !EXCLUDED_BRANCHES.has(raw.headRef)
    ? raw.headRef : undefined;

  // UserRole
  const userRole = eq(raw.author, self) ? 'authored'
    : includes(raw.reviewers, self) ? 'reviewed' : 'mentioned';

  return {
    title: act.title,
    date,
    source: 'github',
    sourceSubtype,
    people,
    userRole,
    body: cleanBody(bodyRaw),
    labels: raw.labels || undefined,
    scope,
    container: headRef,
    state: raw.state || undefined,
  };
}

function extractJira(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  // Body from comments
  const bodyRaw = raw.comments && Array.isArray(raw.comments)
    ? raw.comments.map((c: any) => `${c.author || 'unknown'}: ${c.body || ''}`).join('\n')
    : '';

  const people = collectPeople(
    [raw.assignee, raw.reporter, ...(raw.watchers || []), ...(raw.mentions || []),
     ...(raw.comments || []).map((c: any) => c.author)],
    self
  );

  return {
    title: act.title,
    date,
    source: 'jira',
    sourceSubtype: 'issue',
    people,
    userRole: eq(raw.assignee, self) ? 'authored' : includes(raw.mentions, self) ? 'mentioned' : 'watched',
    body: cleanBody(bodyRaw),
    labels: raw.labels || undefined,
    scope: raw.storyPoints ? `${raw.storyPoints} story points` : undefined,
    state: raw.status || undefined,
    linkedItems: raw.linkedIssues || undefined,
  };
}

function extractSlack(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  const people = collectPeople(
    [raw.parentAuthor, raw.replyAuthor, raw.author, ...(raw.mentions || [])],
    self
  );
  const sentiment = raw.reactions && Array.isArray(raw.reactions)
    ? raw.reactions.map((r: any) => `${r.name}:${r.count}`).join(', ')
    : undefined;

  return {
    title: act.title,
    date,
    source: 'slack',
    sourceSubtype: 'thread',
    people,
    userRole: eq(raw.parentAuthor, self) || eq(raw.author, self) ? 'authored' : 'mentioned',
    container: raw.threadTs || raw.thread_ts || undefined,
    sentiment,
  };
}

function extractOutlook(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  // Handle both v1 (attendees: number) and v2 (to: string[]) shapes
  const toArray = Array.isArray(raw.to) ? raw.to : [];
  const ccArray = Array.isArray(raw.cc) ? raw.cc : [];
  const attendeesArray = Array.isArray(raw.attendees) ? raw.attendees : [];

  const people = collectPeople(
    [raw.from, raw.organizer, ...toArray, ...ccArray, ...attendeesArray],
    self
  );

  return {
    title: act.title,
    date,
    source: 'outlook',
    sourceSubtype: raw.from ? 'email' : 'meeting',
    people,
    userRole: eq(raw.from, self) || eq(raw.organizer, self) ? 'authored' : 'attended',
    body: raw.subject ? cleanBody(raw.subject) : undefined,
    scope: raw.duration ? `${raw.duration} min` : undefined,
  };
}

function extractGoogleCalendar(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  const attendees = Array.isArray(raw.attendees) ? raw.attendees : [];
  const people = collectPeople([raw.organizer, ...attendees], self);

  return {
    title: act.title,
    date,
    source: 'google-calendar',
    sourceSubtype: 'meeting',
    people,
    userRole: eq(raw.organizer, self) ? 'authored' : 'attended',
    scope: raw.duration ? `${raw.duration} min` : undefined,
    isRoutine: raw.recurring === true ? true : undefined,
  };
}

function extractGoogleDocs(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  const bodyRaw = raw.comments && Array.isArray(raw.comments)
    ? raw.comments.map((c: any) => `${c.author || 'unknown'}: ${c.body || ''}`).join('\n')
    : '';

  const people = collectPeople(
    [raw.owner, raw.lastModifiedBy, ...(raw.contributors || []),
     ...(raw.suggestedEditors || []),
     ...(raw.comments || []).map((c: any) => c.author)],
    self
  );

  return {
    title: act.title,
    date,
    source: 'google-docs',
    people,
    userRole: eq(raw.owner, self) ? 'authored' : includes(raw.contributors, self) ? 'contributed' : 'mentioned',
    body: cleanBody(bodyRaw),
  };
}

function extractGoogleSheets(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  const bodyRaw = raw.comments && Array.isArray(raw.comments)
    ? raw.comments.map((c: any) => `${c.author || 'unknown'}: ${c.body || ''}`).join('\n')
    : '';

  const people = collectPeople(
    [raw.owner, raw.lastModifiedBy, ...(raw.mentions || []),
     ...(raw.comments || []).map((c: any) => c.author)],
    self
  );

  return {
    title: act.title,
    date,
    source: 'google-sheets',
    people,
    userRole: eq(raw.owner, self) ? 'authored' : 'mentioned',
    body: cleanBody(bodyRaw),
    scope: raw.sheets ? `${raw.sheets.length} sheets` : undefined,
  };
}

// Default extractor for tools with minimal signal value (Confluence, Google Drive,
// Google Meet, Figma, OneDrive, etc.) — title + date + people is sufficient.
// Adding per-tool extractors for these would be over-engineering: they have no body
// content and minimal unique signals. (RJ-4)
function extractDefault(act: ActivityLike, raw: Record<string, any>, self: string, date: string): ActivityContext {
  // Generic people extraction: try common field names across tools
  const people = collectPeople(
    [raw.owner, raw.creator, raw.organizer, raw.lastModifiedBy, raw.author,
     ...(raw.attendees || []), ...(raw.participants || []),
     ...(raw.sharedWith || []), ...(raw.watchers || []),
     ...(raw.editors || []), ...(raw.commenters || [])],
    self
  );

  return {
    title: act.title,
    date,
    source: act.source || 'unknown',
    people,
    userRole: 'mentioned',
    isRoutine: raw.recurring === true ? true : undefined,
    scope: raw.duration ? `${raw.duration} min` : undefined,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

// RH-1: Adapter is a pure data normalizer — no template engine knowledge.
// scanAndStrip() handles security (credentials/PII).
// escapeHandlebarsInput() is called in the PROMPT LAYER, not here.
function cleanBody(text: string): string | undefined {
  if (!text || text.trim().length === 0) return undefined;
  const cleaned = scanAndStrip(text);
  return cleaned.length > MAX_BODY_LENGTH
    ? cleaned.slice(0, MAX_BODY_LENGTH) + '...'
    : cleaned;
}

function collectPeople(candidates: (string | undefined | null)[], self: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    const lower = c.toLowerCase();
    if (lower === self || seen.has(lower)) continue;
    seen.add(lower);
    result.push(c);
  }
  return result;
}

function eq(a: unknown, b: string): boolean {
  return typeof a === 'string' && a.toLowerCase() === b;
}

function includes(arr: unknown, val: string): boolean {
  return Array.isArray(arr) && arr.some(
    (item: unknown) => typeof item === 'string' && item.toLowerCase() === val
  );
}
