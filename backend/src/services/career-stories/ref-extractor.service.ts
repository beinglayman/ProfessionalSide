/**
 * RefExtractorService
 *
 * Extracts cross-tool references from text using regex patterns.
 * Used to detect links between activities across different tools
 * for clustering into career stories.
 *
 * Supported references:
 * - Jira tickets: PROJ-123, ABC-1
 * - GitHub PRs: org/repo#42, #42, github.com URLs
 * - Confluence pages: atlassian.net/wiki/...pages/123
 */

export class RefExtractorService {
  private readonly PATTERNS = {
    // Jira tickets: PROJ-123, ABC-1 (2-10 uppercase letters, hyphen, digits)
    jira: /\b([A-Z]{2,10}-\d+)\b/g,

    // GitHub PRs: org/repo#42 or just #42 (local repo)
    githubPr: /(?:([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+))?#(\d+)/g,

    // GitHub URLs: github.com/org/repo/pull/42
    githubUrl: /github\.com\/([^\/]+)\/([^\/]+)\/(?:pull|issues)\/(\d+)/g,

    // Confluence pages: atlassian.net/wiki/.../pages/123
    confluence: /atlassian\.net\/wiki\/.*\/pages\/(\d+)/g,

    // Figma files: figma.com/file/KEY/...
    figma: /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/g,
  };

  /**
   * Extract all cross-tool references from text
   *
   * @param text - Text to search for references (title, description, etc.)
   * @returns Deduplicated array of reference strings
   *
   * @example
   * extractRefs("Fixed PROJ-123 in PR #42")
   * // Returns: ["PROJ-123", "local#42"]
   */
  extractRefs(text: string): string[] {
    if (!text) return [];

    const refs: string[] = [];

    // Jira tickets: PROJ-123
    for (const match of text.matchAll(this.PATTERNS.jira)) {
      refs.push(match[1]);
    }

    // GitHub PRs: org/repo#42 or #42
    for (const match of text.matchAll(this.PATTERNS.githubPr)) {
      const repo = match[1] || 'local';
      refs.push(`${repo}#${match[2]}`);
    }

    // GitHub URLs: github.com/org/repo/pull/42
    for (const match of text.matchAll(this.PATTERNS.githubUrl)) {
      refs.push(`${match[1]}/${match[2]}#${match[3]}`);
    }

    // Confluence page IDs
    for (const match of text.matchAll(this.PATTERNS.confluence)) {
      refs.push(`confluence:${match[1]}`);
    }

    // Figma file keys
    for (const match of text.matchAll(this.PATTERNS.figma)) {
      refs.push(`figma:${match[1]}`);
    }

    // Deduplicate
    return [...new Set(refs)];
  }

  /**
   * Extract references from multiple text sources
   *
   * @param texts - Array of text strings to search
   * @returns Deduplicated array of all references found
   */
  extractRefsFromMultiple(texts: (string | undefined | null)[]): string[] {
    const allRefs: string[] = [];

    for (const text of texts) {
      if (text) {
        allRefs.push(...this.extractRefs(text));
      }
    }

    return [...new Set(allRefs)];
  }

  /**
   * Extract references from an object by searching all string values
   *
   * @param obj - Object to search (e.g., raw API response)
   * @returns Deduplicated array of all references found
   */
  extractRefsFromObject(obj: unknown): string[] {
    if (!obj) return [];

    const text = JSON.stringify(obj);
    return this.extractRefs(text);
  }
}

// Singleton instance for convenience
export const refExtractor = new RefExtractorService();
