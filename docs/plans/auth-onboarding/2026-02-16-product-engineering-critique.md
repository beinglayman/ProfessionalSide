# Auth-Onboarding Critique Triage (Post-Brainstorming)

**Date:** 2026-02-16  
**Reviewer lens:** Product engineering review of core external boundary (OAuth + onboarding)

## Purpose

This document is a triage pass over the prior critique against the approved design:

- `docs/plans/auth-onboarding/2026-02-16-oauth-reliability-design.md`

Goal: isolate **real implementation deltas** from points already handled in design.

---

## 1) Items already addressed by the design

The following critique items are valid observations about current code, but they are already explicitly fixed in the design plan.

| Critique item | Already addressed in design |
|---|---|
| Onboarding is mocked (`setTimeout`) | Section 5b: replace with real OAuth hooks (`2026-02-16-oauth-reliability-design.md:399`) |
| Onboarding lists unsupported tools | Section 5a: replace 8 hardcoded tools with 4 real buckets (`2026-02-16-oauth-reliability-design.md:386`) |
| State lacks expiry | Fix 5: `iat` + 10-minute max age check (`2026-02-16-oauth-reliability-design.md:175`) |
| Encryption key fallback chain is unsafe | Fix 4: remove weak fallback, fail fast (`2026-02-16-oauth-reliability-design.md:159`) |
| Multiple OAuth service instances (mutex ineffective) | Problem #0: singleton-first prerequisite (`2026-02-16-oauth-reliability-design.md:20`) |
| Frontend type mismatch (`zoom`, `google_workspace`) | Section 5e calls this out (`2026-02-16-oauth-reliability-design.md:457`) |
| Callback always returns to settings | Section 5c adds onboarding return detection (`2026-02-16-oauth-reliability-design.md:433`) |
| “Security before onboarding” sequencing | Phase ordering already does this: Phase 1 -> Phase 4 (`2026-02-16-oauth-reliability-design.md:465`) |

---

## 2) Real gaps that remain (actionable deltas)

### Gap 1: Disconnect controller bypasses OAuth service (revocation path won’t run)

**Current behavior (verified):**

- API disconnect path does direct hard delete:
  - `backend/src/controllers/mcp.controller.ts:396`
- It does **not** call OAuth service disconnect method.

**Why this matters:**

- Design Fix 7 (provider revocation) is implemented in service-level disconnect path (`2026-02-16-oauth-reliability-design.md:224`), but production endpoint currently bypasses it.
- Hard delete removes historical integration row, weakening auditability and recovery diagnostics.

**Required change:**

- Route controller disconnect through `oauthService.disconnectIntegration()` (or equivalent centralized method that performs revocation + controlled local deactivation).
- Avoid raw `deleteMany` as the default path.

**Severity:** High

---

### Gap 2: Frontend tool type is duplicated in two files; design names only one

**Current behavior (verified):**

- `src/types/mcp.types.ts` union misses `zoom`, `google_workspace` (`src/types/mcp.types.ts:2`).
- `src/services/mcp.service.ts` enum also misses both (`src/services/mcp.service.ts:13`).

**Why this matters:**

- Fixing only one type surface leaves inconsistent compile-time/runtime tool coverage.

**Required change:**

- Update both:
  - `src/types/mcp.types.ts`
  - `src/services/mcp.service.ts`

**Severity:** Medium

---

### Gap 3: Mutex deployment assumption is implicit

**Current behavior (verified):**

- Design uses in-memory mutex map (`2026-02-16-oauth-reliability-design.md:128`).

**Why this matters:**

- Correct for single-process deployment today.
- Becomes insufficient under multi-instance scaling unless explicitly upgraded.

**Required change:**

- Add explicit design note:
  - “In-memory mutex is single-process only; on multi-instance deployment move to Redis lock or Postgres advisory lock.”

**Severity:** Low

---

## 3) What changes from prior critique

The prior critique overstated novelty on several points that were already in the design.  
The actionable scope should be narrowed to the 3 deltas above.

This keeps review signal high and implementation focused.

---

## 4) Final implementation delta list

1. Replace controller hard-delete disconnect with service-driven disconnect/revocation path.  
   File anchor: `backend/src/controllers/mcp.controller.ts:396`
2. Update frontend tool types in **both** type definitions.  
   File anchors: `src/types/mcp.types.ts:2`, `src/services/mcp.service.ts:13`
3. Add explicit single-instance mutex limitation note in design doc.  
   File anchor: `docs/plans/auth-onboarding/2026-02-16-oauth-reliability-design.md:128`

With these deltas, the design and critique align.
