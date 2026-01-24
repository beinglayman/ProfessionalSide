import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from './utils/screenshot-helper';

/**
 * Example E2E test demonstrating screenshot capture workflow
 *
 * CD6 Design-UX: Screenshot Verification Protocol
 *
 * After tests pass:
 * 1. Run: ls __docs/feature/workspace-list-improvements/
 * 2. For each .png WITHOUT 'verified_' prefix:
 *    a. Read it with the Read tool
 *    b. Write one-line assessment
 *    c. If issues: fix and re-run tests
 *    d. If no issues: mv <name>.png verified_<name>.png
 * 3. After renaming ALL, do NOT claim completion
 * 4. Let NEXT iteration confirm completion
 *
 * Usage:
 *   Local:  npm run test:e2e
 *   Prod:   npm run test:e2e:prod
 *   Custom: BASE_URL=https://staging.inchronicle.com npm run test:e2e
 */

// Detect environment from E2E_BASE_URL or BASE_URL (CLI override)
const BASE_URL = process.env.BASE_URL || process.env.E2E_BASE_URL || '';
const ENV = BASE_URL.includes('inchronicle.com') ? 'prod' : 'local';

test.describe('Homepage Screenshots', () => {
  test('capture homepage sections', async ({ page }) => {
    // Create screenshot helper for this feature
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'workspace-list-improvements',
    });

    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for any loading states to resolve
    await page.waitForTimeout(1000);

    // Capture full page
    await screenshots.captureSection({
      name: `homepage-full-${ENV}`,
      fullPage: true,
    });

    // Capture specific section by data-screenshot-section attribute
    // Note: Requires component to have: {...screenshotSection('dashboard-header')}
    // await screenshots.captureSection({
    //   name: 'dashboard-header',
    //   section: 'dashboard-header',
    // });

    // Basic verification - page should load
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Public Pages Screenshots', () => {
  test('capture landing/login page', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'workspace-list-improvements',
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Capture what's visible (could be landing, login, or dashboard depending on auth)
    await screenshots.captureSection({
      name: `landing-${ENV}`,
      fullPage: true,
    });
  });
});

test.describe('Workspace List Screenshots', () => {
  test('capture workspace list states', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'workspace-list-improvements',
    });

    // Navigate to workspaces (may redirect to login if not authenticated)
    await page.goto('/workspaces');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Capture current state (may be login page, empty, loading, or populated)
    await screenshots.captureSection({
      name: `workspace-list-${ENV}`,
      fullPage: true,
      animationDelay: 500,
    });
  });

  test('capture responsive views', async ({ page, browserName }) => {
    // Skip responsive tests on mobile/tablet projects (they have fixed viewports)
    test.skip(browserName !== 'chromium', 'Responsive tests only on chromium');

    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'workspace-list-improvements',
    });

    await page.goto('/workspaces');
    await page.waitForLoadState('networkidle');

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    await screenshots.captureSection({
      name: `workspace-mobile-${ENV}`,
      fullPage: true,
    });

    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    await screenshots.captureSection({
      name: `workspace-tablet-${ENV}`,
      fullPage: true,
    });

    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
    await screenshots.captureSection({
      name: `workspace-desktop-${ENV}`,
      fullPage: true,
    });
  });
});
