/**
 * Peer validation end-to-end spec.
 *
 * Prerequisite: run `npm run --prefix backend seed:validation-e2e` against
 * the same database the app is connected to. That script creates:
 *   - two users with deterministic credentials (see constants below)
 *   - one published story with 4 sections
 *   - validations in mixed states:
 *       situation -> APPROVED
 *       task      -> PENDING (stale, 4 days old)
 *       action    -> EDIT_SUGGESTED
 *       result    -> PENDING (fresh)
 *   - one external invite for an unknown email
 *
 * What this spec covers (in one happy-path journey - the cheapest way to
 * catch the most regressions):
 *   1. Validator logs in, sees pending work in /me/validations.
 *   2. Validator opens the story, approves the 'result' section.
 *   3. Author logs in, opens the story, sees the ValidationStatsStrip
 *      with the updated count of co-signed sections.
 *
 * What it does NOT cover (by design - each deserves its own spec):
 *   - Edit-suggestion accept/reject flow (Ship 3.3)
 *   - Edit-invalidation cascade (Ship 3.4)
 *   - External invite signup flow (Ship 4.2)
 *   - Reminder cron (direct service call, not a UI flow)
 */

import { test, expect, Page } from '@playwright/test';
import { login } from './utils/auth-helper';

// Deterministic fixtures - kept in sync with backend/scripts/seed-validation-e2e.ts.
const E2E_AUTHOR_EMAIL = 'e2e-story-author@inchronicle.test';
const E2E_VALIDATOR_EMAIL = 'e2e-story-validator@inchronicle.test';
const E2E_PASSWORD = 'E2eTestPassword123!';
const STORY_ID = 'e2e-story-validation-flow';

// Login helper that accepts explicit creds rather than reading env.
async function loginAs(page: Page, email: string) {
  await login(page, { email, password: E2E_PASSWORD });
}

// Logout is not exposed via a shared helper yet; clearing storage is
// the lowest-friction way to reset the Playwright auth state between
// the validator-acting and author-acting halves of the journey.
async function clearSession(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      // Some origins block storage access; ignore.
    }
  });
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(90000);

test.describe('Peer validation happy path', () => {
  test('validator approves a section; author sees stats update', async ({ page }) => {
    // -------------------------------------------------------------------
    // Part 1 - validator side
    // -------------------------------------------------------------------
    await loginAs(page, E2E_VALIDATOR_EMAIL);

    // The validator's inbox should show at least one pending item for
    // the seeded story.
    await page.goto('/me/validations');
    await page.waitForLoadState('networkidle');

    // The inbox renders a card per pending/recent validation with the
    // story title front-and-center. Use a forgiving match so the test
    // survives small copy changes.
    const inboxCard = page
      .locator('a, [role="link"], article, div')
      .filter({ hasText: /Recovered the payments pipeline/i })
      .first();
    await expect(inboxCard).toBeVisible();

    // Jump straight to the validator view for the seeded story rather
    // than trying to click through the inbox - inbox layout is still
    // evolving and link-selector brittleness isn't what we're testing.
    await page.goto(`/validate/${STORY_ID}`);
    await page.waitForLoadState('networkidle');

    // The validator page exposes one action bar per section they're
    // assigned to. Seed state gives them pending on 'task' and 'result'.
    // Approve the fresh 'result' section (the other pending, 'task', is
    // kept stale for the reminder-cron scenario to use).
    const resultSection = page.locator('section[data-section-key="result"]');
    await expect(resultSection).toBeVisible();
    await resultSection.getByRole('button', { name: /^approve$/i }).click();

    // Wait for the mutation to resolve. After approve the button flips
    // to a disabled/checked state or the section header picks up an
    // "Approved" badge. Match on either to stay robust.
    await expect(
      page.getByText(/approved/i).first(),
    ).toBeVisible({ timeout: 15000 });

    // -------------------------------------------------------------------
    // Part 2 - author side
    // -------------------------------------------------------------------
    await clearSession(page);
    await loginAs(page, E2E_AUTHOR_EMAIL);

    await page.goto(`/stories/${STORY_ID}`);
    await page.waitForLoadState('networkidle');

    // Turn Evidence on so the ValidationStatsStrip (author-only) renders.
    // The toggle sits in the story header; click it if it reads "Evidence
    // off" (i.e. currently off). If it's already on, this is a no-op.
    const evidenceToggle = page
      .getByRole('button', { name: /evidence (off|on)/i })
      .first();
    if (await evidenceToggle.isVisible().catch(() => false)) {
      const label = (await evidenceToggle.textContent())?.toLowerCase() || '';
      if (label.includes('off')) {
        await evidenceToggle.click();
        await page.waitForLoadState('networkidle');
      }
    }

    // The stats strip lives above the Tufte two-column layout. Seed
    // state now has 2 approvals across 4 sections (situation + result),
    // so the strip should read "2 of 4 sections co-signed".
    const statsStrip = page.getByText(/\d+ of \d+ sections? co-signed/i).first();
    await expect(statsStrip).toBeVisible({ timeout: 10000 });

    const stripText = (await statsStrip.textContent()) || '';
    const match = stripText.match(/(\d+)\s+of\s+(\d+)/i);
    expect(match, `Expected "N of M co-signed" format, got: ${stripText}`).toBeTruthy();
    const [, coSigned, total] = match!;
    expect(Number(total)).toBe(4);
    // After this run there should be at least 2 approved sections
    // (situation was seeded approved, result we just approved).
    expect(Number(coSigned)).toBeGreaterThanOrEqual(2);
  });
});
