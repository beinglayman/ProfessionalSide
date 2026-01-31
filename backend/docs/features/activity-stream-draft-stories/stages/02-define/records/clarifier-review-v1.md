# Clarifier Review v1: Activity Stream & Draft Stories View

**Reviewer:** The Clarifier (Checker)
**Date:** 2026-01-31
**Artifact Reviewed:** requirements-doc-v1.md

---

## Evaluation Criteria

| Criterion | Weight | Score | Notes |
|-----------|--------|-------|-------|
| Completeness | 25% | 9/10 | All core flows covered, edge cases identified |
| Clarity | 25% | 9/10 | Clear Given/When/Then format, unambiguous |
| Testability | 20% | 9/10 | All ACs are verifiable, measurable |
| Consistency | 15% | 8/10 | Minor terminology variation (see below) |
| Traceability | 10% | 10/10 | Clear link to concept-brief-v1.md |
| Scope Appropriateness | 5% | 9/10 | Reasonable scope, clear deferrals |

**Weighted Score: 8.95/10**

---

## Strengths

1. **Testable acceptance criteria** — Every AC follows Given/When/Then and is verifiable

2. **Clear scope boundaries** — Explicit "Out of Scope" on each story prevents creep

3. **Edge cases identified** — Zero activities, manual entries, load failures covered

4. **API specification included** — Backend contract defined early

5. **MoSCoW prioritization** — Clear MUST/SHOULD/COULD breakdown

6. **NFRs specified** — Performance (500ms), accessibility, responsiveness

---

## Findings

### Finding 1: Terminology Consistency (Minor)
**Issue:** US-01 says "source icons" but US-08 says "Source Icons on Draft Story Card"
**Impact:** Low — same feature, different naming
**Recommendation:** Standardize to "source contribution icons"

### Finding 2: Activity Loading Threshold
**Issue:** US-04 says "first 20 activities" but NFR-01 mentions "≤50 activities for 500ms"
**Impact:** Medium — unclear performance target
**Recommendation:** Clarify: "Load 20, perform well up to 50 before pagination required"

### Finding 3: Demo/Production Routing
**Issue:** US-04 mentions demo/prod modes but doesn't specify how mode is determined
**Impact:** Low — implementation detail, but should be explicit
**Recommendation:** Add note: "Mode determined by `JournalEntry.sourceMode` field"

### Finding 4: Missing Error States
**Issue:** US-03 (By Source tab) doesn't specify error handling
**Impact:** Low — follows pattern from US-01
**Recommendation:** Add: "If filter fails: show error with retry"

---

## Test Scenarios Derived

From the requirements, I can derive these test scenarios:

### Scenario Group: Draft Story List (US-01)
- [ ] TC-01: List displays Draft Stories with title, count, icons
- [ ] TC-02: Empty state displays when no Draft Stories exist
- [ ] TC-03: Manual entry shows "Manual entry" badge
- [ ] TC-04: Error state shows retry button

### Scenario Group: Temporal Tab (US-02)
- [ ] TC-05: Time-based stories show date range
- [ ] TC-06: Cluster-based stories show cluster reference
- [ ] TC-07: Multi-month range displays correctly

### Scenario Group: Source Tab (US-03)
- [ ] TC-08: Source filter shows all available sources
- [ ] TC-09: Filtering by source shows matching Draft Stories
- [ ] TC-10: Multi-source Draft Story appears for any matching filter
- [ ] TC-11: Empty filter result shows appropriate message
- [ ] TC-12: Source with 0 activities is disabled

### Scenario Group: Activity Panel (US-04)
- [ ] TC-13: Selecting Draft Story loads activities in right panel
- [ ] TC-14: Activities show source icon, title, timestamp
- [ ] TC-15: Load more appears for >20 activities
- [ ] TC-16: Demo mode queries DemoToolActivity
- [ ] TC-17: Production mode queries ToolActivity
- [ ] TC-18: Zero activities shows manual entry message

---

## Decision

**APPROVE** — Proceed to Gate 2

The requirements document is comprehensive, testable, and appropriately scoped. Minor findings above are recommendations, not blockers.

---

## Recommendations for Design Stage

1. Create wireframes for both tab states (By Source, By Temporal)
2. Design the collapsed single-column layout for mobile
3. Specify exact source brand colors in design system
4. Define tree-line SVG behavior on scroll
