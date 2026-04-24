# Evidence Layer + Peer Validation - Design Document

**Status:** Design complete. Phase 1 implementation starts immediately; Phases 2-4 phased over subsequent sessions.

## Context

Today, a published career story on `/stories/:id` shows section prose and a flat list of source activities underneath. It doesn't visibly carry the product's core promise: *every claim has tool evidence or a peer behind it.* The roadmap calls for a **structured co-sign** feature as a Q2 Proof Layer build. This design covers both:

- The reader-facing **Evidence Layer** UI - a toggle that reveals activity groundings and peer validators inline.
- The end-to-end **peer validation workflow** that populates those validators.

Reference UX: `public/prototypes/evidence/proto-V6c-tufte-inline-badges.html` (Tufte two-column layout, inline witness badges, margin evidence cards, participants row).

## The four-layer credibility chain (recap)

Activity -> Story -> Narrative -> Profile. A story is credible because each claim inside it points back to Activities (tool evidence) AND/OR a peer who confirmed it. The Evidence Layer makes that chain visible to readers. Peer validation is how claims earn the green badge rather than the amber one.

---

## Part 1 - Evidence Layer UI

### The Evidence toggle

Lives on the published story view (`/stories/:id`, `src/pages/stories/published-story.tsx`). The toggle is visible only in the fullscreen reading view (the default for this route) - not in embedded previews elsewhere.

States:
- **Off (default for the first visit, then persists per-user):** Single-column reading layout, no badges, no margin cards, no inline markers. Clean prose.
- **On:** Two-column Tufte layout (60 / 5 / 35). Grounded claims get a soft underline; inline witness badges sit next to them; margin column on the right holds one card per activity-grounded evidence; ungrounded claims get an amber "Ungrounded" pill; disputed claims get a red dashed underline and a callout below the paragraph.

Toggle state persists per-user in localStorage. Authors probably keep it on; public readers probably keep it off.

### Grounded vs ungrounded vs disputed

- **Grounded:** The section's evidence[] contains at least one StorySource pointing to a real ToolActivity. The claim span underlines in soft primary-200.
- **Ungrounded:** No StorySource. Renders with an amber dashed underline plus an "&#9888; Ungrounded" pill. The publish modal already warns about these (see `PublishModal.tsx` ClaimResolutionPanel) - this just carries the warning into the read view.
- **Disputed:** A peer validator rejected the claim with a reason. Renders with a red dashed underline and a callout block below the paragraph showing the disputer's name + reason.

### Inline witness badges

Small 22x22 avatar circles sit directly after the claim span, one per validator. Color-coded:
- **Green ring** - validator approved
- **Amber ring** - invited but hasn't responded yet
- **Gray ring** - unknown user (person found in activities but not in InChronicle)

Hover shows a tooltip with the name and status. Click scrolls the matching margin card into view with a pulse highlight.

Empty state (grounded claim, no witnesses invited): small dashed circle plus "no witnesses" muted text, clickable to open "invite a validator."

### Margin evidence cards

Right column, one card per StorySource on the active section. Each card shows tool icon + short evidence title + link to the source + date. Hairline SVG dashed connector from the claim span to the margin card. Hover on either end highlights the pair and thickens the connector.

### Participants row

Below the story body. Cards for everyone who shows up in the story's activity set - GitHub reviewers, Jira assignees, Slack thread participants, meeting attendees - with their avatar, the tool that surfaced them, a validation status chip (Validated / Pending / Not invited), and for unknown users a "Invite to InChronicle" button.

This row IS the author's entry point to the validation flow (see Part 2).

---

## Part 2 - Validation workflow (the deep thinking the user asked for)

### How coworker user IDs are found

Three sources, in precedence order:

1. **Activity rawData -> email match -> InChronicle user.**
   - `extractRawDataContext` already pulls participant strings per tool (`reviewers[]` from GitHub, `assignee`/`reporter` from Jira, `to[]`/`attendees[]` from Outlook/Teams, `lastModifiedBy` from Confluence, `mentions` from Slack threads).
   - New service: `resolveActivityParticipants(activityIds[]) -> ResolvedParticipant[]`.
   - Each `ResolvedParticipant` carries `{ sourceTool, displayName, email?, roleInActivity, inchronicleUserId?: string | null }`.
   - Email lookup: exact match against `User.email`. Case-insensitive. Fall back to display-name match inside the author's NetworkConnection list (risky, only use when email is missing).
   - Unresolved participants still appear in the UI as "unknown users" - flagged for invite.

2. **Author's existing NetworkConnection list.**
   - When the participant string only has a display name (no email, e.g. a Slack display name), match against the author's accepted network connections.
   - This catches colleagues who are on InChronicle but whose activity data doesn't carry their email.

