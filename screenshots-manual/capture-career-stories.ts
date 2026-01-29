/**
 * Quick script to capture Career Stories screenshots
 * Run with: npx tsx screenshots-manual/capture-career-stories.ts
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5555';
const EMAIL = process.env.E2E_USER_EMAIL || 'test@example.com';
const PASSWORD = process.env.E2E_USER_PASSWORD || 'testpassword123';

async function captureScreenshots() {
  console.log(`Starting browser at ${BASE_URL}...`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // 1. Navigate to login
    console.log('Navigating to login...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots-manual/01-login-page.png', fullPage: true });
    console.log('Captured: 01-login-page.png');

    // 2. Login
    console.log('Logging in...');
    const emailInput = page.getByLabel('Email address');
    const passwordInput = page.getByLabel('Password');

    if (await emailInput.isVisible()) {
      await emailInput.fill(EMAIL);
      await passwordInput.fill(PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    } else {
      console.log('Login form not visible, checking if already logged in...');
    }

    // 3. Navigate to Career Stories
    console.log('Navigating to Career Stories...');
    await page.goto(`${BASE_URL}/career-stories`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots-manual/02-career-stories-initial.png', fullPage: true });
    console.log('Captured: 02-career-stories-initial.png');

    // 4. Check for empty state or clusters
    const emptyState = page.getByTestId('cluster-list-empty');
    const clusterList = page.getByTestId('cluster-list');

    if (await emptyState.isVisible()) {
      console.log('Empty state detected');
      await page.screenshot({ path: 'screenshots-manual/03-empty-state.png', fullPage: true });
      console.log('Captured: 03-empty-state.png');

      // Try to generate clusters
      const generateBtn = page.getByRole('button', { name: /generate clusters/i });
      if (await generateBtn.isVisible()) {
        console.log('Clicking Generate Clusters...');
        await generateBtn.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'screenshots-manual/04-after-generate.png', fullPage: true });
        console.log('Captured: 04-after-generate.png');
      }
    } else if (await clusterList.isVisible()) {
      console.log('Cluster list detected');

      // Click first cluster
      const firstCluster = page.locator('[data-testid^="cluster-card-"]').first();
      if (await firstCluster.isVisible()) {
        console.log('Selecting first cluster...');
        await firstCluster.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'screenshots-manual/05-cluster-selected.png', fullPage: true });
        console.log('Captured: 05-cluster-selected.png');

        // Try to generate STAR
        const generateStarBtn = page.locator('[data-testid^="generate-star-"]').first();
        if (await generateStarBtn.isVisible()) {
          console.log('Generating STAR...');
          await generateStarBtn.click();
          await page.waitForTimeout(5000); // Wait for generation
          await page.screenshot({ path: 'screenshots-manual/06-star-generated.png', fullPage: true });
          console.log('Captured: 06-star-generated.png');
        }
      }
    }

    // 5. Mobile view
    console.log('Capturing mobile view...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots-manual/07-mobile-view.png', fullPage: true });
    console.log('Captured: 07-mobile-view.png');

    console.log('\nAll screenshots captured in screenshots-manual/');

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'screenshots-manual/error-state.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
