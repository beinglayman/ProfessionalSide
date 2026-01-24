import { Page } from '@playwright/test';

/** Default timeout for waiting on spinners (ms) */
const DEFAULT_SPINNER_TIMEOUT_MS = 10000;

/** Default delay for UI to stabilize after spinners disappear (ms) */
const DEFAULT_STABILITY_DELAY_MS = 1500;

/** Default timeout for element visibility (ms) */
const DEFAULT_ELEMENT_TIMEOUT_MS = 10000;

/** CSS selectors for common loading indicators */
const LOADING_INDICATOR_SELECTORS =
  '[class*="animate-spin"], [class*="loading"], .spinner, [class*="skeleton"]';

/**
 * Wait for page content to fully load
 *
 * Waits for loading indicators (spinners, skeleton loaders) to disappear,
 * then adds a stability delay for animations to complete.
 *
 * @param page - Playwright page
 * @param options - Optional configuration
 */
export async function waitForContentLoaded(
  page: Page,
  options: {
    /** Max time to wait for spinners to disappear (ms) */
    spinnerTimeout?: number;
    /** Additional delay after spinners gone (ms) */
    stabilityDelay?: number;
  } = {}
): Promise<void> {
  const {
    spinnerTimeout = DEFAULT_SPINNER_TIMEOUT_MS,
    stabilityDelay = DEFAULT_STABILITY_DELAY_MS,
  } = options;

  // Wait for loading indicators to disappear
  await page
    .waitForFunction(
      (selectors) => {
        const spinners = document.querySelectorAll(selectors);
        return spinners.length === 0;
      },
      LOADING_INDICATOR_SELECTORS,
      { timeout: spinnerTimeout }
    )
    .catch(() => {
      // Log warning but don't fail - content may still be usable
      console.warn(
        `Warning: Timed out waiting for spinners after ${spinnerTimeout}ms`
      );
    });

  // Allow animations to complete
  await page.waitForTimeout(stabilityDelay);
}

/**
 * Wait for a specific element to be visible and stable
 *
 * @param page - Playwright page
 * @param selector - CSS selector or data-testid
 * @param timeout - Max wait time (ms)
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = DEFAULT_ELEMENT_TIMEOUT_MS
): Promise<boolean> {
  try {
    await page.locator(selector).waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}
