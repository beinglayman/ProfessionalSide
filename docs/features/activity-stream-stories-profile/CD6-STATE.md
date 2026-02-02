# CD6 Project State

## Project Info
- **Name**: Activity Stream, Stories & Profile (Three-Tab Architecture)
- **Created**: 2026-01-31
- **Current Stage**: DEVELOP
- **Status**: READY

## Problem Statement
Current journal flow is slow because raw activities are immediately converted to journal entries via AI processing. Users wait for processing before seeing their work.

Need a faster, more intuitive architecture:
1. **Journal Tab**: Raw activities + draft stories (instant render)
2. **Stories Tab**: STAR-based career narratives with evidence
3. **Profile Tab**: Published stories (shareable career portfolio)

## Vision
- Render raw `DemoToolActivity` instantly with tool logos and temporal filters
- Background AI processing for draft generation
- Evidence-backed STAR stories as the alpha feature
- Publishing flow: Story → Workspace (B2B) → Network (cross-company) → Profile (shareable link)

## Stage History
| Stage | Status | Date | Notes |
|-------|--------|------|-------|
| CONCEPT | COMPLETE | 2026-01-31 | Visionary + Strategist + Balancer done |
| DEFINE | COMPLETE | 2026-01-31 | Specifier + Clarifier + Scope Guardian done |
| DESIGN_SYSTEM | COMPLETE | 2026-01-31 | Architect + Technical Reviewer + Integration Arbiter done |
| DESIGN_UX | COMPLETE | 2026-01-31 | Experience Designer + Usability Advocate done |
| DEVELOP | PENDING | - | - |
| DETECT | PENDING | - | - |
| DEPLOY | PENDING | - | - |

## Key Decisions
- [x] Confirm three-tab architecture (Journal / Stories / Profile)
- [x] Define Activity Stream UI components (via invariants)
- [x] Define Stories → Profile publishing flow (via invariants)
- [x] Demo mode detection: X-Demo-Mode header (Integration Arbiter)
- [x] Visibility storage: Column on DemoCareerStory (Integration Arbiter)
- [x] STAR validation: On publish only, require summary (Integration Arbiter)
- [ ] Decide on background processing strategy

## Artifacts Created
- `CONCEPT.md` - Visionary + Strategist + Balancer analysis
- `GAP-ANALYSIS.md` - API and screen inventory with gaps
- `DEFINE.md` - Invariant-focused requirements (Specifier + Clarifier + Scope Guardian)
- `DESIGN-SYSTEM.md` - Technical architecture (Architect + Technical Reviewer + Integration Arbiter)
- `DESIGN-UX.md` - User flows, wireframes, accessibility (Experience Designer + Usability Advocate)

## Domain Objects
| Layer | Model | Purpose |
|-------|-------|---------|
| Raw | `DemoToolActivity` | Raw tool events (GitHub, Jira, etc.) |
| Cluster | `DemoStoryCluster` | Grouped activities |
| Draft | `DemoJournalEntry` | AI-enhanced drafts |
| Story | `DemoCareerStory` | STAR-structured narratives |

## References
- Demo V2 mockups: `__docs/plans/2026-01-24-journal-settings-ux-analysis/journal-page/demo-v2/`
- Existing dual-path docs: `docs/features/dual-path-demo-journal-rendering/`
