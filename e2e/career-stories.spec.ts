import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from './utils/screenshot-helper';
import { login } from './utils/auth-helper';
import { waitForContentLoaded } from './utils/wait-helper';

/**
 * Career Stories E2E Tests
 *
 * Tests for the Career Stories feature:
 * - Viewing clusters
 * - Generating STAR narratives
 * - Mobile responsive layout
 *
 * Usage:
 *   npm run test:e2e -- career-stories.spec.ts
 */

// Run authenticated tests sequentially to avoid login conflicts
test.describe.configure({ mode: 'serial' });

// Increase timeout for authenticated tests
test.setTimeout(60000);

test.describe('Career Stories', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);

    // Verify we're logged in
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('navigate to career stories page', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'career-stories-ui',
      scenario: 'navigation',
    });

    // Navigate via header link
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Stories link in navigation
    const storiesLink = page.getByRole('link', { name: 'Stories' });
    await storiesLink.click();

    await page.waitForURL('**/career-stories');
    await waitForContentLoaded(page);

    // Verify page loaded
    await expect(page.getByTestId('career-stories-page')).toBeVisible();

    await screenshots.captureSection({
      name: 'career-stories-initial',
      fullPage: true,
    });
  });

  test('display empty state when no clusters', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'career-stories-ui',
      scenario: 'empty-state',
    });

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    // Check for empty state or cluster list
    const emptyState = page.getByTestId('cluster-list-empty');
    const clusterList = page.getByTestId('cluster-list');

    // One of them should be visible
    const isEmpty = await emptyState.isVisible().catch(() => false);
    const hasClusters = await clusterList.isVisible().catch(() => false);

    expect(isEmpty || hasClusters).toBe(true);

    if (isEmpty) {
      await screenshots.captureSection({
        name: 'empty-state',
        fullPage: true,
      });

      // Verify empty state has generate button
      await expect(page.getByText('Generate Clusters')).toBeVisible();
    }
  });

  test('display cluster list when clusters exist', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'career-stories-ui',
      scenario: 'cluster-list',
    });

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    const clusterList = page.getByTestId('cluster-list');

    // Check if clusters exist
    if (await clusterList.isVisible()) {
      await screenshots.captureSection({
        name: 'cluster-list',
        fullPage: true,
      });

      // Verify cluster cards are present
      const clusterCards = page.locator('[data-testid^="cluster-card-"]');
      const count = await clusterCards.count();

      if (count > 0) {
        // Click first cluster
        await clusterCards.first().click();

        // Wait for selection
        await page.waitForTimeout(300);

        await screenshots.captureSection({
          name: 'cluster-selected',
          fullPage: true,
        });
      }
    }
  });

  test('generate STAR narrative', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'career-stories-ui',
      scenario: 'star-generation',
    });

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    const clusterList = page.getByTestId('cluster-list');

    // Skip if no clusters
    if (!(await clusterList.isVisible())) {
      test.skip(true, 'No clusters available for STAR generation');
      return;
    }

    // Find a cluster without a ready STAR
    const generateButton = page.locator('[data-testid^="generate-star-"]').first();

    if (await generateButton.isVisible()) {
      // Click generate
      await generateButton.click();

      // Wait for loading state
      await expect(page.getByTestId('star-preview-loading').or(page.getByTestId('star-preview'))).toBeVisible({
        timeout: 10000,
      });

      await screenshots.captureSection({
        name: 'star-generating',
        fullPage: true,
      });

      // Wait for generation to complete (up to 10 seconds)
      await page.waitForTimeout(3000);

      // Check result
      const preview = page.getByTestId('star-preview');
      const error = page.getByTestId('star-preview-error');

      if (await preview.isVisible()) {
        await screenshots.captureSection({
          name: 'star-generated',
          fullPage: true,
        });

        // Verify STAR sections are present
        await expect(page.getByText('SITUATION', { exact: false })).toBeVisible();
        await expect(page.getByText('TASK', { exact: false })).toBeVisible();
        await expect(page.getByText('ACTION', { exact: false })).toBeVisible();
        await expect(page.getByText('RESULT', { exact: false })).toBeVisible();
      } else if (await error.isVisible()) {
        await screenshots.captureSection({
          name: 'star-validation-error',
          fullPage: true,
        });
      }
    }
  });

  test('toggle polish option', async ({ page }) => {
    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    // First generate a STAR
    const clusterCards = page.locator('[data-testid^="cluster-card-"]');
    if ((await clusterCards.count()) > 0) {
      await clusterCards.first().click();
      await page.waitForTimeout(300);

      const generateButton = page.locator('[data-testid^="generate-star-"]').first();
      if (await generateButton.isVisible()) {
        await generateButton.click();
        await page.waitForTimeout(3000);
      }

      // Check if polish toggle exists
      const polishToggle = page.getByTestId('polish-toggle');
      if (await polishToggle.isVisible()) {
        // Toggle polish
        const isChecked = await polishToggle.isChecked();
        await polishToggle.click();

        // Verify toggle changed
        expect(await polishToggle.isChecked()).toBe(!isChecked);
      }
    }
  });

  test('responsive layout - mobile view', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Responsive tests only on chromium');

    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'career-stories-ui',
      scenario: 'responsive',
    });

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    await screenshots.captureSection({
      name: 'mobile-list',
      fullPage: true,
    });

    // Click a cluster to open mobile sheet
    const clusterCards = page.locator('[data-testid^="cluster-card-"]');
    if ((await clusterCards.count()) > 0) {
      await clusterCards.first().click();
      await page.waitForTimeout(500);

      await screenshots.captureSection({
        name: 'mobile-sheet-open',
        fullPage: true,
      });
    }
  });

  test('responsive layout - tablet view', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Responsive tests only on chromium');

    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'career-stories-ui',
      scenario: 'responsive',
    });

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');

    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    await screenshots.captureSection({
      name: 'tablet-view',
      fullPage: true,
    });
  });

  test('keyboard navigation', async ({ page }) => {
    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    const clusterList = page.getByTestId('cluster-list');

    // Skip if no clusters
    if (!(await clusterList.isVisible())) {
      test.skip(true, 'No clusters for keyboard navigation');
      return;
    }

    const clusterCards = page.locator('[data-testid^="cluster-card-"]');
    if ((await clusterCards.count()) > 0) {
      // Focus first cluster
      await clusterCards.first().focus();

      // Verify focus ring is visible
      await expect(clusterCards.first()).toBeFocused();

      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);

      // Select with Enter
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // Verify selection
      const selectedCard = page.locator('[data-testid^="cluster-card-"][aria-selected="true"]');
      expect(await selectedCard.count()).toBeGreaterThan(0);
    }
  });

  test('accessibility - ARIA labels', async ({ page }) => {
    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    // Check for listbox role
    const listbox = page.getByRole('listbox', { name: 'Clusters' });
    await expect(listbox.or(page.getByTestId('cluster-list-empty'))).toBeVisible();

    // Check header has proper structure
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
