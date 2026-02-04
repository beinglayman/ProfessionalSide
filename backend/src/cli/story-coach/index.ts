#!/usr/bin/env ts-node
/**
 * Story Coach CLI
 *
 * CLI-first demo to validate the pipeline before integration.
 *
 * Usage:
 *   npx ts-node src/cli/story-coach/index.ts <command> [options]
 *
 * Commands:
 *   detect <entry.json>              Detect archetype from journal entry
 *   coach <entry.json>               Run interactive coaching session
 *   generate <entry.json>            Generate story (with optional session)
 *   evaluate <story.json>            Evaluate story quality
 *   compare <entry.json>             Compare with/without coaching
 *   pipeline <entry.json>            Full pipeline: detect → coach → generate → evaluate
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import * as readline from 'readline';
import { v4 as uuidv4 } from 'uuid';

import {
  JournalEntryFile,
  CoachSessionFile,
  GeneratedStoryFile,
  StoryArchetype,
  FrameworkName,
  ExtractedContext,
  ComparisonResultFile,
} from './types';
import { detectArchetype } from './services/archetype-detector';
import { generateStory, generateBasicStory, generateEnhancedStory } from './services/story-generator';
import { evaluateStory } from './services/story-evaluator';
import { runInteractiveCoaching, extractContextWithLLM } from './services/interactive-coach';
import { ARCHETYPE_QUESTIONS, getNextQuestion, getAllQuestions } from './questions';

const program = new Command();

// =============================================================================
// UTILITIES
// =============================================================================

function loadJsonFile<T>(path: string): T {
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as T;
}

function saveJsonFile(path: string, data: unknown): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`✓ Saved: ${path}`);
}

async function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// =============================================================================
// COMMANDS
// =============================================================================

/**
 * Detect archetype from journal entry
 */
async function detectCommand(entryPath: string, options: { output?: string }) {
  console.log('\n🔍 Detecting archetype...\n');

  const entry = loadJsonFile<JournalEntryFile>(entryPath);
  const detection = await detectArchetype(entry);

  console.log(`Primary: ${detection.primary.archetype.toUpperCase()} (${Math.round(detection.primary.confidence * 100)}%)`);
  console.log(`Reasoning: ${detection.primary.reasoning}\n`);

  if (detection.alternatives.length > 0) {
    console.log('Alternatives:');
    detection.alternatives.forEach((alt) => {
      console.log(`  - ${alt.archetype}: ${Math.round(alt.confidence * 100)}%`);
    });
  }

  if (options.output) {
    saveJsonFile(options.output, detection);
  }

  return detection;
}

/**
 * Run interactive coaching session (real coaching with dynamic follow-ups)
 */
