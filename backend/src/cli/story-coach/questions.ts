/**
 * Archetype-specific question banks for Story Coach
 */

import { CoachQuestion, StoryArchetype } from './types';

export const ARCHETYPE_QUESTIONS: Record<StoryArchetype, CoachQuestion[]> = {
  firefighter: [
    {
      id: 'ff-dig-1',
      phase: 'dig',
      question: "What was the moment you realized something was wrong?",
      hint: "Think about where you were, what time it was, what you saw.",
    },
    {
      id: 'ff-dig-2',
      phase: 'dig',
      question: "Who did you call first? What did you say to them?",
      hint: "Give me their name and role.",
    },
    {
      id: 'ff-dig-3',
      phase: 'dig',
      question: "What was the hardest part of fixing this?",
      hint: "What dead ends did you hit? What almost didn't work?",
    },
    {
      id: 'ff-impact-1',
      phase: 'impact',
      question: "What would have happened if you hadn't caught this?",
      hint: "Be specific - customers affected, money lost, reputation damage?",
    },
    {
      id: 'ff-impact-2',
      phase: 'impact',
      question: "What's the number that proves you succeeded?",
      hint: "Time saved? Incidents prevented? Money saved? Users protected?",
    },
    {
      id: 'ff-growth-1',
      phase: 'growth',
      question: "What changed because of this? New process? Runbook? Alert?",
      hint: "Is it still in use today?",
    },
  ],

  architect: [
    {
      id: 'ar-dig-1',
      phase: 'dig',
      question: "What did you see that others didn't?",
      hint: "Why was NOW the right time to act?",
    },
    {
      id: 'ar-dig-2',
      phase: 'dig',
      question: "What was the hardest trade-off you had to make?",
      hint: "What did you give up? What did you get in return?",
    },
    {
      id: 'ar-dig-3',
      phase: 'dig',
      question: "Who pushed back on your design? How did you handle it?",
      hint: "Give me a name and what their concern was.",
    },
    {
      id: 'ar-impact-1',
      phase: 'impact',
      question: "Who uses this today? How many teams or people?",
      hint: "Is it still the foundation?",
    },
    {
      id: 'ar-impact-2',
      phase: 'impact',
      question: "What became possible because of your architecture?",
      hint: "What couldn't they do before that they can do now?",
    },
    {
      id: 'ar-growth-1',
      phase: 'growth',
      question: "What would you design differently if you started today?",
      hint: "What did you learn from building this?",
    },
  ],

  diplomat: [
    {
      id: 'di-dig-1',
      phase: 'dig',
      question: "Who wanted what? Walk me through the conflict.",
      hint: "Name the people or teams and what they were fighting for.",
    },
    {
      id: 'di-dig-2',
      phase: 'dig',
      question: "What was really at stake for each side?",
      hint: "Not their stated position - their actual fear or need.",
    },
    {
      id: 'di-dig-3',
      phase: 'dig',
      question: "What did you learn by listening that others had missed?",
      hint: "The insight that unlocked the solution.",
    },
    {
      id: 'di-impact-1',
      phase: 'impact',
      question: "What became possible after you got alignment?",
      hint: "What was blocked before that could move forward?",
    },
    {
      id: 'di-impact-2',
      phase: 'impact',
      question: "How long did the alignment last? Is it still holding?",
      hint: "Did it create lasting change or temporary peace?",
    },
    {
      id: 'di-growth-1',
      phase: 'growth',
      question: "What did you learn about influence that you didn't know before?",
      hint: "How do you approach similar situations now?",
    },
  ],

  multiplier: [
    {
      id: 'mu-dig-1',
      phase: 'dig',
      question: "What were people struggling with before you stepped in?",
      hint: "Quantify the pain - time wasted, errors made, frustration level.",
    },
    {
      id: 'mu-dig-2',
      phase: 'dig',
      question: "What did you create that made things better?",
      hint: "Framework? Template? Training? Tool?",
    },
    {
      id: 'mu-dig-3',
      phase: 'dig',
      question: "How did it spread? Did you have to push it, or did people pull it?",
      hint: "Who were the early adopters? Name them.",
    },
    {
      id: 'mu-impact-1',
      phase: 'impact',
      question: "How many people or teams use it now?",
      hint: "Is it still in use? Has it grown?",
    },
    {
      id: 'mu-impact-2',
      phase: 'impact',
      question: "What's the compound impact? Each person saves X, times how many?",
      hint: "Help me understand the multiplication.",
    },
    {
      id: 'mu-growth-1',
      phase: 'growth',
      question: "What did you learn about creating things that get adopted?",
      hint: "What makes something stick vs get ignored?",
    },
  ],

  detective: [
    {
      id: 'de-dig-1',
      phase: 'dig',
      question: "What was the mystery? What couldn't anyone explain?",
      hint: "What made it hard to solve? Intermittent? No repro?",
    },
    {
      id: 'de-dig-2',
      phase: 'dig',
      question: "Walk me through your investigation. What did you try first?",
      hint: "Include the dead ends - they show rigor.",
    },
    {
      id: 'de-dig-3',
      phase: 'dig',
      question: "What was the breakthrough moment? What led you to the answer?",
      hint: "The clue that cracked it.",
    },
    {
      id: 'de-impact-1',
      phase: 'impact',
      question: "What was the actual root cause? How surprising was it?",
      hint: "Was it what people expected, or something else entirely?",
    },
    {
      id: 'de-impact-2',
      phase: 'impact',
      question: "How many people were affected before you solved it?",
      hint: "Users, customers, engineers - who was suffering?",
    },
    {
      id: 'de-growth-1',
      phase: 'growth',
      question: "What debugging skill did you develop from this?",
      hint: "How do you approach similar mysteries now?",
    },
  ],

  pioneer: [
    {
      id: 'pi-dig-1',
      phase: 'dig',
      question: "What made this genuinely unknown territory?",
      hint: "No docs? New tech? Nobody had done it before?",
    },
    {
      id: 'pi-dig-2',
      phase: 'dig',
      question: "What did you try that didn't work?",
      hint: "Pioneers fail a lot before succeeding.",
    },
    {
      id: 'pi-dig-3',
      phase: 'dig',
      question: "How did you learn without documentation or guidance?",
      hint: "Reverse engineering? Experimentation? Asking strangers?",
    },
    {
      id: 'pi-impact-1',
      phase: 'impact',
      question: "What trail did you leave for others?",
      hint: "Documentation? Guide? Template? Training?",
    },
    {
      id: 'pi-impact-2',
      phase: 'impact',
      question: "Who has followed your trail? How many?",
      hint: "Did your exploration help others?",
    },
    {
      id: 'pi-growth-1',
      phase: 'growth',
      question: "What surprised you most about the new territory?",
      hint: "What do you know now that you couldn't have guessed?",
    },
  ],

  turnaround: [
    {
      id: 'tu-dig-1',
      phase: 'dig',
      question: "How bad was it when you arrived? Give me the numbers.",
      hint: "Incidents per week? Days behind? Test coverage? Morale?",
    },
    {
      id: 'tu-dig-2',
      phase: 'dig',
      question: "What did you identify as the real problem?",
      hint: "Not the symptoms - the root cause of the mess.",
    },
    {
      id: 'tu-dig-3',
      phase: 'dig',
      question: "What was your first move? What did you prioritize?",
      hint: "You couldn't fix everything - what came first?",
    },
    {
      id: 'tu-impact-1',
      phase: 'impact',
      question: "What are the numbers now? Give me before and after.",
      hint: "Same metrics you mentioned before - what changed?",
    },
    {
      id: 'tu-impact-2',
      phase: 'impact',
      question: "How long did the turnaround take?",
      hint: "When did you know it was working?",
    },
    {
      id: 'tu-growth-1',
      phase: 'growth',
      question: "What did you learn about turning things around?",
      hint: "What would you do faster next time?",
    },
  ],

  preventer: [
    {
      id: 'pr-dig-1',
      phase: 'dig',
      question: "What did you notice that others didn't?",
      hint: "What pattern or risk caught your attention?",
    },
    {
      id: 'pr-dig-2',
      phase: 'dig',
      question: "How did you know it was a real risk, not paranoia?",
      hint: "What evidence did you gather?",
    },
    {
      id: 'pr-dig-3',
      phase: 'dig',
      question: "How did you raise the alarm? Who did you convince?",
      hint: "Was there resistance? How did you overcome it?",
    },
    {
      id: 'pr-impact-1',
      phase: 'impact',
      question: "What would have happened if you hadn't caught this?",
      hint: "Paint the picture of the disaster that didn't happen.",
    },
    {
      id: 'pr-impact-2',
      phase: 'impact',
      question: "What changed because of your warning?",
      hint: "New process? Fix deployed? Policy changed?",
    },
    {
      id: 'pr-growth-1',
      phase: 'growth',
      question: "What makes you good at seeing risks others miss?",
      hint: "Is it experience? Paranoia? Process? Intuition?",
    },
  ],
};

