/**
 * Pattern Registry
 *
 * Central registry for all extraction patterns.
 * Patterns self-validate their examples at registration time.
 *
 * Usage:
 *   const registry = new PatternRegistry();
 *   registry.register(myPattern);
 *
 * Patterns validate:
 * 1. Regex has global flag
 * 2. All examples match and produce expected refs
 * 3. No negative examples match
 */

import { RefPattern, ToolType } from './types';
import {
  jiraTicketPattern,
  githubRefPattern,
  githubUrlPattern,
  confluencePagePattern,
  confluenceRawDataPattern,
  figmaUrlPattern,
  figmaRawDataPattern,
  slackChannelUrlPattern,
  slackRawDataPattern,
  googleDocsPattern,
  googleSheetsPattern,
  googleSlidesPattern,
  googleDriveFilePattern,
  googleDriveFolderPattern,
  googleMeetPattern,
  googleCalendarPattern,
  // Raw data patterns
  googleDocsRawDataPattern,
  googleMeetRawDataPattern,
} from './patterns';

export interface PatternValidationError {
  patternId: string;
  type: 'missing-global-flag' | 'example-failed' | 'negative-matched';
  message: string;
  details?: {
    input?: string;
    expected?: string;
    actual?: string[];
  };
}

export class PatternRegistry {
  private patterns: Map<string, RefPattern> = new Map();
  private patternsByTool: Map<ToolType, RefPattern[]> = new Map();
  private validationErrors: PatternValidationError[] = [];

  constructor(autoRegisterDefaults = true) {
    if (autoRegisterDefaults) {
      this.registerDefaults();
    }
  }

  /**
   * Register a pattern with validation
   * @throws PatternValidationError[] if validation fails
   */
  register(pattern: RefPattern): void {
    const errors = this.validatePattern(pattern);

    if (errors.length > 0) {
      this.validationErrors.push(...errors);
      const errorMessages = errors.map(e => `  - ${e.message}`).join('\n');
      throw new Error(
        `Pattern '${pattern.id}' failed validation:\n${errorMessages}`
      );
    }

    if (this.patterns.has(pattern.id)) {
      throw new Error(
        `Pattern '${pattern.id}' already registered. ` +
        `Use 'supersedes' field and increment version for updates.`
      );
    }

    this.patterns.set(pattern.id, pattern);

    // Index by tool type
    const toolPatterns = this.patternsByTool.get(pattern.toolType) || [];
    toolPatterns.push(pattern);
    this.patternsByTool.set(pattern.toolType, toolPatterns);
  }

  /**
   * Get all active patterns (excludes superseded ones)
   */
  getActivePatterns(): RefPattern[] {
    const superseded = new Set<string>();

    this.patterns.forEach((p) => {
      if (p.supersedes) {
        superseded.add(p.supersedes);
      }
    });

    return Array.from(this.patterns.values()).filter(
      (p) => !superseded.has(p.id)
    );
  }

  /**
   * Get patterns by tool type
   */
  getPatternsByTool(toolType: ToolType): RefPattern[] {
    return (this.patternsByTool.get(toolType) || []).filter((p) => {
      // Exclude superseded
      const supersededBy = Array.from(this.patterns.values()).find(
        (other) => other.supersedes === p.id
      );
      return !supersededBy;
    });
  }

  /**
   * Get a specific pattern by ID
   */
  getPattern(id: string): RefPattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * Get all registered pattern IDs
   */
  getPatternIds(): string[] {
    return Array.from(this.patterns.keys());
  }

  /**
   * Get validation errors from registration attempts
   */
  getValidationErrors(): PatternValidationError[] {
    return [...this.validationErrors];
  }

  /**
   * Validate a pattern definition
   */
  private validatePattern(pattern: RefPattern): PatternValidationError[] {
    const errors: PatternValidationError[] = [];

    // 1. Check global flag
    if (!pattern.regex.global) {
      errors.push({
        patternId: pattern.id,
        type: 'missing-global-flag',
        message: `Regex must have global flag (add 'g')`,
      });
      return errors; // Can't continue without global flag
    }

    // 2. Validate positive examples
    for (const example of pattern.examples) {
      pattern.regex.lastIndex = 0; // Reset regex state
      const matches = Array.from(example.input.matchAll(pattern.regex));
      const refs = matches.map((m) => pattern.normalizeMatch(m));

      if (!refs.includes(example.expectedRef)) {
        errors.push({
          patternId: pattern.id,
          type: 'example-failed',
          message: `Example failed: "${example.input}" expected "${example.expectedRef}" but got [${refs.join(', ') || 'nothing'}]`,
          details: {
            input: example.input,
            expected: example.expectedRef,
            actual: refs,
          },
        });
      }
    }

    // 3. Validate negative examples
    for (const negExample of pattern.negativeExamples) {
      pattern.regex.lastIndex = 0;
      const matches = Array.from(negExample.matchAll(pattern.regex));

      if (matches.length > 0) {
        const refs = matches.map((m) => pattern.normalizeMatch(m));
        errors.push({
          patternId: pattern.id,
          type: 'negative-matched',
          message: `Negative example matched: "${negExample}" should not match but got [${refs.join(', ')}]`,
          details: {
            input: negExample,
            actual: refs,
          },
        });
      }
    }

    return errors;
  }

  /**
   * Register all default patterns
   */
  private registerDefaults(): void {
    const defaults: RefPattern[] = [
      jiraTicketPattern,
      githubRefPattern,
      githubUrlPattern,
      confluencePagePattern,
      figmaUrlPattern,
      figmaRawDataPattern,
      slackChannelUrlPattern,
      // Google Workspace
      googleDocsPattern,
      googleSheetsPattern,
      googleSlidesPattern,
      googleDriveFilePattern,
      googleDriveFolderPattern,
      googleMeetPattern,
      googleCalendarPattern,
      // Raw data patterns (for API responses)
      confluenceRawDataPattern,
      slackRawDataPattern,
      googleDocsRawDataPattern,
      googleMeetRawDataPattern,
    ];

    for (const pattern of defaults) {
      try {
        this.register(pattern);
      } catch (error) {
        // Log but don't fail - allows partial registration
        console.error(`Failed to register pattern ${pattern.id}:`, error);
      }
    }
  }
}

// Singleton instance
export const patternRegistry = new PatternRegistry();
