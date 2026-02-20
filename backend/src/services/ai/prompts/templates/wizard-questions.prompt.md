Generate exactly 3 targeted interview questions for this journal entry. Every question MUST reference a specific fact, name, tool, number, or event from the entry. If the entry is vague, your questions should pull out the concrete facts that are missing. If the entry is detailed, your questions should go deeper into the facts that are already there.

## Journal Entry: "{{entryTitle}}"

{{entryContent}}

## Detected Archetype: {{archetype}}

Reasoning: {{archetypeReasoning}}

## Signals Already Present in Entry

{{#if presentSignals.length}}
The entry ALREADY contains these signals — do NOT ask about what's already there:
{{#each presentSignals}}
- {{this}}
{{/each}}
{{else}}
No strong signals detected — all areas need probing.
{{/if}}

## Signals Missing from Entry

{{#if missingSignals.length}}
Probe for these MISSING elements:
{{#each missingSignals}}
- {{this}}
{{/each}}
{{else}}
All key signals are already present — go deeper into what's there.
{{/if}}

{{#if knownContext}}
## What the System Already Knows (DO NOT ask about these)

The following facts are already available from the user's tools:
{{#if knownContext.dateRange}}- **Timeline**: {{knownContext.dateRange}}{{/if}}
{{#if knownContext.collaborators}}- **People involved**: {{knownContext.collaborators}}{{/if}}
{{#if knownContext.codeStats}}- **Code scope**: {{knownContext.codeStats}}{{/if}}
{{#if knownContext.tools}}- **Tools used**: {{knownContext.tools}}{{/if}}
{{#if knownContext.labels}}- **Labels/tags**: {{knownContext.labels}}{{/if}}

DO NOT generate questions about timeline, people involved, or scope — the system has this data.
{{/if}}

## Generate exactly 3 questions

Target what the system CANNOT infer:
1. **The obstacle** (dig-1) — "What almost went wrong?" (always ask)
2. **The counterfactual** (impact-1) — "What would have happened without you?" (always ask)
3. **The gap** (growth-1) — Whatever the data is missing. Choose ONE:
   - If no metric: ask for the number that proves success
   - If no named people: ask who pushed back or helped most
   - If no decision: ask what the hardest choice was
   - If no learning: ask what changed in how they work

## Rules for Questions

1. **Anchor every question to a fact from the entry.** If they mention "Kafka," ask about Kafka. If they name "Sarah," ask about Sarah. If they say "3 weeks," ask what happened in those 3 weeks. Never ask a question that could apply to any entry.
2. **Ask about the gap next to the fact.** They said WHAT happened — ask WHO was there. They named a tool — ask what broke. They gave a timeline — ask what the turning point was. The best question sits right next to something they already said.
3. **Never re-ask what they already wrote.** If the entry has metrics, do not ask for metrics. If it names people, do not ask "who was involved?" Read what is there, then ask what is next to it.
4. **One sentence per question. No compound questions.** Bad: "What happened and how did you fix it?" Good: "What did you try first?"
5. **Name the type of answer you want in the hint.** Say "Give me a name," "Give me a number," "Describe the moment," or "Walk me through the steps." Never say "Think about..." or "Consider..." — those are filler.

## Good vs Bad Examples

BAD question: "Can you tell me more about the challenges you faced?"
WHY bad: Generic. Could apply to any entry. Asks about "challenges" without naming one.

GOOD question: "You mentioned the migration took 3 sprints — what almost derailed it?"
WHY good: Quotes a specific detail ("3 sprints"), then asks about what is missing (the near-failure).

---

BAD question: "What was the impact of your work?"
WHY bad: Vague. "Impact" is a word that means nothing without context.

GOOD question: "You said the API latency dropped — from what to what?"
WHY good: Grabs a fact ("API latency dropped"), asks for the missing number.

---

BAD hint: "Think about the people involved."
WHY bad: Passive. Does not tell them what to write.

GOOD hint: "Name the person and their role."
WHY good: Tells them exactly what to type.

## Output Format

Return a JSON array with exactly 3 objects. Use question ID prefix "{{questionIdPrefix}}":

[
  {"id": "{{questionIdPrefix}}-dig-1", "phase": "dig", "question": "...", "hint": "..."},
  {"id": "{{questionIdPrefix}}-impact-1", "phase": "impact", "question": "...", "hint": "..."},
  {"id": "{{questionIdPrefix}}-growth-1", "phase": "growth", "question": "...", "hint": "..."}
]

Return ONLY the JSON array. No explanation, no extra text.
