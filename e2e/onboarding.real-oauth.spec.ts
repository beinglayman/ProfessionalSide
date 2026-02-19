import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { getRealOAuthCredentials, login } from './utils/auth-helper';
import { waitForContentLoaded } from './utils/wait-helper';
import {
  assertRealOAuthReadiness,
  disableDemoMode,
  getAccessTokenFromPage,
  getRequiredRealTools,
  isRealOAuthEnabled,
} from './utils/real-oauth-helper';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

const REAL_OAUTH_ENABLED = isRealOAuthEnabled();
const REQUIRED_TOOLS = getRequiredRealTools();

async function goToOnboardingStep2IfNeeded(page: Page): Promise<boolean> {
  await page.goto('/onboarding');
  await page.waitForLoadState('networkidle');
  await waitForContentLoaded(page, { stabilityDelay: 500 });

  if (!page.url().includes('/onboarding')) {
    return false;
  }

  const step2Heading = page.getByText('Connect your work tools');
  if (await step2Heading.isVisible().catch(() => false)) {
    return true;
  }

  const nameField = page.getByLabel(/Full Name/);
  if (await nameField.isVisible().catch(() => false)) {
    if (!(await nameField.inputValue()).trim()) {
      await nameField.fill('E2E Real OAuth User');
    }

    const roleSelect = page.getByLabel(/Role/);
    await roleSelect.selectOption('Developer');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(1000);
    await waitForContentLoaded(page, { stabilityDelay: 500 });
    return true;
  }

  return false;
}

async function ensureRealOAuthReadinessForLoggedInUser(
  page: Page,
  request: APIRequestContext
): Promise<void> {
  const accessToken = await getAccessTokenFromPage(page);
  await assertRealOAuthReadiness({
    request,
    accessToken,
    requiredTools: REQUIRED_TOOLS,
  });
}

test.describe('Onboarding with Real OAuth @real-oauth', () => {
  test.skip(
    !REAL_OAUTH_ENABLED,
    'Set E2E_REAL_OAUTH=true to run real-provider onboarding tests.'
  );

  test.beforeEach(async ({ page }) => {
    await login(page, getRealOAuthCredentials());
    await disableDemoMode(page);
  });

  test('preflight: required provider integrations are connected and valid', async ({
    page,
    request,
  }) => {
    await ensureRealOAuthReadinessForLoggedInUser(page, request);
  });

  test('can complete onboarding and hit live sync with real integrations', async ({
    page,
    request,
  }) => {
    await ensureRealOAuthReadinessForLoggedInUser(page, request);

    const onboardingVisible = await goToOnboardingStep2IfNeeded(page);

    if (onboardingVisible) {
      const getStartedButton = page.getByRole('button', { name: /get started/i });
      await expect(getStartedButton).toBeVisible();
      await expect(getStartedButton).toBeEnabled({ timeout: 15000 });

      await getStartedButton.click();
      await page
        .waitForURL((url) => !url.pathname.includes('/onboarding'), { timeout: 20000 })
        .catch(() => null);
    }

    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);
    await disableDemoMode(page);

    const syncButton = page.getByRole('button', { name: /sync/i });
    await expect(syncButton).toBeVisible();

    const liveSyncRequestPromise = page
      .waitForRequest((req) => req.url().includes('/mcp/sync-and-persist'), {
        timeout: 15000,
      })
      .catch(() => null);

    const liveSyncResponsePromise = page
      .waitForResponse((res) => res.url().includes('/mcp/sync-and-persist'), {
        timeout: 60000,
      })
      .catch(() => null);

    await syncButton.click();

    const liveSyncRequest = await liveSyncRequestPromise;
    expect(liveSyncRequest).not.toBeNull();

    const liveSyncResponse = await liveSyncResponsePromise;
    expect(liveSyncResponse).not.toBeNull();

    if (liveSyncResponse) {
      expect([200, 400]).toContain(liveSyncResponse.status());
    }
  });
});
