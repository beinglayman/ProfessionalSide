/**
 * Signal Extractor
 *
 * Extracts clustering signals (collaborators, container) from rawData per tool type.
 * Used by Layer 1 heuristic clustering to build multi-signal adjacency graphs.
 *
 * Signals extracted:
 * - collaborators: normalized people involved (excluding self)
 * - container: feature branch / thread ID / epic / space key
 *
 * Keywords intentionally omitted per GSE directive.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ExtractedSignals {
  collaborators: string[];
  container: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const EXCLUDED_BRANCHES = new Set(['main', 'master', 'develop']);

function isExcludedBranch(branch: string): boolean {
  return EXCLUDED_BRANCHES.has(branch)
    || branch.startsWith('release/')
    || branch.startsWith('hotfix/');
}

// =============================================================================
// MAIN EXTRACTOR
// =============================================================================

export function extractSignals(
  source: string,
  rawData: Record<string, unknown> | null,
  selfIdentifiers: string[],
): ExtractedSignals {
  if (!rawData) {
    return { collaborators: [], container: null };
  }

  const selfSet = new Set(selfIdentifiers.map(s => s.toLowerCase()));

  switch (source) {
    case 'github':
      return extractGithub(rawData, selfSet);
    case 'jira':
      return extractJira(rawData, selfSet);
    case 'slack':
      return extractSlack(rawData, selfSet);
    case 'confluence':
      return extractConfluence(rawData, selfSet);
    case 'figma':
      return extractFigma(rawData, selfSet);
    default:
      return { collaborators: [], container: null };
  }
}

// =============================================================================
// PER-TOOL EXTRACTORS
// =============================================================================

function extractGithub(rawData: Record<string, unknown>, selfSet: Set<string>): ExtractedSignals {
  const people: string[] = [];

  // Author
  if (typeof rawData.author === 'string') {
    people.push(rawData.author);
  }

  // Reviewers
  if (Array.isArray(rawData.reviewers)) {
    for (const r of rawData.reviewers) {
      if (typeof r === 'string') people.push(r);
    }
  }

  // Requested reviewers
  if (Array.isArray(rawData.requestedReviewers)) {
    for (const r of rawData.requestedReviewers) {
      if (typeof r === 'string') people.push(r);
    }
  }

  // Mentions
  if (Array.isArray(rawData.mentions)) {
    for (const m of rawData.mentions) {
      if (typeof m === 'string') people.push(m);
    }
  }

  // Container: most-specific-first fallback chain
  let container: string | null = null;
  // 1. Feature branch (PRs) — most specific
  if (typeof rawData.headRef === 'string' && !isExcludedBranch(rawData.headRef)) {
    container = rawData.headRef;
  }
  // 2. Branch (workflow runs) — if not excluded
  else if (typeof rawData.branch === 'string' && !isExcludedBranch(rawData.branch)) {
    container = rawData.branch;
  }
  // 3. Repository — universal fallback for commits, deployments, releases
  if (!container && typeof rawData.repository === 'string') {
    container = `repo:${rawData.repository}`;
  }

  return {
    collaborators: filterSelfAndDedupe(people, selfSet),
    container,
  };
}

function extractJira(rawData: Record<string, unknown>, selfSet: Set<string>): ExtractedSignals {
  const people: string[] = [];

  if (typeof rawData.assignee === 'string') people.push(rawData.assignee);
  if (typeof rawData.reporter === 'string') people.push(rawData.reporter);

  if (Array.isArray(rawData.watchers)) {
    for (const w of rawData.watchers) {
      if (typeof w === 'string') people.push(w);
    }
  }

  if (Array.isArray(rawData.mentions)) {
    for (const m of rawData.mentions) {
      if (typeof m === 'string') people.push(m);
    }
  }

  // Container: epic key from linkedIssues
  let container: string | null = null;
  if (Array.isArray(rawData.linkedIssues)) {
    const epic = rawData.linkedIssues.find(
      (issue: unknown) =>
        typeof issue === 'object' && issue !== null &&
        'type' in issue && (issue as Record<string, unknown>).type === 'Epic'
    );
    if (epic && typeof (epic as Record<string, unknown>).key === 'string') {
      container = (epic as Record<string, unknown>).key as string;
    }
  }

  return {
    collaborators: filterSelfAndDedupe(people, selfSet),
    container,
  };
}

function extractSlack(rawData: Record<string, unknown>, selfSet: Set<string>): ExtractedSignals {
  const people: string[] = [];

  if (typeof rawData.author === 'string') people.push(rawData.author);
  if (typeof rawData.userId === 'string') people.push(rawData.userId);
  if (typeof rawData.parentAuthor === 'string') people.push(rawData.parentAuthor);
  if (typeof rawData.replyAuthor === 'string') people.push(rawData.replyAuthor);

  if (Array.isArray(rawData.mentions)) {
    for (const m of rawData.mentions) {
      if (typeof m === 'string') people.push(m);
    }
  }

  // Container: thread ID (not channel — channel is too broad)
  // Slack API returns thread_ts, mock data may use threadTs
  const threadTs = rawData.threadTs ?? rawData.thread_ts;
  const container = typeof threadTs === 'string' ? threadTs : null;

  return {
    collaborators: filterSelfAndDedupe(people, selfSet),
    container,
  };
}

function extractConfluence(rawData: Record<string, unknown>, selfSet: Set<string>): ExtractedSignals {
  const people: string[] = [];

  if (typeof rawData.creator === 'string') people.push(rawData.creator);
  if (typeof rawData.lastModifiedBy === 'string') people.push(rawData.lastModifiedBy);

  if (Array.isArray(rawData.watchers)) {
    for (const w of rawData.watchers) {
      if (typeof w === 'string') people.push(w);
    }
  }

  if (Array.isArray(rawData.mentions)) {
    for (const m of rawData.mentions) {
      if (typeof m === 'string') people.push(m);
    }
  }

  // Container: space key
  const container = typeof rawData.spaceKey === 'string' ? rawData.spaceKey : null;

  return {
    collaborators: filterSelfAndDedupe(people, selfSet),
    container,
  };
}

function extractFigma(rawData: Record<string, unknown>, selfSet: Set<string>): ExtractedSignals {
  const people: string[] = [];

  if (typeof rawData.owner === 'string') people.push(rawData.owner);
  if (typeof rawData.creator === 'string') people.push(rawData.creator);

  if (Array.isArray(rawData.commenters)) {
    for (const c of rawData.commenters) {
      if (typeof c === 'string') people.push(c);
    }
  }

  if (Array.isArray(rawData.editors)) {
    for (const e of rawData.editors) {
      if (typeof e === 'string') people.push(e);
    }
  }

  // Container: file key
  const container = typeof rawData.fileKey === 'string' ? rawData.fileKey : null;

  return {
    collaborators: filterSelfAndDedupe(people, selfSet),
    container,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function filterSelfAndDedupe(people: string[], selfSet: Set<string>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const person of people) {
    const normalized = person.toLowerCase();
    if (!selfSet.has(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}
