# Checker Review v1: Activity Stream & Draft Stories View

**Reviewer:** The Strategist (Checker)
**Date:** 2026-01-31
**Artifact Reviewed:** concept-brief-v1.md

---

## Evaluation Criteria

| Criterion | Weight | Score | Notes |
|-----------|--------|-------|-------|
| Strategic Fit | 25% | 9/10 | Core to product thesis — activity → story pipeline |
| Market Opportunity | 20% | 7/10 | Differentiates from simple journal apps |
| User Need Evidence | 20% | 8/10 | Clear pain point, demo-v2 validates UX pattern |
| Business Viability | 15% | 8/10 | Low cost — uses existing data models |
| Timing & Urgency | 10% | 9/10 | Blocks Career Stories flow (monetization path) |
| Feasibility | 10% | 9/10 | Data exists, UI patterns proven in prototypes |

**Weighted Score: 8.3/10**

---

## Strengths

1. **Clear problem articulation** — The "can't see what went into it" pain is real and specific

2. **Data foundation exists** — No schema changes needed; `activityIds[]` relationship already in place

3. **Validated UX** — Demo-v2 prototypes prove the two-column pattern works

4. **Strategic alignment** — This is the bridge between raw data and monetizable Career Stories

5. **Incremental value** — Even without Career Stories, users get better visibility

---

## Concerns

### Concern 1: "By Source" Tab Semantics
**Question:** Does "By Source" filter Draft Stories by contributing source, or show a flat list of raw activities?

**Recommendation:** Filter Draft Stories, not raw activities. A flat activity list would overwhelm users and duplicate the right panel.

### Concern 2: Large Activity Sets
**Question:** How to handle Draft Stories with 100+ raw activities?

**Recommendation:**
- Pagination in right panel (load more pattern)
- Show activity count badge on Draft Story card
- Consider "most recent N" with expand option

### Concern 3: Demo vs Production
**Question:** Will this work for both `DemoToolActivity` and `ToolActivity`?

**Recommendation:** Yes — the `sourceMode` field on JournalEntry already handles this. Backend should use appropriate activity table based on sourceMode.

---

## Clarifications Required

1. **Tab behavior confirmation:**
   - By Source = Filter Draft Stories by which tools contributed ✓
   - By Temporal = Show Draft Stories grouped by time ✓

2. **Activity source in right panel:**
   - When Demo mode → query `DemoToolActivity`
   - When Production mode → query `ToolActivity`
   - Determined by `JournalEntry.sourceMode`

3. **Empty state:**
   - No Draft Stories: "Connect tools and sync to see your work activities"
   - Draft Story with no activities: "This entry was created manually"

---

## Decision

**APPROVE** — Proceed to Gate 1

The concept is well-defined, strategically aligned, and technically feasible. Minor clarifications above should be incorporated but do not block progression.

---

## Recommendations for Define Stage

1. Write user stories for both tabs (By Source, By Temporal)
2. Define acceptance criteria for activity loading performance
3. Specify empty state copy and behavior
4. Document the sourceMode routing logic
