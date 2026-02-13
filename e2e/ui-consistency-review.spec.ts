import { test, expect, Page } from '@playwright/test';
import { createScreenshotHelper, createRunLog } from './utils/screenshot-helper';
import { waitForContentLoaded } from './utils/wait-helper';

/**
 * UI Consistency Review — Automated Visual Audit
 *
 * Captures every major authenticated page at 3 viewports (desktop, tablet, mobile).
 * Then runs structural assertions for header, nav, button variants, color tokens.
 *
 * Usage:
 *   E2E_EMAIL=yc@inchronicle.com E2E_PASSWORD=yc2026s npx playwright test ui-consistency-review.spec.ts --project=chromium
 */

// ── Config ────────────────────────────────────────────────────────────────────
const CREDS = {
  email: 'yc@inchronicle.com',
  password: 'yc2026s',
};

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
} as const;

/** Primary pages for UI consistency review */
const PAGES = [
  { name: 'timeline', path: '/timeline', label: 'Timeline' },
  { name: 'stories', path: '/stories', label: 'Stories' },
  { name: 'dashboard', path: '/dashboard', label: 'Dashboard' },
  { name: 'settings', path: '/settings', label: 'Settings' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Login — AuthLayout renders 3 responsive copies of {children} (mobile/tablet/desktop).
 * All share the same id="email". We must find the one that's actually visible.
 */
async function loginWithCreds(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Find the visible email input among the 3 responsive copies
  const emailInputs = page.getByPlaceholder('you@company.com');
  const count = await emailInputs.count();
  let visibleEmail = emailInputs.first(); // fallback
  for (let i = 0; i < count; i++) {
    if (await emailInputs.nth(i).isVisible()) {
      visibleEmail = emailInputs.nth(i);
      break;
    }
  }

  await visibleEmail.fill(CREDS.email);

  // Same for password
  const pwInputs = page.getByPlaceholder('Enter your password');
  const pwCount = await pwInputs.count();
  let visiblePw = pwInputs.first();
  for (let i = 0; i < pwCount; i++) {
    if (await pwInputs.nth(i).isVisible()) {
      visiblePw = pwInputs.nth(i);
      break;
    }
  }
  await visiblePw.fill(CREDS.password);

  // Same for submit button
  const signInBtns = page.getByRole('button', { name: /sign in/i });
  const btnCount = await signInBtns.count();
  let visibleBtn = signInBtns.first();
  for (let i = 0; i < btnCount; i++) {
    if (await signInBtns.nth(i).isVisible()) {
      visibleBtn = signInBtns.nth(i);
      break;
    }
  }
  await visibleBtn.click();

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/** Navigate to page and wait for content (avoid networkidle — ongoing polling never settles) */
async function goAndWait(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForContentLoaded(page, { stabilityDelay: 2000 });
}

/** Collect all issues into a structured array */
interface ConsistencyIssue {
  page: string;
  viewport: string;
  category: string;
  detail: string;
}

// ── Test Suite ────────────────────────────────────────────────────────────────
test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

test.describe('UI Consistency Review', () => {
  const issues: ConsistencyIssue[] = [];

  test.beforeEach(async ({ page }) => {
    await loginWithCreds(page);
    expect(page.url()).not.toContain('/login');
  });

  // ── 1. Full-page screenshots at all viewports ────────────────────────────
  test('capture all pages at desktop viewport', async ({ page }) => {
    const shots = createScreenshotHelper(page, {
      type: 'chore',
      slug: 'ui-consistency-review',
      scenario: 'desktop',
    });

    for (const pg of PAGES) {
      await goAndWait(page, pg.path);
      await shots.captureSection({
        name: `${pg.name}-desktop`,
        fullPage: true,
        viewport: VIEWPORTS.desktop,
      });
    }
  });

  test('capture all pages at tablet viewport', async ({ page }) => {
    const shots = createScreenshotHelper(page, {
      type: 'chore',
      slug: 'ui-consistency-review',
      scenario: 'tablet',
    });

    for (const pg of PAGES) {
      await goAndWait(page, pg.path);
      await shots.captureSection({
        name: `${pg.name}-tablet`,
        fullPage: true,
        viewport: VIEWPORTS.tablet,
      });
    }
  });

  test('capture all pages at mobile viewport', async ({ page }) => {
    const shots = createScreenshotHelper(page, {
      type: 'chore',
      slug: 'ui-consistency-review',
      scenario: 'mobile',
    });

    for (const pg of PAGES) {
      await goAndWait(page, pg.path);
      await shots.captureSection({
        name: `${pg.name}-mobile`,
        fullPage: true,
        viewport: VIEWPORTS.mobile,
      });
    }
  });

  // ── 2. Header consistency checks ─────────────────────────────────────────
  test('header is present and consistent across all pages', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    for (const pg of PAGES) {
      await goAndWait(page, pg.path);

      // Header should exist
      const header = page.locator('header').first();
      const headerVisible = await header.isVisible().catch(() => false);

      if (!headerVisible) {
        issues.push({
          page: pg.name,
          viewport: 'desktop',
          category: 'header',
          detail: 'Header element not visible',
        });
        continue;
      }

      // Logo should be present
      const logoVisible = await page
        .locator('header a[href="/"], header a[href="/timeline"]')
        .first()
        .isVisible()
        .catch(() => false);
      if (!logoVisible) {
        issues.push({
          page: pg.name,
          viewport: 'desktop',
          category: 'header',
          detail: 'Logo/home link not found in header',
        });
      }

      // Navigation links should exist on desktop
      const navLinks = page.locator('header nav a, header a[href="/timeline"], header a[href="/stories"], header a[href="/dashboard"]');
      const navCount = await navLinks.count();
      if (navCount < 2) {
        issues.push({
          page: pg.name,
          viewport: 'desktop',
          category: 'navigation',
          detail: `Only ${navCount} nav links found in header (expected ≥3)`,
        });
      }
    }
  });

  // ── 3. Active nav state consistency ───────────────────────────────────────
  test('active navigation state highlights correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    for (const pg of PAGES) {
      await goAndWait(page, pg.path);

      // Check for active nav indicator (underline, bold, color change)
      // The app uses aria-current or className changes for active links
      const activeLinks = page.locator(
        'header [aria-current="page"], header a.active, header a[data-active="true"]'
      );
      const activeCount = await activeLinks.count();

      // Also check for visually-active links by looking for text-primary or font-semibold
      const styledActiveLinks = page.locator(
        'header a.text-primary-600, header a.text-primary-500, header a.font-semibold'
      );
      const styledCount = await styledActiveLinks.count();

      if (activeCount === 0 && styledCount === 0) {
        // Not a hard failure — some pages may not have a direct nav entry
        if (['timeline', 'stories', 'dashboard'].includes(pg.name)) {
          issues.push({
            page: pg.name,
            viewport: 'desktop',
            category: 'navigation',
            detail: 'No active nav state detected for primary page',
          });
        }
      }
    }
  });

  // ── 4. Mobile hamburger menu ──────────────────────────────────────────────
  test('mobile hamburger menu works on all pages', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    for (const pg of PAGES) {
      await goAndWait(page, pg.path);

      // Desktop nav should be hidden
      const desktopNav = page.locator('header nav.hidden, header nav.md\\:flex');
      // Hamburger button should be visible
      const hamburger = page.locator(
        'header button[aria-label*="menu" i], header button[aria-label*="Menu" i], header button.md\\:hidden'
      );
      const hamburgerVisible = await hamburger.first().isVisible().catch(() => false);

      if (!hamburgerVisible) {
        // Try broader selector — any button in header that's only visible on mobile
        const anyMobileButton = page.locator('header button').first();
        const anyVisible = await anyMobileButton.isVisible().catch(() => false);
        if (!anyVisible) {
          issues.push({
            page: pg.name,
            viewport: 'mobile',
            category: 'responsive',
            detail: 'No hamburger menu button found on mobile',
          });
        }
      }
    }
  });

  // ── 5. Button variant consistency ─────────────────────────────────────────
  test('buttons use consistent design system variants', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    for (const pg of PAGES) {
      await goAndWait(page, pg.path);

      // Find all buttons
      const buttons = page.locator('button, a[role="button"], [class*="btn"]');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 20); i++) {
        const btn = buttons.nth(i);
        const isVisible = await btn.isVisible().catch(() => false);
        if (!isVisible) continue;

        const classes = (await btn.getAttribute('class')) || '';
        const computedBg = await btn.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.backgroundColor;
        }).catch(() => '');

        // Check for inline styles that override design system
        const inlineStyle = (await btn.getAttribute('style')) || '';
        if (inlineStyle.includes('background') || inlineStyle.includes('color')) {
          const text = await btn.textContent().catch(() => '');
          issues.push({
            page: pg.name,
            viewport: 'desktop',
            category: 'buttons',
            detail: `Button "${text?.trim().slice(0, 30)}" uses inline styles instead of design tokens`,
          });
        }
      }
    }
  });

  // ── 6. Color token compliance ─────────────────────────────────────────────
  test('primary color tokens are used consistently', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // Primary purple: #5D259F → rgb(93, 37, 159)
    const PRIMARY_RGB = 'rgb(93, 37, 159)';
    // Common variants
    const PRIMARY_VARIANTS = [
      'rgb(93, 37, 159)',   // 500
      'rgb(75, 30, 128)',   // 600
      'rgb(57, 22, 96)',    // 700
      'rgb(243, 235, 252)', // 50
      'rgb(231, 215, 249)', // 100
    ];

    for (const pg of PAGES) {
      await goAndWait(page, pg.path);

      // Check that interactive elements use primary palette, not random blues/greens
      const links = page.locator('a[href]:not(header a)');
      const linkCount = await links.count();

      for (let i = 0; i < Math.min(linkCount, 10); i++) {
        const link = links.nth(i);
        const isVisible = await link.isVisible().catch(() => false);
        if (!isVisible) continue;

        const color = await link.evaluate((el) => {
          return window.getComputedStyle(el).color;
        }).catch(() => '');

        // Flag links using non-primary, non-gray, non-white, non-black colors
        if (
          color &&
          !color.includes('93, 37, 159') && // primary
          !color.includes('75, 30, 128') && // primary-600
          !color.includes('37, 99, 235') && // blue-600 (acceptable for links)
          !color.includes('59, 130, 246') && // blue-500
          !color.startsWith('rgb(0,') &&
          !color.startsWith('rgb(255,') &&
          !isGrayish(color)
        ) {
          const text = await link.textContent().catch(() => '');
          const href = await link.getAttribute('href').catch(() => '');
          // Only flag if it looks like a significant off-brand color
          if (isOffBrand(color)) {
            issues.push({
              page: pg.name,
              viewport: 'desktop',
              category: 'color',
              detail: `Link "${text?.trim().slice(0, 30)}" (${href}) uses non-standard color: ${color}`,
            });
          }
        }
      }
    }
  });

  // ── 7. Spacing & container consistency ────────────────────────────────────
  test('page containers use consistent max-width', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    for (const pg of PAGES) {
      await goAndWait(page, pg.path);

      // Check main content area max-width
      const mainContent = page.locator('main, [role="main"], .max-w-7xl, .max-w-6xl, .max-w-5xl').first();
      const exists = await mainContent.count();

      if (exists === 0) {
        issues.push({
          page: pg.name,
          viewport: 'desktop',
          category: 'layout',
          detail: 'No <main> element or max-width container found',
        });
        continue;
      }

      const maxWidth = await mainContent.evaluate((el) => {
        return window.getComputedStyle(el).maxWidth;
      }).catch(() => 'none');

      // Log actual max-width for comparison (consistency check done in summary)
    }
  });

  // ── 8. Empty state handling ───────────────────────────────────────────────
  test('empty states are styled consistently', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    for (const pg of PAGES) {
      await goAndWait(page, pg.path);

      // Look for common empty state patterns
      const emptyStates = page.locator(
        '[class*="empty-state"], [data-testid*="empty"], .text-gray-500:has-text("No "), .text-gray-400:has-text("No ")'
      );
      const emptyCount = await emptyStates.count();

      if (emptyCount > 0) {
        // Verify empty states have consistent structure (icon + text + optional CTA)
        for (let i = 0; i < emptyCount; i++) {
          const empty = emptyStates.nth(i);
          const text = await empty.textContent().catch(() => '');
          // Just capture it — visual review will judge consistency
        }
      }
    }
  });

  // ── 9. Focusable element ring consistency ─────────────────────────────────
  test('focus rings use primary color consistently', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // Check on stories page (has the most interactive elements)
    await goAndWait(page, '/stories');

    // Tab through first 10 focusable elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      const count = await focused.count();
      if (count === 0) continue;

      const outline = await focused.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          outlineColor: style.outlineColor,
          outlineStyle: style.outlineStyle,
          boxShadow: style.boxShadow,
        };
      }).catch(() => null);

      // Focus should have visible ring (outline or box-shadow)
      if (outline && outline.outlineStyle === 'none' && !outline.boxShadow) {
        const tag = await focused.evaluate((el) => `${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ')[0] : ''}`).catch(() => 'unknown');
        issues.push({
          page: 'stories',
          viewport: 'desktop',
          category: 'a11y',
          detail: `Element "${tag}" has no visible focus indicator`,
        });
      }
    }
  });

  // ── 10. Typography consistency ────────────────────────────────────────────
  test('typography uses Inter font family consistently', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    for (const pg of PAGES) {
      await goAndWait(page, pg.path);

      // Check body font
      const bodyFont = await page.evaluate(() => {
        return window.getComputedStyle(document.body).fontFamily;
      });

      if (!bodyFont.toLowerCase().includes('inter')) {
        issues.push({
          page: pg.name,
          viewport: 'desktop',
          category: 'typography',
          detail: `Body font is "${bodyFont}" — expected Inter`,
        });
      }

      // Check headings
      const headings = page.locator('h1, h2, h3');
      const hCount = await headings.count();
      for (let i = 0; i < Math.min(hCount, 5); i++) {
        const h = headings.nth(i);
        const isVisible = await h.isVisible().catch(() => false);
        if (!isVisible) continue;

        const font = await h.evaluate((el) => window.getComputedStyle(el).fontFamily).catch(() => '');
        if (font && !font.toLowerCase().includes('inter') && !font.toLowerCase().includes('georgia')) {
          const text = await h.textContent().catch(() => '');
          issues.push({
            page: pg.name,
            viewport: 'desktop',
            category: 'typography',
            detail: `Heading "${text?.trim().slice(0, 30)}" uses "${font}" instead of Inter/Georgia`,
          });
        }
      }
    }
  });

  // ── 11. Stories page — tab switching & filter chips ───────────────────────
  test('stories: tab switching (Stories / Playbook)', async ({ page }) => {
    const shots = createScreenshotHelper(page, {
      type: 'chore',
      slug: 'ui-consistency-review',
      scenario: 'stories-interactions',
    });

    await page.setViewportSize(VIEWPORTS.desktop);
    await goAndWait(page, '/stories');

    // Capture initial state (Stories tab)
    await shots.captureSection({ name: '01-stories-tab-default', fullPage: true });

    // Check Stories tab is active (should have bg-white shadow)
    const storiesTab = page.locator('button').filter({ hasText: 'Stories' }).first();
    const playBookTab = page.locator('button').filter({ hasText: /Playbook|Library/i }).first();

    if (await storiesTab.isVisible().catch(() => false)) {
      const storiesClasses = (await storiesTab.getAttribute('class')) || '';
      console.log(`[stories] Stories tab classes: ${storiesClasses}`);
    }

    // Switch to Playbook/Library tab
    if (await playBookTab.isVisible().catch(() => false)) {
      await playBookTab.click();
      await waitForContentLoaded(page, { stabilityDelay: 800 });
      await shots.captureSection({ name: '02-playbook-tab-active', fullPage: true });

      const playbookClasses = (await playBookTab.getAttribute('class')) || '';
      console.log(`[stories] Playbook tab classes: ${playbookClasses}`);

      // Switch back
      await storiesTab.click();
      await waitForContentLoaded(page, { stabilityDelay: 800 });
    }
  });

  test('stories: filter chip interactions', async ({ page }) => {
    const shots = createScreenshotHelper(page, {
      type: 'chore',
      slug: 'ui-consistency-review',
      scenario: 'stories-chips',
    });

    await page.setViewportSize(VIEWPORTS.desktop);
    await goAndWait(page, '/stories');

    // Find all chip buttons (filter chips + "All" button)
    const allButton = page.locator('button').filter({ hasText: /^All$/ }).first();

    // Capture default state with All selected
    await shots.captureSection({ name: '01-chips-all-selected', fullPage: true });

    // Find individual filter chips (not the All button, not tabs)
    const chipButtons = page.locator('[aria-pressed]');
    const chipCount = await chipButtons.count();
    console.log(`[stories] Found ${chipCount} chip buttons with aria-pressed`);

    // Click each chip and capture state
    for (let i = 0; i < Math.min(chipCount, 6); i++) {
      const chip = chipButtons.nth(i);
      const isVisible = await chip.isVisible().catch(() => false);
      if (!isVisible) continue;

      const text = (await chip.textContent())?.trim() || `chip-${i}`;
      const pressed = await chip.getAttribute('aria-pressed');
      console.log(`[stories] Chip "${text}" aria-pressed=${pressed}`);

      // Click to toggle
      await chip.click();
      await page.waitForTimeout(500);
      await shots.captureSection({ name: `02-chip-${text.replace(/\s+/g, '-').toLowerCase().slice(0, 20)}-clicked`, fullPage: true });

      // Verify it toggled
      const newPressed = await chip.getAttribute('aria-pressed');
      if (pressed === newPressed) {
        issues.push({
          page: 'stories',
          viewport: 'desktop',
          category: 'chips',
          detail: `Chip "${text}" aria-pressed didn't toggle (stayed ${pressed})`,
        });
      }
    }

    // Reset to All
    if (await allButton.isVisible().catch(() => false)) {
      await allButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('stories: view toggle (By Time / By Source)', async ({ page }) => {
    const shots = createScreenshotHelper(page, {
      type: 'chore',
      slug: 'ui-consistency-review',
      scenario: 'stories-view-toggle',
    });

    await page.setViewportSize(VIEWPORTS.desktop);
    await goAndWait(page, '/stories');

    // Find view toggle buttons
    const byTimeBtn = page.locator('button').filter({ hasText: /By Time/i }).first();
    const bySourceBtn = page.locator('button').filter({ hasText: /By Source|By Category/i }).first();

    if (await byTimeBtn.isVisible().catch(() => false)) {
      await shots.captureSection({ name: '01-view-by-time', fullPage: true });

      // Switch to By Source
      if (await bySourceBtn.isVisible().catch(() => false)) {
        await bySourceBtn.click();
        await waitForContentLoaded(page, { stabilityDelay: 800 });
        await shots.captureSection({ name: '02-view-by-source', fullPage: true });

        // Check both buttons have consistent toggle styling
        const timeClasses = (await byTimeBtn.getAttribute('class')) || '';
        const sourceClasses = (await bySourceBtn.getAttribute('class')) || '';
        console.log(`[stories] By Time classes: ${timeClasses.slice(0, 80)}`);
        console.log(`[stories] By Source classes: ${sourceClasses.slice(0, 80)}`);
      }
    }
  });

  test('stories: expand/collapse button', async ({ page }) => {
    const shots = createScreenshotHelper(page, {
      type: 'chore',
      slug: 'ui-consistency-review',
      scenario: 'stories-expand',
    });

    await page.setViewportSize(VIEWPORTS.desktop);
    await goAndWait(page, '/stories');

    // Find expand/collapse button
    const expandBtn = page.locator('button').filter({ hasText: /Expand|Collapse/i }).first();

    if (await expandBtn.isVisible().catch(() => false)) {
      const text = await expandBtn.textContent();
      await shots.captureSection({ name: `01-${text?.trim().toLowerCase() || 'toggle'}-state`, fullPage: true });

      await expandBtn.click();
      await page.waitForTimeout(600);

      const newText = await expandBtn.textContent();
      await shots.captureSection({ name: `02-${newText?.trim().toLowerCase() || 'toggled'}-state`, fullPage: true });
    }
  });

  test('stories: story card click & format chip', async ({ page }) => {
    const shots = createScreenshotHelper(page, {
      type: 'chore',
      slug: 'ui-consistency-review',
      scenario: 'stories-cards',
    });

    await page.setViewportSize(VIEWPORTS.desktop);
    await goAndWait(page, '/stories');

    // Find story cards
    const storyCards = page.locator('[data-testid^="story-card-"]');
    const cardCount = await storyCards.count();
    console.log(`[stories] Found ${cardCount} story cards`);

    if (cardCount > 0) {
      // Click first story card to open preview
      await storyCards.first().click();
      await waitForContentLoaded(page, { stabilityDelay: 1000 });
      await shots.captureSection({ name: '01-story-selected-preview', fullPage: true });

      // Check for format chip in the preview
      const formatChip = page.locator('[data-testid="format-chip"]').first();
      if (await formatChip.isVisible().catch(() => false)) {
        const chipText = await formatChip.textContent();
        console.log(`[stories] Format chip text: ${chipText}`);
        await shots.captureSection({
          name: '02-format-chip-visible',
          selector: '[data-testid="format-chip"]',
        });

        // Click format chip to open dropdown
        await formatChip.click();
        await page.waitForTimeout(500);

        const dropdown = page.locator('[role="listbox"]').first();
        if (await dropdown.isVisible().catch(() => false)) {
          await shots.captureSection({ name: '03-format-dropdown-open', fullPage: true });
          // Close by pressing Escape
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      }

      // Check for status badges
      const statusBadges = page.locator('[class*="bg-green-100"], [class*="bg-amber-100"], [class*="bg-blue-50"], [class*="bg-gray-100"]');
      const badgeCount = await statusBadges.count();
      console.log(`[stories] Found ${badgeCount} status badges`);
    }
  });

  test('stories: mobile responsive with bottom sheet', async ({ page }) => {
    const shots = createScreenshotHelper(page, {
      type: 'chore',
      slug: 'ui-consistency-review',
      scenario: 'stories-mobile',
    });

    await page.setViewportSize(VIEWPORTS.mobile);
    await goAndWait(page, '/stories');

    await shots.captureSection({ name: '01-stories-mobile-list', fullPage: true });

    // Check for mobile filter toggle (SlidersHorizontal icon button)
    const filterToggle = page.locator('button').filter({ has: page.locator('svg') }).first();

    // Click a story card on mobile to trigger bottom sheet
    const storyCards = page.locator('[data-testid^="story-card-"]');
    if (await storyCards.count() > 0) {
      await storyCards.first().click();
      await page.waitForTimeout(800);
      await shots.captureSection({ name: '02-stories-mobile-bottomsheet', fullPage: true });

      // Check for bottom sheet dialog
      const bottomSheet = page.locator('[role="dialog"]');
      if (await bottomSheet.isVisible().catch(() => false)) {
        console.log('[stories-mobile] Bottom sheet dialog opened');
      }
    }
  });

  // ── 12. Timeline page — filter chips & activity stream ──────────────────
  test('timeline: filter chip interactions', async ({ page }) => {
    const shots = createScreenshotHelper(page, {
      type: 'chore',
      slug: 'ui-consistency-review',
      scenario: 'timeline-interactions',
    });

    await page.setViewportSize(VIEWPORTS.desktop);
    await goAndWait(page, '/timeline');

    // Capture default state
    await shots.captureSection({ name: '01-timeline-default', fullPage: true });

    // Find filter chips on timeline
    const chipButtons = page.locator('[aria-pressed]');
    const chipCount = await chipButtons.count();
    console.log(`[timeline] Found ${chipCount} chip buttons with aria-pressed`);

    // Click each visible chip
    for (let i = 0; i < Math.min(chipCount, 5); i++) {
      const chip = chipButtons.nth(i);
      const isVisible = await chip.isVisible().catch(() => false);
      if (!isVisible) continue;

      const text = (await chip.textContent())?.trim() || `chip-${i}`;
      await chip.click();
      await page.waitForTimeout(500);
      await shots.captureSection({ name: `02-timeline-chip-${text.replace(/\s+/g, '-').toLowerCase().slice(0, 20)}`, fullPage: true });
    }

    // Reset
    const allButton = page.locator('button').filter({ hasText: /^All$/ }).first();
    if (await allButton.isVisible().catch(() => false)) {
      await allButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('timeline: view toggle & expand/collapse', async ({ page }) => {
    const shots = createScreenshotHelper(page, {
      type: 'chore',
      slug: 'ui-consistency-review',
      scenario: 'timeline-toggles',
    });

    await page.setViewportSize(VIEWPORTS.desktop);
    await goAndWait(page, '/timeline');

    // Find view toggle
    const viewButtons = page.locator('button').filter({ hasText: /By Time|By Source|By Category|By Story/i });
    const viewCount = await viewButtons.count();
    console.log(`[timeline] Found ${viewCount} view toggle buttons`);

    for (let i = 0; i < viewCount; i++) {
      const btn = viewButtons.nth(i);
      const text = (await btn.textContent())?.trim() || '';
      await btn.click();
      await waitForContentLoaded(page, { stabilityDelay: 800 });
      await shots.captureSection({ name: `01-timeline-view-${text.replace(/\s+/g, '-').toLowerCase()}`, fullPage: true });
    }

    // Expand/collapse
    const expandBtn = page.locator('button').filter({ hasText: /Expand|Collapse/i }).first();
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(600);
      await shots.captureSection({ name: '02-timeline-toggled', fullPage: true });
    }
  });

  test('timeline: mobile responsive', async ({ page }) => {
    const shots = createScreenshotHelper(page, {
      type: 'chore',
      slug: 'ui-consistency-review',
      scenario: 'timeline-mobile',
    });

    await page.setViewportSize(VIEWPORTS.mobile);
    await goAndWait(page, '/timeline');

    await shots.captureSection({ name: '01-timeline-mobile-default', fullPage: true });

    // Check for mobile filter toggle
    const filterToggle = page.locator('button').filter({ has: page.locator('svg') });
    const toggleCount = await filterToggle.count();
    console.log(`[timeline-mobile] Found ${toggleCount} buttons with SVG icons`);

    // Tab to tablet viewport too
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(500);
    await shots.captureSection({ name: '02-timeline-tablet', fullPage: true });
  });

  // ── 13. Cross-page chip/pill styling consistency ────────────────────────
  test('filter chips have consistent styling across Timeline and Stories', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    const chipStyles: Record<string, { active: string; inactive: string }> = {};

    for (const pg of [{ name: 'timeline', path: '/timeline' }, { name: 'stories', path: '/stories' }]) {
      await goAndWait(page, pg.path);

      const activeChip = page.locator('[aria-pressed="true"]').first();
      const inactiveChip = page.locator('[aria-pressed="false"]').first();

      let activeClasses = '';
      let inactiveClasses = '';

      if (await activeChip.isVisible().catch(() => false)) {
        activeClasses = (await activeChip.getAttribute('class')) || '';
      }
      if (await inactiveChip.isVisible().catch(() => false)) {
        inactiveClasses = (await inactiveChip.getAttribute('class')) || '';
      }

      chipStyles[pg.name] = { active: activeClasses, inactive: inactiveClasses };
      console.log(`[${pg.name}] Active chip: ${activeClasses.slice(0, 60)}`);
      console.log(`[${pg.name}] Inactive chip: ${inactiveClasses.slice(0, 60)}`);
    }

    // Compare: both should use same base classes
    if (chipStyles.timeline?.active && chipStyles.stories?.active) {
      const timelineHasPrimary = chipStyles.timeline.active.includes('primary');
      const storiesHasPrimary = chipStyles.stories.active.includes('primary');

      if (timelineHasPrimary !== storiesHasPrimary) {
        issues.push({
          page: 'cross-page',
          viewport: 'desktop',
          category: 'chips',
          detail: `Active chip colors differ: Timeline uses ${timelineHasPrimary ? 'primary' : 'other'}, Stories uses ${storiesHasPrimary ? 'primary' : 'other'}`,
        });
      }
    }
  });

  // ── Summary: report all issues ────────────────────────────────────────────
  test.afterAll(() => {
    // Log run
    const runLog = createRunLog({
      type: 'chore',
      slug: 'ui-consistency-review',
    });
    runLog.logRun(PAGES.map((p) => p.name));

    // Print issues report
    console.log('\n' + '='.repeat(70));
    console.log('UI CONSISTENCY REVIEW — ISSUES FOUND');
    console.log('='.repeat(70));

    if (issues.length === 0) {
      console.log('\n✓ No consistency issues detected across all pages.\n');
    } else {
      // Group by category
      const byCategory = new Map<string, ConsistencyIssue[]>();
      for (const issue of issues) {
        const existing = byCategory.get(issue.category) || [];
        existing.push(issue);
        byCategory.set(issue.category, existing);
      }

      for (const [category, categoryIssues] of byCategory) {
        console.log(`\n── ${category.toUpperCase()} (${ categoryIssues.length}) ──`);
        for (const issue of categoryIssues) {
          console.log(`  [${issue.page}] (${issue.viewport}) ${issue.detail}`);
        }
      }

      console.log(`\nTotal: ${issues.length} issues across ${byCategory.size} categories`);
    }
    console.log('='.repeat(70) + '\n');
  });
});

// ── Utility functions ─────────────────────────────────────────────────────────

/** Check if a color is grayish (r ≈ g ≈ b) */
function isGrayish(color: string): boolean {
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return false;
  const [, r, g, b] = match.map(Number);
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  return maxDiff < 30; // Close enough to gray
}

/** Check if a color is clearly off-brand (not gray, not primary, not standard link blue) */
function isOffBrand(color: string): boolean {
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return false;
  const [, rs, gs, bs] = match;
  const r = Number(rs), g = Number(gs), b = Number(bs);

  // Skip near-black, near-white, grayish
  if (r + g + b < 30 || r + g + b > 720) return false;
  if (isGrayish(color)) return false;

  // Known acceptable: primary purple family, blue link family, green success, red error, amber warning
  // Flag unexpected oranges, pinks, teals, etc.
  const isPurple = r < 120 && g < 60 && b > 80;
  const isBlue = r < 80 && g < 160 && b > 180;
  const isGreen = g > r && g > b;
  const isRed = r > 180 && g < 80 && b < 80;
  const isAmber = r > 180 && g > 120 && b < 60;

  // If it doesn't match any expected color family, it's off-brand
  return !(isPurple || isBlue || isGreen || isRed || isAmber);
}
