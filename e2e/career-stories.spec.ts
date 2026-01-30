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
 * - Demo mode functionality
 * - Edit Activities modal
 *
 * Usage:
 *   npm run test:e2e -- career-stories.spec.ts
 *
 * Demo mode is enabled by default (Cmd/Ctrl+E to toggle)
 */

// Run authenticated tests sequentially to avoid login conflicts
test.describe.configure({ mode: 'serial' });

// Increase timeout for authenticated tests
test.setTimeout(60000);

/**
 * Helper to enable demo mode via localStorage
 */
async function enableDemoMode(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem('app-demo-mode', 'true');
  });
}

/**
 * Helper to disable demo mode via localStorage
 */
async function disableDemoMode(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem('app-demo-mode', 'false');
  });
}

/**
 * Helper to check if demo mode is enabled
 */
async function isDemoModeEnabled(page: import('@playwright/test').Page): Promise<boolean> {
  return await page.evaluate(() => {
    return localStorage.getItem('app-demo-mode') !== 'false';
  });
}

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

    // Disable demo mode for this test to check real empty state
    await disableDemoMode(page);

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    // Check for empty state or cluster list
    // Empty state shows "No clusters yet" heading
    const emptyStateHeading = page.getByRole('heading', { name: 'No clusters yet' });
    const clusterListbox = page.getByRole('listbox', { name: 'Clusters' });

    // One of them should be visible
    const isEmpty = await emptyStateHeading.isVisible().catch(() => false);
    const hasClusters = await clusterListbox.isVisible().catch(() => false);

    expect(isEmpty || hasClusters).toBe(true);

    if (isEmpty) {
      await screenshots.captureSection({
        name: 'empty-state',
        fullPage: true,
      });

      // Verify empty state has generate button (use main area to avoid header button)
      await expect(page.getByRole('main').getByRole('button', { name: 'Generate Clusters' })).toBeVisible();
    }
  });

  test('display cluster list when clusters exist', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'career-stories-ui',
      scenario: 'cluster-list',
    });

    // Enable demo mode to ensure clusters exist
    await enableDemoMode(page);

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    // Use role-based selector for cluster listbox
    const clusterListbox = page.getByRole('listbox', { name: 'Clusters' });

    // Check if clusters exist
    if (await clusterListbox.isVisible()) {
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

    // Enable demo mode to ensure clusters exist
    await enableDemoMode(page);

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    const clusterListbox = page.getByRole('listbox', { name: 'Clusters' });

    // Skip if no clusters
    if (!(await clusterListbox.isVisible())) {
      test.skip(true, 'No clusters available for STAR generation');
      return;
    }

    // Click a cluster to select it first (in demo mode, clicking auto-generates STAR)
    const clusterCards = page.locator('[data-testid^="cluster-card-"]');
    if ((await clusterCards.count()) > 0) {
      // Select the first cluster
      await clusterCards.first().click();

      // Wait for auto-generation (demo mode has 800ms simulated delay)
      await page.waitForTimeout(1500);

      await screenshots.captureSection({
        name: 'star-generating',
        fullPage: true,
      });

      // Check result - in demo mode STAR should be ready
      const preview = page.getByTestId('star-preview');
      const placeholder = page.getByTestId('star-preview-placeholder');

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
      } else if (await placeholder.isVisible()) {
        // Still showing placeholder - might need more time
        await page.waitForTimeout(2000);
        await screenshots.captureSection({
          name: 'star-placeholder',
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

    // Enable demo mode
    await enableDemoMode(page);

    // Set mobile viewport BEFORE navigating
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    await screenshots.captureSection({
      name: 'mobile-list',
      fullPage: true,
    });

    // On mobile, clusters should still be visible (mobile layout shows full-width list)
    const clusterCards = page.locator('[data-testid^="cluster-card-"]');
    if ((await clusterCards.count()) > 0) {
      // Mobile layout should show cluster cards
      const firstCard = clusterCards.first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForTimeout(500);

        await screenshots.captureSection({
          name: 'mobile-sheet-open',
          fullPage: true,
        });
      }
    }
  });

  test('responsive layout - tablet view', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Responsive tests only on chromium');

    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'career-stories-ui',
      scenario: 'responsive',
    });

    // Enable demo mode
    await enableDemoMode(page);

    // Set tablet viewport BEFORE navigating
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    await screenshots.captureSection({
      name: 'tablet-view',
      fullPage: true,
    });
  });

  test('keyboard navigation', async ({ page }) => {
    // Enable demo mode to ensure clusters exist
    await enableDemoMode(page);

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    const clusterListbox = page.getByRole('listbox', { name: 'Clusters' });

    // Skip if no clusters
    if (!(await clusterListbox.isVisible())) {
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
    // Enable demo mode to ensure clusters exist
    await enableDemoMode(page);

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

// =============================================================================
// DEMO MODE TESTS
// =============================================================================

test.describe('Career Stories - Demo Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);

    // Enable demo mode explicitly
    await enableDemoMode(page);
  });

  test('demo mode shows demo clusters', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'career-stories-demo',
      scenario: 'demo-clusters',
    });

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    // Verify demo mode is active
    const isDemo = await isDemoModeEnabled(page);
    expect(isDemo).toBe(true);

    // Demo mode should show clusters (use role-based selector)
    const clusterListbox = page.getByRole('listbox', { name: 'Clusters' });
    await expect(clusterListbox).toBeVisible({ timeout: 10000 });

    // Should have demo clusters visible
    const clusterCards = page.locator('[data-testid^="cluster-card-"]');
    const count = await clusterCards.count();
    expect(count).toBeGreaterThan(0);

    await screenshots.captureSection({
      name: 'demo-clusters-list',
      fullPage: true,
    });
  });

  test('demo mode auto-generates STAR on cluster select', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'career-stories-demo',
      scenario: 'auto-star',
    });

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    const clusterCards = page.locator('[data-testid^="cluster-card-"]');

    if ((await clusterCards.count()) > 0) {
      // Click first cluster
      await clusterCards.first().click();

      // Wait for auto-generation (demo mode simulates 800ms delay)
      await page.waitForTimeout(1500);

      await screenshots.captureSection({
        name: 'demo-star-preview',
        fullPage: true,
      });

      // STAR preview should be visible with content
      const starPreview = page.getByTestId('star-preview');
      if (await starPreview.isVisible()) {
        // Check STAR sections are present
        await expect(page.getByText('SITUATION', { exact: false })).toBeVisible();
        await expect(page.getByText('TASK', { exact: false })).toBeVisible();
        await expect(page.getByText('ACTION', { exact: false })).toBeVisible();
        await expect(page.getByText('RESULT', { exact: false })).toBeVisible();
      }
    }
  });

  test('edit activities button visible in demo mode', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'career-stories-demo',
      scenario: 'edit-activities',
    });

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    const clusterCards = page.locator('[data-testid^="cluster-card-"]');

    if ((await clusterCards.count()) > 0) {
      // Edit activities button should be visible on cluster card
      const editButton = page.locator('[data-testid^="edit-activities-"]').first();
      await expect(editButton).toBeVisible();

      await screenshots.captureSection({
        name: 'edit-activities-button',
        fullPage: true,
      });
    }
  });

  test('edit activities modal opens and functions', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'career-stories-demo',
      scenario: 'edit-activities-modal',
    });

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    const editButton = page.locator('[data-testid^="edit-activities-"]').first();

    if (await editButton.isVisible()) {
      // Open modal
      await editButton.click();
      await page.waitForTimeout(300);

      // Modal should be visible
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      await screenshots.captureSection({
        name: 'edit-activities-modal-open',
        fullPage: true,
      });

      // Check modal has two columns (current & available)
      await expect(page.getByText('Current')).toBeVisible();
      await expect(page.getByText('Available')).toBeVisible();

      // Check save and cancel buttons exist
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();

      // Close modal
      await page.getByRole('button', { name: 'Cancel' }).click();
      await page.waitForTimeout(300);

      // Modal should be closed
      await expect(modal).not.toBeVisible();
    }
  });

  test('toggle demo mode with keyboard shortcut', async ({ page }) => {
    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    // Check initial state (demo mode ON by default)
    let isDemo = await isDemoModeEnabled(page);
    expect(isDemo).toBe(true);

    // Toggle with Cmd/Ctrl+E
    await page.keyboard.press('Meta+e'); // Mac
    await page.waitForTimeout(500);

    // Check demo mode is now OFF
    isDemo = await isDemoModeEnabled(page);
    expect(isDemo).toBe(false);

    // Toggle back ON
    await page.keyboard.press('Meta+e');
    await page.waitForTimeout(500);

    isDemo = await isDemoModeEnabled(page);
    expect(isDemo).toBe(true);
  });

  test('demo clusters show activity counts and tool icons', async ({ page }) => {
    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    const clusterCards = page.locator('[data-testid^="cluster-card-"]');

    if ((await clusterCards.count()) > 0) {
      const firstCard = clusterCards.first();

      // Should show activity count
      await expect(firstCard.getByText(/\d+ activities/)).toBeVisible();

      // Should show date range (clock icon exists)
      await expect(firstCard.locator('svg.lucide-clock').first()).toBeVisible();

      // Should show tool icons (at least one)
      const toolIcons = firstCard.locator('[title]');
      expect(await toolIcons.count()).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// DEMO MODE DISABLED TESTS
// =============================================================================

test.describe('Career Stories - Demo Mode Disabled', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);

    // Disable demo mode explicitly
    await disableDemoMode(page);
  });

  test('without demo mode shows empty state or real data', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'career-stories-demo',
      scenario: 'demo-disabled',
    });

    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    // Verify demo mode is disabled
    const isDemo = await isDemoModeEnabled(page);
    expect(isDemo).toBe(false);

    // Should show either real clusters (listbox) or empty state (heading)
    const emptyStateHeading = page.getByRole('heading', { name: 'No clusters yet' });
    const clusterListbox = page.getByRole('listbox', { name: 'Clusters' });

    const isEmpty = await emptyStateHeading.isVisible().catch(() => false);
    const hasClusters = await clusterListbox.isVisible().catch(() => false);

    expect(isEmpty || hasClusters).toBe(true);

    await screenshots.captureSection({
      name: 'demo-disabled-state',
      fullPage: true,
    });
  });

  test('edit activities button NOT visible when demo disabled', async ({ page }) => {
    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    // Edit button should not be visible (only available in demo mode)
    const editButton = page.locator('[data-testid^="edit-activities-"]').first();

    // Either no clusters exist or edit button should not be visible
    const clusterCards = page.locator('[data-testid^="cluster-card-"]');
    if ((await clusterCards.count()) > 0) {
      await expect(editButton).not.toBeVisible();
    }
  });
});
