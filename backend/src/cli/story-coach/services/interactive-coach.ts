/**
 * Interactive Story Coach Service
 *
 * Real coaching loop that extracts rich details before story generation.
 * Follows RJ/PGC guidance: "Ask the good questions first."
 *
 * Philosophy:
 * - Journalism, not evaluation (interview, don't grade)
 * - One question at a time
 * - Dynamic follow-ups based on answers
 * - User never sees scores
 */

import * as readline from 'readline';
import { v4 as uuidv4 } from 'uuid';
import {
  JournalEntryFile,
  CoachSessionFile,
  StoryArchetype,
  ExtractedContext,
  CoachExchange,
} from '../types';
import { ARCHETYPE_QUESTIONS } from '../questions';
import { callLLM } from './llm-client';

const COACH_PERSONA = `You are a Story Coach - part journalist, part mentor. You're interviewing someone about a career achievement to extract the compelling story beneath the surface.

Your style:
- Direct but warm
- Curious, not judgmental
- You dig for specifics: names, numbers, moments
- You find the drama they didn't know was there
- One short response at a time

Never use:
- Corporate jargon
- Phrases like "That's great!" or "Awesome!"
- Long responses (2 sentences max)

Your job is to pull out what they KNOW but didn't WRITE.`;

interface CoachResponse {
  acknowledgment: string;
  followUp?: string;
  extractedDetail?: string;
}

/**
 * Get dynamic coach response to user's answer
 */
async function getCoachResponse(
  question: string,
  answer: string,
  archetype: StoryArchetype,
  previousExchanges: CoachExchange[]
): Promise<CoachResponse> {
  const context = previousExchanges
    .map((e) => `Q: ${e.question}\nA: ${e.answer}`)
    .join('\n\n');

  const prompt = `${COACH_PERSONA}

Story Type: ${archetype.toUpperCase()}

Previous conversation:
${context || '(Just started)'}

You just asked: "${question}"

They answered: "${answer}"

Respond with JSON only:
{
  "acknowledgment": "Brief acknowledgment (1 sentence, showing you heard the specific detail)",
  "followUp": "Optional probing question if their answer was vague or has more to unpack (null if answer was specific enough)",
  "extractedDetail": "The key specific detail from their answer (name, number, moment, or insight)"
}`;

  try {
    const response = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 300,
    });

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Coach response failed, using fallback');
  }

  // Fallback response
  return {
    acknowledgment: "Got it. Let me note that down.",
    extractedDetail: answer.slice(0, 100),
  };
}

/**
 * Map extracted details to context fields
 * Uses semantic extraction - looks for patterns in ALL answers, not positional mapping
 */
