# Rough-Notation Annotations + Tufte Margin Notes — Production Integration

## Context

The prototype (`src/prototypes/tufte-margin-notes.html`) validates that rough-notation hand-drawn marks + Tufte margin notes create a warm, editorial feel for career stories. This plan brings that into the production NarrativePreview.

**Key design (from prototype iteration):**
- **Marks and notes are decoupled.** Select text → pick a visual style. Click an existing mark → optionally add/edit/remove a note.
- **Style is independent of intent.** All marks are yellow. 6 visual styles: marker, underline, box, circle, strike-through, bracket.
- **Notes are optional and add-later.** A mark without a note is perfectly valid.
- **Hover pairing.** Hover either side → both glow + dashed connector line.
- **Asides.** Standalone margin notes with no text mark.

**The new annotation system supersedes the existing note system** (`StorySource` with `sourceType: 'user_note'` + `NotesPillBar`). Those notes were section-level free text. The new annotations are **anchored to specific text ranges** with margin placement.

---

## What Changes

### Data Model

**New `StoryAnnotation` table** (not extending StorySource — different schema, lifecycle, and UI).

```prisma
model StoryAnnotation {
  id            String   @id @default(cuid())
  storyId       String
  sectionKey    String          // "situation", "task", etc.
  startOffset   Int             // -1 for asides (no text anchor)
  endOffset     Int             // -1 for asides
  annotatedText String          // exact text for staleness detection (empty for asides)
  style         String          // "highlight" | "underline" | "box" | "circle" | "strike-through" | "bracket" | "aside"
  note          String?         // margin note text (required for asides, optional for marks)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  story         CareerStory @relation(fields: [storyId], references: [id], onDelete: Cascade)
  @@index([storyId])
}
```

Add `annotations StoryAnnotation[]` to `CareerStory` model.

### Existing Note System Removal

- Remove `NotesPillBar` component and its rendering from `SourceFootnotes`
- Remove "Add note" buttons from `SourceFootnotes`
- Remove `noteInputSections` state and related handlers from `NarrativePreview`
- Remove `handleAddNote` callback and `useAddStorySource` for notes
- Keep `StorySource` model intact (still used for `activity` and `wizard_answer` source types)
- Existing `user_note` sources remain in DB but stop being created/displayed

### Layout Change

Current: `[spine w-5] [content flex-1]` — flex, single column.

New (when annotations with notes exist OR annotate mode active):
```
[margin 200px hidden lg:block] [spine w-5] [content flex-1]
```

Prepend a flex child to `NarrativeSectionHeader`'s existing flex layout. The margin column is `hidden lg:block` — hides on mobile, shows on desktop. No grid migration needed.

### rough-notation Integration

React renders `<span data-annotation-id="...">` wrappers at annotation offsets within each section. After mount, a `useEffect` finds those spans via the container ref and calls `rough-notation.annotate()` on each. On unmount, `annotation.remove()` cleans up SVGs.

The **existing emphasis pipeline** (`renderContent()` with metrics/patterns/terms/verbs) is **unchanged**. Annotation spans wrap text segments *before* the emphasis pipeline runs, and each segment passes through `renderContent()` independently.

---

## Phases

### Phase 1: Backend — Schema + CRUD (0.75d)

**Files to modify:**
- `backend/prisma/schema.prisma` — add `StoryAnnotation` model + relation on `CareerStory`
- `backend/src/services/career-stories/story-annotation.service.ts` — **new**, CRUD service (follows `story-source.service.ts` pattern)
- `backend/src/controllers/career-stories.controller.ts` — add 4 routes:
  - `GET /stories/:storyId/annotations`
  - `POST /stories/:storyId/annotations`
  - `PATCH /stories/:storyId/annotations/:annotationId`
  - `DELETE /stories/:storyId/annotations/:annotationId`
- `backend/src/controllers/career-stories.schemas.ts` — add Zod schemas
- Enrich story GET response to include `annotations` (like sources)

