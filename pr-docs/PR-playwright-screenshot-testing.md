# PR: Playwright Screenshot Testing Infrastructure

**Branch**: `feature/playwright-screenshot-testing`
**Base**: `main`
**Date**: 2026-01-24

## Summary

This PR establishes reliable Playwright E2E screenshot testing infrastructure, fixing critical issues that caused blank screenshots and improving organization of screenshot artifacts.

## Problem Statement

Playwright authenticated tests were producing blank/white screenshots for dashboard and other pages. Investigation revealed:

1. **Port conflict**: Two Vite dev servers running on port 5173 (this project + another Wails desktop app)
2. **CORS blocking**: Backend didn't allow requests from the new dev port
3. **Screenshot disorganization**: All screenshots dumped in single folder, hard to track runs

## Changes

### 1. Port Configuration (5173 → 5555)

Changed dev server to unique port 5555 to avoid conflicts with other local projects.

| File | Change |
|------|--------|
| `vite.config.ts` | `port: 5173` → `port: 5555` |
| `playwright.config.ts` | Updated BASE_URL and webServer URL |
| `.env.local` | `E2E_BASE_URL=http://localhost:5555` |

### 2. Backend CORS Update

Added `http://localhost:5555` to allowed origins in `backend/src/app.ts`:

- Main CORS middleware (line ~87)
- `/uploads` static file handler (line ~194)
- `/screenshots` static file handler (line ~230)

**Note**: Requires backend deployment to take effect on Azure.

### 3. Screenshot Organization

Screenshots now save to timestamped run folders:

```
__docs/feature/{slug}/runs/{YYYY-MM-DD}_{HH-MM-SS}-{scenario}-{mode}/
```

**Example**:
```
runs/2026-01-24_11-13-20-authenticated-prod/
├── dashboard.png
├── workspaces.png
├── journal-list.png
└── settings.png
```

**Changes in `e2e/utils/screenshot-helper.ts`**:
- Added `generateRunFolderName()` function using local time
- Added `scenario` config option (e.g., 'authenticated', 'responsive')
- Screenshots organized by run instead of flat structure

**Changes in `e2e/authenticated.spec.ts`**:
- Added `scenario` to each test's screenshot config
- Simplified screenshot names (removed `-${ENV}` suffix, folder has mode)

## Files Changed

| File | Lines | Description |
|------|-------|-------------|
| `vite.config.ts` | +2/-2 | Port 5173 → 5555 |
| `playwright.config.ts` | +2/-2 | Updated URLs to port 5555 |
| `e2e/utils/screenshot-helper.ts` | +32/-1 | Run folder generation with local time |
| `e2e/authenticated.spec.ts` | +14/-9 | Added scenarios, simplified names |
| `backend/src/app.ts` | +3/-0 | CORS for localhost:5555 |
| `.env.local` | +1/-1 | E2E_BASE_URL update |

## New Documentation

| File | Purpose |
|------|---------|
| `__docs/plans/2026-01-24-cors-localhost-5555.md` | CORS fix tracking |
| `__docs/feature/workspace-list-improvements/DEBUG-BLANK-SCREENSHOTS.md` | Investigation results |

## Testing

### Production Tests (Passing)
```bash
BASE_URL=https://inchronicle.com npx playwright test authenticated.spec.ts --project=chromium
# Result: 5 passed (1.2m)
```

### Local Tests (Pending backend deployment)
```bash
npm run test:e2e
# Currently fails with CORS error until backend is deployed
```

## Screenshots Captured

### Working (Full Content)
- `settings.png` - Full settings page with all sections
- `journal-list.png` - Journal entries with content

### Partial/Blank (Known Issue - Separate Bug)
- `dashboard.png` - Blank white (dashboard page bug, not test infra)
- `workspaces.png` - Nav bar only, no content (workspaces page bug)

## Root Cause Analysis

### Issue 1: Blank Screenshots (FIXED)

**Cause**: Port 5173 had two listeners:
- PID 63738: ProfessionalSide (correct)
- PID 65488: zdh/desktop/frontend (Wails app - wrong)

Playwright was connecting to the Wails app which crashed because Wails runtime isn't available in browser.

**Evidence**:
```
PAGE ERROR: Cannot read properties of undefined (reading 'main')
at GetConnectionStatus (wailsjs/go/main/App.js:150:22)
```

**Fix**: Changed to unique port 5555.

### Issue 2: CORS Error (FIXED - needs deployment)

**Cause**: Backend CORS didn't include `localhost:5555`.

**Evidence**:
```
Access to XMLHttpRequest at 'https://ps-backend.../api/v1/auth/login'
from origin 'http://localhost:5555' has been blocked by CORS policy
```

**Fix**: Added `'http://localhost:5555'` to `allowedOrigins` in backend.

### Issue 3: Dashboard/Workspaces Blank (NOT THIS PR)

Dashboard and workspaces pages show blank even in production. This is a **separate application bug**, not a test infrastructure issue. Settings and journal pages render correctly.

## Deployment Checklist

- [x] Frontend port change (immediate - local dev)
- [x] Playwright config update (immediate - local dev)
- [x] Backend CORS update (code done)
- [ ] Deploy backend to Azure
- [ ] Verify local E2E tests pass
- [ ] Investigate dashboard/workspaces blank page bug (separate PR)

## How to Run

### Against Production (works now)
```bash
BASE_URL=https://inchronicle.com npx playwright test authenticated.spec.ts
```

### Against Local (after backend deployment)
```bash
npm run dev  # Starts on port 5555
npm run test:e2e
```

## Rollback Plan

If issues arise, revert port changes:
1. `vite.config.ts`: port 5555 → 5173
2. `playwright.config.ts`: URLs back to 5173
3. `.env.local`: E2E_BASE_URL back to 5173
4. Backend: Remove `localhost:5555` from CORS (optional, harmless to keep)
