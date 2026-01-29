/**
 * IdentityMatcher - Matches activities to user's CareerPersona
 *
 * Determines participation level by checking rawData fields against
 * the user's known identities across tools.
 *
 * Design: User provides their identities upfront (via OAuth or manual entry).
 * No identity federation magic - just simple matching.
 */

import {
  CareerPersona,
  ToolType,
  ParticipationLevel,
  ParticipationResult,
  HydratedActivity,
} from './types';

/**
 * Configuration for a participation signal.
 */
interface SignalConfig {
  level: ParticipationLevel;
  weight: number;
}

/**
 * Signals that indicate participation level.
 * Higher weight = stronger evidence of involvement.
 */
const SIGNAL_WEIGHTS: Record<string, SignalConfig> = {
  // Initiator signals (created/owned the work)
  'jira-assignee': { level: 'initiator', weight: 10 },
  'jira-reporter': { level: 'initiator', weight: 9 },
  'github-author': { level: 'initiator', weight: 10 },
  'github-pr-author': { level: 'initiator', weight: 10 },
  'confluence-creator': { level: 'initiator', weight: 10 },
  'figma-owner': { level: 'initiator', weight: 10 },
  'google-organizer': { level: 'initiator', weight: 10 },
  'google-owner': { level: 'initiator', weight: 10 },
  'outlook-organizer': { level: 'initiator', weight: 10 },
  'slack-author': { level: 'initiator', weight: 10 },

  // Contributor signals (active participant)
  'github-reviewer': { level: 'contributor', weight: 7 },
  'github-commenter': { level: 'contributor', weight: 6 },
  'jira-commenter': { level: 'contributor', weight: 6 },
  'confluence-editor': { level: 'contributor', weight: 7 },
  'slack-replier': { level: 'contributor', weight: 6 },
  'figma-editor': { level: 'contributor', weight: 7 },

  // Mentioned signals (referenced in work)
  'jira-mentioned': { level: 'mentioned', weight: 4 },
  'github-mentioned': { level: 'mentioned', weight: 4 },
  'slack-mentioned': { level: 'mentioned', weight: 4 },
  'confluence-mentioned': { level: 'mentioned', weight: 4 },

  // Observer signals (passive awareness)
  'jira-watcher': { level: 'observer', weight: 2 },
  'confluence-watcher': { level: 'observer', weight: 2 },
  'google-attendee': { level: 'observer', weight: 3 },
  'outlook-attendee': { level: 'observer', weight: 3 },
};

export class IdentityMatcher {
  constructor(private persona: CareerPersona) {}

  /**
   * Detect participation level for an activity.
   */
  detectParticipation(activity: HydratedActivity): ParticipationResult {
    const signals = this.collectSignals(activity);

    // Determine level based on highest-weight signal
    let level: ParticipationLevel = 'observer';
    let maxWeight = 0;

    for (const signal of signals) {
      const config = SIGNAL_WEIGHTS[signal];
      if (config && config.weight > maxWeight) {
        maxWeight = config.weight;
        level = config.level;
      }
    }

    return {
      activityId: activity.id,
      level,
      signals,
    };
  }

  /**
   * Collect all matching signals for an activity.
   */
  private collectSignals(activity: HydratedActivity): string[] {
    const signals: string[] = [];
    const rawData = activity.rawData || {};

    switch (activity.source) {
      case 'jira':
        signals.push(...this.matchJira(rawData));
        break;
      case 'github':
        signals.push(...this.matchGithub(rawData));
        break;
      case 'confluence':
        signals.push(...this.matchConfluence(rawData));
        break;
      case 'slack':
        signals.push(...this.matchSlack(rawData));
        break;
      case 'google':
        signals.push(...this.matchGoogle(rawData));
        break;
      case 'outlook':
        signals.push(...this.matchOutlook(rawData));
        break;
      case 'figma':
        signals.push(...this.matchFigma(rawData));
        break;
    }

    return signals;
  }

  /**
   * Check if a value matches any of the user's known identifiers.
   */
  private isMatch(value: unknown, toolType: ToolType): boolean {
    if (!value) return false;
    const strValue = String(value).toLowerCase();

    return this.isEmailMatch(strValue) || this.isIdentityMatch(strValue, toolType);
  }

  /**
   * Check if value matches any of the user's email addresses.
   */
  private isEmailMatch(value: string): boolean {
    return this.persona.emails.some((e) => e.toLowerCase() === value);
  }

  /**
   * Check if value matches any tool-specific identity field.
   */
  private isIdentityMatch(value: string, toolType: ToolType): boolean {
    // Skip 'generic' which has no identity mapping
    if (toolType === 'generic') return false;

    const identity = this.persona.identities[toolType];
    if (!identity) return false;

    // Check all string fields in the identity
    return Object.values(identity).some(
      (v) => typeof v === 'string' && v.toLowerCase() === value
    );
  }