async function coachCommand(
  entryPath: string,
  options: { archetype?: string; output?: string; nonInteractive?: boolean; autoExtract?: boolean }
) {
  console.log('\n🎯 Story Coach Session\n');

  const entry = loadJsonFile<JournalEntryFile>(entryPath);

  // Detect or use provided archetype
  let archetype: StoryArchetype;
  if (options.archetype) {
    archetype = options.archetype as StoryArchetype;
    console.log(`Using archetype: ${archetype.toUpperCase()}\n`);
  } else {
    console.log('Detecting archetype...');
    const detection = await detectArchetype(entry);
    archetype = detection.primary.archetype;
    console.log(`Detected: ${archetype.toUpperCase()}\n`);
  }

  let session: CoachSessionFile;

  if (options.nonInteractive) {
    // Non-interactive mode: just output the questions
    const questions = getAllQuestions(archetype);
    console.log('Questions for this archetype:\n');
    questions.forEach((q, i) => {
      console.log(`[${q.phase.toUpperCase()}] Q${i + 1}: ${q.question}`);
      if (q.hint) console.log(`   Hint: ${q.hint}`);
      console.log('');
    });

    // Create empty session
    session = {
      id: uuidv4(),
      journalEntryId: entry.id,
      archetype,
      exchanges: [],
      extractedContext: {},
      currentPhase: 'dig',
      questionsAsked: 0,
      status: 'skipped',
      startedAt: new Date().toISOString(),
    };
  } else if (options.autoExtract) {
    // Auto-extract mode: use LLM to extract context without user input
    console.log('Auto-extracting context with LLM...\n');
    const extractedContext = await extractContextWithLLM(entry, archetype);

    session = {
      id: uuidv4(),
      journalEntryId: entry.id,
      archetype,
      exchanges: [],
      extractedContext,
      currentPhase: 'complete',
      questionsAsked: 0,
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    console.log('Extracted Context:');
    Object.entries(extractedContext).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        console.log(`  • ${key}: ${value.join(', ')}`);
      } else if (value) {
        console.log(`  • ${key}: ${String(value).slice(0, 60)}${String(value).length > 60 ? '...' : ''}`);
      }
    });
  } else {
    // Real interactive coaching with dynamic follow-ups
    session = await runInteractiveCoaching(entry, archetype, {
      maxQuestions: 6,
      allowSkip: true,
      showProgress: true,
    });
  }

  if (options.output) {
    saveJsonFile(options.output, session);
  }

  return session;
}

/**
 * Update extracted context based on question and answer
 */
function updateExtractedContext(
  context: ExtractedContext,
  question: { id: string; phase: string },
  answer: string
): void {
  // Map questions to context fields based on ID patterns
  if (question.id.includes('dig-1') || question.id.includes('dig-2')) {
    // First dig questions usually reveal the obstacle/real story
    if (!context.obstacle) {
      context.obstacle = answer;
    } else {
      context.realStory = (context.realStory || '') + ' ' + answer;
    }
  }

  if (question.id.includes('dig-3')) {
    // Third dig question often reveals key decision
    context.keyDecision = answer;
  }

  if (question.id.includes('impact-1')) {
    // First impact question is usually counterfactual
    context.counterfactual = answer;
  }

  if (question.id.includes('impact-2')) {
    // Second impact question is the metric
    context.metric = answer;
  }

  if (question.id.includes('growth')) {
    // Growth questions reveal learning
    context.learning = (context.learning || '') + ' ' + answer;
  }

  // Extract named people from answers
  const namePattern = /([A-Z][a-z]+ (?:from|on|in) [a-z]+)/gi;
  const names = answer.match(namePattern);
  if (names) {
    context.namedPeople = [...(context.namedPeople || []), ...names];
  }
}

/**
 * Generate story from entry (with optional session)
 */
async function generateCommand(
  entryPath: string,
  options: { session?: string; framework?: string; archetype?: string; output?: string }
) {
  console.log('\n📝 Generating story...\n');

  const entry = loadJsonFile<JournalEntryFile>(entryPath);
  const framework = (options.framework || 'STAR') as FrameworkName;

  let session: CoachSessionFile | undefined;
  let archetype: StoryArchetype | undefined;

  if (options.session) {
    session = loadJsonFile<CoachSessionFile>(options.session);
    archetype = session.archetype;
    console.log(`Using session: ${session.id}`);
    console.log(`Archetype: ${archetype}`);
    console.log(`Extracted context keys: ${Object.keys(session.extractedContext).join(', ')}\n`);
  } else if (options.archetype) {
    archetype = options.archetype as StoryArchetype;
  }

  const story = await generateStory(entry, framework, archetype, session);

  console.log('Generated Story:');
  console.log('═'.repeat(60));
  console.log(`Title: ${story.title}`);
  console.log(`Hook: ${story.hook}`);
  console.log('');

  Object.entries(story.sections).forEach(([key, section]) => {
    console.log(`[${key.toUpperCase()}]`);
    console.log(section.summary);
    console.log('');
  });

  if (options.output) {
    saveJsonFile(options.output, story);
  }

  return story;
}

