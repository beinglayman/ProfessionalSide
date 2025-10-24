# GitHub MCP Integration - Complete Implementation Plan

**Status:** PLANNED - Ready for Implementation
**Last Updated:** 2025-10-10
**Estimated Duration:** 7-8 days

---

## Table of Contents
1. [Overview](#overview)
2. [Core Concept](#core-concept)
3. [Architecture](#architecture)
4. [Implementation Phases](#implementation-phases)
5. [File Changes](#file-changes)
6. [User Flows](#user-flows)
7. [API Specifications](#api-specifications)
8. [Testing Strategy](#testing-strategy)

---

## Overview

### Goal
Complete end-to-end GitHub MCP integration in the journal entry creation flow, enabling users to:
- Import GitHub activity (commits, PRs, issues) into journal entries
- AI automatically organizes and categorizes the activity
- Smart pre-fill of entry type, content, skills, and artifacts
- Adaptive flow that skips unnecessary steps
- Daily summary generation for review and posting

### Key Features
- ✅ **AI-First Approach**: AI organizes raw GitHub data into meaningful categories
- ✅ **Smart Form Flow**: Auto-fills steps 2, 3, 5, 6 based on imported data
- ✅ **Artifact Preservation**: GitHub links (PRs, commits, issues) preserved through to final entry
- ✅ **Daily Summaries**: Generate daily digest from GitHub activity
- ✅ **Privacy-First**: 30-minute session storage, explicit consent required

---

## Core Concept

### Traditional Flow (7 steps)
```
Step 1: Focus Area Selection
Step 2: Entry Type Selection
Step 3: Content Input
Step 4: Privacy & Goals
Step 5: Artifacts Upload
Step 6: Skills Selection
Step 7: AI Review & Post
```

### With GitHub MCP (Smart Flow - 4 clicks)
```
Step 1: Focus Area Selection
Step 1.5: GitHub Import → AI Organizes Everything
  ↓ AI extracts:
    - Entry type suggestion
    - Title & content draft
    - Skills/technologies
    - Artifacts (PR/commit links)
Step 2: Entry Type ✓ (Pre-selected, can edit)
Step 3: Content ✓ (Pre-filled, can edit)
[Smart Skip Option] → Jump to Step 4
Step 4: Privacy & Goals (Required)
Step 5: Artifacts ✓ (GitHub links added, can add more)
Step 6: Skills ✓ (Pre-selected, can modify)
Step 7: AI Enhancement & Post
```

**Time Saved:** ~50% for GitHub-based entries

---

## Architecture

### Data Flow

```
User clicks "Import from GitHub"
   ↓
Step 1.5: Date range selection + consent
   ↓
Backend: GitHub Tool fetches raw activity
   ↓
Backend: AI Organizer Service processes & categorizes
   ↓
Frontend: Display organized results with selection
   ↓
User selects items → "Apply"
   ↓
FormData.mcpImportData populated with:
  - AI suggestions (entry type, title, content, skills)
  - Selected items
  - Ready-to-use artifacts
   ↓
Smart navigation: Offer to skip to Step 4
   ↓
Steps 2,3,5,6: Show pre-filled badge, allow edits
   ↓
Step 7: AI enhances with MCP context
   ↓
Final entry saved with:
  - Enhanced content
  - GitHub artifacts attached
  - MCP metadata stored
  - Audit log created
```

---

## Implementation Phases

### **SPRINT 1: Core Import Flow (4 days)**

#### Day 1: Step 1.5 UI + Backend AI Organizer

**Frontend:**
- Create `src/components/new-entry/steps/Step1ImportMCP.tsx`
  - Connection status badge
  - Prominent "Skip This Step" button
  - Date range picker (Last 7 days, 30 days, Custom)
  - Privacy consent checkbox
  - "Fetch & Organize Activity" button
  - Loading state

**Backend:**
- Create `backend/src/services/mcp/mcp-ai-organizer.service.ts`
  - `organizeGitHubActivity()` method
  - OpenAI GPT-4 integration
  - Returns structured JSON:
    ```json
    {
      "suggestedEntryType": "achievement",
      "suggestedTitle": "...",
      "contextSummary": "...",
      "extractedSkills": ["React", "TypeScript"],
      "categories": [...],
      "artifacts": [...]
    }
    ```

- Modify `backend/src/controllers/mcp.controller.ts`
  - Add `fetchAndOrganize` endpoint
  - Calls GitHub tool + AI organizer
  - Stores in session (30 min expiry)

- Modify `backend/src/routes/mcp.routes.ts`
  - Add route: `POST /api/v1/mcp/fetch-and-organize`

#### Day 2: Results Display + Selection

**Frontend:**
- Create `src/components/mcp/GitHubOrganizedResults.tsx`
  - AI suggested title display
  - Categories with summaries
  - Selectable items (checkboxes)
  - Importance badges (High/Medium/Low)
  - Extracted skills display
  - "Apply Selected Items" button

- Create `src/components/mcp/MCPConsentDialog.tsx`
  - Privacy notice modal
  - Data usage explanation
  - Session duration info
  - "I Understand" checkbox

- Modify `src/components/new-entry/types/newEntryTypes.ts`
  - Add `mcpImportData` interface to FormData
  - Include all AI suggestions and selected items

#### Day 3: Smart Pre-fill Logic

**Frontend:**
- Modify `src/components/new-entry/steps/Step2EntryType.tsx`
  - Auto-select entry type from AI suggestion
  - Show "AI Suggested from GitHub" badge
  - Allow user override

- Modify `src/components/new-entry/steps/Step3Content.tsx`
  - Pre-fill title and content from AI
  - Show "Content Generated from GitHub Activity" notice
  - Fully editable

- Modify `src/components/new-entry/steps/Step5Artifacts.tsx`
  - Display GitHub artifacts section
  - Show PR/commit/issue cards with GitHub icon
  - External link buttons
  - Separate from file uploads

- Modify `src/components/new-entry/steps/Step6Skills.tsx`
  - Pre-select skills from AI extraction
  - Show "AI Detected" badge
  - Match skill names to DB skill IDs
  - Allow additions/removals

#### Day 4: Smart Navigation + Step 7 Enhancement

**Frontend:**
- Modify `src/components/new-entry/NewEntryModalRefactored.tsx`
  - Add Step 1.5 between Step 1 and Step 2
  - Smart skip logic: After Step 1.5, offer jump to Step 4
  - `getNextStep()` function for adaptive flow
  - `shouldShowPreFilledBadge()` function

- Modify `src/components/new-entry/components/FormNavigation.tsx`
  - Visual progress indicator
  - Show completed, pre-filled, active, pending states
  - Different icons for each state

- Modify `src/components/new-entry/steps/Step7Review.tsx`
  - Pass MCP context to AI generation endpoint
  - Merge GitHub artifacts with user uploads
  - Display GitHub artifacts with special badges
  - Show "Enhanced with GitHub Data" notice

**Backend:**
- Modify `backend/src/controllers/ai.controller.ts`
  - Update `generateEntry` endpoint
  - Accept `mcpContext` parameter
  - Include GitHub categories and artifacts in prompt
  - Return enhanced content + preserve artifacts

- Modify `backend/src/controllers/journal.controller.ts`
  - Update `createJournalEntry` endpoint
  - Save MCP metadata in entry.metadata field
  - Create JournalArtifact records for GitHub links
  - Create MCPAuditLog record
  - Track usage stats

---

### **SPRINT 2: Daily Summary (2 days)**

#### Day 1: Daily Digest Backend + Frontend

**Backend:**
- Create `backend/src/services/mcp/mcp-daily-summary.service.ts`
  - `generateDailySummary(userId, date)` method
  - Fetch activity for specific date
  - Reuse AI organizer for categorization
  - Generate prose summary
  - Return organized data + summary text

- Modify `backend/src/routes/mcp.routes.ts`
  - Add route: `POST /api/v1/mcp/daily-summary`

**Frontend:**
- Create `src/pages/mcp/daily-digest.tsx`
  - Date selector (defaults to today)
  - "Generate Summary" button
  - Display organized results (reuse GitHubOrganizedResults)
  - Show AI prose summary
  - "Save as Journal Entry" button → pre-fills modal
  - "Dismiss" button

- Modify `src/components/layout/sidebar.tsx`
  - Add "Daily Summary" link to navigation
  - Route to `/mcp/daily-digest`
  - Icon: Calendar

#### Day 2: Integration + Testing

- Test daily summary generation
- Test "Save as Entry" flow
- Verify all data flows correctly
- Bug fixes

---

### **SPRINT 3: Analytics & Polish (1-2 days)**

#### Day 1: Usage Statistics

**Backend:**
- Modify `backend/src/controllers/mcp.controller.ts`
  - Add `getIntegrationStats` endpoint
  - Query MCPAuditLog for user stats
  - Return:
    - Entries created with GitHub
    - Last import timestamp
    - Total items imported
    - Breakdown by type

- Modify `backend/src/routes/mcp.routes.ts`
  - Add route: `GET /api/v1/mcp/integrations/github/stats`

**Frontend:**
- Modify `src/components/settings/integrations-settings.tsx`
  - Add usage stats section for connected GitHub
  - Display metrics in grid layout
  - "View Import History" button
  - "Generate Daily Summary" button (links to daily digest)

#### Day 2: Testing, Bug Fixes, Documentation

- End-to-end testing
- Edge cases (no activity, failed fetch, etc.)
- Performance optimization
- Update CLAUDE.md with MCP guidelines

---

## File Changes

### **Frontend (14 files)**

**NEW FILES (4):**
1. `src/components/new-entry/steps/Step1ImportMCP.tsx`
2. `src/components/mcp/GitHubOrganizedResults.tsx`
3. `src/components/mcp/MCPConsentDialog.tsx`
4. `src/pages/mcp/daily-digest.tsx`

**MODIFIED FILES (10):**
5. `src/components/new-entry/NewEntryModalRefactored.tsx`
6. `src/components/new-entry/types/newEntryTypes.ts`
7. `src/components/new-entry/steps/Step2EntryType.tsx`
8. `src/components/new-entry/steps/Step3Content.tsx`
9. `src/components/new-entry/steps/Step5Artifacts.tsx`
10. `src/components/new-entry/steps/Step6Skills.tsx`
11. `src/components/new-entry/steps/Step7Review.tsx`
12. `src/components/new-entry/components/FormNavigation.tsx`
13. `src/components/settings/integrations-settings.tsx`
14. `src/components/layout/sidebar.tsx`

### **Backend (6 files)**

**NEW FILES (2):**
15. `backend/src/services/mcp/mcp-ai-organizer.service.ts`
16. `backend/src/services/mcp/mcp-daily-summary.service.ts`

**MODIFIED FILES (4):**
17. `backend/src/controllers/mcp.controller.ts`
18. `backend/src/controllers/ai.controller.ts`
19. `backend/src/controllers/journal.controller.ts`
20. `backend/src/routes/mcp.routes.ts`

**Total: 20 files (6 new, 14 modified)**

---

## User Flows

### Flow 1: Import from GitHub in New Entry

```
1. User clicks "New Entry"
2. Step 1: Selects focus area (e.g., "Software Development")
3. Step 1.5:
   - Sees "Import from GitHub (Optional)"
   - Prominent "Skip This Step" button
   - Clicks "Last 7 days"
   - Checks consent checkbox
   - Clicks "Fetch & Organize Activity"
4. Loading spinner (3-5 seconds)
5. AI Organized Results appear:
   - "AI Suggested Title: Weekly Code Review & Feature Completion"
   - Categories:
     - Achievements (2 merged PRs, 1 milestone)
     - Bug Fixes (3 issues closed)
     - Code Reviews (5 PRs reviewed)
   - Each item with checkbox (smart defaults selected)
   - Skills detected: React, TypeScript, Node.js
6. User reviews, deselects 1 item, clicks "Apply Selected Items"
7. Smart Skip Dialog appears:
   - "AI has pre-filled entry type, content, skills, and artifacts"
   - "Skip to Privacy Settings" button
   - "Review Each Step" button
8a. If "Skip to Privacy Settings":
   - Jumps to Step 4
   - Steps 2,3,5,6 show ✓ Pre-filled badges
9b. If "Review Each Step":
   - Step 2: Entry type already selected ("Achievement"), can change
   - Step 3: Title & content already filled, can edit
   - Step 4: Privacy & goals (required)
   - Step 5: 2 PR links + 3 issue links already added, can upload files
   - Step 6: 3 skills already selected, can add more
10. Step 7: AI Review
   - User clicks "Generate Final Entry"
   - AI enhances the draft with MCP context
   - Preview shows polished entry with GitHub artifacts
11. User clicks "Post Entry"
12. Success! Entry saved with GitHub metadata & artifacts
```

### Flow 2: Daily Summary Generation

```
1. User navigates to "Daily Summary" from sidebar
2. Date defaults to today
3. User clicks "Generate Summary"
4. Loading (3-5 seconds)
5. AI organized summary appears:
   - Stats: 5 commits, 2 PRs merged, 1 issue closed
   - Categories with items
   - AI prose summary (2-3 paragraphs)
6. User reads summary
7. Options:
   a. "Save as Journal Entry" → Opens new entry modal pre-filled
   b. "Dismiss" → Clears the summary
8. If saved, entry created with all GitHub data
```

---

## API Specifications

### POST /api/v1/mcp/fetch-and-organize

**Purpose:** Fetch GitHub activity and organize with AI

**Request:**
```json
{
  "dateRange": {
    "start": "2025-10-03T00:00:00Z",
    "end": "2025-10-10T23:59:59Z"
  },
  "consentGiven": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "ses_abc123xyz",
    "organized": {
      "suggestedEntryType": "achievement",
      "suggestedTitle": "Weekly Code Review & Feature Completion",
      "contextSummary": "This week I focused on...",
      "extractedSkills": ["React", "TypeScript", "Node.js"],
      "categories": [
        {
          "type": "achievement",
          "label": "Major Achievements",
          "summary": "Completed 2 significant features...",
          "items": [
            {
              "id": "pr-123",
              "type": "pr",
              "title": "Add user authentication flow",
              "description": "Implemented OAuth + JWT tokens",
              "url": "https://github.com/user/repo/pull/123",
              "importance": "high",
              "selected": true,
              "metadata": {
                "additions": 450,
                "deletions": 120,
                "files_changed": 8,
                "merged_at": "2025-10-09T14:30:00Z"
              }
            }
          ]
        }
      ],
      "artifacts": [
        {
          "type": "github_pr",
          "id": "pr-123",
          "title": "Add user authentication flow",
          "url": "https://github.com/user/repo/pull/123",
          "icon": "git-pull-request",
          "metadata": { "state": "merged" }
        }
      ]
    },
    "privacyNotice": "Data stored for 30 minutes only..."
  }
}
```

### POST /api/v1/ai/generate-entry (MODIFIED)

**Added mcpContext parameter**

**Request:**
```json
{
  "title": "Weekly Code Review & Feature Completion",
  "content": "This week I focused on...",
  "entryType": "achievement",
  "skills": [1, 5, 12],
  "mcpContext": {
    "source": "github",
    "categories": [...],
    "artifacts": [...],
    "originalSummary": "..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "content": "# Weekly Code Review & Feature Completion\n\nThis week marked...",
    "artifacts": [...]
  }
}
```

### POST /api/v1/journal/entries (MODIFIED)

**Added mcpImportData parameter**

**Request:**
```json
{
  "title": "...",
  "content": "...",
  "entryType": "achievement",
  "privacyLevel": "team",
  "workspaceId": "ws_123",
  "selectedSkillIds": [1, 5, 12],
  "artifacts": [...], // Includes GitHub artifacts
  "mcpImportData": {
    "source": "github",
    "sessionId": "ses_abc",
    "fetchedAt": "2025-10-10T10:00:00Z",
    "dateRange": {...},
    "selectedCategories": [...]
  }
}
```

### GET /api/v1/mcp/integrations/github/stats

**Response:**
```json
{
  "success": true,
  "data": {
    "entriesCreated": 12,
    "lastImport": "2025-10-09T14:30:00Z",
    "totalItems": 47,
    "breakdown": {
      "commits": 23,
      "pullRequests": 18,
      "issues": 6
    }
  }
}
```

### POST /api/v1/mcp/daily-summary

**Request:**
```json
{
  "date": "2025-10-10"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2025-10-10",
    "organized": { /* same as fetch-and-organize */ },
    "summary": "Today I accomplished three major milestones..."
  }
}
```

---

## Testing Strategy

### Unit Tests

**Backend:**
- `mcp-ai-organizer.service.test.ts`
  - Test AI response parsing
  - Test categorization logic
  - Mock OpenAI responses

**Frontend:**
- Test Step1ImportMCP component
- Test smart pre-fill logic
- Test artifact merging

### Integration Tests

- Test full flow: Import → Pre-fill → Generate → Post
- Test with various GitHub activity patterns
- Test error scenarios (no activity, API failures)
- Test session expiry
- Test artifact preservation

### E2E Tests

- User creates entry with GitHub import
- User generates daily summary
- User views usage stats

---

## Environment Variables

### Required (Already Set in Azure)

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=Ov23lin460CkSEdCBIeT
GITHUB_CLIENT_SECRET=a2fea3e0bdd4160ec81ef190aec6c339689c969b
GITHUB_REDIRECT_URI=https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/github

# MCP
MCP_ENCRYPTION_KEY=VjEIge9QR+s+9ZG+rWCNd1bR3axc3vXeh9/7qXiKe2k=
MCP_SESSION_DURATION=30
MCP_DEBUG=false

# OpenAI (for AI organizer)
OPENAI_API_KEY=<existing key>
AZURE_OPENAI_API_KEY=<existing key>
AZURE_OPENAI_ENDPOINT=<existing endpoint>
```

---

## Success Metrics

### User Experience
- ✅ 50% reduction in time to create GitHub-based entries
- ✅ 90%+ of AI pre-fills accepted by users
- ✅ Zero privacy incidents

### Technical
- ✅ <5 second AI organization time
- ✅ 100% artifact preservation rate
- ✅ <1% session expiry before use

### Adoption
- ✅ 30% of entries use GitHub import (30 days post-launch)
- ✅ 50% of users with GitHub connected use daily summary

---

## Risks & Mitigations

### Risk 1: OpenAI Rate Limits
**Mitigation:** Implement caching, batch requests, fallback to simpler categorization

### Risk 2: GitHub API Rate Limits
**Mitigation:** Respect rate limit headers, implement exponential backoff, cache results

### Risk 3: AI Generates Poor Content
**Mitigation:** Always allow user editing, provide "regenerate" option, collect feedback

### Risk 4: Session Expiry Before Use
**Mitigation:** Extend to 30 minutes, show countdown timer, allow re-fetch

---

## Future Enhancements (Post-MVP)

1. **Multi-tool Import**: Combine GitHub + Jira in single entry
2. **Auto-scheduling**: Daily summary email at 5pm
3. **Team Summaries**: Aggregate team GitHub activity
4. **Custom Prompts**: User-defined organization rules
5. **Webhooks**: Real-time import on PR merge
6. **AI Learning**: Improve categorization based on user edits

---

## Appendix: Key Code Snippets

### FormData.mcpImportData Interface

```typescript
export interface FormData {
  // ... existing fields

  mcpImportData?: {
    source: 'github';
    sessionId: string;
    fetchedAt: string;
    dateRange: { start: string; end: string };

    // AI suggestions for pre-fill
    aiSuggestedEntryType: 'achievement' | 'learning' | 'reflection';
    aiSuggestedTitle: string;
    aiSuggestedContent: string; // Markdown formatted
    aiExtractedSkills: string[]; // ["TypeScript", "React"]

    // Selected categories with items
    selectedCategories: Array<{
      type: 'achievement' | 'learning' | 'bug_fix' | 'code_review' | 'documentation';
      label: string;
      summary: string;
      items: Array<{
        id: string;
        type: 'commit' | 'pr' | 'issue';
        title: string;
        description: string;
        url: string;
        metadata: any;
      }>;
    }>;

    // Ready-to-attach artifacts
    artifacts: Array<{
      type: 'github_pr' | 'github_commit' | 'github_issue';
      id: string;
      title: string;
      url: string;
      icon: string;
      metadata: any;
    }>;
  };
}
```

### AI Organizer Prompt Template

```typescript
const prompt = `
Analyze this GitHub activity and organize it for a professional journal entry.

Activity:
- ${commits.length} commits
- ${pullRequests.length} pull requests
- ${issues.length} issues

${JSON.stringify(rawData, null, 2)}

Return JSON with:
1. suggestedEntryType: "achievement", "learning", or "reflection"
2. suggestedTitle: Catchy, professional title (max 80 chars)
3. contextSummary: 2-3 paragraph prose summary in first person
4. extractedSkills: Array of technologies/languages detected
5. categories: Organize items into meaningful groups (achievements, learning, bug fixes, code reviews, documentation)
6. artifacts: Top 5-10 items as reference links

Prioritize merged PRs and closed issues as high importance.
Focus on impact, learnings, and collaboration.
`;
```

---

## Contact & Questions

For questions or clarifications, refer back to this document or ask Claude to:
- Explain specific sections in detail
- Provide code examples for any component
- Clarify implementation steps
- Suggest alternative approaches

**Document Version:** 1.0
**Last Updated:** 2025-10-10
