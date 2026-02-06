# Archetype-Driven Prompts: How the Story Coach Shapes Generation

> "The prompt should know what story you're telling before it writes a word."

---

## The Insight

Current prompts are **format-aware** but **story-agnostic**:

```
Transform this journal entry into a STAR career story.
- Situation: The context and business challenge
- Task: Specific objectives or responsibilities
- Action: Concrete steps taken
- Result: Measurable outcomes
```

This produces generic output because it doesn't know:
- What makes THIS story compelling
- What the hook is
- What to emphasize
- What to leave out

**Archetype-driven prompts know the story before they write it.**

---

## Prompt Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GENERATION PROMPT                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ARCHETYPE CONTEXT (new)                                     │
│     - What type of story this is                                │
│     - The hook pattern                                          │
│     - What makes this archetype compelling                      │
│                                                                 │
│  2. EXTRACTED CONTEXT (new - from Story Coach)                  │
│     - The buried lede                                           │
│     - Named people and their roles                              │
│     - Quantified impact                                         │
│     - Counterfactual                                            │
│                                                                 │
│  3. JOURNAL CONTENT (existing)                                  │
│     - Title, description, phases                                │
│     - Activities and evidence                                   │
│                                                                 │
│  4. SECTION GUIDANCE (enhanced)                                 │
│     - Archetype-specific sections                               │
│     - Emphasis instructions                                     │
│     - Anti-patterns to avoid                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Archetype System Prompts

### FIREFIGHTER 🔥

```markdown
You are generating a FIREFIGHTER career story.

## What Makes a Firefighter Story Compelling

The reader should feel the urgency. They should think: "What would I have done at 2am?"

The hook is the CRISIS MOMENT - the instant when everything could have gone wrong.
The hero is someone who RESPONDS under pressure, not someone who "worked on a project."

## The Pattern

Great firefighter stories follow this arc:
1. CALM BEFORE STORM - Brief normalcy, then disruption
2. DISCOVERY - The moment of "oh no"
3. MOBILIZATION - Who you called, what you did first
4. THE BATTLE - Specific actions under pressure
5. RESOLUTION - How it ended
6. PREVENTION - What changed so it never happens again

## Opening Line Formula

"At [TIME], [TIMEFRAME BEFORE IMPORTANT EVENT], I discovered [CRISIS] that would have [CATASTROPHIC OUTCOME]..."

Examples:
- "At 2am, two weeks before our biggest launch, I discovered a race condition that would have double-charged every customer."
- "Fifteen minutes before the board presentation, I noticed our demo environment was serving cached data from last quarter."
- "On Black Friday morning, our monitoring showed a pattern I'd never seen—we were about to run out of database connections."

## Section Guidance

### CRISIS
- Start with the moment of discovery, not background
- Make the stakes visceral: "millions in refunds" not "significant impact"
- Include sensory details: time, place, what you saw

### RESPONSE
- Use first person, active voice: "I called..." not "A meeting was convened"
- Name specific people: "I pulled in Sarah from platform" not "I assembled a team"
- Show speed: "Within 15 minutes, I had..."

### RESOLUTION
- Technical specificity: what was the actual fix?
- Don't skip the "how" - that's where credibility lives
- Include the moment of relief: "At 4:17am, the fix was deployed"

### PREVENTION
- This is your multiplier - what lasting change did you create?
- "The runbook I wrote is still used today"
- "We now have automated detection for this class of bug"

## Anti-Patterns to Avoid

❌ "The team worked together to solve the problem" - WHO did WHAT?
❌ "It was a challenging situation" - SHOW the challenge, don't label it
❌ Starting with "In my role as..." - Start with the crisis
❌ "Successfully resolved the issue" - What was the actual outcome?
❌ Passive voice: "A bug was discovered" - YOU discovered it
```

---

### ARCHITECT 🏗️

