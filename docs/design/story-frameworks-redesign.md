# Story Frameworks Redesign: What the Story Coach Actually Needs

> "STAR is a format. What's your STORY?"

---

## The Problem

Current frameworks are **structural formats** (STAR, CAR, SOAR). They tell you HOW to organize a story, not WHAT story you have.

A Story Coach doesn't ask "Do you want STAR or SOAR?"

A Story Coach asks:
- "Is this a crisis you navigated or a system you built?"
- "Did you lead people or lead technology?"
- "Is the hero moment the fix or the prevention?"

Then the coach picks the right structure AND emphasis.

---

## The Insight: Stories Have Archetypes

Every compelling career story fits one of a few **archetypes** - patterns that humans recognize and remember. The framework should match the archetype, not the other way around.

| Current Approach | Proposed Approach |
|------------------|-------------------|
| "Pick STAR or SOAR" | "What type of story is this?" |
| Format-first | Story-first |
| 8 similar structures | Distinct archetypes with tailored structures |
| User chooses format | Coach recommends based on extracted context |

---

## Story Archetypes

### 1. THE FIREFIGHTER 🔥
**Pattern:** Crisis emerged → You responded → Disaster averted

**Signals in extraction:**
- "2am page", "production incident", "almost shipped broken"
- "What almost went wrong?" yields dramatic answer
- Counterfactual is severe ("customers would have been double-charged")

**Structure:**
```
CRISIS: What was burning? Stakes?
RESPONSE: What did YOU do in the first 15 minutes?
RESOLUTION: How was it fixed?
PREVENTION: What changed so it never happens again?
```

**Best for:** Technical interviews, incident retrospectives, demonstrating ownership

**Example lead:** "Two weeks before launch, at 2am, I discovered a race condition that would have double-charged every customer..."

---

### 2. THE ARCHITECT 🏗️
**Pattern:** Saw the big picture → Designed the solution → Built it to last

**Signals in extraction:**
- "Designed", "architected", "from scratch"
- Multi-month timeline
- Decisions with long-term implications
- "Still in use today"

**Structure:**
```
VISION: What did you see that others didn't?
DESIGN: What trade-offs did you navigate?
BUILD: How did you make it real?
LEGACY: What's the lasting impact?
```

**Best for:** Senior/Staff interviews, promotion packets, system design discussions

**Example lead:** "I saw that our monolith couldn't scale to 10x traffic, so I designed a migration path that took 6 months but is still the foundation today..."

---

### 3. THE DIPLOMAT 🤝
**Pattern:** Competing interests → You bridged them → Alignment achieved

**Signals in extraction:**
- "Stakeholders", "buy-in", "resistance", "consensus"
- Named people with conflicting views
- "Politics", "competing priorities"
- Cross-team or cross-org scope

**Structure:**
```
CONFLICT: Who wanted what? What was at stake?
NAVIGATION: How did you understand each side?
BRIDGE: What solution satisfied everyone?
OUTCOME: What became possible after alignment?
```

**Best for:** Leadership interviews, promotion to senior+, cross-functional roles

**Example lead:** "The payments team wanted stability, the product team wanted velocity, and the CTO wanted both. I found a way to give everyone what they actually needed..."

---

### 4. THE MULTIPLIER 📈
**Pattern:** You made others better → Impact scaled beyond you

**Signals in extraction:**
- "Mentored", "trained", "team adopted"
- Impact through others ("the team now does X")
- Artifacts that outlive you (runbooks, frameworks, processes)
- "Even after I left..."

**Structure:**
```
BEFORE: What was the team/org struggling with?
INTERVENTION: What did you create/teach/establish?
ADOPTION: How did it spread?
MULTIPLICATION: What's the ongoing impact beyond you?
```

**Best for:** Manager interviews, staff+ promotion, leadership roles

**Example lead:** "The team was spending 40% of time on incidents. I created a reliability framework that's now used by 12 teams and reduced incidents org-wide by 70%..."

---

### 5. THE DETECTIVE 🔍
**Pattern:** Mystery problem → Systematic investigation → Root cause found

**Signals in extraction:**
- "Intermittent", "couldn't reproduce", "nobody knew why"
- Investigation process described
- "Turned out to be..."
- Technical depth in the diagnosis

**Structure:**
```
MYSTERY: What was happening that nobody understood?
INVESTIGATION: What hypotheses did you test?
DISCOVERY: What was the actual root cause?
FIX: How did you solve it and prevent recurrence?
```

**Best for:** Technical interviews, debugging demonstrations, IC roles

**Example lead:** "Users were randomly getting logged out and nobody could figure out why. I traced it through three services to find a race condition that only triggered under specific load patterns..."

---

### 6. THE PIONEER 🚀
**Pattern:** Uncharted territory → You explored it → New capability unlocked

