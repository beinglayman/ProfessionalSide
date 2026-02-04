# Archetype Detection

Analyze this journal entry and determine which story archetype best fits.

## Journal Entry

**Title:** {{title}}

**Category:** {{category}}

**Content:**
{{fullContent}}

{{#if phases}}
**Phases:**
{{#each phases}}
- {{name}}: {{summary}}
{{/each}}
{{/if}}

{{#if impactHighlights}}
**Impact Highlights:**
{{#each impactHighlights}}
- {{this}}
{{/each}}
{{/if}}

## Available Archetypes

1. **FIREFIGHTER** 🔥 - Crisis emerged → Responded under pressure → Disaster averted
   - Signals: incidents, emergencies, "almost", time pressure, 2am, production issues, recovery
   - Best when: There's a clear crisis moment and response

2. **ARCHITECT** 🏗️ - Saw big picture → Designed solution → Built to last
   - Signals: designed, architected, system, multi-month, "still in use", platform, infrastructure
   - Best when: User created something with lasting impact

3. **DIPLOMAT** 🤝 - Competing interests → Bridged divides → Alignment achieved
   - Signals: stakeholders, buy-in, resistance, cross-team, politics, consensus, competing priorities
   - Best when: Success required navigating people, not just technology

4. **MULTIPLIER** 📈 - Created something → Others adopted → Impact scaled
   - Signals: team adopted, trained, framework, "N teams now use", mentored, template, standard
   - Best when: User's impact came through enabling others

5. **DETECTIVE** 🔍 - Mystery problem → Investigated → Found root cause
   - Signals: couldn't figure out, traced, intermittent, investigation, debugging, root cause
   - Best when: The story is about systematic problem-solving

6. **PIONEER** 🚀 - Uncharted territory → Explored → Created trail for others
   - Signals: first time, no documentation, figured out, no playbook, new technology, exploration
   - Best when: User ventured into unknown territory

7. **TURNAROUND** ↩️ - Failing state → Diagnosed → Recovered
   - Signals: inherited, failing, took over, before/after metrics, behind schedule, struggling
   - Best when: User transformed something from bad to good

8. **PREVENTER** 🛡️ - Saw risk → Raised alarm → Prevented disaster
   - Signals: would have, caught before, proactive, prevented, security, risk identified
   - Best when: The hero moment is what DIDN'T happen

## Analysis Instructions

1. Read the journal entry carefully
2. Identify which signals are present
3. Consider the emotional core of the story - what's the "hero moment"?
4. Select the archetype that best captures that hero moment
5. Provide alternatives if the story could fit multiple archetypes

## Output

Return valid JSON (no markdown code blocks):

{
  "primary": {
    "archetype": "firefighter",
    "confidence": 0.85,
    "reasoning": "Entry mentions 2am incident, race condition discovery, potential customer impact - classic crisis response story"
  },
  "alternatives": [
    {
      "archetype": "detective",
      "confidence": 0.60,
      "reasoning": "Investigation element present in tracing the race condition, but crisis response is the stronger narrative"
    },
    {
      "archetype": "architect",
      "confidence": 0.40,
      "reasoning": "Some system design mentioned but not the core of the story"
    }
  ],
  "signals": {
    "hasCrisis": true,
    "hasArchitecture": false,
    "hasStakeholders": false,
    "hasMultiplication": true,
    "hasMystery": true,
    "hasPioneering": false,
    "hasTurnaround": false,
    "hasPrevention": true
  }
}
