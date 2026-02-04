/**
 * Story Evaluator Service
 *
 * Evaluates generated stories using Story Coach rubric.
 * Adapted from Russian Judge scoring pattern.
 */

import { GeneratedStoryFile, StoryEvaluationFile, EvaluationBreakdown } from '../types';
import { callLLM } from './llm-client';

/**
 * Rule-based scoring (fast, no LLM call)
 */
export function scoreStoryRuleBased(story: GeneratedStoryFile): EvaluationBreakdown {
  const allText = [
    story.title,
    story.hook,
    ...Object.values(story.sections).map(s => s.summary),
  ].join(' ');

  // Specificity (0-10): Names, numbers, dates
  let specificity = 5;
  if (allText.match(/\d+%/)) specificity += 1;           // Has percentages
  if (allText.match(/\$[\d,]+/)) specificity += 1;       // Has dollar amounts
  if (allText.match(/\d+ (hours|days|weeks|months)/)) specificity += 0.5;  // Time durations
  if (allText.match(/\d+ (teams|people|users|customers)/)) specificity += 1;  // People counts
  if (allText.match(/[A-Z][a-z]+ from/)) specificity += 1;  // Named people ("Sarah from")
  if (allText.includes('various') || allText.includes('significant')) specificity -= 1;  // Vague
  if (allText.includes('several') || allText.includes('multiple')) specificity -= 0.5;  // Vague
  specificity = Math.min(10, Math.max(1, specificity));

  // Compelling Hook (0-10): Opening grabs attention
  let compellingHook = 5;
  const hook = story.hook || Object.values(story.sections)[0]?.summary || '';
  if (hook.match(/^At \d/)) compellingHook += 2;         // Starts with time
  if (hook.match(/^(When|Two weeks|The moment|On)/)) compellingHook += 1.5;  // Narrative opening
  if (hook.match(/^In my role/i)) compellingHook -= 2;   // Boring opening
  if (hook.match(/^I was responsible/i)) compellingHook -= 1.5;  // Boring
  if (hook.match(/^The project/i)) compellingHook -= 1;  // Impersonal
  if (hook.includes('discovered') || hook.includes('realized')) compellingHook += 1;  // Discovery moment
  compellingHook = Math.min(10, Math.max(1, compellingHook));

  // Evidence Quality (0-10): Claims backed by proof
  let evidenceQuality = 5;
  const evidenceCount = Object.values(story.sections)
    .reduce((sum, s) => sum + (s.evidence?.length || 0), 0);
  if (evidenceCount >= 3) evidenceQuality += 1;
  if (evidenceCount >= 5) evidenceQuality += 1;
  if (evidenceCount === 0) evidenceQuality -= 2;
  if (allText.includes('would have') || allText.includes('prevented')) evidenceQuality += 1;  // Counterfactual
  if (allText.includes('still') && allText.includes('today')) evidenceQuality += 0.5;  // Lasting impact
  evidenceQuality = Math.min(10, Math.max(1, evidenceQuality));

  // Archetype Fit (0-10): Follows archetype arc
  let archetypeFit = 5;
  if (story.archetype) {
    // Check for archetype-specific patterns
    switch (story.archetype) {
      case 'firefighter':
        if (allText.match(/\d+\s*(am|pm|AM|PM)/)) archetypeFit += 1;  // Time of day
        if (allText.includes('incident') || allText.includes('emergency')) archetypeFit += 1;
        if (allText.includes('prevented') || allText.includes('averted')) archetypeFit += 1;
        break;
      case 'architect':
        if (allText.includes('designed') || allText.includes('architected')) archetypeFit += 1;
        if (allText.includes('still') || allText.includes('foundation')) archetypeFit += 1;
        break;
      case 'diplomat':
        if (allText.includes('stakeholder') || allText.includes('alignment')) archetypeFit += 1;
        if (allText.includes('consensus') || allText.includes('buy-in')) archetypeFit += 1;
        break;
      case 'multiplier':
        if (allText.match(/\d+ teams/)) archetypeFit += 1;
        if (allText.includes('adopted') || allText.includes('trained')) archetypeFit += 1;
        break;
      // Add other archetypes as needed
    }
  }
  archetypeFit = Math.min(10, Math.max(1, archetypeFit));

  // Actionable Impact (0-10): Clear outcomes
  let actionableImpact = 5;
  if (allText.match(/reduced.*by \d+/i)) actionableImpact += 1.5;  // Reduction metric
  if (allText.match(/improved.*by \d+/i)) actionableImpact += 1.5;  // Improvement metric
  if (allText.match(/saved.*\d+/i)) actionableImpact += 1;  // Saved something
  if (allText.match(/from.*to/i)) actionableImpact += 1;  // Before/after
  if (allText.includes('zero incidents') || allText.includes('no downtime')) actionableImpact += 1;
  actionableImpact = Math.min(10, Math.max(1, actionableImpact));

  return {
    specificity,
    compellingHook,
    evidenceQuality,
    archetypeFit,
    actionableImpact,
  };
}

