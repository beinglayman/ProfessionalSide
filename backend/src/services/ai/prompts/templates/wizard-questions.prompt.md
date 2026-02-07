Generate 6 contextual D-I-G interview questions for this journal entry. Every question MUST reference a specific fact, name, tool, number, or event from the entry. If the entry is vague, your questions should pull out the concrete facts that are missing. If the entry is detailed, your questions should go deeper into the facts that are already there.

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

## D-I-G Protocol

Generate exactly 6 questions in this distribution:

- **3 DIG questions** (dig-1, dig-2, dig-3): Find the real story underneath the summary.
  - dig-1: Ask about how it started. The trigger, the alert, the moment they noticed. Hint should say "Describe the moment" or "What time was it?"
  - dig-2: Ask about a key person or decision. Who did they work with? What trade-off did they make? Hint should say "Name the person" or "What were the options?"
  - dig-3: Ask about the hardest part. The obstacle, the dead end, the thing that almost failed. Hint should say "What went wrong?" or "What did you try that didn't work?"

- **2 IMPACT questions** (impact-1, impact-2): Make the outcome concrete and counterfactual.
  - impact-1: Ask "what would have happened otherwise?" or "what was at risk?" Hint should demand a number or a consequence: "Estimate the cost" or "How many users were affected?"
  - impact-2: Ask for a before-and-after metric. Hint should say "Give me the number" or "What changed from X to Y?"

- **1 GROWTH question** (growth-1): Extract what changed permanently.
  - Ask what they do differently now, or what they built because of this. Hint should say "Is it still in use?" or "How do you handle this now?"

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

## Handling Vague vs Detailed Entries

- If the entry is **vague** (few names, no numbers, no specific tools): ask questions that EXTRACT concrete facts. Use hints that demand specifics: "Give me a number," "Name the system," "What day was this?"
- If the entry is **detailed** (names people, cites metrics, describes specific events): ask questions that go DEEPER into what is already there. Use hints that ask for the story behind the fact: "What happened right before that?", "Why that person specifically?"

## Output Format

Return a JSON array with exactly 6 objects. Use question ID prefix "{{questionIdPrefix}}":

[
  {"id": "{{questionIdPrefix}}-dig-1", "phase": "dig", "question": "...", "hint": "..."},
  {"id": "{{questionIdPrefix}}-dig-2", "phase": "dig", "question": "...", "hint": "..."},
  {"id": "{{questionIdPrefix}}-dig-3", "phase": "dig", "question": "...", "hint": "..."},
  {"id": "{{questionIdPrefix}}-impact-1", "phase": "impact", "question": "...", "hint": "..."},
  {"id": "{{questionIdPrefix}}-impact-2", "phase": "impact", "question": "...", "hint": "..."},
  {"id": "{{questionIdPrefix}}-growth-1", "phase": "growth", "question": "...", "hint": "..."}
]

Return ONLY the JSON array. No explanation, no extra text.