/**
 * Evaluate a story
 */
async function evaluateCommand(storyPath: string, options: { output?: string }) {
  console.log('\n⭐ Evaluating story...\n');

  const story = loadJsonFile<GeneratedStoryFile>(storyPath);
  const evaluation = await evaluateStory(story);

  console.log('═'.repeat(60));
  console.log(` SCORE: ${evaluation.score}/10`);
  console.log('═'.repeat(60));
  console.log('');
  console.log('Breakdown:');
  console.log(`  Specificity:      ${evaluation.breakdown.specificity}/10`);
  console.log(`  Compelling Hook:  ${evaluation.breakdown.compellingHook}/10`);
  console.log(`  Evidence Quality: ${evaluation.breakdown.evidenceQuality}/10`);
  console.log(`  Archetype Fit:    ${evaluation.breakdown.archetypeFit}/10`);
  console.log(`  Impact:           ${evaluation.breakdown.actionableImpact}/10`);
  console.log('');
  console.log(`Coach: "${evaluation.coachComment}"`);
  console.log('');

  if (evaluation.suggestions.length > 0) {
    console.log('Suggestions:');
    evaluation.suggestions.forEach((s) => console.log(`  • ${s}`));
  }

  if (options.output) {
    saveJsonFile(options.output, evaluation);
  }

  return evaluation;
}

/**
 * Compare with/without coaching
 */
async function compareCommand(entryPath: string, options: { output?: string; outputDir?: string }) {
  console.log('\n🔬 Comparison: With vs Without Story Coach\n');

  const entry = loadJsonFile<JournalEntryFile>(entryPath);
  const outputDir = options.outputDir || './results';

  // Step 1: Detect archetype
  console.log('Step 1: Detecting archetype...');
  const detection = await detectArchetype(entry);
  console.log(`  → ${detection.primary.archetype.toUpperCase()}\n`);

  // Step 2: Generate basic story (without coaching)
  console.log('Step 2: Generating BASIC story (no coaching)...');
  const basicStory = await generateBasicStory(entry, 'SOAR');
  const basicEval = await evaluateStory(basicStory);
  console.log(`  → Score: ${basicEval.score}/10\n`);

  // Step 3: Simulate coaching session with sample answers
  console.log('Step 3: Simulating coaching session...');
  const session = await simulateCoachingSession(entry, detection.primary.archetype);
  console.log(`  → Extracted ${Object.keys(session.extractedContext).length} context items\n`);

  // Step 4: Generate enhanced story (with coaching)
  console.log('Step 4: Generating ENHANCED story (with coaching)...');
  const enhancedStory = await generateEnhancedStory(
    entry,
    'SOAR',
    detection.primary.archetype,
    session
  );
  const enhancedEval = await evaluateStory(enhancedStory);
  console.log(`  → Score: ${enhancedEval.score}/10\n`);

  // Results
  const improvement = enhancedEval.score - basicEval.score;
  const percentImprovement = ((improvement / basicEval.score) * 100).toFixed(1);

  console.log('═'.repeat(60));
  console.log(' COMPARISON RESULTS');
  console.log('═'.repeat(60));
  console.log('');
  console.log(`Basic Story Score:    ${basicEval.score}/10`);
  console.log(`Enhanced Story Score: ${enhancedEval.score}/10`);
  console.log(`Improvement:          +${improvement.toFixed(1)} (${percentImprovement}%)`);
  console.log('');

  // Show key differences
  console.log('Key Differences:');
  const differences: string[] = [];

  if (enhancedEval.breakdown.specificity > basicEval.breakdown.specificity) {
    differences.push('Enhanced has more specific details (names, numbers)');
  }
  if (enhancedEval.breakdown.compellingHook > basicEval.breakdown.compellingHook) {
    differences.push('Enhanced has a more compelling opening');
  }
  if (enhancedStory.hook !== basicStory.hook) {
    differences.push(`Hook changed: "${basicStory.hook.slice(0, 50)}..." → "${enhancedStory.hook.slice(0, 50)}..."`);
  }

  differences.forEach((d) => console.log(`  • ${d}`));

  // Save results
  const comparison: ComparisonResultFile = {
    journalEntryId: entry.id,
    basicStory: { story: basicStory, evaluation: basicEval },
    enhancedStory: { story: enhancedStory, evaluation: enhancedEval, session },
    improvement: {
      scoreDelta: improvement,
      percentImprovement: parseFloat(percentImprovement),
      keyDifferences: differences,
    },
    comparedAt: new Date().toISOString(),
  };

  if (options.output) {
    saveJsonFile(options.output, comparison);
  } else {
    // Save to output directory
    saveJsonFile(join(outputDir, 'comparison.json'), comparison);
    saveJsonFile(join(outputDir, 'basic-story.json'), basicStory);
    saveJsonFile(join(outputDir, 'enhanced-story.json'), enhancedStory);
    saveJsonFile(join(outputDir, 'session.json'), session);
  }

  return comparison;
}

