# PR: Playwright Screenshot Testing Setup

**Branch:** `feature/playwright-screenshot-testing`
**Date:** 2026-01-24
**Type:** Feature

---

## Summary

Added Playwright E2E testing infrastructure focused on screenshot capture for UX verification. Supports both local development and production URL testing with authenticated sessions.

## Problem

- No way to programmatically capture UI screenshots for documentation
- Manual screenshot process is error-prone and inconsistent
- No visual regression baseline for UX changes
- Needed integration with CD6 Design-UX Screenshot Verification Protocol

## Solution

Implemented Playwright-based screenshot testing with:
- Configurable base URL (local/prod/staging)
- Authenticated session support via environment variables
- Screenshot storage organized by type/slug pattern
- Helper utilities for consistent screenshot capture

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright configuration with multi-environment support |
| `e2e/utils/screenshot-helper.ts` | Screenshot capture utilities and verification protocol |
| `e2e/utils/auth-helper.ts` | Login/authentication helpers for E2E tests |
| `e2e/utils/index.ts` | Utility exports |
| `e2e/example.spec.ts` | Example public page tests |
| `e2e/authenticated.spec.ts` | Authenticated page screenshot tests |
| `e2e/.env.example` | Template for credentials |
| `e2e/.env.e2e` | Actual credentials (gitignored) |
| `src/utils/screenshot-markers.ts` | React component markers for section targeting |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Added Playwright scripts and devDependencies |
| `.gitignore` | Added Playwright artifacts and auth state |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SCREENSHOT TESTING FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │   Config     │     │    Tests     │     │   Helpers    │        │
│  │              │     │              │     │              │        │
│  │ playwright   │────▶│ *.spec.ts    │────▶│ screenshot-  │        │
│  │ .config.ts   │     │              │     │ helper.ts    │        │
│  │              │     │              │     │              │        │
│  │ BASE_URL     │     │ login()      │     │ capture      │        │
│  │ IS_PROD      │     │ capture()    │     │ Section()    │        │
│  └──────────────┘     └──────────────┘     └──────────────┘        │
│         │                    │                    │                  │
│         │                    │                    ▼                  │
│         │                    │           ┌──────────────┐           │
│         │                    │           │  __docs/     │           │
│         │                    │           │  <type>/     │           │
│         │                    └──────────▶│  <slug>/     │           │
│         │                                │  *.png       │           │
│         │                                └──────────────┘           │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     ENVIRONMENTS                              │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  Local:  http://localhost:5173  (starts dev server)          │   │
│  │  Prod:   https://inchronicle.com (no server needed)          │   │
│  │  Custom: BASE_URL=https://staging... (any URL)               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Usage

### Quick Start

```bash
# Install (already done)
npm install -D @playwright/test dotenv
npx playwright install chromium

# Run against local dev server
npm run test:e2e

# Run against production
npm run test:e2e:prod

# Run with visible browser
npm run test:e2e:prod:headed
```

### NPM Scripts

| Script | Description |
|--------|-------------|
| `test:e2e` | Run all E2E tests against localhost |
| `test:e2e:ui` | Interactive Playwright UI mode |
| `test:e2e:headed` | Run with visible browser |
| `test:e2e:prod` | Run against https://inchronicle.com |
| `test:e2e:prod:headed` | Production with visible browser |
| `screenshots:prod` | Desktop screenshots on prod |
| `screenshots:mobile` | Mobile viewport on prod |
| `screenshots:all` | All viewports on prod |

### Custom URL

```bash
BASE_URL=https://staging.inchronicle.com npm run test:e2e
```

---

## Credentials Setup

1. Copy the example file:
   ```bash
   cp e2e/.env.example e2e/.env.e2e
   ```

2. Edit with your credentials:
   ```
   E2E_EMAIL=your-email@example.com
   E2E_PASSWORD=your-password
   ```

3. **Security**: `.env.e2e` is gitignored. Never commit credentials.

---

## Screenshot Storage

Screenshots are stored following the pattern:

```
__docs/<type>/<slug>/<name>-<env>.png
```

**Example:**
```
__docs/
└── feature/
    └── workspace-list-improvements/
        ├── dashboard-prod.png
        ├── workspaces-authenticated-prod.png
        ├── workspaces-auth-mobile-prod.png
        └── journal-list-prod.png
```

**Types:**
- `feature` - New feature documentation
- `bugfix` - Bug fix verification
- `chore` - Maintenance/refactoring

---

## CD6 Screenshot Verification Protocol

After tests pass, follow this verification workflow:

```
1. List screenshots:
   ls __docs/feature/<slug>/

2. For each .png WITHOUT 'verified_' prefix:
   a. View the screenshot
   b. Assess: Does it show correct content?
   c. If issues → fix code, re-run tests
   d. If OK → mv <name>.png verified_<name>.png

3. After renaming ALL → do NOT claim completion

4. Let NEXT iteration confirm all verified
```

**Why wait?** The iteration that renames files ≠ the iteration that claims completion. This ensures completion is based on observed state, not assumed state.

---

## Writing New Tests

### Basic Screenshot Test

```typescript
import { test } from '@playwright/test';
import { createScreenshotHelper } from './utils/screenshot-helper';

test('capture my-page', async ({ page }) => {
  const screenshots = createScreenshotHelper(page, {
    type: 'feature',
    slug: 'my-feature-name',
  });

  await page.goto('/my-page');
  await page.waitForLoadState('networkidle');

  await screenshots.captureSection({
    name: 'my-page-full',
    fullPage: true,
  });
});
```

### Authenticated Test

```typescript
import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from './utils/screenshot-helper';
import { login } from './utils/auth-helper';

test.describe('Authenticated Tests', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await login(page);
    expect(page.url()).not.toContain('/login');
  });

  test('capture dashboard', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',
      slug: 'my-feature',
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await page.waitForTimeout(1500);

    await screenshots.captureSection({
      name: 'dashboard',
      fullPage: true,
    });
  });
});
```

### Targeting Specific Sections

In your React components:
```tsx
import { screenshotSection } from '@/utils/screenshot-markers';

<div {...screenshotSection('workspace-header')}>
  <h1>Workspaces</h1>
</div>
```

In your test:
```typescript
await screenshots.captureSection({
  name: 'workspace-header',
  section: 'workspace-header',  // matches data-screenshot-section
});
```

---

## Troubleshooting

### Tests timeout on login

**Cause:** Parallel tests hitting rate limits or session conflicts.

**Fix:** Run authenticated tests sequentially:
```typescript
test.describe.configure({ mode: 'serial' });
test.setTimeout(60000);
```

### Screenshots show loading spinners

**Cause:** Content hasn't finished loading.

**Fix:** Wait for spinners to disappear:
```typescript
await page.waitForFunction(() => {
  const spinners = document.querySelectorAll('[class*="animate-spin"]');
  return spinners.length === 0;
}, { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1500);
```

### "Missing E2E credentials" error

**Cause:** Environment variables not set.

**Fix:** Create `e2e/.env.e2e` with credentials (see Credentials Setup).

### Blank screenshots

**Cause:** Page redirected or auth failed silently.

**Fix:** Add assertions to verify page state before capture:
```typescript
await expect(page.locator('h1')).toBeVisible();
```

---

## Dependencies Added

```json
{
  "devDependencies": {
    "@playwright/test": "^1.58.0",
    "dotenv": "^17.2.3"
  }
}
```

---

## Future Improvements

1. **Visual regression testing** - Compare screenshots against baselines
2. **Auth state persistence** - Reuse login across tests (Playwright storageState)
3. **CI integration** - Run on PR merge
4. **Slack notifications** - Post screenshots to channel on deploy

---

## Related

- [CD6 Screenshot Verification Protocol](../../ideapit/ideapit.md#cd6-design-ux-screenshot-verification-protocol)
- [L3-DEEP-DIVES/TESTING](../L3-DEEP-DIVES/) (future)