/**
 * Get next question for a session
 */
export function getNextQuestion(
  archetype: StoryArchetype,
  currentPhase: 'dig' | 'impact' | 'growth',
  questionsAsked: number
): CoachQuestion | null {
  const questions = ARCHETYPE_QUESTIONS[archetype];
  const phaseQuestions = questions.filter(q => q.phase === currentPhase);

  // Count questions asked in current phase
  const phaseStartIndex = questions.findIndex(q => q.phase === currentPhase);
  const questionsInPhase = questionsAsked - phaseStartIndex;

  if (questionsInPhase < phaseQuestions.length) {
    return phaseQuestions[questionsInPhase];
  }

  // Move to next phase
  const phases: Array<'dig' | 'impact' | 'growth'> = ['dig', 'impact', 'growth'];
  const currentIdx = phases.indexOf(currentPhase);

  if (currentIdx < phases.length - 1) {
    const nextPhase = phases[currentIdx + 1];
    const nextPhaseQuestions = questions.filter(q => q.phase === nextPhase);
    return nextPhaseQuestions[0] || null;
  }

  return null; // Session complete
}

/**
 * Get all questions for an archetype (for non-interactive mode)
 */
export function getAllQuestions(archetype: StoryArchetype): CoachQuestion[] {
  return ARCHETYPE_QUESTIONS[archetype];
}