```markdown
You are generating an ARCHITECT career story.

## What Makes an Architect Story Compelling

The reader should see your VISION - what you saw that others didn't.
The hero is someone who thinks in SYSTEMS, not just code.
The payoff is LONGEVITY - this thing is still running, still valuable.

## The Pattern

Great architect stories follow this arc:
1. THE LIMITATION - What couldn't the old system do?
2. THE VISION - What did you see was possible?
3. THE TRADE-OFFS - What hard decisions did you navigate?
4. THE BUILD - How did you make it real?
5. THE LEGACY - What's the lasting impact?

## Opening Line Formula

"I saw that [SYSTEM] couldn't [LIMITATION], so I designed [SOLUTION] that [LASTING IMPACT]..."

Examples:
- "I saw that our monolith couldn't handle 10x growth, so I designed a migration path that's still the foundation three years later."
- "Our deployment process required 4 hours of manual work. I architected a CI/CD pipeline that now handles 50 deploys per day."
- "Every team was building their own auth. I designed a shared identity service that now protects 12 products."

## Section Guidance

### VISION
- What was the insight? What did you see that others missed?
- Why was NOW the right time to act?
- What would have happened if you hadn't?

### DESIGN
- Name the trade-offs explicitly: "We chose X over Y because..."
- Show that you considered alternatives
- Explain WHY, not just WHAT

### BUILD
- Don't skip to the end - how did you make it real?
- What was the hardest part of implementation?
- Who did you bring along? (Architects don't build alone)

### LEGACY
- Quantify longevity: "still running", "adopted by N teams"
- What maintenance burden did you avoid?
- What became possible because of your architecture?

## Anti-Patterns to Avoid

❌ "I implemented a microservices architecture" - What PROBLEM did it solve?
❌ Listing technologies without context - WHY those choices?
❌ Skipping the trade-offs - everything has trade-offs
❌ "It was well-received" - SHOW the impact, don't claim reception
❌ No mention of other people - architects influence, they don't dictate
```

---

### DIPLOMAT 🤝

```markdown
You are generating a DIPLOMAT career story.

## What Makes a Diplomat Story Compelling

The reader should see the CONFLICT - real people wanting different things.
The hero is someone who BRIDGES divides, not someone who "collaborated."
The payoff is ALIGNMENT - what became possible when people agreed.

## The Pattern

Great diplomat stories follow this arc:
1. THE FACTIONS - Who wanted what? Why were they in conflict?
2. THE STAKES - What would happen if alignment wasn't reached?
3. THE UNDERSTANDING - How did you learn what each side really needed?
4. THE BRIDGE - What solution satisfied everyone?
5. THE UNLOCK - What became possible after alignment?

## Opening Line Formula

"[TEAM A] wanted [X], [TEAM B] wanted [Y], and [AUTHORITY] needed both. I found a way to [RESOLUTION]..."

Examples:
- "The payments team wanted stability, product wanted velocity, and the CTO wanted both. I found a migration path that gave everyone what they needed."
- "Security said no external APIs. Product said we need the integration by Q2. I designed an approach that satisfied both."
- "Three VPs were competing for the same engineering resources. I facilitated a prioritization framework that ended the conflict."

## Section Guidance

### CONFLICT
- Name the people or teams: "Sarah's team wanted..." not "One team wanted..."
- Make the conflict real: what were the stakes for each side?
- Avoid villain framing - each side had valid concerns

### NAVIGATION
- How did you understand each side's REAL needs (not stated positions)?
- What meetings, conversations, 1:1s did you have?
- What did you learn that others hadn't bothered to discover?

### BRIDGE
- What was the insight that unlocked agreement?
- How did you present it? (The framing matters)
- What did each side give up, and what did they get?

### OUTCOME
- What became possible after alignment?
- How long did the alignment last?
- What's the ongoing relationship?

## Anti-Patterns to Avoid

❌ "I collaborated with stakeholders" - WHO, about WHAT conflict?
❌ "After some discussion, we agreed" - WHAT was the discussion?
❌ Making yourself the hero who "convinced" others - you BRIDGED, not won
❌ "Successfully aligned the teams" - On WHAT? With WHAT outcome?
❌ Skipping the conflict - no conflict = no diplomat story
```

---

### DETECTIVE 🔍

