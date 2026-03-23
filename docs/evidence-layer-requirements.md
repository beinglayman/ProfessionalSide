# Evidence Layer — Peer-Validated Career Stories

## Complete Specification (PGC-Audited)

*Month 3 Feature — InChronicle*

---

## 1. Raw Requirement

> "Every story should have this section where two things will be stated — who witnessed this story (users that figure in the activity logs in various tools) and what is the proof that it happened (each claim grounded in activity). There should be a peer validation flow. The story owner should be able to send the story to a colleague for validation. Only the colleagues that figure in the related activities should be able to be sent the link. There should be a validation dashboard for the users to view all the pending validations, completed validations, and who validated what."

**Stripped to essence (35 words):**

> Add a section to each story showing who was involved (extracted from activity data) and what evidence supports each claim. Let story owners request validation from involved people. Build a dashboard to track validation requests and responses.

**Three distinct features:**
1. **Evidence Panel** (display) — show participants and grounded claims on each story
2. **Peer Validation Flow** (workflow) — request, receive, and respond to validation
3. **Validation Dashboard** (management UI) — track all validation requests

---

## 2. PGC Clarity Audit

### Clarity Score: 3/10

**Justification:** Correctly identifies a real product need and names three features at the right abstraction level. But conflates display with workflow, ignores the identity resolution problem (the hardest technical challenge), doesn't define what "validation" means mechanically, and leaves the dashboard audience ambiguous.

### Jargon Detector

| Term | What It Actually Means | Ambiguity |
|------|----------------------|-----------|
| "witnessed this story" | People whose identifiers appear in rawData of linked ToolActivity records. NOT eyewitnesses. | **HIGH** — "witnessed" implies observation; reality is "participated in underlying activities." Correct term: **participants**. |
| "users that figure in the activity logs" | External identifiers (GitHub logins, Jira names, emails) in rawData JSON blobs. These are NOT InChronicle users by default — they are opaque strings. | **VERY HIGH** — implies known users. They're strings in JSON. |
| "proof that it happened" | Already partially exists via `StorySource` model linking claims to `ToolActivity` records. Requirement wants better UI presentation, not a new data model. | **MEDIUM** |
| "each claim grounded in activity" | Already implemented. `ClaimResolutionPanel` identifies ungrounded claims. Publishing gates on this. | **LOW** — exists. |
| "peer validation flow" | Multi-step workflow hiding ~10 decision points. | **VERY HIGH** |
| "only colleagues that figure in the related activities" | Recipient list filtered to people in rawData — but these are external identifiers needing identity resolution to InChronicle users. If person isn't on InChronicle, what happens? Unstated. | **CRITICAL** |
| "validation dashboard" | Whose dashboard? Requests I sent? Received? Both? | **HIGH** |

### Who-Is-This-For Test

| Persona | Addressed? | What They Need |
|---------|-----------|----------------|
| **Story Owner** | Yes | See participants, send requests, track status |
| **Validator** | Partially | What do they see? Full story? Just their sections? |
| **Story Viewer** (recruiter/mentor) | No | What does a validated story look like? |
| **Non-InChronicle Participant** | No | Can't interact at all — unresolved |

---

## 3. Gap Analysis: 23 Questions — All Answered

### Identity Resolution
1. **Match by handles/emails** found in activity rawData → match against `UserToolIdentity` table
2. **Zero matches** → show as "Unknown User" with "Invite to InChronicle" button
3. **Multiple matches** → show dropdown for story owner to select correct user
4. **Email invitations** → yes, "Invite to InChronicle" with simple UX for story owner
5. **Mapping maintenance** → auto-captured when user connects a tool (handle/email stored in `UserToolIdentity`). Cross-tool: if email matches across tools, assume same user.

### Validation Mechanics
6. **Per-claim** validation (each evidence-linked claim individually)
7. **Binary** — valid or invalid per claim
8. **Rejection** → validator can reject a claim and share context (shown to story owner)
9. **Context without verdict** → yes, validator can add comments without accepting/rejecting
10. **Permanent** — like an approval, once done it stays done. No retraction.
11. **Edit revokes** — if a validated claim is edited, its validation is **revoked** (not just flagged)
12. **1 validation** = show "validated" badge. Validators shown as circular avatar row.

