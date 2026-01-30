# Career Stories Demo Mode - Local Testing Guide

This guide explains how to test the Career Stories demo mode feature locally.

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (or via Docker)
- Environment variables configured (see `.env.local.example`)

## Quick Start

### 1. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd backend && npm install && cd ..
```

### 2. Start the Database

```bash
# If using Docker
docker-compose up -d postgres

# Or ensure your local PostgreSQL is running
```

### 3. Run Database Migrations

```bash
cd backend
npx prisma migrate dev
cd ..
```

### 4. Start Both Servers

**Option A: Separate terminals (recommended for debugging)**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
# Runs on http://localhost:3002
```

Terminal 2 - Frontend:
```bash
npm run dev
# Runs on http://localhost:5555
```

**Option B: Single command**
```bash
npm run dev:all
# Starts both servers concurrently
```

### 5. Access the Application

Open http://localhost:5555 in your browser.

**Test Credentials:**
- Email: `test@techcorp.com`
- Password: `password123`

---

## Demo Mode Features

### Toggling Demo Mode

Demo mode is **ON by default** for new users.

**Keyboard Shortcut:** `Cmd+E` (Mac) or `Ctrl+E` (Windows/Linux)

This toggles between:
- **Demo Mode ON**: Shows sample clusters with mock data
- **Demo Mode OFF**: Shows real user data (empty if no activities synced)

### What Demo Mode Provides

1. **Pre-populated Clusters** - 3 sample clusters with realistic activities:
   - Authentication System Migration
   - API Performance Optimization
   - Design System Implementation

2. **Sample Activities** - Each cluster contains 3-5 activities from various tools:
   - GitHub PRs and commits
   - Jira tickets
   - Confluence pages

3. **STAR Generation** - Auto-generates STAR narratives when selecting a cluster

4. **Edit Activities** - Edit button (pencil icon) allows reassigning activities between clusters

---

## Testing Checklist

### Basic Flow

- [ ] Navigate to Career Stories page (`/career-stories`)
- [ ] Verify demo clusters appear (3 clusters)
- [ ] Click a cluster to select it
- [ ] Verify STAR narrative auto-generates
- [ ] Toggle framework selector (STAR, STARL, CAR, etc.)
- [ ] Click "Regenerate" to get a new narrative

### Demo Mode Toggle

- [ ] Press `Cmd/Ctrl+E` to disable demo mode
- [ ] Verify empty state appears (or real data if available)
- [ ] Press `Cmd/Ctrl+E` again to re-enable
- [ ] Verify demo clusters return

### Edit Activities Modal

- [ ] Click pencil icon on a cluster card
- [ ] Modal opens with two columns (Current / Available)
- [ ] Search activities using the search box
- [ ] Add an activity using the + button
- [ ] Remove an activity using the - button
- [ ] Click Save Changes
- [ ] Verify cluster updates

### Mobile Responsiveness

- [ ] Resize browser to mobile width (<768px)
- [ ] Verify cluster list displays full-width
- [ ] Click a cluster
- [ ] Verify bottom sheet opens with STAR preview
- [ ] Swipe down or tap backdrop to close

---

## Running Tests

### Unit Tests

```bash
# Frontend
npm run test

# Backend
cd backend && npm run test
```

### E2E Tests

```bash
# Ensure servers are running first
npx playwright test e2e/career-stories.spec.ts

# Run with UI for debugging
npx playwright test e2e/career-stories.spec.ts --ui

# Run specific test
npx playwright test -g "demo mode"
```

### Test Coverage Report

```bash
npm run test:coverage
```

---

## Troubleshooting

### "Demo clusters not appearing"

1. Check browser console for errors
2. Verify localStorage: `localStorage.getItem('app-demo-mode')` should NOT be `'false'`
3. Clear localStorage and refresh: `localStorage.clear()`

### "STAR generation stuck on loading"

1. Demo mode uses client-side mock data with 800ms simulated delay
2. If stuck longer, check browser console for errors
3. Try refreshing the page

### "Edit button not visible"

The edit button only appears in demo mode. Press `Cmd/Ctrl+E` to enable demo mode.

### "Tests failing"

```bash
# Reset test environment
npm run test:reset

# Run with verbose output
npm run test -- --reporter=verbose
```

---

## Architecture Notes

### Demo Mode Data Flow

```
User clicks cluster
    │
    ▼
isDemoMode() check
    │
    ├── true  → Return DEMO_CLUSTERS from client-side mock data
    │           No API call needed
    │
    └── false → Call CareerStoriesService.getClusters()
                Fetch from real database
```

### Key Files

| File | Purpose |
|------|---------|
| `src/services/demo-mode.service.ts` | Global demo mode state management |
| `src/services/career-stories-demo-data.ts` | Client-side mock clusters and STAR data |
| `src/hooks/useCareerStories.ts` | React Query hooks with demo mode branching |
| `src/components/career-stories/CareerStoriesPage.tsx` | Main page component |
| `src/components/shared/EditActivitiesModal.tsx` | Activity editing modal |
| `backend/src/services/career-stories/demo.service.ts` | Backend demo data seeding |

### localStorage Keys

| Key | Values | Default |
|-----|--------|---------|
| `app-demo-mode` | `'true'` / `'false'` | `true` (absent = true) |
| `app-demo-sync-status` | JSON object | `{hasSynced: false, ...}` |
| `career-stories-framework` | `'STAR'`, `'STARL'`, etc. | `'STAR'` |

---

## Related Documentation

- [Career Stories Demo Mode Design](./design-brainstorm.md)
- [STAR Framework Reference](../../reference/star-frameworks.md)
- [API Documentation](../../api/career-stories.md)