3. **Manual autocomplete** (author types a name/email in the invite flow).
   - Searches User table within the author's workspace or network scope.
   - For external emails (no match), creates an invite-to-sign-up flow: email goes out with a magic-link token that lets them sign up and validate in one go.

### Claim assignment - who validates what

A validator is not asked to approve every claim in the story. They're asked to validate only the claims tied to activities they participated in.

Algorithm (per story, per validator):
1. Get validator's participation set: all ToolActivities where they're a participant (by the resolver above).
2. Intersect with the story's activity set (`story.activityIds` plus activities referenced by `StorySource.activityId`).
3. For each resulting activity, find the claim spans / StorySources it grounds.
4. Those claims are the validator's "ask set."

This keeps the cognitive load low (a validator sees 2-5 claims, not 20) and means validation is *credible* (validators only speak to what they actually saw).

Edge case: author explicitly assigns a validator to a claim they weren't in (e.g., "my skip-level manager should approve this broader claim"). Supported via manual override.

### How validators are notified

1. **In-app notification** - new `NotificationType.STORY_VALIDATION_REQUESTED`, with `relatedEntityType = CAREER_STORY` and payload including `storyId`, `claimCount`, `authorName`. Uses the existing Notification model.

2. **Email** - template with story title, author name, number of claims, a one-click "Review story" button pointing to a tokenized validator URL. Even if the validator is logged out, the token logs them in to the validator view.

3. **Reminder** - if `PENDING` for more than 7 days, one gentle reminder email. No spamming.

4. **Preferences** - existing `NotificationPreferences` model gets new toggles: `storyValidationRequests` (on/off), `storyValidationDigest` (instant / daily / weekly).

### Validator-mode story view

New route: `/stories/:id/validate` (or same page with `?mode=validate` query). Only accessible when the logged-in user has a `StoryValidation` row with `status = PENDING` for this story, or via a valid tokenized link.

The view is the same published-story view, with Evidence ON forced, plus:
- A sticky top bar: "Reviewing a story by {author}. {N} claims need your approval."
- Per-assigned-claim, an inline action panel (appears near the claim margin card):
  - **Approve** (primary green button)
  - **Suggest an edit** (inline rich-text editor, sends back to author as a suggestion they can accept or reject)
  - **Dispute** (red button, requires a short reason - becomes the red callout visible to future readers)
- Claims not assigned to this validator are read-only (no action panel) but still visible in context.

After all assigned claims are actioned, the validator sees a "Thanks - your review is saved" confirmation. The author gets a notification (`STORY_VALIDATION_APPROVED` / `STORY_VALIDATION_DISPUTED` / `STORY_EDIT_SUGGESTED`).

### Approve / edit / dispute - what happens on each

- **Approve:** StoryValidation.status = APPROVED. Inline badge flips green. Author notified.
- **Suggest edit:** Validator's edit saved as a `StoryEditSuggestion` (new table). Claim badge shows purple "edit suggested" state. Author sees the suggestion, can Accept (replaces the claim text, re-sends to validator for re-approval) or Reject (badge drops back to pending, validator notified of rejection).
- **Dispute:** StoryValidation.status = DISPUTED, with `note` storing the reason. Inline claim flips to red dashed + red callout renders below the paragraph. Author notified. Author can Edit the claim (resets to pending) or Remove the claim entirely.

### Edit invalidation

If the author edits a claim after any validator has approved it, that claim's validations all flip back to PENDING with a note ("author edited on {date}"). Each affected validator gets a re-review notification. Other claims' validations remain intact.

This is critical for credibility. A validator approved a specific sentence; if that sentence changes, the approval has to follow.

### Pending-validations inbox

New UI at `/me/validations` (or a tab inside the existing notifications page). Shows each pending story:
- Story title + one-line summary
- Author avatar + name
- "3 claims need your approval"
- Deadline if set
- [Review story] button

Counter shown in the top-nav (like a notification badge). Same place as the existing notification bell.

---

## Data model additions

