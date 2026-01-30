/**
 * Debug test for demo journal entries not rendering
 *
 * This test traces the data flow:
 * 1. Login
 * 2. Enable demo mode
 * 3. Trigger sync
 * 4. Check API response
 * 5. Check if entries render
 */

import { test, expect } from '@playwright/test';

test.describe('Demo Journal Debug', () => {
  test('trace demo journal data flow', async ({ page }) => {
    // Collect all console messages
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Collect network requests
    const networkRequests: { url: string; status: number; response?: any }[] = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        let responseData;
        try {
          responseData = await response.json();
        } catch {
          responseData = 'non-json';
        }
        networkRequests.push({
          url,
          status: response.status(),
          response: responseData,
        });
      }
    });

    // Step 1: Go to login page
    console.log('Step 1: Navigating to login...');
    await page.goto('http://localhost:5555/login');
    await page.waitForLoadState('networkidle');

    // Step 2: Login with test credentials
    console.log('Step 2: Logging in...');
    await page.fill('input[type="email"]', 'test@techcorp.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log('Did not redirect to dashboard, checking current URL...');
    });
    console.log('Current URL after login:', page.url());

    // Step 3: Check demo mode status
    console.log('Step 3: Checking demo mode...');
    const demoModeStatus = await page.evaluate(() => {
      return localStorage.getItem('app-demo-mode');
    });
    console.log('Demo mode localStorage value:', demoModeStatus);

    // Enable demo mode if not enabled
    if (demoModeStatus === 'false') {
      console.log('Enabling demo mode...');
      await page.evaluate(() => {
        localStorage.setItem('app-demo-mode', 'true');
      });
    }

    // Step 4: Navigate to Journal page
    console.log('Step 4: Navigating to Journal page...');
    await page.goto('http://localhost:5555/journal');
    await page.waitForLoadState('networkidle');

    // Step 5: Check if sync button exists
    console.log('Step 5: Looking for Sync button...');
    const syncButton = page.locator('button:has-text("Sync")');
    const syncButtonExists = await syncButton.count() > 0;
    console.log('Sync button exists:', syncButtonExists);

    // Step 6: Click sync and wait for completion
    if (syncButtonExists) {
      console.log('Step 6: Clicking Sync button...');
      await syncButton.click();

      // Wait for sync modal to appear and complete
      const doneButton = page.locator('button:has-text("Done")');
      try {
        await doneButton.waitFor({ state: 'visible', timeout: 30000 });
        console.log('Sync completed, clicking Done...');
        await doneButton.click();
      } catch (e) {
        console.log('Done button not found within timeout');
      }

      // Wait for page to reload
      await page.waitForLoadState('networkidle');
    }

    // Step 7: Check for demo/journal-entries API call
    console.log('\nStep 7: Analyzing network requests...');
    const demoEntriesRequest = networkRequests.find(r => r.url.includes('/demo/journal-entries'));
    console.log('Demo journal entries request:', demoEntriesRequest);

    // Step 8: Check what's rendered on the page
    console.log('\nStep 8: Checking rendered content...');

    // Check for "No journal entries found" message
    const noEntriesMessage = page.locator('text=No journal entries found');
    const hasNoEntriesMessage = await noEntriesMessage.count() > 0;
    console.log('Shows "No journal entries" message:', hasNoEntriesMessage);

    // Check for journal cards
    const journalCards = page.locator('[class*="journal-card"], [class*="JournalCard"], article');
    const cardCount = await journalCards.count();
    console.log('Journal card count:', cardCount);

    // Check for any entry titles from our demo data
    const weekOfText = page.locator('text=/Week of/');
    const weekOfCount = await weekOfText.count();
    console.log('Elements containing "Week of":', weekOfCount);

    // Step 9: Print all console logs
    console.log('\n=== CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));

    // Step 10: Print relevant network requests
    console.log('\n=== NETWORK REQUESTS (API calls) ===');
    networkRequests.forEach(req => {
      console.log(`${req.status} ${req.url}`);
      if (req.url.includes('demo') || req.url.includes('journal')) {
        console.log('  Response:', JSON.stringify(req.response, null, 2).substring(0, 500));
      }
    });

    // Take screenshot for visual inspection
    await page.screenshot({ path: 'e2e/screenshots/demo-journal-debug.png', fullPage: true });
    console.log('\nScreenshot saved to e2e/screenshots/demo-journal-debug.png');

    // Assertions to identify the issue
    expect(demoEntriesRequest, 'Expected /demo/journal-entries API call').toBeDefined();
    if (demoEntriesRequest) {
      expect(demoEntriesRequest.status, 'API should return 200').toBe(200);
      expect(demoEntriesRequest.response?.success, 'API should return success: true').toBe(true);
      expect(demoEntriesRequest.response?.data?.length, 'API should return entries').toBeGreaterThan(0);
    }
  });
});
