/**
 * Debug test for "Promote to Career Story" feature
 *
 * This test traces the data flow:
 * 1. Login
 * 2. Enable demo mode
 * 3. Navigate to Journal page
 * 4. Switch to Story view
 * 5. Find and click the Promote button
 * 6. Check the network request and response
 */

import { test, expect } from '@playwright/test';
import { login } from './utils/auth-helper';

test.describe('Promote to Career Story Debug', () => {
  test('trace promote to career story flow', async ({ page }) => {
    // Collect all console messages
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Collect network requests
    const networkRequests: { url: string; method: string; status?: number; response?: any; requestBody?: any }[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/')) {
        networkRequests.push({
          url,
          method: request.method(),
          requestBody: request.postData() ? JSON.parse(request.postData() || '{}') : undefined,
        });
      }
    });

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        let responseData;
        try {
          responseData = await response.json();
        } catch {
          responseData = 'non-json';
        }

        // Find the matching request and update it
        const requestEntry = networkRequests.find(r => r.url === url && !r.status);
        if (requestEntry) {
          requestEntry.status = response.status();
          requestEntry.response = responseData;
        }
      }
    });

    // Step 1: Login
    console.log('Step 1: Logging in...');
    await login(page);
    console.log('Current URL after login:', page.url());

    // Step 2: Enable demo mode
    console.log('Step 2: Enabling demo mode...');
    await page.evaluate(() => {
      localStorage.setItem('app-demo-mode', 'true');
    });

    const demoModeStatus = await page.evaluate(() => localStorage.getItem('app-demo-mode'));
    console.log('Demo mode status:', demoModeStatus);

    // Step 3: Navigate to Journal page
    console.log('Step 3: Navigating to Journal page...');
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await page.screenshot({ path: 'e2e/screenshots/promote-debug-1-initial.png', fullPage: true });

    // Step 4: Switch to Story view (click "By Story" tab)
    console.log('Step 4: Looking for "By Story" tab...');

    // Wait a bit for the page to fully render
    await page.waitForTimeout(1000);

    // Print available buttons
    const tabs = await page.locator('button').allTextContents();
    console.log('Available buttons:', tabs.filter(t => t.length > 0 && t.length < 30));

    // Find and click the "By Story" tab
    const byStoryTab = page.locator('button:has-text("By Story")');
    const byStoryTabExists = await byStoryTab.count() > 0;
    console.log('"By Story" tab exists:', byStoryTabExists);

    if (byStoryTabExists) {
      await byStoryTab.click();
      await page.waitForTimeout(1000);
      console.log('Clicked "By Story" tab');
    }

    await page.screenshot({ path: 'e2e/screenshots/promote-debug-2-story-view.png', fullPage: true });

    // Step 5: Look for story groups
    console.log('Step 5: Looking for story groups...');
    await page.waitForTimeout(1000);

    // Check for story group headers
    const storyGroupHeaders = page.locator('[class*="StoryGroupHeader"], button:has-text("Week of"), [class*="story-group"]');
    const storyGroupCount = await storyGroupHeaders.count();
    console.log('Story group headers found:', storyGroupCount);

    // Step 6: Look for the Promote button (ArrowUpRight icon)
    console.log('Step 6: Looking for Promote button...');

    // The promote button has title="Promote to Career Story"
    const promoteButton = page.locator('button[title="Promote to Career Story"]');
    const promoteButtonCount = await promoteButton.count();
    console.log('Promote buttons found:', promoteButtonCount);

    if (promoteButtonCount > 0) {
      // Clear existing network requests to track only the promote request
      const promoteRequestIndex = networkRequests.length;

      console.log('Clicking first Promote button...');
      await promoteButton.first().click();

      // Wait for potential API call
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'e2e/screenshots/promote-debug-3-after-click.png', fullPage: true });

      // Check for new network requests after clicking
      const newRequests = networkRequests.slice(promoteRequestIndex);
      console.log('\nNew network requests after clicking Promote:');
      newRequests.forEach(req => {
        console.log(`  ${req.method} ${req.url}`);
        if (req.status) console.log(`    Status: ${req.status}`);
        if (req.response) console.log(`    Response: ${JSON.stringify(req.response).substring(0, 500)}`);
      });

      // Check for the specific from-entry API call
      const fromEntryRequest = newRequests.find(r => r.url.includes('/from-entry/'));
      if (fromEntryRequest) {
        console.log('\n=== FROM-ENTRY REQUEST FOUND ===');
        console.log('URL:', fromEntryRequest.url);
        console.log('Method:', fromEntryRequest.method);
        console.log('Status:', fromEntryRequest.status);
        console.log('Response:', JSON.stringify(fromEntryRequest.response, null, 2));
      } else {
        console.log('\n=== NO FROM-ENTRY REQUEST FOUND ===');
        console.log('This suggests the button click is not triggering the API call');
      }
    } else {
      console.log('No Promote buttons found. Checking page structure...');

      // Debug: Print all buttons on the page
      const allButtons = await page.locator('button').allTextContents();
      console.log('All button texts:', allButtons.filter(t => t.length > 0 && t.length < 50));

      // Check for icons that might be the promote button
      const arrowIcons = page.locator('svg.lucide-arrow-up-right, [data-testid*="promote"]');
      console.log('Arrow up right icons found:', await arrowIcons.count());
    }

    // Step 7: Print console logs
    console.log('\n=== CONSOLE LOGS (filtered) ===');
    const relevantLogs = consoleLogs.filter(log =>
      log.includes('promote') ||
      log.includes('career') ||
      log.includes('story') ||
      log.includes('entry') ||
      log.includes('🚀') ||
      log.includes('📤') ||
      log.includes('📥') ||
      log.includes('❌') ||
      log.includes('✅') ||
      log.includes('🖱️')
    );
    relevantLogs.forEach(log => console.log(log));

    // Step 8: Print all network requests to /career-stories/
    console.log('\n=== ALL CAREER-STORIES API CALLS ===');
    const careerStoriesRequests = networkRequests.filter(r => r.url.includes('/career-stories/'));
    careerStoriesRequests.forEach(req => {
      console.log(`${req.method} ${req.url}`);
      console.log(`  Status: ${req.status}`);
      if (req.response?.success === false) {
        console.log(`  Error: ${req.response.error}`);
      }
      // Show stories list content
      if (req.url.includes('/stories') && !req.url.includes('/from-entry')) {
        console.log('  Stories count:', req.response?.data?.stories?.length || 0);
        if (req.response?.data?.stories?.length > 0) {
          console.log('  Stories:', req.response.data.stories.map((s: any) => ({ id: s.id, title: s.title })));
        }
      }
      // Show clusters
      if (req.url.endsWith('/clusters')) {
        console.log('  Clusters count:', req.response?.data?.length || 0);
      }
    });

    // Check if navigation occurred
    console.log('\nStep 9: Checking navigation...');
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);

    const navigatedToCareerStories = finalUrl.includes('/career-stories');
    console.log('Navigated to career-stories:', navigatedToCareerStories);

    // If the navigation occurred, capture the career stories page
    if (navigatedToCareerStories) {
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e2e/screenshots/promote-debug-4-career-stories-page.png', fullPage: true });
      console.log('Navigated successfully to career stories page!');
    }

    // Final screenshot
    await page.screenshot({ path: 'e2e/screenshots/promote-debug-5-final.png', fullPage: true });
    console.log('\nScreenshots saved to e2e/screenshots/promote-debug-*.png');

    // Assertions
    expect(promoteButtonCount, 'Should find at least one Promote button').toBeGreaterThan(0);

    // Assert that the API call succeeded
    const fromEntryRequest = networkRequests.find(r => r.url.includes('/from-entry/'));
    expect(fromEntryRequest, 'Should make from-entry API call').toBeDefined();
    expect(fromEntryRequest?.status, 'API should return 200').toBe(200);
    expect(fromEntryRequest?.response?.success, 'API should return success').toBe(true);

    // Assert navigation occurred
    expect(navigatedToCareerStories, 'Should navigate to career stories page').toBe(true);
  });
});