Run: `npx prisma migrate dev --name add_story_annotations`

### Phase 2: Frontend Types + Hooks (0.5d)

**Files to modify:**
- `src/types/career-stories.ts` — add `AnnotationStyle` type, `StoryAnnotation` interface, add `annotations?` to `CareerStory`
- `src/services/career-stories.service.ts` — add `createAnnotation`, `updateAnnotation`, `deleteAnnotation` methods
- `src/hooks/useCareerStories.ts` — add `useCreateAnnotation()`, `useUpdateAnnotation()`, `useDeleteAnnotation()` mutations

### Phase 3: Core — `useRoughAnnotations` hook + annotation-utils (1d)

**New files:**
- `src/hooks/useRoughAnnotations.ts` — bridges React DOM refs → `rough-notation.annotate()` calls
  - Takes container ref + annotations array + section text
  - Validates staleness (`text.slice(start, end) !== annotatedText` → skip)
  - Applies style config (6 styles, all yellow family)
  - Cleans up on unmount/re-render
- `src/components/career-stories/annotation-utils.ts` — **new**, utilities:
  - `splitTextByAnnotations(text, annotations)` — splits section text into segments by annotation offsets, returns `{ text, annotationId?, annotation? }[]`
  - `getTextOffsetFromSelection(containerEl, range)` — walks text nodes via TreeWalker to compute character offsets from a DOM selection range

**Install:** `npm install rough-notation`

### Phase 4: Annotation-Aware Text Rendering (1d)

**Files to modify:**
- `src/components/career-stories/NarrativeSection.tsx`:
  - Add prop: `annotations?: StoryAnnotation[]`
  - Add `containerRef` on the `<p>` element
  - In read-only path: call `splitTextByAnnotations()` → for each segment, call `renderContent(segment.text)` → annotated segments wrapped in `<span data-annotation-id={id}>`
  - Call `useRoughAnnotations(containerRef, annotations, content)`
  - Add `onClick` handler on annotation spans (delegates to parent via callback prop)

### Phase 5: Selection Popover + Annotation Popover (1d)

**New files:**
- `src/components/career-stories/SelectionPopover.tsx` — fixed-position popover with 6 style icon buttons
  - Positioned above selection via `Range.getBoundingClientRect()`
  - On style click: calls `getTextOffsetFromSelection()` → `createAnnotation` mutation
  - Only visible when annotate mode active
- `src/components/career-stories/AnnotationPopover.tsx` — fixed-position popover for editing existing marks
  - Shows truncated text, note textarea, Save button, Remove button
  - Save → `updateAnnotation`, Remove → `deleteAnnotation`
  - Enter to save, Escape to close

**Files to modify:**
- `src/components/career-stories/NarrativePreview.tsx`:
  - Add state: `annotateMode`, `selectionPopover`, `editPopover`
  - Add "Annotate" toggle to dropdown menu (alongside Coach review, Emphasis, Practice)
  - Wire `mouseup` listener for selection detection
  - Pass `annotations` (from `story.annotations`) to each `NarrativeSection`
  - Render both popovers as siblings at article level

### Phase 6: Margin Column + Hover Pairing (1d)

**New files:**
- `src/components/career-stories/MarginColumn.tsx` — renders alongside each section
  - Shows margin notes for annotations with `note !== null`
  - Shows "+" aside button (in annotate mode)
  - Vertical positioning: `annotationSpan.getBoundingClientRect()` relative to section container
  - Aside input: inline textarea, Enter to save (creates annotation with `style: 'aside'`)

**Files to modify:**
- `src/components/career-stories/NarrativeSectionHeader.tsx`:
  - Prepend `<MarginColumn>` as first flex child when `showMargin` is true
  - `showMargin` = any annotation has a note OR annotate mode active
- `src/components/career-stories/NarrativePreview.tsx`:
  - Pass `annotateMode` and annotation data to section headers
  - SVG connector layer for hover pairing (absolute positioned, `pointer-events: none`)