function updateContext(
  context: ExtractedContext,
  questionId: string,
  answer: string,
  extractedDetail?: string
): void {
  const detail = extractedDetail || answer;
  const baseQuestionId = questionId.replace(/-followup$/, ''); // Handle follow-ups

  // Always extract named people from any answer (pattern: "Name from team" or just capitalized names)
  const namePatterns = [
    /([A-Z][a-z]+)\s+(?:from|on|in)\s+(?:the\s+)?([a-z]+)/gi,  // "Sarah from platform"
    /(?:called|texted|pinged|asked|told)\s+([A-Z][a-z]+)/gi,    // "called Sarah"
    /([A-Z][a-z]+)(?:,?\s+(?:the|a|our)\s+)?(?:senior|lead|principal|staff)?\s*(?:engineer|dev|dba|manager|director)/gi, // "Alex the DBA"
  ];

  for (const pattern of namePatterns) {
    const matches = detail.matchAll(pattern);
    for (const match of matches) {
      const name = match[1];
      if (name && name.length > 2 && !['The', 'And', 'But', 'For', 'With'].includes(name)) {
        context.namedPeople = [...new Set([...(context.namedPeople || []), name])];
      }
    }
  }

  // Always extract metrics from any answer
  const percentMatch = detail.match(/(\d+(?:\.\d+)?)\s*%/);
  const dollarMatch = detail.match(/\$[\d,]+(?:\.\d+)?[KMB]?(?:\s*\/\s*(?:hour|day|month|year))?/i);
  const timeMatch = detail.match(/(\d+)\s*(hours?|days?|weeks?|months?|minutes?)/i);
  const countMatch = detail.match(/(\d+)\s*(users?|customers?|teams?|people|engineers?|incidents?)/i);

  if (dollarMatch && !context.metric) {
    context.metric = dollarMatch[0];
  } else if (percentMatch && !context.metric) {
    context.metric = `${percentMatch[1]}%`;
  } else if (countMatch && !context.metric) {
    context.metric = countMatch[0];
  } else if (timeMatch && !context.metric) {
    context.metric = timeMatch[0];
  }

  // Extract counterfactual phrases from any answer
  const counterfactualPatterns = [
    /would have (?:caused|resulted|led to|meant|cost)[^.]+/i,
    /could have (?:lost|caused|resulted)[^.]+/i,
    /if (?:we|I) hadn't[^.]+/i,
    /without (?:this|the fix|intervention)[^.]+/i,
    /at risk[^.]+/i,
  ];

  for (const pattern of counterfactualPatterns) {
    const match = detail.match(pattern);
    if (match && !context.counterfactual) {
      context.counterfactual = match[0];
    }
  }

  // Phase-based primary mapping (for the main insight of each phase)
  if (baseQuestionId.includes('dig-1') && !context.realStory) {
    context.realStory = detail;
  } else if (baseQuestionId.includes('dig-2') && !context.keyDecision) {
    context.keyDecision = detail;
  } else if (baseQuestionId.includes('dig-3') && !context.obstacle) {
    context.obstacle = detail;
  } else if (baseQuestionId.includes('impact-1') && !context.counterfactual) {
    context.counterfactual = detail;
  } else if (baseQuestionId.includes('impact-2') && !context.metric) {
    context.metric = detail;
  } else if (baseQuestionId.includes('growth') && !context.learning) {
    context.learning = detail;
  }
}

/**
 * Run interactive coaching session
 */
