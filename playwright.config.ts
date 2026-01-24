import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local (single source of truth)
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

/**
 * Playwright configuration for screenshot-focused E2E testing.
 *
 * Screenshot storage follows the pattern:
 *   __docs/<type>/<slug>/<screenshot-name>.png
 *
 * Where:
 *   - type: 'feature', 'bugfix', 'chore'
 *   - slug: kebab-case descriptor (e.g., 'workspace-list-improvements')
 *
 * CD6 Screenshot Verification Protocol:
 * - After tests pass, verify each screenshot visually
 * - Rename verified screenshots with 'verified_' prefix
 * - Only claim completion after next iteration confirms all verified
 *
 * Usage:
 *   Local dev:  npm run test:e2e
 *   Production: npm run test:e2e:prod
 *   Custom URL: BASE_URL=https://staging.inchronicle.com npm run test:e2e
 */

// Priority: CLI override (BASE_URL) > .env.local (E2E_BASE_URL) > default (localhost)
const BASE_URL = process.env.BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:5173';
const IS_PROD = BASE_URL.includes('inchronicle.com');

export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: 'html',

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: BASE_URL,

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot settings */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Pro 11'] },
    },
  ],

  /* Run local dev server only when not testing against production */
  webServer: IS_PROD
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
      },
});
