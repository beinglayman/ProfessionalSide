# FIREFIGHTER Story Generation

You are generating a **FIREFIGHTER** career story.

## What Makes a Firefighter Story Compelling

The reader should feel the **urgency**. They should think: "What would I have done at 2am?"

The hook is the **CRISIS MOMENT** - the instant when everything could have gone wrong.
The hero is someone who **RESPONDS under pressure**, not someone who "worked on a project."

## The Narrative Arc

```
CALM BEFORE STORM → DISCOVERY → MOBILIZATION → THE BATTLE → RESOLUTION → PREVENTION
```

1. **Brief normalcy, then disruption**
2. **The moment of "oh no"**
3. **Who you called, what you did first**
4. **Specific actions under pressure**
5. **How it ended**
6. **What changed so it never happens again**

## Opening Line Formula

Start with the crisis moment, not background:

> "At [TIME], [TIMEFRAME BEFORE IMPORTANT EVENT], I discovered [CRISIS] that would have [CATASTROPHIC OUTCOME]..."

### Good Examples
- "At 2am, two weeks before our biggest launch, I discovered a race condition that would have double-charged every customer."
- "Fifteen minutes before the board presentation, I noticed our demo environment was serving cached data from last quarter."
- "On Black Friday morning, our monitoring showed a pattern I'd never seen—we were about to run out of database connections."

### Bad Examples (Don't do this)
- "In my role as a senior engineer, I was responsible for..."
- "The project involved migrating our system..."
- "I worked on improving the reliability of..."

## Section Guidance

### SITUATION / CRISIS
- Start with the moment of discovery, not background
- Make stakes visceral: "millions in refunds" not "significant impact"
- Include sensory details: time, place, what you saw
- Example: "At 2am, two weeks before launch, I got a page that stopped my heart..."

### TASK / RESPONSE
- First person, active voice: "I called..." not "A meeting was convened"
- Name specific people: "I pulled in Sarah from platform" not "I assembled a team"
- Show speed: "Within 15 minutes, I had..."
- Example: "I immediately called Marcus, our on-call DBA, and pulled Sarah from the platform team into a war room..."

### ACTION / THE BATTLE
- Technical specificity: what did you actually do?
- The "how" is where credibility lives
- Include dead ends: "First we tried X, but..."
- Example: "We traced the issue through three services. The first theory—a memory leak—was wrong. Then I noticed the pattern only appeared when..."

### RESULT / RESOLUTION
- The moment of relief: "At 4:17am, the fix was deployed"
- Quantify what was saved/prevented
- Example: "The fix went live at 4:17am. We ran validation for two hours. By 7am, I sent the all-clear."

### PREVENTION (for SOAR/SHARE frameworks)
- What lasting change did you create?
- "The runbook I wrote is still used today"
- "We now have automated detection for this class of bug"

## Anti-Patterns to AVOID

❌ "The team worked together to solve the problem"
   → WHO did WHAT? Name names.

❌ "It was a challenging situation"
   → SHOW the challenge, don't label it.

❌ Starting with "In my role as..."
   → Start with the crisis.

❌ "Successfully resolved the issue"
   → What was the ACTUAL outcome? Numbers?

❌ Passive voice: "A bug was discovered"
   → YOU discovered it.

❌ "After some investigation..."
   → WHAT investigation? Walk me through it.

## Extracted Context Integration

Use the extracted context from the Story Coach session to enrich the story:

- **obstacle** → Use in SITUATION/CRISIS section
- **namedPeople** → Use in ACTION section, name them specifically
- **counterfactual** → Use to establish stakes: "If we hadn't caught this..."
- **metric** → Use in RESULT section with specific numbers
- **evidence** → Reference as proof points

## Output Requirements

Generate a story that:
1. Opens with the crisis moment (not background)
2. Names specific people involved
3. Shows the timeline and urgency
4. Includes at least one quantified outcome
5. Ends with lasting impact or prevention

The reader should finish thinking: "That was a real crisis, and they handled it."
