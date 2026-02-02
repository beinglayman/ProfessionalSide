# CD6 CONCEPT STAGE

**Date**: 2026-01-31
**Status**: COMPLETE
**Next**: DEFINE

---

## The Visionary - Problem Discovery & Opportunity Framing

### Problem Statement

**Current Pain:**
Users wait for AI processing before seeing their work activities. The current flow:
```
Activity happens → AI processes → Journal entry created → User sees it
```

This creates friction:
1. **Latency**: Users don't see immediate feedback
2. **Loss of raw context**: AI transformation loses the original tool-specific details
3. **No separation of concerns**: Drafts and polished stories are mixed
4. **No clear publishing path**: Stories don't flow to shareable portfolio

### Opportunity

**"WorkStream as Career Evidence Platform"**

Transform from a journal tool into a **career evidence management system**:
- **Capture**: Instant visibility of work as it happens
- **Curate**: AI-assisted story building with STAR framework
- **Share**: Evidence-backed portfolio for career advancement

### Target Users

| Persona | Need | Current Gap |
|---------|------|-------------|
| **Individual Contributor** | Track accomplishments for reviews | No instant view, AI delays |
| **Job Seeker** | Interview-ready stories | Stories aren't STAR-structured |
| **Manager** | Review team contributions | No workspace collaboration |
| **Career Coach** | Help clients build narratives | No shareable portfolio |

---

## The Strategist - Market Validation & Strategic Fit

### Competitive Landscape

| Competitor | Strength | Our Differentiation |
|------------|----------|---------------------|
| LinkedIn | Network reach | Evidence-backed, not self-reported |
| Brag Doc tools | Simple tracking | AI-powered STAR narratives |
| Notion/Obsidian | Flexibility | Integrated tool activity capture |
| Performance mgmt (Lattice) | Manager view | Individual ownership of narrative |

### Strategic Fit

**Alpha Value Proposition:**
> "Evidence-backed career stories, not self-reported claims"

Every story links to:
- The actual PR that was merged
- The Jira ticket that was closed
- The meeting where impact was discussed

**This is verifiable, defensible, and trustworthy.**

### Market Validation Questions

1. Do users want to see raw activities instantly? → **Yes** (demo-v2 feedback)
2. Is STAR format valuable for interviews? → **Yes** (industry standard)
3. Will users publish to workspaces? → **TBD** (B2B validation needed)
4. Is shareable profile valuable? → **Yes** (interview prep use case)

---

## The Balancer - Innovation vs Pragmatism Trade-offs

### Build vs Skip

| Feature | Build Now | Defer | Rationale |
|---------|-----------|-------|-----------|
| Activity Stream UI | ✅ | | Core value - instant visibility |
| Background draft generation | ✅ | | Removes wait time |
| STAR story editor | ✅ | | Alpha differentiator |
| Workspace publishing | ✅ | | B2B requirement |
| Network (cross-company) | | ✅ | Defer until workspace proven |
| Profile shareable link | ✅ | | Interview use case |

### Technical Trade-offs

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| Activity rendering | New component | Refactor existing | **New component** - cleaner separation |
| Background processing | Queue (Redis) | Simple async | **Simple async** - sufficient for now |
| Story storage | Extend JournalEntry | Separate CareerStory | **Separate** - already exists |

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Users ignore raw activities | Low | Medium | Make drafts prominent |
| STAR too rigid | Medium | Medium | Allow freeform stories too |
| Publishing friction | Medium | High | One-click publish flow |

---

## Validated Concept

### Three-Tab Architecture

1. **Journal** (Private)
   - Activity Stream: Raw `DemoToolActivity` with instant render
   - Draft Stories: Background-generated `DemoJournalEntry`

2. **Stories** (Private → Publishable)
   - `DemoCareerStory` with STAR framework
   - Evidence-linked to source activities
   - Publish actions to Workspace/Network

3. **Profile** (Shareable)
   - Aggregate of published stories
   - Shareable link for interviews
   - Auto-populated from Workspace/Network

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Activity visibility latency | < 100ms | Time from sync to render |
| Draft generation time | < 30s background | Time to create draft |
| Stories created per user | 3+ per month | User engagement |
| Profile views per share | Trackable | Link analytics |

---

## Approval

- [ ] Problem statement validated
- [ ] Opportunity framing approved
- [ ] Build/defer decisions confirmed
- [ ] Ready for DEFINE stage