export async function runInteractiveCoaching(
  entry: JournalEntryFile,
  archetype: StoryArchetype,
  options: {
    maxQuestions?: number;
    allowSkip?: boolean;
    showProgress?: boolean;
  } = {}
): Promise<CoachSessionFile> {
  const { maxQuestions = 6, allowSkip = true, showProgress = true } = options;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askUser = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  // Initialize session
  const session: CoachSessionFile = {
    id: uuidv4(),
    journalEntryId: entry.id,
    archetype,
    exchanges: [],
    extractedContext: {},
    currentPhase: 'dig',
    questionsAsked: 0,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
  };

  const questions = ARCHETYPE_QUESTIONS[archetype];

  // Opening
  console.log('\n' + '═'.repeat(60));
  console.log(' STORY COACH');
  console.log('═'.repeat(60));
  console.log('');
  console.log(`"${entry.title}" - I see what you wrote.`);
  console.log(`Now let's find the story beneath it.`);
  console.log('');
  if (allowSkip) {
    console.log('(Press Enter to skip a question. Type "done" to finish early.)');
  }
  console.log('');

  let questionIndex = 0;
  let followUpQuestion: string | null = null;

  while (questionIndex < Math.min(questions.length, maxQuestions)) {
    const question = questions[questionIndex];
    const questionText = followUpQuestion || question.question;

    // Show progress
    if (showProgress && !followUpQuestion) {
      const phase = question.phase.toUpperCase();
      console.log(`\n[${phase} ${questionIndex + 1}/${maxQuestions}]`);
    }

    // Ask question
    console.log(`\nCoach: "${questionText}"`);
    if (!followUpQuestion && question.hint) {
      console.log(`       (${question.hint})`);
    }

    const answer = await askUser('\nYou: ');

    // Handle exit
    if (answer.toLowerCase() === 'done' || answer.toLowerCase() === 'quit') {
      console.log('\nCoach: "Alright, we have enough to work with. Let\'s see what we can build."');
      break;
    }

    // Handle skip
    if (!answer.trim()) {
      if (allowSkip) {
        console.log('\nCoach: "No problem. Moving on."');
        followUpQuestion = null;
        questionIndex++;
        continue;
      }
    }

    // Process answer
    const response = await getCoachResponse(
      questionText,
      answer,
      archetype,
      session.exchanges
    );

    // Record exchange
    session.exchanges.push({
      questionId: followUpQuestion ? `${question.id}-followup` : question.id,
      question: questionText,
      answer: answer.trim(),
      phase: question.phase,
      timestamp: new Date().toISOString(),
    });

    // Update context
    updateContext(
      session.extractedContext,
      question.id,
      answer,
      response.extractedDetail
    );

    // Show acknowledgment
    console.log(`\nCoach: "${response.acknowledgment}"`);

    // Check for follow-up
    if (response.followUp && session.exchanges.length < maxQuestions) {
      followUpQuestion = response.followUp;
      // Don't increment questionIndex - stay on same base question
    } else {
      followUpQuestion = null;
      questionIndex++;
    }

    session.questionsAsked = session.exchanges.length;
    session.currentPhase = question.phase;
  }

  rl.close();

  // Wrap up
  session.status = 'completed';
  session.completedAt = new Date().toISOString();

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log(' SESSION COMPLETE');
  console.log('═'.repeat(60));

  const extracted = Object.entries(session.extractedContext)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  console.log(`\nExtracted ${extracted.length} rich details:`);
  extracted.forEach((key) => {
    const value = session.extractedContext[key as keyof ExtractedContext];
    if (Array.isArray(value)) {
      console.log(`  • ${key}: ${value.join(', ')}`);
    } else if (typeof value === 'string') {
      console.log(`  • ${key}: ${value.slice(0, 60)}${value.length > 60 ? '...' : ''}`);
    }
  });

  console.log('\nCoach: "Now let\'s turn this into a story worth telling."');

  return session;
}

/**
 * Quick extraction for non-interactive mode (e.g., tests)
 * Uses LLM to extract context from entry without user input
 */
export async function extractContextWithLLM(
  entry: JournalEntryFile,
  archetype: StoryArchetype
): Promise<ExtractedContext> {
  const questions = ARCHETYPE_QUESTIONS[archetype]
    .slice(0, 4) // Use first 4 questions as extraction prompts
    .map((q) => q.question)
    .join('\n- ');

  const prompt = `You are extracting rich story details from a journal entry.

Entry Title: ${entry.title}
Entry Content: ${entry.fullContent || entry.description}

Story Type: ${archetype.toUpperCase()}

Based on this entry, infer answers to these Story Coach questions:
- ${questions}

Extract any specific details present (names, numbers, dates, metrics).
Also infer what LIKELY happened based on context clues.

Respond with JSON only:
{
  "realStory": "The core narrative in 1-2 sentences",
  "obstacle": "The main challenge or problem faced",
  "keyDecision": "The critical decision or action taken",
  "counterfactual": "What would have happened without intervention",
  "metric": "Quantified impact (number, percentage, time)",
  "namedPeople": ["Names of people mentioned or likely involved"],
  "learning": "Key takeaway or lesson"
}

Only include fields where you have reasonable confidence. Use null for uncertain fields.`;

  try {
    const response = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      maxTokens: 500,
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      // Filter out null values
      return Object.fromEntries(
        Object.entries(extracted).filter(([_, v]) => v !== null)
      ) as ExtractedContext;
    }
  } catch (error) {
    console.error('LLM extraction failed:', error);
  }

  // Fallback: basic extraction
  return {
    realStory: entry.description || entry.title,
  };
}
