import { ActivitySource, ActivityRawData } from '../../types/activity';

/** Fallback color when source is unknown */
export const FALLBACK_SOURCE_COLOR = '#888888';

/** Maximum refs to display in expanded view */
export const MAX_REFS_DISPLAY = 10;

/** Maximum comments to show in expanded view */
export const MAX_COMMENTS_DISPLAY = 2;

/** Maximum attendees to show before truncating */
export const MAX_ATTENDEES_DISPLAY = 5;

/** Maximum reactions to show in expanded view */
export const MAX_REACTIONS_DISPLAY = 5;

/**
 * Detect the source type of a cross-tool reference from its string pattern.
 *
 * Patterns recognized:
 * - Jira: PROJECT-123 (uppercase letters, dash, digits)
 * - GitHub: org/repo#123 or repo#123 (word chars, optional slash, hash, digits)
 * - Confluence: 6+ digit page ID
 *
 * @returns The detected source type or null if unrecognized
 */
export function getRefType(ref: string): ActivitySource | null {
  // Jira: PROJECT-123 format (uppercase project key, dash, issue number)
  if (/^[A-Z]+-\d+$/.test(ref)) {
    return 'jira';
  }

  // GitHub: org/repo#123 or repo#123 format
  if (/^[\w-]+\/[\w-]+#\d+$/.test(ref) || /^[\w-]+#\d+$/.test(ref)) {
    return 'github';
  }

  // Confluence: numeric page ID (6+ digits to avoid matching short numbers)
  if (/^\d{6,}$/.test(ref)) {
    return 'confluence';
  }

  return null;
}

/**
 * Filter out refs that duplicate the sourceId to avoid redundancy.
 * Uses exact match comparison to prevent false positives.
 *
 * @example
 * getUniqueRefs(['AUTH-123', 'acme/backend#60'], 'acme/backend#60')
 * // Returns: ['AUTH-123']
 */
export function getUniqueRefs(refs: string[], sourceId: string): string[] {
  const normalizedSourceId = sourceId.toLowerCase();

  return refs.filter(ref => {
    const normalizedRef = ref.toLowerCase();
    // Exact match (case-insensitive)
    return normalizedRef !== normalizedSourceId;
  });
}

/**
 * Get source-specific metadata summary for collapsed card view.
 * Returns a single-line string summarizing key metrics.
 */
export function getMetadataSummary(source: string, rawData?: ActivityRawData | null): string | null {
  if (!rawData) return null;

  switch (source) {
    case 'github': {
      const parts: string[] = [];
      if (rawData.state) parts.push(rawData.state);
      if (rawData.additions !== undefined || rawData.deletions !== undefined) {
        parts.push(`+${rawData.additions || 0}/-${rawData.deletions || 0}`);
      }
      if (rawData.reviews && rawData.reviews > 0) parts.push(`${rawData.reviews} reviews`);
      return parts.length > 0 ? parts.join(' · ') : null;
    }

    case 'jira': {
      const parts: string[] = [];
      if (rawData.status) parts.push(rawData.status);
      if (rawData.priority) parts.push(rawData.priority);
      if (rawData.storyPoints !== undefined) parts.push(`${rawData.storyPoints} pts`);
      return parts.length > 0 ? parts.join(' · ') : null;
    }

    case 'confluence': {
      const parts: string[] = [];
      if (rawData.spaceKey) parts.push(rawData.spaceKey);
      if (rawData.version !== undefined) parts.push(`v${rawData.version}`);
      return parts.length > 0 ? parts.join(' · ') : null;
    }

    case 'slack': {
      const parts: string[] = [];
      if (rawData.channelName) parts.push(`#${rawData.channelName}`);
      if (rawData.reactions && rawData.reactions.length > 0) {
        const total = rawData.reactions.reduce((sum, r) => sum + r.count, 0);
        parts.push(`${total} reactions`);
      }
      return parts.length > 0 ? parts.join(' · ') : null;
    }

    // Calendar/meeting sources (Microsoft + Google)
    case 'outlook':
    case 'teams':
    case 'google-calendar':
    case 'google-meet': {
      const parts: string[] = [];
      if (rawData.duration !== undefined) parts.push(`${rawData.duration} min`);
      const attendeeCount = Array.isArray(rawData.attendees)
        ? rawData.attendees.length
        : rawData.attendees;
      if (attendeeCount) parts.push(`${attendeeCount} attendees`);
      return parts.length > 0 ? parts.join(' · ') : null;
    }

    // Microsoft file storage
    case 'onedrive':
    case 'sharepoint': {
      const parts: string[] = [];
      if (rawData.fileName) parts.push(rawData.fileName);
      return parts.length > 0 ? parts.join(' · ') : null;
    }

    // Google Workspace docs
    case 'google-docs':
    case 'google-sheets':
    case 'google-drive': {
      const parts: string[] = [];
      if (rawData.fileName) parts.push(rawData.fileName);
      if (rawData.version !== undefined) parts.push(`v${rawData.version}`);
      return parts.length > 0 ? parts.join(' · ') : null;
    }

    case 'figma': {
      return rawData.fileName || null;
    }

    default:
      return null;
  }
}

/**
 * Check if an activity has expandable content (details beyond the summary).
 */
export function hasExpandableContent(
  source: string,
  rawData?: ActivityRawData | null,
  description?: string | null,
  uniqueRefsCount: number = 0
): boolean {
  if (description) return true;
  if (uniqueRefsCount > 0) return true;
  if (!rawData) return false;

  switch (source) {
    case 'github':
      return !!(rawData.changedFiles || (rawData.commits && rawData.commits > 1) ||
               (rawData.requestedReviewers && rawData.requestedReviewers.length > 0) ||
               (rawData.comments && rawData.comments.length > 0));

    case 'jira':
      return !!((rawData.labels && rawData.labels.length > 0) || rawData.assignee ||
               (rawData.comments && rawData.comments.length > 0));

    case 'confluence':
      return !!(rawData.lastModifiedBy || (rawData.comments && rawData.comments.length > 0));

    case 'slack':
      return !!((rawData.reactions && rawData.reactions.length > 0) ||
               (rawData.comments && rawData.comments.length > 0));

    // Calendar/meeting sources (Microsoft + Google)
    case 'outlook':
    case 'teams':
    case 'google-calendar':
    case 'google-meet':
      return !!((Array.isArray(rawData.attendees) && rawData.attendees.length > 0) ||
               rawData.organizer || (rawData.comments && rawData.comments.length > 0));

    // Microsoft file storage
    case 'onedrive':
    case 'sharepoint':
    // Google Workspace docs
    case 'google-docs':
    case 'google-sheets':
    case 'google-drive':
      return !!(rawData.lastModifiedBy || (rawData.comments && rawData.comments.length > 0));

    case 'figma':
      return !!((rawData.commenters && rawData.commenters.length > 0) ||
               (rawData.comments && rawData.comments.length > 0));

    default:
      return !!(rawData.comments && rawData.comments.length > 0);
  }
}

/**
 * Safely parse a timestamp string to Date.
 * Returns null if the timestamp is invalid.
 */
export function safeParseTimestamp(timestamp: string): Date | null {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}