```markdown
You are generating a DETECTIVE career story.

## What Makes a Detective Story Compelling

The reader should feel the MYSTERY - the frustration of not knowing.
The hero is someone who INVESTIGATES systematically, not randomly.
The payoff is the "A-HA" moment - the root cause revealed.

## The Pattern

Great detective stories follow this arc:
1. THE MYSTERY - What was happening that nobody could explain?
2. THE CLUES - What did the evidence show?
3. THE HYPOTHESES - What theories did you test?
4. THE BREAKTHROUGH - What led to the answer?
5. THE REVEAL - What was the actual root cause?
6. THE FIX - How did you solve it permanently?

## Opening Line Formula

"[SYMPTOM] was happening and nobody could figure out why. I traced it through [INVESTIGATION] to discover [ROOT CAUSE]..."

Examples:
- "Users were randomly getting logged out, but only on Tuesdays. I traced it through three services to find a cache invalidation bug triggered by weekly batch jobs."
- "Our API was timing out, but only for 5% of requests. I discovered the pattern: every request that touched a specific legacy table."
- "Memory usage was climbing steadily until crash. I found a circular reference that only occurred when users had exactly 3 connected accounts."

## Section Guidance

### MYSTERY
- Make the frustration real: how long had this been unsolved?
- What made it hard? (Intermittent, no repro, misleading symptoms)
- What had others already tried?

### INVESTIGATION
- Show your methodology: "First I checked... then I noticed..."
- What tools did you use?
- What dead ends did you hit?

### BREAKTHROUGH
- What was the clue that cracked it?
- Was it luck, persistence, or insight?
- The moment of realization: "That's when I saw..."

### SOLUTION
- What was the actual fix?
- How did you verify it worked?
- What prevented recurrence?

## Anti-Patterns to Avoid

❌ "I debugged the issue" - HOW did you debug it?
❌ Skipping the investigation to the fix - the investigation IS the story
❌ "After some analysis..." - WHAT analysis?
❌ No wrong turns - real investigations have dead ends
❌ Magic solution: "Then I realized the answer" - WHAT led to the realization?
```

---

### MULTIPLIER 📈

```markdown
You are generating a MULTIPLIER career story.

## What Makes a Multiplier Story Compelling

The reader should see SCALE - your impact went beyond what you personally did.
The hero is someone who makes OTHERS better, not just themselves.
The payoff is MULTIPLICATION - 10 people doing what 1 couldn't.

## The Pattern

Great multiplier stories follow this arc:
1. THE STRUGGLE - What was the team/org struggling with?
2. THE INTERVENTION - What did you create, teach, or establish?
3. THE ADOPTION - How did it spread?
4. THE MULTIPLICATION - What's the ongoing impact beyond you?

## Opening Line Formula

"[GROUP] was struggling with [PROBLEM]. I created [SOLUTION], and now [SCALED IMPACT]..."

Examples:
- "Every team was reinventing API error handling. I created a shared library and wrote the guide that 8 teams now use."
- "Junior engineers were afraid to deploy. I built a deployment training program that has now graduated 25 engineers."
- "Incident response was chaos. I created the runbook template that's now the org standard across 40 services."

## Section Guidance

### STRUGGLE
- Quantify the pain: "40% of engineering time", "3 incidents per week"
- Make it relatable: why couldn't people solve it themselves?
- Scope: how many people were affected?

### INTERVENTION
- What did you create? (Framework, training, template, tool)
- How did you design it for adoption? (Not just correctness)
- What was your insight that others missed?

### ADOPTION
- How did it spread? (Did you push it? Did it pull?)
- Who were the early adopters? Name them.
- What resistance did you overcome?

### MULTIPLICATION
- Quantify the scale: "N teams", "N people", "still used today"
- What's the compound impact? (Each person saves X hours, times N people)
- What became possible that wasn't before?

## Anti-Patterns to Avoid

❌ "I helped the team improve" - HOW did you help? What did you CREATE?
❌ "The team adopted my solution" - WHY did they adopt it? What made it stick?
❌ Focusing only on what you built, not on adoption - multipliers SPREAD
❌ No numbers - multiplication needs quantification
❌ "I mentored junior engineers" - What was the OUTCOME of the mentoring?
```

---

### PIONEER 🚀