  private matchJira(rawData: Record<string, unknown>): string[] {
    const signals: string[] = [];

    if (this.isMatch(rawData.assignee, 'jira')) {
      signals.push('jira-assignee');
    }
    if (this.isMatch(rawData.reporter, 'jira')) {
      signals.push('jira-reporter');
    }

    // Check watchers array
    const watchers = rawData.watchers as unknown[] | undefined;
    if (Array.isArray(watchers) && watchers.some((w) => this.isMatch(w, 'jira'))) {
      signals.push('jira-watcher');
    }

    // Check mentions in description/comments
    const mentions = rawData.mentions as unknown[] | undefined;
    if (Array.isArray(mentions) && mentions.some((m) => this.isMatch(m, 'jira'))) {
      signals.push('jira-mentioned');
    }

    return signals;
  }

  private matchGithub(rawData: Record<string, unknown>): string[] {
    const signals: string[] = [];

    if (this.isMatch(rawData.author, 'github')) {
      signals.push('github-author');
    }

    // Check reviewers array
    const reviewers = rawData.reviewers as unknown[] | undefined;
    if (Array.isArray(reviewers) && reviewers.some((r) => this.isMatch(r, 'github'))) {
      signals.push('github-reviewer');
    }

    // Check requested reviewers
    const requestedReviewers = rawData.requestedReviewers as unknown[] | undefined;
    if (
      Array.isArray(requestedReviewers) &&
      requestedReviewers.some((r) => this.isMatch(r, 'github'))
    ) {
      signals.push('github-reviewer');
    }

    // Check mentions
    const mentions = rawData.mentions as unknown[] | undefined;
    if (Array.isArray(mentions) && mentions.some((m) => this.isMatch(m, 'github'))) {
      signals.push('github-mentioned');
    }

    return signals;
  }

  private matchConfluence(rawData: Record<string, unknown>): string[] {
    const signals: string[] = [];

    if (this.isMatch(rawData.creator, 'confluence')) {
      signals.push('confluence-creator');
    }
    if (this.isMatch(rawData.lastModifiedBy, 'confluence')) {
      signals.push('confluence-editor');
    }

    const watchers = rawData.watchers as unknown[] | undefined;
    if (Array.isArray(watchers) && watchers.some((w) => this.isMatch(w, 'confluence'))) {
      signals.push('confluence-watcher');
    }

    return signals;
  }

  private matchSlack(rawData: Record<string, unknown>): string[] {
    const signals: string[] = [];

    if (this.isMatch(rawData.author, 'slack') || this.isMatch(rawData.userId, 'slack')) {
      signals.push('slack-author');
    }

    if (rawData.isReply && this.isMatch(rawData.author, 'slack')) {
      signals.push('slack-replier');
    }

    const mentions = rawData.mentions as unknown[] | undefined;
    if (Array.isArray(mentions) && mentions.some((m) => this.isMatch(m, 'slack'))) {
      signals.push('slack-mentioned');
    }

    return signals;
  }

  private matchGoogle(rawData: Record<string, unknown>): string[] {
    const signals: string[] = [];

    if (this.isMatch(rawData.organizer, 'google')) {
      signals.push('google-organizer');
    }
    if (this.isMatch(rawData.owner, 'google')) {
      signals.push('google-owner');
    }

    const attendees = rawData.attendees as unknown[] | undefined;
    if (Array.isArray(attendees) && attendees.some((a) => this.isMatch(a, 'google'))) {
      signals.push('google-attendee');
    }

    return signals;
  }

  private matchOutlook(rawData: Record<string, unknown>): string[] {
    const signals: string[] = [];

    if (this.isMatch(rawData.organizer, 'outlook')) {
      signals.push('outlook-organizer');
    }

    const attendees = rawData.attendees as unknown[] | undefined;
    if (Array.isArray(attendees) && attendees.some((a) => this.isMatch(a, 'outlook'))) {
      signals.push('outlook-attendee');
    }

    return signals;
  }

  private matchFigma(rawData: Record<string, unknown>): string[] {
    const signals: string[] = [];

    if (this.isMatch(rawData.owner, 'figma') || this.isMatch(rawData.creator, 'figma')) {
      signals.push('figma-owner');
    }

    const editors = rawData.editors as unknown[] | undefined;
    if (Array.isArray(editors) && editors.some((e) => this.isMatch(e, 'figma'))) {
      signals.push('figma-editor');
    }

    return signals;
  }
}
