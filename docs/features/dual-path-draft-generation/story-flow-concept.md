# Story Flow Concept

## Architecture: Dual-Path Draft Generation

```
                              ┌─────────────────────────────────┐
                              │        RAW ACTIVITIES           │
                              │   (tool data, events, refs)     │
                              └───────────────┬─────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │                                                   │
                    ▼                                                   ▼
    ┌───────────────────────────────┐           ┌───────────────────────────────┐
    │     TEMPORAL DETECTION        │           │     CLUSTER EXTRACTION        │
    │                               │           │                               │
    │  • Daily patterns             │           │  • Shared references          │
    │  • Weekly summaries           │           │  • Cross-tool relations       │
    │  • Sprint boundaries          │           │  • Project groupings          │
    │  • Template matching          │           │  • May span weeks+            │
    │                               │           │                               │
    └───────────────┬───────────────┘           └───────────────┬───────────────┘
                    │                                           │
                    ▼                                           ▼
    ┌───────────────────────────────┐           ┌───────────────────────────────┐
    │     DRAFT JOURNAL ENTRY       │           │       DRAFT STORY             │
    │                               │           │                               │
    │  Auto-created, bare minimum   │           │  Auto-created, bare minimum   │
    │  polishing via prompts        │           │  polishing via prompts        │
    │                               │           │                               │
    │  Focus: "What happened when"  │           │  Focus: "What relates"        │
    └───────────────┬───────────────┘           └───────────────┬───────────────┘
                    │                                           │
                    └─────────────────────┬─────────────────────┘
                                          │
                                          ▼
                    ┌─────────────────────────────────────────────┐
                    │         NARRATIVE ENRICHMENT LAYER          │
                    │                                             │
                    │  Apply templates based on purpose:          │
                    │                                             │
                    │  • STAR Story (behavioral interview)        │
                    │  • 1:1 Meeting Notes                        │
                    │  • Skill Gap Analysis                       │
                    │  • Project Impact Document                  │
                    │  • Contribution Summary                     │
                    │  • Performance Review Input                 │
                    │  • Technical Decision Record                │
                    │  • ... n more templates                     │
                    │                                             │
                    └─────────────────────┬───────────────────────┘
                                          │
                                          ▼
                    ┌─────────────────────────────────────────────┐
                    │              PUBLISHED VIEW                 │
                    └─────────────────────────────────────────────┘
```

## Key Distinctions

| Aspect | Draft Journal Entry | Draft Story |
|--------|---------------------|-------------|
| **Grouping logic** | Temporal patterns (daily, weekly, sprint) | Reference/relation clustering |
| **Time scope** | Fixed window | Unbounded (follows the thread) |
| **Detection** | Template matching on time patterns | Graph-based clustering on refs |
| **Primary question** | "What did I do today/this week?" | "What's the full picture of X?" |
| **Cardinality** | 1 per time window | n per cluster discovered |

## Temporal Pattern Detection

System auto-detects applicable patterns from the data:
- Daily work log
- Weekly summary
- Sprint retrospective
- Monthly review
- Custom cadences

## Narrative Templates (Enrichment)

Both draft types can be enriched with purpose-specific templates:

1. **STAR Story** - Situation, Task, Action, Result for interviews
2. **1:1 Notes** - Manager sync format with wins, blockers, asks
3. **Skill Gap Analysis** - What was learned, what's missing
4. **Project Impact** - Contribution and outcomes for a project
5. **Technical Decision Record** - ADR-style for key decisions
6. **Performance Review Input** - Formatted for review cycles
7. **Handoff Document** - Context transfer to new team member

## Smart View (Multiple Facades)

The same underlying data accessible through:
1. **Temporal view** - Calendar/timeline navigation
2. **Project view** - Grouped by project/epic
3. **Skill view** - Grouped by technologies/competencies
4. **Reference view** - Follow the thread (tickets, PRs, docs)