```markdown
You are generating a PIONEER career story.

## What Makes a Pioneer Story Compelling

The reader should feel the UNKNOWN - the vertigo of no playbook.
The hero is someone who EXPLORES and DOCUMENTS, not just survives.
The payoff is the TRAIL - what you left for those who follow.

## The Pattern

Great pioneer stories follow this arc:
1. THE FRONTIER - What was the unknown territory?
2. THE CHALLENGE - Why was there no map?
3. THE EXPLORATION - How did you navigate?
4. THE DISCOVERY - What did you find?
5. THE TRAIL - What path did you create for others?

## Opening Line Formula

"We needed to [GOAL] but there was no playbook. I figured out [APPROACH] and documented [TRAIL]..."

Examples:
- "We needed to integrate with an API that had no documentation. I reverse-engineered the protocol and wrote the guide that three teams now use."
- "Nobody in the company had built on this platform before. I ran the experiments and created the decision framework we still use."
- "The library we needed didn't exist. I evaluated 8 alternatives, found they all fell short, and built what became our internal standard."

## Section Guidance

### FRONTIER
- What made this genuinely new? (Not just "challenging")
- What was at stake if you failed to navigate?
- Why did YOU take this on?

### EXPLORATION
- What did you try first?
- What failed? What almost worked?
- How did you learn without documentation?

### DISCOVERY
- What did you learn that nobody else knew?
- What was surprising?
- What would you tell someone starting today?

### TRAIL
- What did you document?
- Who has used your trail?
- What became possible because of your exploration?

## Anti-Patterns to Avoid

❌ "I learned a new technology" - What was UNKNOWN about it?
❌ Skipping the failures - pioneers fail often before succeeding
❌ "I implemented X" - What made it pioneering? (If there's a tutorial, it's not pioneering)
❌ No trail - real pioneers leave documentation for others
❌ "It was challenging" - SHOW the challenge through the exploration
```

---

### TURNAROUND ↩️

```markdown
You are generating a TURNAROUND career story.

## What Makes a Turnaround Story Compelling

The reader should see the TRANSFORMATION - dramatic before/after.
The hero is someone who DIAGNOSES and FIXES, not just "works on."
The payoff is METRICS - undeniable proof of the change.

## The Pattern

Great turnaround stories follow this arc:
1. THE DECLINE - What was failing and how badly?
2. THE DIAGNOSIS - What was the actual root cause?
3. THE PLAN - What was your intervention strategy?
4. THE EXECUTION - How did you make the change?
5. THE RECOVERY - What are the metrics now?

## Opening Line Formula

"When I [INHERITED/TOOK OVER] [THING], it was [FAILING STATE]. [TIMEFRAME] later, [SUCCESS STATE]..."

Examples:
- "When I inherited the service, it had 12 P1 incidents per month. Six months later, we had zero."
- "The project was 3 months behind schedule when I took over. We shipped on the original deadline."
- "Test coverage was 15% and deploys took 4 hours. I got us to 80% coverage and 8-minute deploys."

## Section Guidance

### DECLINE
- Be specific about how bad: numbers, frequency, consequences
- Don't blame predecessors - focus on the state, not the cause
- Make the reader feel "that's bad"

### DIAGNOSIS
- What did you identify as the real problem?
- Was it what people thought, or something else?
- How did you know you were right?

### INTERVENTION
- What was your strategy? (Not just "worked hard")
- What did you prioritize? What did you defer?
- Who did you bring along?

### RECOVERY
- NUMBERS. Before → After.
- Timeline: how long did the turnaround take?
- What's the ongoing state?

## Anti-Patterns to Avoid

❌ "I improved the project" - From WHAT to WHAT?
❌ No before metrics - turnarounds need baselines
❌ "After hard work..." - WHAT work?
❌ Blaming others - focus on what YOU changed
❌ Vague outcomes - "much better" is not a metric
```

---

### PREVENTER 🛡️

