# UX Testing Automation Guide

> Screenshot-based UX verification for InChronicle using Playwright

---

## Quick Reference

```bash
# Configure in .env.local:
# E2E_BASE_URL=https://inchronicle.com   (production)
# E2E_BASE_URL=http://localhost:5173     (local)

# Take screenshots
npm run screenshots

# Run with visible browser (debugging)
npm run test:e2e:headed

# All viewports (desktop, mobile, tablet)
npm run screenshots:all
```

---

## Local UI + Production API

For testing UI changes with real production data without running backend locally:

1. Copy `.env.example` to `.env.local`
2. Uncomment the `VITE_API_URL` line in Section 2
3. Run `npm run dev`

```bash
# .env.local
VITE_API_URL=https://ps-backend-1758551070.azurewebsites.net/api/v1
```

**Use cases:**
- Testing styling, alignment, responsive design
- Verifying component quality with real data
- Quick UI iteration without backend setup

**Warning:** This connects to PRODUCTION database. Changes you make (create, update, delete) affect real data. Use a test account.

---

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Taking Screenshots](#taking-screenshots)
4. [Writing Tests](#writing-tests)
5. [CD6 Verification Protocol](#cd6-verification-protocol)
6. [AI Agent Instructions](#ai-agent-instructions)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### What This Does

- Captures UI screenshots programmatically via Playwright
- Supports local dev, production, and staging environments
- Handles authentication for protected pages
- Organizes screenshots by feature/bugfix/chore type
- Integrates with CD6 Design-UX verification workflow

### Architecture

```
playwright.config.ts          # Environment config (URL, projects)
        │
        ▼
e2e/*.spec.ts                 # Test files
        │
        ├── utils/auth-helper.ts      # Login handling
        ├── utils/screenshot-helper.ts # Capture utilities
        └── utils/wait-helper.ts      # Content loading
        │
        ▼
__docs/<type>/<slug>/*.png    # Output screenshots (gitignored)
```

### File Locations

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Base URL, browser projects, timeouts |
| `e2e/authenticated.spec.ts` | Tests for logged-in pages |
| `e2e/example.spec.ts` | Tests for public pages |
| `e2e/utils/` | Shared helpers |
| `e2e/.env.e2e` | Credentials (gitignored) |
| `src/utils/screenshot-markers.ts` | React component markers |

---

## Setup

### Prerequisites

```bash
# Install Playwright (already in devDependencies)
npm install

# Install browser
npx playwright install chromium
```

### Credentials

Copy `.env.example` to `.env.local` and uncomment Section 3:

```bash
# .env.local
E2E_EMAIL=your-email@inchronicle.com
E2E_PASSWORD=your-password
```

**Security:** `.env.local` is gitignored. Never commit credentials.

### Verify Setup

```bash
# List available tests
npx playwright test --list

# Run one test to verify
npm run test:e2e:prod -- -g "landing"
```

---

## Taking Screenshots

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all E2E tests |
| `npm run test:e2e:ui` | Interactive Playwright UI mode |
| `npm run test:e2e:headed` | Run with visible browser |
| `npm run screenshots` | Desktop screenshots |
| `npm run screenshots:mobile` | Mobile viewport |
| `npm run screenshots:all` | All viewports |

### Target URL Configuration

Set `E2E_BASE_URL` in `.env.local`:

```bash
# Production
E2E_BASE_URL=https://inchronicle.com

# Local (requires npm run dev)
E2E_BASE_URL=http://localhost:5173
```

Or override via CLI:
```bash
BASE_URL=https://staging.inchronicle.com npm run test:e2e
```

### Output Location

Screenshots save to:
```
__docs/<type>/<slug>/<name>-<env>.png
```

Example:
```
__docs/feature/workspace-list-improvements/dashboard-prod.png
```

---

## Writing Tests

### Basic Public Page

```typescript
import { test } from '@playwright/test';
import { createScreenshotHelper } from './utils/screenshot-helper';

test('capture homepage', async ({ page }) => {
  const screenshots = createScreenshotHelper(page, {
    type: 'feature',
    slug: 'my-feature',
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await screenshots.captureSection({
    name: 'homepage',
    fullPage: true,
  });
});
```

### Authenticated Page

```typescript
import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from './utils/screenshot-helper';
import { login } from './utils/auth-helper';
import { waitForContentLoaded } from './utils/wait-helper';

// Run sequentially to avoid auth conflicts
test.describe.configure({ mode: 'serial' });
test.setTimeout(60000);

test.describe('Dashboard Screenshots', () => {
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
    await waitForContentLoaded(page);

    await screenshots.captureSection({
      name: 'dashboard',
      fullPage: true,
    });
  });
});
```

### Responsive Screenshots

```typescript
test('capture responsive views', async ({ page }) => {
  const screenshots = createScreenshotHelper(page, {
    type: 'feature',
    slug: 'my-feature',
  });

  await page.goto('/workspaces');
  await page.waitForLoadState('networkidle');

  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(500);
  await screenshots.captureSection({ name: 'mobile', fullPage: true });

  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await screenshots.captureSection({ name: 'tablet', fullPage: true });

  // Desktop
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);
  await screenshots.captureSection({ name: 'desktop', fullPage: true });
});
```

### Section-Specific Screenshots

In React component:
```tsx
import { screenshotSection } from '@/utils/screenshot-markers';

<div {...screenshotSection('workspace-header')}>
  <h1>Workspaces</h1>
</div>
```

In test:
```typescript
await screenshots.captureSection({
  name: 'workspace-header',
  section: 'workspace-header',  // matches data-screenshot-section
});
```

---

## CD6 Verification Protocol

After tests pass, verify screenshots manually:

### Step-by-Step

```bash
# 1. List captured screenshots
ls __docs/feature/<slug>/

# 2. For each .png file (without 'verified_' prefix):
#    a. Open and inspect visually
#    b. Check: Does it show correct content? Layout OK?

# 3. If issues found:
#    - Fix the code
#    - Re-run tests
#    - Restart verification

# 4. If screenshot is correct:
mv <name>.png verified_<name>.png

# 5. After ALL renamed, do NOT claim completion yet
# 6. Let NEXT iteration confirm all verified
```

### Why Two Iterations?

The iteration that renames files ≠ the iteration that claims completion.

This ensures:
- Fresh filesystem state check
- No false positives from assumed state
- Audit trail of verification

---

## AI Agent Instructions

### For Claude/AI Assistants

When asked to capture UX screenshots:

```
1. SETUP CHECK
   - Verify e2e/.env.e2e exists with credentials
   - Run: npx playwright test --list

2. CAPTURE SCREENSHOTS
   - Run: npm run screenshots:prod
   - Or specific: npm run test:e2e:prod -- -g "test-name"

3. VERIFY OUTPUT
   - Run: ls __docs/feature/<slug>/
   - Read each .png file to verify content

4. FOLLOW CD6 PROTOCOL
   - For each unverified screenshot:
     a. Read the image
     b. Assess: "Shows [description]. [OK/ISSUE: detail]"
     c. If OK: mv <name>.png verified_<name>.png
   - Do NOT claim completion after renaming
   - Let next iteration confirm

5. REPORT
   - List all screenshots taken
   - Note any issues found
   - Provide verification status
```

### Example AI Workflow

```
User: "Take screenshots of the workspace page on production"

AI Actions:
1. Run: npm run test:e2e:prod -- -g "workspace"
2. Run: ls __docs/feature/workspace-list-improvements/
3. Read: __docs/feature/.../workspaces-authenticated-prod.png
4. Assess: "Shows workspace list with nav header. Content area empty (expected for new user). ✓"
5. Run: mv workspaces-authenticated-prod.png verified_workspaces-authenticated-prod.png
6. Report: "Screenshot captured and verified. Workspace list displays correctly."
```

### Creating New Test Files

When AI needs to add new screenshot tests:

```typescript
// Template for new authenticated test
import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from './utils/screenshot-helper';
import { login } from './utils/auth-helper';
import { waitForContentLoaded } from './utils/wait-helper';

const ENV = process.env.BASE_URL?.includes('inchronicle.com') ? 'prod' : 'local';

test.describe.configure({ mode: 'serial' });
test.setTimeout(60000);

test.describe('My Feature Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    expect(page.url()).not.toContain('/login');
  });

  test('capture feature page', async ({ page }) => {
    const screenshots = createScreenshotHelper(page, {
      type: 'feature',          // or 'bugfix', 'chore'
      slug: 'feature-slug',     // kebab-case
    });

    await page.goto('/my-page');
    await page.waitForLoadState('networkidle');
    await waitForContentLoaded(page);

    await screenshots.captureSection({
      name: `my-page-${ENV}`,
      fullPage: true,
    });
  });
});
```

---

## Troubleshooting

### Login Fails / Timeout

**Symptoms:** Test hangs at login, times out after 30s

**Causes:**
- Wrong credentials in `.env.e2e`
- Rate limiting (too many parallel logins)
- Auth service down

**Fixes:**
```typescript
// Ensure serial execution
test.describe.configure({ mode: 'serial' });
test.setTimeout(60000);
```

### Screenshots Show Loading Spinners

**Symptoms:** Screenshot captures mid-load state

**Fix:** Use `waitForContentLoaded`:
```typescript
import { waitForContentLoaded } from './utils/wait-helper';

await page.goto('/page');
await page.waitForLoadState('networkidle');
await waitForContentLoaded(page);  // Waits for spinners to disappear
```

### Blank or White Screenshots

**Symptoms:** Screenshot is empty/white

**Causes:**
- Page redirected (auth failure)
- Content lazy-loaded and not waited for
- Wrong URL

**Fixes:**
```typescript
// Add assertion before capture
await expect(page.locator('h1, [data-testid="main"]')).toBeVisible();
```

### "Missing E2E credentials" Error

**Fix:** Create `e2e/.env.e2e`:
```bash
E2E_EMAIL=your-email@example.com
E2E_PASSWORD=your-password
```

### Tests Pass But No Screenshots

**Check:** Output directory exists and is not gitignored for the specific slug:
```bash
ls -la __docs/feature/your-slug/
```

---

## Best Practices

### DO

- Use `waitForContentLoaded()` after navigation
- Run authenticated tests with `mode: 'serial'`
- Include environment in filename: `name-${ENV}`
- Follow CD6 verification protocol before claiming done

### DON'T

- Don't use magic sleep values without explanation
- Don't run auth tests in parallel (rate limits)
- Don't commit `.env.e2e` or credentials
- Don't skip verification step

---

## Related Documentation

- [PR Documentation](__docs/feature/workspace-list-improvements/PR-playwright-screenshot-testing.md)
- [CD6 Screenshot Verification Protocol](ideapit.md#cd6-design-ux-screenshot-verification-protocol)
- [Playwright Docs](https://playwright.dev/docs/intro)
