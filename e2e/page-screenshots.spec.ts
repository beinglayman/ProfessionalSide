import { test } from '@playwright/test';
import { waitForContentLoaded } from './utils/wait-helper';

const SCREENSHOT_DIR = 'e2e/screenshots';

test.describe.configure({ mode: 'serial' });

test.describe('Page screenshots', () => {
  test.setTimeout(180000);

  test('capture journal, promote to career story, then view it', async ({ page }) => {
    // --- Login ---
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.getByLabel('Email address').fill('test@techcorp.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    // 1. Journal page
    await page.goto('/journal');
    await page.waitForLoadState('domcontentloaded');
    await waitForContentLoaded(page, { stabilityDelay: 3000 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-journal-page.png`,
      fullPage: true,
    });
    console.log('Screenshot saved: 01-journal-page.png');

    // 2. Enable demo mode so we have demo data to work with
    await page.evaluate(() => {
      localStorage.setItem('app-demo-mode', 'true');
    });

    // Reload to pick up demo mode
    await page.goto('/journal');
    await page.waitForLoadState('domcontentloaded');
    await waitForContentLoaded(page, { stabilityDelay: 3000 });

    // 3. Navigate to Career Stories page
    await page.goto('/career-stories');
    await page.waitForLoadState('domcontentloaded');
    await waitForContentLoaded(page, { stabilityDelay: 3000 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-career-stories-page.png`,
      fullPage: true,
    });
    console.log('Screenshot saved: 02-career-stories-page.png');

    // 4. Try to click on a story card to open detail view
    // Look for story cards in various forms
    const storySelectors = [
      '[data-testid="story-card"]',
      'button:has-text("Q")', // Quarter-grouped story cards often start with Q
      'h3', // Story title headings
    ];

    let clicked = false;

    // First check if there are visible stories on the page
    const pageContent = await page.locator('main, [role="main"], .flex-1').first().innerText().catch(() => '');
    console.log('Career stories page content (first 300 chars):', pageContent.substring(0, 300));

    // Try to find and click a story
    for (const selector of storySelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        // Find a clickable one that looks like a story
        for (let i = 0; i < Math.min(count, 5); i++) {
          const text = await elements.nth(i).innerText().catch(() => '');
          if (text.length > 5 && !text.includes('No stories')) {
            console.log(`Clicking element [${selector}] #${i}: "${text.substring(0, 50)}"`);
            await elements.nth(i).click();
            clicked = true;
            break;
          }
        }
        if (clicked) break;
      }
    }

    if (clicked) {
      await waitForContentLoaded(page, { stabilityDelay: 3000 });
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/03-career-story-detail.png`,
        fullPage: true,
      });
      console.log('Screenshot saved: 03-career-story-detail.png');
    } else {
      // No stories exist - promote one from journal
      console.log('No stories found. Promoting a journal entry...');

      await page.goto('/journal');
      await page.waitForLoadState('domcontentloaded');
      await waitForContentLoaded(page, { stabilityDelay: 3000 });

      // Look for the "Review drafts" button or a promote action on a journal entry
      const reviewDrafts = page.getByRole('button', { name: /review drafts/i });
      if ((await reviewDrafts.count()) > 0) {
        await reviewDrafts.click();
        await waitForContentLoaded(page, { stabilityDelay: 2000 });
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/03-review-drafts.png`,
          fullPage: true,
        });
        console.log('Screenshot saved: 03-review-drafts.png');
      }

      // Try the three-dot menu on a journal entry to find promote option
      const menuButtons = page.locator('button[aria-label*="menu"], button:has(svg.lucide-more-vertical), [class*="MoreVertical"]');
      if ((await menuButtons.count()) > 0) {
        await menuButtons.first().click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/03-entry-menu.png`,
          fullPage: true,
        });
        console.log('Screenshot saved: 03-entry-menu.png');

        // Look for promote option
        const promoteBtn = page.getByRole('menuitem', { name: /promote|career story/i })
          .or(page.locator('button:has-text("Promote")'))
          .or(page.locator('[role="menuitem"]:has-text("Career")'));

        if ((await promoteBtn.count()) > 0) {
          await promoteBtn.first().click();
          await waitForContentLoaded(page, { stabilityDelay: 3000 });
          await page.screenshot({
            path: `${SCREENSHOT_DIR}/03-promote-wizard.png`,
            fullPage: true,
          });
          console.log('Screenshot saved: 03-promote-wizard.png');
        }
      }
    }

    // 5. Final: disable demo mode
    await page.evaluate(() => {
      localStorage.removeItem('app-demo-mode');
    });
  });
});
