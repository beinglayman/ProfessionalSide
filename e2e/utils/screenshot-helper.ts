import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Screenshot Helper for CD6 Design-UX Screenshot Verification Protocol
 *
 * Storage pattern: __docs/<type>/<slug>/<screenshot-name>.png
 *
 * Types:
 *   - 'feature': New feature documentation
 *   - 'bugfix': Bug fix verification
 *   - 'chore': Maintenance/refactoring documentation
 *
 * Verification Protocol:
 *   1. Take screenshots during test runs
 *   2. After tests pass, verify each screenshot visually
 *   3. Rename verified: mv <name>.png verified_<name>.png
 *   4. Completion claimed only after next iteration confirms all verified
 */

/** Default delay for CSS animations to complete (ms) */
const DEFAULT_ANIMATION_DELAY_MS = 300;

/** Base directory for screenshot storage */
const SCREENSHOTS_BASE_DIR = '__docs';

export type ScreenshotType = 'feature' | 'bugfix' | 'chore';

export interface ScreenshotConfig {
  type: ScreenshotType;
  slug: string;
  /** Optional scenario name for the run folder (e.g., 'authenticated', 'responsive') */
  scenario?: string;
}

export interface SectionScreenshotOptions {
  /** Section identifier - used in filename */
  name: string;
  /** CSS selector or data-testid for the section */
  selector?: string;
  /** data-screenshot-section attribute value */
  section?: string;
  /** Wait for animations to complete (ms) */
  animationDelay?: number;
  /** Full page screenshot instead of section */
  fullPage?: boolean;
  /** Viewport size override */
  viewport?: { width: number; height: number };
}

/**
 * Generate a run folder name with format: YYYY-MM-DD_HH-MM-SS-{scenario}-{prod|local}
 * Uses local time, not UTC
 */
function generateRunFolderName(scenario?: string): string {
  const now = new Date();

  // Format as local time: YYYY-MM-DD_HH-MM-SS
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const dateTime = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

  // Detect mode from environment
  const baseUrl = process.env.BASE_URL || process.env.E2E_BASE_URL || '';
  const mode = baseUrl.includes('inchronicle.com') ? 'prod' : 'local';

  const scenarioSuffix = scenario ? `-${scenario}` : '';
  return `${dateTime}${scenarioSuffix}-${mode}`;
}

/**
 * Creates a screenshot helper instance for a specific feature/bugfix/chore
 */
