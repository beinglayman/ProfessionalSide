# Research Brief: Career Evidence Signals Across Tools

**Date**: 2026-01-29
**Researcher**: SSR (Sr Staff Researcher)
**Status**: In Progress

---

## Mission

Map all interaction types across developer/productivity tools that can serve as career evidence - focused on what B2C APIs actually expose for individual users.

**Core Question**: What interactions that matter for demonstrating individual contribution are available via APIs that a B2C product can consume?

---

## Audience

Career-stories pipeline team building evidence extraction for individuals who want to:
- Build compelling career narratives from their work history
- Demonstrate impact beyond "I created X"
- Show collaboration, influence, and recognition signals

---

## Decision This Informs

1. **What to build**: Which evidence types have reliable API support?
2. **What to defer**: Which signals require heuristics vs. deterministic extraction?
3. **What to skip**: Which "nice to have" signals aren't feasible?

---

## Timeline

1 research cycle:
- Phase 1: Mission (this doc) ✓
- Phase 2: Landscape/Source Map
- Phase 3: Gold Seam identification
- Phase 4: Deep Dives per tool
- Phase 5: Team artifacts (extraction specs)

---

## Success Criteria

- [ ] Complete evidence signal inventory per tool
- [ ] API endpoint + field mapping for each signal
- [ ] B2C feasibility rating (Available / Partial / Unavailable)
- [ ] Gaps documented with workaround options
- [ ] Team can implement extraction without guessing

---

## Scope

### Evidence Types to Map

| Evidence Type | Description | Career Value |
|---------------|-------------|--------------|
| **Created** | Authored, initiated, opened | Direct ownership proof |
| **Contributed** | Commits, edits, updates, additions | Hands-on work evidence |
| **Reviewed** | Code review, doc review, feedback given | Technical judgment signal |
| **Approved** | Merged PR, signed off, accepted | Decision authority |
| **Mentioned** | @-tagged, called out by name | Recognized expertise |
| **Assigned** | Given responsibility, delegated to | Trust signal |
| **Invited** | Meeting attendee, doc shared with | Collaboration scope |
| **Watched** | Subscribed, following | Interest/ownership signal |
| **Reacted** | Emoji, upvote, endorsement | Lightweight engagement |
| **Impacted** | Downstream refs, dependencies, citations | Influence radius |

### Tools to Research

| Tool | Primary Use | B2C OAuth Available? |
|------|-------------|---------------------|
| **GitHub** | Code, PRs, Issues | Yes |
| **Jira** | Tickets, Projects | Yes (Atlassian) |
| **Confluence** | Docs, Pages | Yes (Atlassian) |
| **Slack** | Messaging, Threads | Yes (with scopes) |
| **Outlook/M365** | Email, Calendar | Yes (Microsoft Graph) |
| **Google Workspace** | Docs, Calendar, Meet, Drive | Yes |
| **Figma** | Design files | Yes |
| **Linear** | Issues (alt to Jira) | Yes |
| **Notion** | Docs (alt to Confluence) | Yes |

### Explicitly Out of Scope

- Admin/org APIs (need enterprise access)
- Scraping/unofficial APIs
- Signals requiring ML/NLP (sentiment, quality)
- Privacy-invasive signals (reading others' DMs)

---

## Open Questions

1. **Mention detection**: Structured field vs. text parsing needed?
2. **Historical depth**: How far back can each API fetch?
3. **Rate limits**: Feasible for bulk historical sync?
4. **Consent model**: What does user authorize access to?
5. **Cross-tool refs**: Can we link GitHub PR ↔ Jira ticket reliably?

---

## Deliverables

1. `01-SOURCE-MAP.md` - Primary sources per tool
2. `02-GOLD-SEAM-MAP.md` - High-value areas to dig deep
3. `03-DEEP-DIVE-*.md` - Per-tool analysis
4. `04-EVIDENCE-MATRIX.md` - Final mapping: Evidence × Tool × API
5. `05-EXTRACTION-SPEC.md` - Implementation guidance