**Signals in extraction:**
- "First time", "no playbook", "figured it out"
- Learning curve was steep
- Created documentation/process for others
- "Nobody had done this before"

**Structure:**
```
FRONTIER: What was the unknown territory?
EXPLORATION: How did you navigate without a map?
DISCOVERY: What did you learn that others didn't know?
TRAIL: What path did you create for those who follow?
```

**Best for:** Innovation roles, startups, emerging tech positions

**Example lead:** "We needed to integrate with an API that had no documentation and no support. I reverse-engineered the protocol and wrote the guide that three other teams now use..."

---

### 7. THE TURNAROUND ↩️
**Pattern:** Something was failing → You reversed it → Now it's succeeding

**Signals in extraction:**
- "Failing", "struggling", "underwater"
- Before/after metrics with dramatic improvement
- Inherited a mess
- "When I took over..."

**Structure:**
```
DECLINE: What was failing and why?
DIAGNOSIS: What did you identify as the real problem?
INTERVENTION: What did you change?
RECOVERY: What are the metrics now vs before?
```

**Best for:** Leadership interviews, turnaround situations, management roles

**Example lead:** "When I inherited the project, it was 3 months behind schedule with 40% test coverage and daily production incidents. Six months later..."

---

### 8. THE PREVENTER 🛡️
**Pattern:** Saw risk others missed → Took action → Disaster never happened

**Signals in extraction:**
- "Would have", "if we hadn't", "caught before"
- Counterfactual is the impact (hard to prove)
- Proactive, not reactive
- "Nobody noticed because nothing went wrong"

**Structure:**
```
RISK: What did you see that others didn't?
EVIDENCE: How did you know it was real?
ACTION: What did you do to prevent it?
NON-EVENT: What would have happened? What didn't happen?
```

**Best for:** Security roles, reliability engineering, risk management

**Example lead:** "I noticed our token refresh logic had a race condition. It wasn't causing problems yet, but at 10x scale it would have logged out every user during peak hours..."

---

## Framework Selection Logic

The Story Coach uses extracted context to recommend an archetype:

```typescript
interface ExtractedContext {
  // From DIG phase
  obstacle: string;
  keyDecision: string;
  namedPeople: string[];

  // From IMPACT phase
  impactType: 'performance' | 'cost' | 'capability' | 'risk' | 'experience';
  metric: string;
  counterfactual: string;

  // Detected signals
  signals: {
    hasCrisis: boolean;           // "2am", "incident", "emergency"
    hasArchitecture: boolean;      // "designed", "architected", "built system"
    hasStakeholders: boolean;      // named people with conflicts
    hasMultiplication: boolean;    // "team adopted", "still in use"
    hasMystery: boolean;           // "couldn't figure out", "intermittent"
    hasPioneering: boolean;        // "first time", "no documentation"
    hasTurnaround: boolean;        // "failing", "inherited", "behind"
    hasPrevention: boolean;        // "would have", "caught before"
  };
}

function recommendArchetype(ctx: ExtractedContext): StoryArchetype {
  // Priority order matters - some stories fit multiple archetypes

  if (ctx.signals.hasCrisis && ctx.counterfactual) {
    return 'FIREFIGHTER';  // Crisis with clear stakes
  }

  if (ctx.signals.hasTurnaround && ctx.metric) {
    return 'TURNAROUND';  // Dramatic before/after
  }

  if (ctx.signals.hasStakeholders && ctx.namedPeople.length >= 3) {
    return 'DIPLOMAT';  // Multiple named stakeholders
  }

  if (ctx.signals.hasMultiplication) {
    return 'MULTIPLIER';  // Impact through others
  }

  if (ctx.signals.hasMystery) {
    return 'DETECTIVE';  // Investigation narrative
  }

  if (ctx.signals.hasPioneering) {
    return 'PIONEER';  // Uncharted territory
  }

  if (ctx.signals.hasPrevention && ctx.counterfactual) {
    return 'PREVENTER';  // Risk that didn't materialize
  }

  if (ctx.signals.hasArchitecture) {
    return 'ARCHITECT';  // System building
  }

  // Default fallback
  return 'FIREFIGHTER';  // Most stories have a crisis element
}
```

---

## Mapping Archetypes to Existing Frameworks

For backward compatibility and generation, each archetype maps to a structural framework with customized section emphasis:

| Archetype | Base Framework | Section Customization |
|-----------|----------------|----------------------|
| FIREFIGHTER | SOAR | Obstacles = the crisis, emphasize urgency |
| ARCHITECT | STARL | Learning = design decisions, emphasize longevity |
| DIPLOMAT | SHARE | Hindrances = stakeholder conflicts, emphasize influence |
| MULTIPLIER | SHARE + custom | Add "Multiplication" section for scaled impact |
| DETECTIVE | CAR | Challenge = the mystery, emphasize investigation |
| PIONEER | CARL | Context = uncharted territory, Learning = what you discovered |
| TURNAROUND | SOAR | Situation = the decline, Results = the recovery |
| PREVENTER | CAR + custom | Result = what DIDN'T happen (counterfactual) |