/**
 * Simulate a coaching session with sample answers
 * (For testing - in real use, answers come from user)
 */
async function simulateCoachingSession(
  entry: JournalEntryFile,
  archetype: StoryArchetype
): Promise<CoachSessionFile> {
  // Create session with simulated answers based on entry content
  const session: CoachSessionFile = {
    id: uuidv4(),
    journalEntryId: entry.id,
    archetype,
    exchanges: [],
    extractedContext: {},
    currentPhase: 'complete',
    questionsAsked: 6,
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  // Extract context from entry content (simulating what user would say)
  const content = (entry.fullContent || entry.description || '').toLowerCase();

  // Simulate obstacle extraction
  if (content.includes('bug') || content.includes('issue') || content.includes('problem')) {
    session.extractedContext.obstacle = 'Discovered a critical issue that needed immediate attention';
  }
  if (content.includes('2am') || content.includes('night') || content.includes('weekend')) {
    session.extractedContext.obstacle = 'Got paged at 2am with a critical production issue';
  }

  // Simulate counterfactual
  if (content.includes('customer') || content.includes('user')) {
    session.extractedContext.counterfactual = 'Customers would have been significantly impacted';
  }
  if (content.includes('revenue') || content.includes('money') || content.includes('cost')) {
    session.extractedContext.counterfactual = 'Could have resulted in significant financial loss';
  }

  // Simulate metric extraction
  const percentMatch = content.match(/(\d+)%/);
  if (percentMatch) {
    session.extractedContext.metric = `${percentMatch[1]}% improvement`;
  }
  const timeMatch = content.match(/(\d+)\s*(hours?|days?|weeks?)/);
  if (timeMatch) {
    session.extractedContext.metric = `Saved ${timeMatch[1]} ${timeMatch[2]}`;
  }

  // Add some default context if nothing extracted
  if (Object.keys(session.extractedContext).length === 0) {
    session.extractedContext = {
      obstacle: 'Faced a challenging technical problem with tight deadline',
      counterfactual: 'Would have missed an important milestone',
      metric: 'Delivered on time with high quality',
    };
  }

  return session;
}

/**
 * Coach then Generate (real interactive flow)
 * This is the main user-facing command
 */
async function coachGenerateCommand(
  entryPath: string,
  options: { framework?: string; output?: string; outputDir?: string; autoExtract?: boolean }
) {
  const outputDir = options.outputDir || './results';
  const framework = (options.framework || 'SOAR') as FrameworkName;

  console.log('\n🎯 Story Coach → Generate\n');
  console.log('═'.repeat(60));
  console.log(' Phase 1: Let\'s find the story beneath the surface');
  console.log('═'.repeat(60));

  const entry = loadJsonFile<JournalEntryFile>(entryPath);

  // Step 1: Detect archetype
  console.log('\nDetecting story type...');
  const detection = await detectArchetype(entry);
  const archetype = detection.primary.archetype;
  console.log(`→ This is a ${archetype.toUpperCase()} story (${Math.round(detection.primary.confidence * 100)}% confidence)`);
  console.log(`  "${detection.primary.reasoning}"\n`);

  // Step 2: Run coaching
  let session: CoachSessionFile;

  if (options.autoExtract) {
    // Auto-extract for testing
    console.log('Auto-extracting rich details...\n');
    const extractedContext = await extractContextWithLLM(entry, archetype);
    session = {
      id: uuidv4(),
      journalEntryId: entry.id,
      archetype,
      exchanges: [],
      extractedContext,
      currentPhase: 'complete',
      questionsAsked: 0,
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    console.log('Extracted:');
    Object.entries(extractedContext).forEach(([key, value]) => {
      if (value) {
        const display = Array.isArray(value) ? value.join(', ') : String(value).slice(0, 80);
        console.log(`  • ${key}: ${display}`);
      }
    });
  } else {
    // Real interactive coaching
    session = await runInteractiveCoaching(entry, archetype, {
      maxQuestions: 6,
      allowSkip: true,
      showProgress: true,
    });
  }

  // Save session
  saveJsonFile(join(outputDir, '1-session.json'), session);

  // Step 3: Generate story with extracted context
  console.log('\n' + '═'.repeat(60));
  console.log(' Phase 2: Generating your story');
  console.log('═'.repeat(60));
  console.log('');

  const story = await generateEnhancedStory(entry, framework, archetype, session);

  // Display story
  console.log(`\n📖 ${story.title}\n`);
  console.log(`"${story.hook}"\n`);

  Object.entries(story.sections).forEach(([key, section]) => {
    console.log(`[${key.toUpperCase()}]`);
    console.log(section.summary);
    if (section.evidence && section.evidence.length > 0) {
      section.evidence.forEach((e) => console.log(`  • ${e}`));
    }
    console.log('');
  });

  // Save story
  saveJsonFile(join(outputDir, '2-story.json'), story);

  // Step 4: Quick evaluation (internal, not shown as score)
  const evaluation = await evaluateStory(story);

  // Show coach comment without the score
  console.log('═'.repeat(60));
  console.log(` Coach: "${evaluation.coachComment}"`);
  console.log('═'.repeat(60));

  // If there are suggestions, show them as "to make it even stronger"
  if (evaluation.suggestions.length > 0) {
    console.log('\nTo make it even stronger:');
    evaluation.suggestions.slice(0, 2).forEach((s) => console.log(`  → ${s}`));
  }

  saveJsonFile(join(outputDir, '3-evaluation.json'), evaluation);

  console.log(`\n✓ All files saved to ${outputDir}/`);

  if (options.output) {
    saveJsonFile(options.output, story);
  }

  return { session, story, evaluation };
}

/**
 * Full pipeline: detect → coach (LLM extraction) → generate → evaluate
 */
async function pipelineCommand(entryPath: string, options: { outputDir?: string }) {
  const outputDir = options.outputDir || './results';

  console.log('\n🚀 Running Full Pipeline\n');
  console.log('═'.repeat(60));

  // Load entry
  const entry = loadJsonFile<JournalEntryFile>(entryPath);
  console.log(`Entry: ${entry.title}\n`);

  // Step 1: Detect
  console.log('STEP 1: Archetype Detection');
  const detection = await detectArchetype(entry);
  console.log(`  Result: ${detection.primary.archetype.toUpperCase()} (${Math.round(detection.primary.confidence * 100)}%)`);
  saveJsonFile(join(outputDir, '1-archetype.json'), detection);

  // Step 2: Extract context with LLM (replaces simulated coaching)
  console.log('\nSTEP 2: Context Extraction (LLM)');
  const extractedContext = await extractContextWithLLM(entry, detection.primary.archetype);
  const session: CoachSessionFile = {
    id: uuidv4(),
    journalEntryId: entry.id,
    archetype: detection.primary.archetype,
    exchanges: [],
    extractedContext,
    currentPhase: 'complete',
    questionsAsked: 0,
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
  console.log(`  Extracted: ${Object.keys(extractedContext).filter(k => extractedContext[k as keyof ExtractedContext]).join(', ')}`);
  saveJsonFile(join(outputDir, '2-session.json'), session);

  // Step 3: Generate
  console.log('\nSTEP 3: Story Generation');
  const story = await generateEnhancedStory(
    entry,
    'SOAR',
    detection.primary.archetype,
    session
  );
  console.log(`  Title: ${story.title}`);
  saveJsonFile(join(outputDir, '3-story.json'), story);

  // Step 4: Evaluate
  console.log('\nSTEP 4: Story Evaluation');
  const evaluation = await evaluateStory(story);
  console.log(`  Score: ${evaluation.score}/10`);
  console.log(`  Coach: "${evaluation.coachComment}"`);
  saveJsonFile(join(outputDir, '4-evaluation.json'), evaluation);

  console.log('\n' + '═'.repeat(60));
  console.log(` PIPELINE COMPLETE - Results in ${outputDir}/`);
  console.log('═'.repeat(60));

  return { detection, session, story, evaluation };
}

// =============================================================================
// CLI SETUP
// =============================================================================

program
  .name('story-coach')
  .description('CLI for Story Coach pipeline testing')
  .version('1.0.0');

program
  .command('detect <entry>')
  .description('Detect archetype from journal entry')
  .option('-o, --output <file>', 'Output file for results')
  .action(async (entry, options) => { await detectCommand(entry, options); });

program
  .command('coach <entry>')
  .description('Run interactive coaching session')
  .option('-a, --archetype <type>', 'Use specific archetype')
  .option('-o, --output <file>', 'Output file for session')
  .option('-n, --non-interactive', 'Just show questions, no interaction')
  .option('--auto-extract', 'Use LLM to auto-extract context (no user input)')
  .action(async (entry, options) => { await coachCommand(entry, options); });

program
  .command('coach-generate <entry>')
  .description('Full flow: coach → generate (main user command)')
  .option('-f, --framework <name>', 'Framework (STAR, SOAR, etc)', 'SOAR')
  .option('-o, --output <file>', 'Output file for final story')
  .option('-d, --output-dir <dir>', 'Output directory for all files', './results')
  .option('--auto-extract', 'Use LLM extraction instead of interactive (for testing)')
  .action(async (entry, options) => { await coachGenerateCommand(entry, options); });

program
  .command('generate <entry>')
  .description('Generate story from entry')
  .option('-s, --session <file>', 'Coach session file')
  .option('-f, --framework <name>', 'Framework (STAR, SOAR, etc)', 'SOAR')
  .option('-a, --archetype <type>', 'Archetype (if no session)')
  .option('-o, --output <file>', 'Output file for story')
  .action(async (entry, options) => { await generateCommand(entry, options); });

program
  .command('evaluate <story>')
  .description('Evaluate story quality')
  .option('-o, --output <file>', 'Output file for evaluation')
  .action(async (story, options) => { await evaluateCommand(story, options); });

program
  .command('compare <entry>')
  .description('Compare with/without coaching')
  .option('-o, --output <file>', 'Output file for comparison')
  .option('-d, --output-dir <dir>', 'Output directory', './results')
  .action(async (entry, options) => { await compareCommand(entry, options); });

program
  .command('pipeline <entry>')
  .description('Full pipeline: detect → coach → generate → evaluate')
  .option('-d, --output-dir <dir>', 'Output directory', './results')
  .action(async (entry, options) => { await pipelineCommand(entry, options); });

program.parse();