export function createScreenshotHelper(page: Page, config: ScreenshotConfig) {
  // Validate config
  if (!config.slug || config.slug.trim() === '') {
    throw new Error('ScreenshotConfig.slug is required and cannot be empty');
  }

  // Create run-specific folder: __docs/{type}/{slug}/runs/{datetime-scenario-mode}/
  const runFolderName = generateRunFolderName(config.scenario);
  const baseDir = path.join(
    process.cwd(),
    SCREENSHOTS_BASE_DIR,
    config.type,
    config.slug,
    'runs',
    runFolderName
  );

  // Ensure directory exists
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  return {
    /**
     * Take a screenshot of a specific section
     */
    async captureSection(options: SectionScreenshotOptions): Promise<string> {
      const {
        name,
        selector,
        section,
        animationDelay = DEFAULT_ANIMATION_DELAY_MS,
        fullPage = false,
        viewport,
      } = options;

      if (!name || name.trim() === '') {
        throw new Error('Screenshot name is required');
      }

      // Set viewport if specified
      if (viewport) {
        await page.setViewportSize(viewport);
      }

      // Wait for animations
      if (animationDelay > 0) {
        await page.waitForTimeout(animationDelay);
      }

      const screenshotPath = path.join(baseDir, `${name}.png`);

      try {
        if (fullPage) {
          await page.screenshot({ path: screenshotPath, fullPage: true });
        } else if (section) {
          // Use data-screenshot-section attribute
          const element = page.locator(`[data-screenshot-section="${section}"]`);
          await element.waitFor({ state: 'visible', timeout: 5000 });
          await element.screenshot({ path: screenshotPath });
        } else if (selector) {
          // Use CSS selector
          const element = page.locator(selector);
          await element.waitFor({ state: 'visible', timeout: 5000 });
          await element.screenshot({ path: screenshotPath });
        } else {
          // Default to full page
          await page.screenshot({ path: screenshotPath, fullPage: true });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to capture screenshot "${name}": ${message}`);
      }

      return screenshotPath;
    },

    /**
     * Navigate to a section using data-screenshot-section and capture it
     */
    async navigateAndCapture(
      url: string,
      section: string,
      options: Omit<SectionScreenshotOptions, 'section'> = { name: section }
    ): Promise<string> {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Scroll section into view
      const element = page.locator(`[data-screenshot-section="${section}"]`);
      await element.scrollIntoViewIfNeeded();

      return this.captureSection({ ...options, section });
    },

    /**
     * Capture multiple sections in sequence
     */
    async captureMultiple(
      sections: SectionScreenshotOptions[]
    ): Promise<string[]> {
      const paths: string[] = [];
      for (const section of sections) {
        const screenshotPath = await this.captureSection(section);
        paths.push(screenshotPath);
      }
      return paths;
    },

    /**
     * Get the screenshot directory path
     */
    getDirectory(): string {
      return baseDir;
    },

    /**
     * List all unverified screenshots (no 'verified_' prefix)
     */
    listUnverified(): string[] {
      if (!fs.existsSync(baseDir)) return [];

      return fs.readdirSync(baseDir).filter((file) => {
        return (
          file.endsWith('.png') &&
          !file.startsWith('verified_')
        );
      });
    },

    /**
     * List all verified screenshots (have 'verified_' prefix)
     */
    listVerified(): string[] {
      if (!fs.existsSync(baseDir)) return [];

      return fs.readdirSync(baseDir).filter((file) => {
        return file.endsWith('.png') && file.startsWith('verified_');
      });
    },

    /**
     * Mark a screenshot as verified by renaming it
     */
    markVerified(filename: string): void {
      const sourcePath = path.join(baseDir, filename);
      const targetPath = path.join(baseDir, `verified_${filename}`);

      if (fs.existsSync(sourcePath)) {
        fs.renameSync(sourcePath, targetPath);
      }
    },

    /**
     * Check if all screenshots are verified
     */
    allVerified(): boolean {
      const unverified = this.listUnverified();
      return unverified.length === 0;
    },
  };
}

/**
 * Add screenshot section markers to components
 *
 * Usage in React components:
 *   <div {...screenshotSection('header')}>...</div>
 *
 * This adds: data-screenshot-section="header"
 */
export function screenshotSection(name: string) {
  return { 'data-screenshot-section': name };
}

/**
 * Run Log - creates timestamped log entries for screenshot runs
 *
 * Format: YYYY-MM-DD_HH-MM-SS | MODE | slug | screenshot-count
 */
export interface RunLogEntry {
  timestamp: string;
  mode: 'prod' | 'local';
  slug: string;
  screenshotCount: number;
  screenshots: string[];
}

/**
 * Creates a run log for tracking screenshot test executions
 */
export function createRunLog(config: ScreenshotConfig) {
  const baseDir = path.join(
    process.cwd(),
    SCREENSHOTS_BASE_DIR,
    config.type,
    config.slug
  );
  const logPath = path.join(baseDir, 'run-log.txt');

  // Detect mode from environment
  const baseUrl = process.env.BASE_URL || process.env.E2E_BASE_URL || '';
  const mode: 'prod' | 'local' = baseUrl.includes('inchronicle.com') ? 'prod' : 'local';

  return {
    /**
     * Append a run entry to the log
     */
    logRun(screenshots: string[]): RunLogEntry {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

      const entry: RunLogEntry = {
        timestamp,
        mode,
        slug: config.slug,
        screenshotCount: screenshots.length,
        screenshots,
      };

      // Ensure directory exists
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      // Format log line
      const logLine = `${timestamp} | ${mode.padEnd(5)} | ${config.slug} | ${screenshots.length} screenshots: ${screenshots.join(', ')}\n`;

      // Append to log file
      fs.appendFileSync(logPath, logLine);

      return entry;
    },

    /**
     * Get the log file path
     */
    getLogPath(): string {
      return logPath;
    },

    /**
     * Read all log entries
     */
    readLog(): string {
      if (!fs.existsSync(logPath)) return '';
      return fs.readFileSync(logPath, 'utf-8');
    },
  };
}