```markdown
You are generating a PREVENTER career story.

## What Makes a Preventer Story Compelling

The reader should feel the NEAR MISS - how close disaster came.
The hero is someone who SEES AHEAD, not just reacts.
The payoff is the COUNTERFACTUAL - what WOULD have happened.

## The Pattern

Great preventer stories follow this arc:
1. THE RISK - What did you see that others didn't?
2. THE EVIDENCE - How did you know it was real?
3. THE WARNING - How did you raise the alarm?
4. THE ACTION - What did you do to prevent it?
5. THE NON-EVENT - What would have happened?

## Opening Line Formula

"I noticed [RISK] that nobody else saw. If I hadn't [ACTION], [CATASTROPHE] would have happened..."

Examples:
- "I noticed our token refresh logic had a race condition. If I hadn't caught it, at 10x scale we would have logged out every user during peak hours."
- "I saw that our database was 2 weeks from running out of disk space. If I hadn't raised it, Black Friday would have been a disaster."
- "I caught a security vulnerability in our auth flow before it shipped. If it had gone live, customer data would have been exposed."

## Section Guidance

### RISK
- What was the pattern you noticed?
- Why did others miss it?
- What made you look?

### EVIDENCE
- How did you verify the risk was real?
- What data did you gather?
- Who did you consult?

### ACTION
- What did you do to raise awareness?
- What resistance did you face?
- How did you prioritize this over other work?

### COUNTERFACTUAL
- This is the most important section
- Paint the picture: what WOULD have happened?
- Be specific: "X customers", "Y dollars", "Z hours of outage"
- Why should the reader care about something that didn't happen?

## Anti-Patterns to Avoid

❌ "I identified a potential issue" - What was the RISK?
❌ No counterfactual - preventer stories need "would have"
❌ "It could have been bad" - HOW bad? WHAT would have happened?
❌ "Proactively addressed" - WHAT did you address? WHY did it matter?
❌ Taking credit for luck - you need to show you SAW the risk, not stumbled on it
```

---

## Extracted Context Integration

The prompt combines the archetype guidance with Story Coach extracted context:

```markdown
## Extracted Context from Story Coach

The user revealed the following through brainstorming:

### The Buried Story
{extractedContext.realStory}

### Key People
{extractedContext.namedPeople.map(p => `- ${p.name}: ${p.role}`).join('\n')}

### The Counterfactual
{extractedContext.counterfactual}

### Quantified Impact
- Primary metric: {extractedContext.metric}
- Evidence source: {extractedContext.evidence}

### What Almost Went Wrong
{extractedContext.obstacle}

Use this extracted context to enrich the story. The user has already revealed these
details through conversation - incorporate them naturally, don't repeat them verbatim.
```

---

## Full Prompt Template

```markdown
# Career Story Generation

## Archetype: {archetype.name}

{archetype.systemPrompt}

## Extracted Context

{extractedContext}

## Journal Entry Content

Title: {journalEntry.title}
Description: {journalEntry.description}
Full Content: {journalEntry.fullContent}

### Phases
{journalEntry.phases.map(p => `- ${p.name}: ${p.summary}`).join('\n')}

### Evidence
{journalEntry.activities.map(a => `- ${a.title} (${a.source})`).join('\n')}

## Output Requirements

Generate a {archetype.name} career story with these sections:
{archetype.sections.map(s => `- ${s.name}: ${s.description}`).join('\n')}

Opening line should follow the pattern:
"{archetype.openingLineFormula}"

Return valid JSON with:
- title: Compelling title (max 60 chars)
- hook: The opening line
- sections: Object with each section containing summary and evidence
- reasoning: Why this archetype fits this story
```

---

## The Difference

### Without Archetype + Extracted Context

```
SITUATION: Led migration from monolith to microservices over 6 months.
RESULT: Successfully completed migration and improved deployments.
```

### With Archetype + Extracted Context

```
**FIREFIGHTER Story: Crisis Averted**

CRISIS: At 2am, two weeks before our biggest launch, I discovered a race
condition in our data sync layer. The bug would have caused customer
double-charges on every order - potentially millions in refunds and a
PR disaster.

RESPONSE: I immediately pulled in Sarah from platform and Marcus from
orders. I also called Dev, a contractor who knew the legacy system.
Within 15 minutes we had a war room. Over the next 72 hours, we traced
the issue through three services.

RESOLUTION: At 4am on day three, I found it: a race condition in token
refresh that only manifested under our production load patterns. I wrote
the fix and we deployed at 6am. The launch went smoothly.

PREVENTION: I wrote the runbook that the team still uses today for
similar issues. We added automated detection for this class of bug.
The migration eventually delivered 50-100x improvement in deployment
frequency - from bi-weekly to 5-10 times daily.
```

**The archetype made the prompt KNOW the story before it wrote a word.**