---

## Story Coach Framework Recommendation

After extraction, the Story Coach presents:

```
┌─────────────────────────────────────────────────────────────────┐
│ STORY COACH: FRAMEWORK RECOMMENDATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Based on what you told me, this is a FIREFIGHTER story.        │
│                                                                 │
│ The hook: "Two weeks before launch, at 2am, I discovered a     │
│ race condition that would have double-charged every customer." │
│                                                                 │
│ Structure I recommend:                                          │
│ • CRISIS: The 2am discovery, what was at stake                 │
│ • RESPONSE: Assembling the team, 72-hour sprint                │
│ • RESOLUTION: Finding and fixing the race condition            │
│ • PREVENTION: The runbook you wrote, ongoing impact            │
│                                                                 │
│ This works because:                                            │
│ ✓ Clear stakes (millions in refunds)                           │
│ ✓ Your specific actions under pressure                         │
│ ✓ Quantifiable outcome (50-100x deployment improvement)        │
│ ✓ Lasting impact (runbook still in use)                        │
│                                                                 │
│ Alternative angles:                                             │
│ • ARCHITECT - if you want to emphasize the system design       │
│ • MULTIPLIER - if you want to emphasize the runbook adoption   │
│                                                                 │
│ [Use FIREFIGHTER]  [Try ARCHITECT]  [Try MULTIPLIER]           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Use Case Mapping

Different contexts need different archetypes:

| Use Case | Best Archetypes | Why |
|----------|-----------------|-----|
| **Behavioral Interview** | FIREFIGHTER, DETECTIVE, DIPLOMAT | Shows how you handle pressure, solve problems, work with people |
| **Technical Interview** | DETECTIVE, ARCHITECT, PIONEER | Shows depth, system thinking, exploration |
| **Promotion Packet** | MULTIPLIER, ARCHITECT, DIPLOMAT | Shows scope, lasting impact, leadership |
| **Brag Document** | TURNAROUND, FIREFIGHTER, MULTIPLIER | Shows before/after, heroic moments, scaled impact |
| **1:1 with Manager** | PREVENTER, PIONEER, DETECTIVE | Shows proactive thinking, learning, depth |
| **Executive Summary** | TURNAROUND, MULTIPLIER | Shows business impact, leverage |

---

## The Opening Line Test

A good archetype gives you a compelling opening line:

| Archetype | Opening Line Pattern |
|-----------|---------------------|
| FIREFIGHTER | "At 2am, two weeks before launch, I discovered..." |
| ARCHITECT | "I saw that our system couldn't scale, so I designed..." |
| DIPLOMAT | "Three teams wanted three different things. I found a way to..." |
| MULTIPLIER | "The team was struggling with X. I created Y, and now 12 teams use it..." |
| DETECTIVE | "Users were experiencing X and nobody could figure out why. I traced it to..." |
| PIONEER | "We needed to do X but there was no playbook. I figured out..." |
| TURNAROUND | "When I took over, it was failing. Six months later..." |
| PREVENTER | "I noticed a risk that nobody else saw. If I hadn't acted..." |

If you can't write a compelling opening line, you picked the wrong archetype.

---

## Implementation Notes

### Database Changes

```prisma
model CareerStory {
  // ... existing fields

  // New: archetype-based framework
  archetype        String?   // 'firefighter', 'architect', 'diplomat', etc.
  archetypeSections Json?    // Custom sections for this archetype

  // Keep for backward compatibility
  framework        String    // 'STAR', 'SOAR', etc.
  sections         Json      // Standard framework sections
}
```

### Migration Path

1. Keep existing 8 frameworks working (backward compatible)
2. Add archetype as optional enhancement
3. Story Coach recommends archetype, maps to framework for generation
4. Over time, archetype-native generation can replace framework mapping

### Prompt Enhancement

When generating with an archetype, the prompt includes:

```
You are generating a {ARCHETYPE} career story.

The hook for this story type is: {ARCHETYPE_HOOK_PATTERN}

Structure:
{ARCHETYPE_SECTIONS}

Emphasis:
{ARCHETYPE_EMPHASIS}

The user's extracted context:
{EXTRACTED_CONTEXT}
```

---

## Summary

| Current | Proposed |
|---------|----------|
| 8 structural frameworks | 8 story archetypes |
| User picks format | Coach recommends based on story |
| "STAR or SOAR?" | "Is this a crisis or a system you built?" |
| Generic sections | Archetype-specific emphasis |
| Opening: "In my role as..." | Opening: "At 2am, two weeks before launch..." |

**The framework should serve the story, not the other way around.**