### Access Control
13. **Full story** visible to validator
14. **No** — validators don't see other validators' responses
15. **Yes** — owner sees pending/completed status on validation dashboard
16. **Authentication required** — must register and login to validate

### Dashboard
17. **Both** sent and received
18. **Separate tabs**
19. **Default sort by date**, can also sort by status
20. **Grouped by story**

### Display
21. **After story content** (evidence section at bottom)
22. **Recruiter view** — same story content + evidence section with circular validator avatar row
23. **PragmaLink** — validation shown within the evidence section

---

## 4. Evidence Panel Specification

### What Already Exists (do NOT re-implement)
- `StorySource` model — links claims to activities with labels, URLs, tool types
- `ClaimResolutionPanel` — identifies ungrounded claims
- Source margin/footnotes — displays sources alongside narrative
- Publishing gate checking for ungrounded claims
- `IdentityMatcher` — detects the owner's participation level

### What Needs Building: Participant Extraction Service

The inverse of IdentityMatcher. Instead of "is the owner in this activity?", it asks "who ELSE is in this activity?"

**Extraction fields per tool:**

| Tool | rawData Field | Role |
|------|--------------|------|
| GitHub (PR) | `reviewers[]` | reviewer |
| GitHub (PR/commit) | `author` | author |
| Jira | `assignee` | assignee |
| Jira | `reporter` | reporter |
| Confluence | `lastModifiedBy` | editor |
| Confluence | `author` | author |
| Slack | `author` | author |
| Outlook/Google | `attendees[]` | attendee |
| Outlook/Google | `organizer` | organizer |
| Figma | `owner`, `editors[]` | owner/editor |

**Critical:** Owner's own identifiers EXCLUDED using existing `CareerPersona`.

**Participant data structure:**
```typescript
interface StoryParticipant {
  externalId: string;           // Raw identifier from rawData ("bob.chen")
  tool: ToolType;               // Which tool
  role: string;                 // "reviewer", "assignee", etc.
  activityIds: string[];        // Which activities they appear in
  inchronicleUserId?: string;   // Resolved user ID, if matched
  inchronicleUser?: { id, name, email, avatar };
  matchConfidence: 'exact_email' | 'exact_login' | 'fuzzy_name' | 'unmatched';
}
```

**Identity Resolution Strategy (priority order):**
1. **Exact email match** — rawData identifier is an email → match against `User.email`
2. **Connected account match** — tool-specific login → match via `UserToolIdentity` table (populated when users connect tools)
3. **Cross-tool email match** — if email found for a user in one tool, assume same user for matching identifiers across other tools
4. **Multiple matches** → show dropdown for story owner to select the correct user
5. **Zero matches** → show as "Unknown User" with "Invite to InChronicle" button

**Evidence Panel UI (new collapsible section at bottom of story view):**

```
+-----------------------------------------------+
| [Shield]  Evidence & Participants              |
+-----------------------------------------------+
|                                                |
| PARTICIPANTS (3 matched, 1 unresolved)         |
|                                                |
| [avatar] Bob Chen      Reviewer (GitHub)       |
|          Validated [✓]     2 activities         |
|                                                |
| [avatar] Sarah Kim     Reviewer (GitHub)       |
|          Pending...        1 activity           |
|                                                |
| [?]      security-lead  Attendee (Outlook)     |
|          [Invite to InChronicle]  1 activity    |
|                                                |
| EVIDENCE TRAIL                                 |
| 4 sources across 3 tools                       |
| [github] [jira] [confluence]                   |
| Time span: Jan 15 – Feb 28, 2026               |
+-----------------------------------------------+
```

**Published/PragmaLink/Recruiter view:**
```
Validated by  [○○○] 3 peers    |  4 sources across [github][jira][confluence]
              ^^^               |  Jan 15 – Feb 28, 2026
              circular avatars  |
```

---

## 5. Peer Validation Flow

### Story Owner Flow
1. Owner opens story → Evidence Panel shows extracted participants
2. Owner clicks "Request Validation" on a matched participant
3. Confirmation: "Send validation request to Bob Chen for [Story Title]?"
4. System creates `StoryValidation` record (status: pending, token: 32-char crypto random, snapshot hash of story sections, expires: 30 days)
5. In-app notification + email sent to validator with link `/validate/{token}`
6. Owner can cancel pending requests anytime