```prisma
model StoryValidation {
  id          String   @id @default(cuid())
  storyId     String
  /** Which claim the validator is approving. References StoryAnnotation id. */
  claimId     String
  /** The validator (InChronicle user). */
  validatorId String
  /** The author at the time of request (for history). */
  authorId    String
  status      StoryValidationStatus @default(PENDING)
  /** Freeform note: dispute reason or edit suggestion preview. */
  note        String?
  /** Activity ids that put this validator on the claim. */
  groundingActivityIds String[] @default([])
  requestedAt DateTime @default(now())
  respondedAt DateTime?

  story     CareerStory @relation(fields: [storyId], references: [id], onDelete: Cascade)
  validator User        @relation("StoryValidationValidator", fields: [validatorId], references: [id])
  author    User        @relation("StoryValidationAuthor", fields: [authorId], references: [id])

  @@unique([storyId, claimId, validatorId])
  @@index([validatorId, status])
}

enum StoryValidationStatus {
  PENDING
  APPROVED
  EDIT_SUGGESTED
  DISPUTED
  INVALIDATED   // prior approval reset because author edited
}

model StoryEditSuggestion {
  id            String   @id @default(cuid())
  validationId  String   @unique
  /** The claim text the validator is proposing. */
  suggestedText String
  /** Author's verdict after seeing the suggestion. */
  authorVerdict String?  // "accepted" | "rejected"
  /** Set when author responds. */
  respondedAt   DateTime?
  createdAt     DateTime @default(now())

  validation StoryValidation @relation(fields: [validationId], references: [id], onDelete: Cascade)
}
```

Extensions to existing models:

- `StoryAnnotation`: already has `startOffset`, `endOffset`, `annotatedText`, `style`, `note`. Use `style = "claim"` for story-claim annotations. Each claim gets one. Its `id` becomes the foreign key for `StoryValidation.claimId`.
- `NotificationType`: add `STORY_VALIDATION_REQUESTED`, `STORY_VALIDATION_APPROVED`, `STORY_VALIDATION_DISPUTED`, `STORY_EDIT_SUGGESTED`, `STORY_EDIT_ACCEPTED`, `STORY_VALIDATION_INVALIDATED`, `STORY_VALIDATION_REMINDER`.
- `EntityType`: add `CAREER_STORY`.

---

## Implementation phases

Each phase ships independently and delivers visible value.

| Phase | Scope | Est. |
|---|---|---|
| **1 (this session)** | Evidence toggle + Tufte two-column layout + margin cards from existing StorySource data + hairline connectors + Participants row with "unknown user" empty state. No inline claim badges yet (needs claim-extraction). No validation yet. | 1-2 days |
| **2** | Claim extraction - extend story-generation prompt to emit ordered (claim text, evidence indices) pairs per section. Persist claim spans as StoryAnnotation rows with style="claim". Render inline underlines. Inline badge slots (empty state only). | 3-5 days |
| **3** | Participant resolver service. Validator invitation flow at publish time. StoryValidation + StoryEditSuggestion models + migrations. Validator-mode story view. Validator notifications. Pending-validations inbox. Badge states (green / amber / red). | 1.5-2 weeks |
| **4** | Edit-invalidation. Reminder cron. External-invite flow for unknown users. Digest preferences. Validation analytics (per-user, per-story). | 1 week |

**Sequencing note:** Phase 1 ships an obvious visual win without backend changes - the Evidence toggle, Tufte layout, and margin cards all work off data that already exists. Phase 2 is the content-model change that makes claim-level granularity real. Phase 3 is the full validation machinery. Phase 4 is polish and ops.

Profile rebuild is still gated behind Stories co-sign (Phase 3 here) per the existing design doc.

---

## Open items to resolve before Phase 3

1. **External validator UX.** Should unknown participants (no InChronicle account) be able to validate a single story via a tokenized magic-link without signing up? Or must they sign up first? Leaning: require sign-up - keeps the network walled, and a peer validation is a strong signup hook.

2. **Validator scope - workspace vs network vs open.** For stories with `visibility = workspace`, should only workspace colleagues be able to validate? For `visibility = network`, only connections? Open validation (anyone who shows up in activities, regardless of current connection status) probably maximizes co-sign rate but opens a spam vector. Leaning: gate by the story's visibility + author's NetworkPolicy.

3. **Claim-extraction failure mode.** What if the LLM can't parse a section into clean claim spans? Fallback: treat the entire section summary as one claim grounded by all section evidence. Still works, just coarser.

4. **Dispute severity.** Should a single dispute hide the claim from public view, or just render it with a red mark? Leaning: render visibly - the credibility story is about honesty, not erasure. A disputed claim in the open is more honest than a hidden one.

## Phase 1 verification

After Phase 1 ships:

1. Navigate to any published story (`/stories/:id`). Top-right shows an "Evidence Off" toggle button.
2. Click it - page transitions to two-column layout. Story text reflows to 60% width, margin column appears at 35%.
3. Each StorySource shows as a margin card, aligned to its section. Tool icon + evidence title + date visible.
4. Hairline connector runs between the section heading and each of its margin cards.
5. Participants row at the bottom shows one card per unique activity participant. Known InChronicle users have their avatar; unknown users show a generic icon with an "Invite to InChronicle" button (currently a no-op until Phase 3).
6. Toggle persists: reload the page and Evidence stays on.
7. Toggle hides when not in fullscreen mode (verify by rendering the story in an embedded card elsewhere - toggle should be absent there).
