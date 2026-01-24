import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from './utils/screenshot-helper';
import { login } from './utils/auth-helper';
import { waitForContentLoaded } from './utils/wait-helper';

/**
 * Authenticated E2E Tests
 *
 * These tests log in first, then capture screenshots of authenticated pages.
 *
 * Usage:
 *   npm run test:e2e:prod -- authenticated.spec.ts
 *   npm run screenshots:prod -- authenticated.spec.ts
 *
 * CD6 Design-UX: Screenshot Verification Protocol applies after tests pass.
 */

const ENV = process.env.BASE_URL?.includes('inchronicle.com') ? 'prod' : 'local';

// Run authenticated tests sequentially to avoid login conflicts
test.describe.configure({ mode: 'serial' });

// Increase timeout for authenticated tests (login + page load)
test.setTimeout(60000);

test.describe('Authenticated Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);

    // Verify we're logged in - just check URL is not login
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('capture dashboard', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'workspace-list-improvements',
    });

    // Navigate to dashboard (may already be there after login)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    await screenshots.captureSection({
      name: `dashboard-${ENV}`,
      fullPage: true,
    });
  });

  test('capture workspaces list - authenticated', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'workspace-list-improvements',
    });

    await page.goto('/workspaces');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    // Capture the workspace list
    await screenshots.captureSection({
      name: `workspaces-authenticated-${ENV}`,
      fullPage: true,
    });

    // Try to capture specific sections if they exist
    const workspaceList = page.locator('[data-screenshot-section="workspace-list"]');
    if ((await workspaceList.count()) > 0) {
      await screenshots.captureSection({
        name: `workspace-list-section-${ENV}`,
        section: 'workspace-list',
      });
    }

    // Capture filters if present
    const filters = page.locator('[data-screenshot-section="workspace-filters"]');
    if ((await filters.count()) > 0) {
      await screenshots.captureSection({
        name: `workspace-filters-${ENV}`,
        section: 'workspace-filters',
      });
    }
  });

  test('capture workspaces - responsive views', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Responsive tests only on chromium');

    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'workspace-list-improvements',
    });

    await page.goto('/workspaces');
    await page.waitForLoadState('networkidle');

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await screenshots.captureSection({
      name: `workspaces-auth-mobile-${ENV}`,
      fullPage: true,
    });

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await screenshots.captureSection({
      name: `workspaces-auth-tablet-${ENV}`,
      fullPage: true,
    });

    // Desktop wide
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await screenshots.captureSection({
      name: `workspaces-auth-desktop-wide-${ENV}`,
      fullPage: true,
    });
  });

  test('capture journal list', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'workspace-list-improvements',
    });

    await page.goto('/journal');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    await screenshots.captureSection({
      name: `journal-list-${ENV}`,
      fullPage: true,
    });
  });

  test('capture settings page', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'workspace-list-improvements',
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    await screenshots.captureSection({
      name: `settings-${ENV}`,
      fullPage: true,
    });
  });
});
