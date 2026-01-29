import { test, expect } from '@playwright/test';
import { login } from './utils/auth-helper';

/**
 * Screenshot capture for Career Stories UI
 * Run with: BASE_URL=http://localhost:5555 npx playwright test e2e/capture-screenshots.spec.ts --project=chromium
 */

test.describe('Career Stories Screenshots', () => {
  test.setTimeout(120000);

  test('capture career stories flow', async ({ page }) => {
    // Login
    await login(page);

    // Navigate to Career Stories
    await page.goto('/career-stories');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Screenshot 1: Initial page (empty state or with clusters)
    await page.screenshot({
      path: 'screenshots/career-stories-01-initial.png',
      fullPage: true
    });
    console.log('Captured: career-stories-01-initial.png');

    // Check if demo mode banner is visible (means we have demo clusters)
    const demoBanner = page.getByText('Demo Mode');
    const hasDemoMode = await demoBanner.isVisible().catch(() => false);

    if (hasDemoMode) {
      console.log('Demo mode active - clusters already loaded');
      await page.screenshot({
        path: 'screenshots/career-stories-02-demo-clusters.png',
        fullPage: true
      });
      console.log('Captured: career-stories-02-demo-clusters.png');
    } else {
      // Try to generate clusters if empty (non-demo mode)
      const generateBtn = page.getByRole('button', { name: /generate clusters/i }).first();
      if (await generateBtn.isVisible() && await generateBtn.isEnabled()) {
        console.log('Clicking Generate Clusters...');
        await generateBtn.click();
        await page.waitForTimeout(5000);

        await page.screenshot({
          path: 'screenshots/career-stories-02-after-generate.png',
          fullPage: true
        });
        console.log('Captured: career-stories-02-after-generate.png');
      }
    }

    // Click first cluster if exists
    const clusterCard = page.locator('[data-testid^="cluster-card-"]').first();
    if (await clusterCard.isVisible()) {
      console.log('Selecting cluster...');
      await clusterCard.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'screenshots/career-stories-03-cluster-selected.png',
        fullPage: true
      });
      console.log('Captured: career-stories-03-cluster-selected.png');

      // Try to generate STAR
      const generateStarBtn = page.locator('[data-testid^="generate-star-"]').first();
      if (await generateStarBtn.isVisible()) {
        console.log('Generating STAR...');
        await generateStarBtn.click();

        // Wait for generation (can take a few seconds)
        await page.waitForTimeout(8000);

        await page.screenshot({
          path: 'screenshots/career-stories-04-star-generated.png',
          fullPage: true
        });
        console.log('Captured: career-stories-04-star-generated.png');
      }
    }

    // Mobile view
    console.log('Capturing mobile view...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'screenshots/career-stories-05-mobile.png',
      fullPage: true
    });
    console.log('Captured: career-stories-05-mobile.png');

    // If cluster selected on mobile, sheet should be open
    if (await clusterCard.isVisible()) {
      await clusterCard.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'screenshots/career-stories-06-mobile-sheet.png',
        fullPage: true
      });
      console.log('Captured: career-stories-06-mobile-sheet.png');
    }

    console.log('\nAll screenshots saved to screenshots/ directory');
  });
});
