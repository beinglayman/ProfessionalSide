# Re-Enhance Nudge Analysis

**Date**: 2026-02-17
**Status**: IMPLEMENTED (items 1-2), AUDITED (item 4)

---

## Context Items

### 1. Re-enhance nudge not visible (FIXED)

**Root cause**: NarrativePreview nudge gated on `story.needsRegeneration === true`, but that flag is only set when `editActivities()` is called (user changes story's activity list). For stories that haven't had activities edited, `needsRegeneration` defaults to `false`.

**Fix**: Broadened the gate to show for any unpublished draft story (`story && !story.isPublished`). Copy differentiates:
- `needsRegeneration === true` → "Activities changed — re-enhance to update this story"
- Otherwise → "Polish this story with AI before sharing"

**File**: `src/components/career-stories/NarrativePreview.tsx:601`

### 2. Journal entry re-enhance nudge (IMPLEMENTED)

**Approach**: Added amber nudge banner to `StoryGroupHeader` expanded view, matching the career story pattern.

**Conditions**: Shows when:
- `!isPendingEnhancement` (not currently being enhanced)
- `hasLLMContent` (description + impactHighlights exist)
- `!isPublished`
- `onRegenerateNarrative` callback exists

**Copy**: "Polish this draft with AI before promoting"

**File**: `src/components/journal/story-group-header.tsx` (expanded view, after enhancing indicator)

### 3. Re-enhance vs Regenerate (NOT IMPLEMENTED — deferred)

Both currently call the same `onRegenerate` callback. Differentiation would require:
- Backend: new `PATCH /career-stories/:id/re-enhance` endpoint with "polish" prompt (preserve structure, improve prose)
- Frontend: separate button/callback for polish vs full rewrite
- UX decision: how to expose both options (two buttons? toggle? dropdown?)

### 4. OAuth wizard visual verification (CODE AUDITED)

**Components audited**:
- `OAuthSetupWizard.tsx` — 2-col grid, skeleton loading, admin gating
- `ProviderSetupCard.tsx` — status badges, expandable details, inline form
- `StatusBadge.tsx` — 3 states (configured/missing/blank)
- `CredentialForm.tsx` — client ID + secret fields, optional keys
- `CopyChip.tsx` — callback URL copy

**Backend verified**:
- `GET /admin/oauth/providers` — reads .env, returns provider status
- `POST /admin/oauth/providers/:provider/configure` — writes .env, hot-reloads
- `GET /admin/oauth/validate` — validates all configs

**No code bugs found**. Needs manual visual verification: login as admin → Settings → Integrations.

### 5. Anthropic key → Azure OpenAI (NOT VERIFIED)

Azure OpenAI (gpt-4o) configured in .env. Career story generation needs E2E verification.

---

## Architecture Notes

### needsRegeneration Flow
```
editActivities() → needsRegeneration = true
regenerate()     → needsRegeneration = false
create()         → needsRegeneration = false (default)
```

### Journal Entry Enhancement Flow
```
Sync → creates JournalEntry (no description yet)
     → SSE: backend generates narrative async
     → narratives-complete event → description + impactHighlights populated
     → isPendingEnhancement becomes false
     → Re-enhance nudge becomes visible
```