### Phase 7: Remove Old Note System + Mobile (0.5d)

**Files to modify:**
- `src/components/career-stories/SourceFootnotes.tsx` — remove `NotesPillBar` usage, remove "Add note" buttons, remove `onAddNote`/`forceShowNoteInput`/`onNoteInputClosed`/`onRequestAddNote` props
- `src/components/career-stories/NarrativePreview.tsx` — remove `noteInputSections` state, remove `handleAddNote`, simplify `SourceFootnotes` props
- Mobile: marks visible (rough-notation SVGs render), margin hides (`hidden lg:block`), tapping a mark with a note shows auto-dismissing tooltip

**File to delete:**
- `src/components/career-stories/NotesPillBar.tsx`

### Phase 8: Tests (0.75d)

**New test files:**
- `src/components/career-stories/annotation-utils.test.ts` — `splitTextByAnnotations` edge cases, `getTextOffsetFromSelection` with mock ranges
- `src/components/career-stories/SelectionPopover.test.tsx` — renders 6 styles, calls onCreate
- `src/components/career-stories/AnnotationPopover.test.tsx` — save/remove/keyboard
- `src/components/career-stories/MarginColumn.test.tsx` — renders notes, aside button, hides when empty

**Files to update:**
- `src/components/career-stories/NarrativePreview.test.tsx` — annotate mode toggle, annotation spans rendered
- `src/components/career-stories/SourceFootnotes.test.tsx` — remove NotesPillBar expectations

---

## Critical Design Details

### Offset Computation from DOM Selection

The DOM has nested `<mark>`, `<span>`, `<strong>` from the emphasis pipeline. To get character offsets into the raw section text:

```ts
function getTextOffsetFromSelection(container: HTMLElement, range: Range): { start: number; end: number } {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let charCount = 0;
  let start = -1, end = -1;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node === range.startContainer) start = charCount + range.startOffset;
    if (node === range.endContainer) { end = charCount + range.endOffset; break; }
    charCount += node.textContent?.length || 0;
  }
  return { start, end };
}
```

### Staleness Detection

Annotations store `annotatedText`. On render: `sectionText.slice(startOffset, endOffset) !== annotatedText` → stale, skip rendering. No fuzzy matching in v1.

### Style Config (matches prototype)

```ts
const YELLOW = { fill: 'rgba(253, 224, 71, 0.4)', stroke: '#eab308' };
const STYLE_CONFIG = {
  highlight:        { rnType: 'highlight',      strokeWidth: 1,   padding: [2, 3] },
  underline:        { rnType: 'underline',      strokeWidth: 2.5, padding: [0, 2] },
  box:              { rnType: 'box',             strokeWidth: 2,   padding: 4 },
  circle:           { rnType: 'circle',          strokeWidth: 2,   padding: 8 },
  'strike-through': { rnType: 'strike-through', strokeWidth: 2.5, padding: 0 },
  bracket:          { rnType: 'bracket',         strokeWidth: 2,   padding: 4, brackets: ['left'] },
};
```

All marks use YELLOW. `fill` for marker highlights, `stroke` for everything else.

---

## Verification

1. `npx prisma migrate dev` succeeds, new table created
2. Backend tests pass for annotation CRUD
3. Open a career story → annotations from DB render with rough-notation SVGs
4. Enable "Annotate" mode → select text → popover with 6 style buttons
5. Click a style → mark appears with rough SVG, saved to DB
6. Click an existing mark → edit popover → type a note → Save → margin note appears
7. Hover margin note → both glow + connector line
8. Click "+" in margin → type aside → appears as italic gray margin text
9. Click "Remove mark" → annotation deleted, SVG removed
10. Resize to < 1024px → margin hides, marks stay, tap shows tooltip
11. Regenerate story → stale annotations silently hidden
12. Old NotesPillBar no longer renders
13. All existing tests pass, new tests pass