**Constraint enforcement:** API verifies validatorId's externalId appears in story's linked activities' rawData.

### Validator Flow
1. Receives notification/email → opens `/validate/{token}`
2. Must be **authenticated** (registered + logged in)
3. Sees the **full story** with claims highlighted inline
4. Each **claim** (evidence-linked statement) has a binary toggle: **Valid** or **Invalid**
5. Can optionally add context/comments on any claim (without needing to accept/reject)
6. Provides **per-claim** response:
   ```typescript
   interface ClaimValidation {
     claimId: string;
     sectionKey: string;
     claimText: string;
     verdict: 'valid' | 'invalid' | null;
     comment?: string;
   }

   interface ValidationResponse {
     claims: ClaimValidation[];
     overallComment?: string;
   }
   ```
7. Status logic:
   - `validated` — all claims rated valid (or no claims rated invalid)
   - `disputed` — any claim rated invalid
8. **Full transparency:** Story owner sees every per-claim verdict and comment
9. **Permanent:** Once submitted, validation cannot be retracted
10. Validators do **NOT** see other validators' responses
11. Story owner notified (type: `VALIDATION_RECEIVED` or `VALIDATION_DISPUTED`)

### Post-Validation Edit = Claim-Level Revocation
1. For each `ClaimValidation` in `StoryValidation.response`:
   - Compare `claimText` (snapshot) to current claim text
   - If text changed → **revoke** that claim's validation
   - If unchanged → validation persists
2. If all claims revoked → set overall `status: 'revoked'`
3. Owner can re-request for edited claims
4. Per-claim, not per-story — unchanged claims keep validation

---

## 6. Validation Dashboard

**Location:** `/validations` in main sidebar navigation.

**Two tabs, grouped by story, default sort by date:**

### Tab 1: Requests I've Sent
```
Led OAuth2 Migration                    2/3 validated
├─ [avatar] Bob Chen      Validated     Jan 15 → Jan 18
│  └─ 4/5 claims valid, 1 invalid (comment: "Timeline was Q2 not Q1")
├─ [avatar] Sarah Kim     Pending       Jan 15
└─ [?]      security-lead Invited       Jan 16

API Rate Limiting                       0/1 validated
└─ [avatar] Alex Dev      Pending       Jan 20
```
Actions: Resend (pending/expired), Cancel (pending), View Response (validated/disputed)

### Tab 2: Requests I've Received
```
Redesigned Auth Flow — by Honey Arora   Pending
└─ 6 claims to review                  [Validate →]

API Rate Limiting — by Alex Dev         Validated
└─ Validated Jan 10                     [View →]
```
Actions: Validate (pending), View (read-only)

---

## 7. Data Model

### New Models

```prisma
model StoryValidation {
  id                String    @id @default(cuid())
  storyId           String
  requesterId       String
  validatorId       String?
  validatorEmail    String?
  externalId        String
  tool              String
  activityIds       String[]
  token             String    @unique
  status            String    @default("pending")
  response          Json?
  comment           String?
  respondedAt       DateTime?
  storySnapshotHash String?
  storyEditedAfter  Boolean   @default(false)
  expiresAt         DateTime?
  cancelledAt       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  story     CareerStory @relation(fields: [storyId], references: [id], onDelete: Cascade)
  requester User        @relation("ValidationRequester", fields: [requesterId], references: [id])
  validator User?       @relation("ValidationValidator", fields: [validatorId], references: [id])

  @@unique([storyId, validatorId])
  @@index([validatorId, status])
  @@map("story_validations")
}

model UserToolIdentity {
  id         String   @id @default(cuid())
  userId     String
  tool       String
  externalId String
  idType     String   // "login"|"display_name"|"email"|"account_id"
  isPrimary  Boolean  @default(false)
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tool, externalId])
  @@index([userId])
  @@map("user_tool_identities")
}

model ValidationInvite {
  id              String    @id @default(cuid())
  validationId    String
  inviterUserId   String
  inviteeEmail    String
  inviteToken     String    @unique
  status          String    @default("pending")
  acceptedAt      DateTime?
  acceptedUserId  String?
  expiresAt       DateTime?
  createdAt       DateTime  @default(now())

  validation StoryValidation @relation(fields: [validationId], references: [id], onDelete: Cascade)
  inviter    User            @relation(fields: [inviterUserId], references: [id])

  @@unique([validationId, inviteeEmail])
  @@map("validation_invites")
}
```