/**
 * Calculate weighted overall score
 */
export function calculateOverallScore(breakdown: EvaluationBreakdown): number {
  const weights = {
    specificity: 0.25,
    compellingHook: 0.20,
    evidenceQuality: 0.20,
    archetypeFit: 0.15,
    actionableImpact: 0.20,
  };

  const weightedScore =
    breakdown.specificity * weights.specificity +
    breakdown.compellingHook * weights.compellingHook +
    breakdown.evidenceQuality * weights.evidenceQuality +
    breakdown.archetypeFit * weights.archetypeFit +
    breakdown.actionableImpact * weights.actionableImpact;

  // Cap at 9.5 - "Never give 10"
  return Math.min(9.5, Math.round(weightedScore * 10) / 10);
}

/**
 * Generate Story Coach comment based on score
 */
function generateCoachComment(score: number, breakdown: EvaluationBreakdown): string {
  if (score >= 8) {
    return "THAT'S a story. I'd remember this in an interview. The specifics sell it.";
  }
  if (score >= 7) {
    return "This has a hook. The numbers are there. A few more specific details and it's excellent.";
  }
  if (score >= 6) {
    return "Good structure. I can see what happened. Now make me care - where's the drama?";
  }
  if (score >= 5) {
    return "I can see what happened. But I don't feel why it matters. Where's the moment that almost went wrong?";
  }
  if (score >= 4) {
    return "This is a summary, not a story. What's the one thing you want me to remember?";
  }
  return "We need to start over. What REALLY happened? Not the press release version.";
}

/**
 * Generate improvement suggestions
 */
function generateSuggestions(breakdown: EvaluationBreakdown): string[] {
  const suggestions: string[] = [];

  if (breakdown.specificity < 6) {
    suggestions.push("Add specific numbers: percentages, dollar amounts, time saved, people affected.");
    suggestions.push("Name the people involved: 'Sarah from platform' not 'the team'.");
  }

  if (breakdown.compellingHook < 6) {
    suggestions.push("Start with the moment of crisis or discovery, not background.");
    suggestions.push("Try opening with: 'At 2am...' or 'Two weeks before launch...'");
  }

  if (breakdown.evidenceQuality < 6) {
    suggestions.push("Add the counterfactual: What would have happened if you hadn't acted?");
    suggestions.push("Include lasting impact: Is it still in use today?");
  }

  if (breakdown.archetypeFit < 6) {
    suggestions.push("Lean into the story type. If it's a crisis story, emphasize the urgency.");
  }

  if (breakdown.actionableImpact < 6) {
    suggestions.push("Add before/after metrics: 'from X to Y' shows clear improvement.");
    suggestions.push("Quantify the outcome: '50% reduction' is stronger than 'significant improvement'.");
  }

  return suggestions;
}

/**
 * Evaluate a generated story
 */
export async function evaluateStory(story: GeneratedStoryFile): Promise<StoryEvaluationFile> {
  // Rule-based scoring (fast)
  const breakdown = scoreStoryRuleBased(story);
  const score = calculateOverallScore(breakdown);
  const suggestions = generateSuggestions(breakdown);
  const coachComment = generateCoachComment(score, breakdown);

  return {
    storyId: story.id,
    score,
    breakdown,
    suggestions,
    coachComment,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * LLM-enhanced evaluation (more nuanced but slower)
 */
export async function evaluateStoryWithLLM(story: GeneratedStoryFile): Promise<StoryEvaluationFile> {
  // First get rule-based score
  const ruleBasedEval = await evaluateStory(story);

  // Then get LLM assessment
  const prompt = `You are a Story Coach evaluating a career story. Be direct and specific.

## Story to Evaluate

**Title:** ${story.title}

**Hook:** ${story.hook}

**Sections:**
${Object.entries(story.sections).map(([key, section]) =>
  `### ${key}\n${section.summary}`
).join('\n\n')}

## Evaluation Criteria

Score each 1-10:
1. Specificity (names, numbers, dates vs vague claims)
2. Compelling Hook (does opening grab attention?)
3. Evidence Quality (claims backed by proof?)
4. Actionable Impact (clear, quantified outcomes?)

## Your Assessment

Provide a brief, direct assessment in Story Coach voice.
What works? What's missing? What would make this unforgettable?

End with ONE specific suggestion to improve this story.`;

  const response = await callLLM({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  // Combine rule-based and LLM feedback
  return {
    ...ruleBasedEval,
    coachComment: response.slice(0, 500), // Take first 500 chars of LLM response
  };
}