### Modified Models
- `User` — add relations: `sentValidations`, `receivedValidations`, `toolIdentities`, `sentInvites`
- `CareerStory` — add relation: `validations`
- `NotificationType` enum — add: `VALIDATION_REQUEST`, `VALIDATION_RECEIVED`, `VALIDATION_DISPUTED`
- `EntityType` enum — add: `CAREER_STORY`, `STORY_VALIDATION`

---

## 8. Privacy & Trust

| Question | Decision |
|----------|----------|
| Can owner see who hasn't validated? | Yes — visible as "Pending" with date sent |
| Can validators see other validators? | No — not during or after validation |
| Retraction? | No — permanent, like an approval |
| Anonymous or attributed? | Attributed — validator's name + avatar shown |
| GDPR right-to-erasure? | User deletion cascades (SetNull on validatorId, clear response/comment) |
| Non-InChronicle participants? | "Invite to InChronicle" button, sends email, must sign up to validate |
| Claim edited after validation? | Validation revoked for that claim only |

---

## 9. Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| Solo work (no participants) | "Solo contribution — no external participants identified." No validation possible. |
| Participant not on InChronicle | "Invite to InChronicle" button sends email. `ValidationInvite` created. |
| Story edited after validation | Per-claim: edited claims have validation revoked. Unchanged claims keep validation. |
| Story unpublished after validation | Validations preserved. Re-publishing restores badges. |
| Validator marks a claim invalid | Claim marked "invalid" with context. Overall status: "disputed". Story NOT blocked. |
| Request expires (30 days) | Status: "expired". Owner can resend. Old token invalidated. |
| Story deleted after request sent | Token resolution fails → "This story is no longer available." |
| Same person, different identifiers | Dedup by resolved userId. If unresolved, appear as separate participants (Phase 1). |

---

## 10. Implementation Sequence

### Phase 1 — Foundation (weeks 1–2)
1. `UserToolIdentity` model + migration
2. Populate from MCP OAuth callbacks
3. `ParticipantExtractorService` (inverse of IdentityMatcher)
4. Identity resolution service
5. API: `GET /api/career-stories/:id/participants`

### Phase 2 — Validation Core (weeks 3–4)
1. `StoryValidation` + `ValidationInvite` models + migration
2. New notification types
3. API: `POST /api/career-stories/:id/validations`
4. API: `POST /api/career-stories/:id/validations/invite`
5. API: `POST /api/validations/:token/respond`
6. API: `GET /api/validations/:token`
7. Invitation acceptance flow
8. Notification integration
9. Post-edit detection hook

### Phase 3 — Frontend (weeks 5–6)
1. Evidence Panel component
2. "Request Validation" flow
3. Validator response page (`/validate/:token`)
4. Validation Dashboard (`/validations`)
5. Validation badges on published views

### Phase 4 — Polish (week 7)
1. Retraction/resend flows
2. Email templates
3. PragmaLink integration
4. Dashboard filters/sorting

---

## 11. Critical Files

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add StoryValidation, UserToolIdentity models |
| `backend/src/services/career-stories/pipeline/identity-matcher.ts` | Pattern for participant extraction |
| `backend/src/services/career-stories/story-publishing.service.ts` | Post-validation edit detection hook |
| `src/pages/stories/published-story.tsx` | Evidence Panel + validation badges |
| `backend/src/services/notification-queue.service.ts` | New notification types |
| `backend/src/routes/career-stories.routes.ts` | New endpoints |
| New: `backend/src/services/career-stories/participant-extractor.service.ts` | Core extraction logic |
| New: `backend/src/services/career-stories/validation.service.ts` | Validation logic |
| New: `backend/src/routes/validation.routes.ts` | Validation API endpoints |
| New: `src/pages/validations/index.tsx` | Validation Dashboard page |
| New: `src/pages/validations/validate.tsx` | Validator response page |
| New: `src/components/career-stories/EvidencePanel.tsx` | Evidence Panel component |
