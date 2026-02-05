/**
 * StoryWizardService Tests
 *
 * Tests for the two-step story promotion wizard:
 * - analyzeEntry: archetype detection + question generation
 * - generateStory: story generation with user answers
 *
 * Coverage:
 * - Happy path for both endpoints
 * - Edge cases (empty answers, missing content, invalid archetypes)
 * - Error handling (not found, insufficient content)
 * - Helper function unit tests
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  createStoryWizardService,
  WizardError,
  StoryArchetype,
  WizardAnswer,
  answersToContext,
  extractNamedPeople,
} from './story-wizard.service';

// Mock the LLM-dependent modules
vi.mock('../cli/story-coach/services/archetype-detector', () => ({
  detectArchetype: vi.fn().mockResolvedValue({
    primary: {
      archetype: 'firefighter',
      confidence: 0.85,
      reasoning: 'Entry describes responding to a production incident',
    },
    alternatives: [
      { archetype: 'detective', confidence: 0.65, reasoning: 'Investigation elements present' },
    ],
  }),
}));

vi.mock('./ai/model-selector.service', () => ({
  getModelSelector: vi.fn().mockReturnValue(null), // Use fallback sections
}));

const prisma = new PrismaClient();

const TEST_USER_ID = 'test-user-story-wizard';
const TEST_WORKSPACE_ID = 'test-workspace-story-wizard';

// =============================================================================
// TEST SETUP
// =============================================================================

async function ensureTestUserAndWorkspace(): Promise<void> {
  const existingUser = await prisma.user.findUnique({ where: { id: TEST_USER_ID } });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        email: 'test-story-wizard@test.com',
        name: 'Story Wizard Test User',
        password: 'test-password-hash',
      },
    });
  }

  const existingWorkspace = await prisma.workspace.findUnique({ where: { id: TEST_WORKSPACE_ID } });
  if (!existingWorkspace) {
    await prisma.workspace.create({
      data: {
        id: TEST_WORKSPACE_ID,
        name: 'Test Workspace',
        isPersonal: true,
        members: {
          create: {
            userId: TEST_USER_ID,
            role: 'owner',
            permissions: {},
          },
        },
      },
    });
  }
}

async function cleanupTestData(): Promise<void> {
  await prisma.$transaction([
    prisma.careerStory.deleteMany({ where: { userId: TEST_USER_ID } }),
    prisma.journalEntry.deleteMany({ where: { authorId: TEST_USER_ID } }),
  ]);
}

interface CreateEntryOptions {
  title?: string;
  description?: string;
  fullContent?: string;
  sourceMode?: 'demo' | 'production';
}

async function createTestJournalEntry(options: CreateEntryOptions = {}) {
  // Use nullish coalescing to allow empty strings
  const description = options.description ?? 'Resolved critical production outage affecting 10,000 users';
  const fullContent = options.fullContent ?? `
    At 2am on a Tuesday, I received an alert about our payment processing system being down.
    I quickly assembled a team including Sarah from platform and Marcus from orders.
    After 3 hours of debugging, we identified a race condition in the checkout flow.
    We deployed a fix that prevented an estimated $500K in lost revenue.
    The incident taught me the importance of comprehensive monitoring.
  `.trim();

  return prisma.journalEntry.create({
    data: {
      authorId: TEST_USER_ID,
      workspaceId: TEST_WORKSPACE_ID,
      sourceMode: options.sourceMode ?? 'demo',
      title: options.title ?? 'Production Incident Response',
      description,
      fullContent,
      activityIds: [],
      skills: ['Incident Response', 'Debugging'],
      visibility: 'workspace',
      groupingMethod: 'temporal',
    },
  });
}

// =============================================================================
// TEST SUITES
// =============================================================================

describe('StoryWizardService', () => {
  beforeAll(async () => {
    await ensureTestUserAndWorkspace();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('analyzeEntry', () => {
    it('should detect archetype and return questions for valid entry', async () => {
      const entry = await createTestJournalEntry();
      const service = createStoryWizardService(true);

      const result = await service.analyzeEntry(entry.id, TEST_USER_ID);

      expect(result.archetype.detected).toBe('firefighter');
      expect(result.archetype.confidence).toBeGreaterThan(0);
      expect(result.archetype.reasoning).toBeTruthy();
      expect(result.questions).toBeInstanceOf(Array);
      expect(result.questions.length).toBeGreaterThan(0);
      expect(result.journalEntry.id).toBe(entry.id);
      expect(result.journalEntry.title).toBe('Production Incident Response');
    });

    it('should throw ENTRY_NOT_FOUND for non-existent entry', async () => {
      const service = createStoryWizardService(true);

      await expect(
        service.analyzeEntry('non-existent-id', TEST_USER_ID)
      ).rejects.toThrow(WizardError);

      try {
        await service.analyzeEntry('non-existent-id', TEST_USER_ID);
      } catch (error) {
        expect(error).toBeInstanceOf(WizardError);
        expect((error as WizardError).code).toBe('ENTRY_NOT_FOUND');
        expect((error as WizardError).statusCode).toBe(404);
      }
    });

    it('should throw ENTRY_NOT_FOUND for wrong user', async () => {
      const entry = await createTestJournalEntry();
      const service = createStoryWizardService(true);

      await expect(
        service.analyzeEntry(entry.id, 'different-user-id')
      ).rejects.toThrow(WizardError);
    });

    it('should throw INSUFFICIENT_CONTENT for short entries', async () => {
      const entry = await createTestJournalEntry({
        description: 'Short',
        fullContent: '',
      });
      const service = createStoryWizardService(true);

      await expect(
        service.analyzeEntry(entry.id, TEST_USER_ID)
      ).rejects.toThrow(WizardError);

      try {
        await service.analyzeEntry(entry.id, TEST_USER_ID);
      } catch (error) {
        expect(error).toBeInstanceOf(WizardError);
        expect((error as WizardError).code).toBe('INSUFFICIENT_CONTENT');
        expect((error as WizardError).statusCode).toBe(400);
      }
    });

    it('should respect demo mode isolation', async () => {
      const demoEntry = await createTestJournalEntry({ sourceMode: 'demo' });
      const prodService = createStoryWizardService(false); // production mode

      // Production service should not find demo entry
      await expect(
        prodService.analyzeEntry(demoEntry.id, TEST_USER_ID)
      ).rejects.toThrow(WizardError);
    });

    it('should return questions with correct structure', async () => {
      const entry = await createTestJournalEntry();
      const service = createStoryWizardService(true);

      const result = await service.analyzeEntry(entry.id, TEST_USER_ID);

      for (const question of result.questions) {
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('question');
        expect(question).toHaveProperty('phase');
        expect(['dig', 'impact', 'growth']).toContain(question.phase);
        expect(question).toHaveProperty('allowFreeText');
        expect(question.allowFreeText).toBe(true);
      }
    });

    it('should include alternatives in archetype result', async () => {
      const entry = await createTestJournalEntry();
      const service = createStoryWizardService(true);

      const result = await service.analyzeEntry(entry.id, TEST_USER_ID);

      expect(result.archetype.alternatives).toBeInstanceOf(Array);
      for (const alt of result.archetype.alternatives) {
        expect(alt).toHaveProperty('archetype');
        expect(alt).toHaveProperty('confidence');
      }
    });
  });

  describe('generateStory', () => {
    const validAnswers: Record<string, WizardAnswer> = {
      'firefighter-dig-1': { selected: ['paged'], freeText: 'Got paged at 2am' },
      'firefighter-dig-2': { selected: [], freeText: 'Assembled team with Sarah and Marcus' },
      'firefighter-impact-1': { selected: ['revenue_risk'], freeText: 'Prevented $500K loss' },
      'firefighter-impact-2': { selected: [], freeText: 'Fixed in 3 hours' },
    };

    it('should generate story with valid inputs', async () => {
      const entry = await createTestJournalEntry();
      const service = createStoryWizardService(true);

      const result = await service.generateStory({
        journalEntryId: entry.id,
        answers: validAnswers,
        archetype: 'firefighter',
        framework: 'STAR',
      }, TEST_USER_ID);

      expect(result.story).toBeDefined();
      expect(result.story.framework).toBe('STAR');
      expect(result.story.archetype).toBe('firefighter');
      expect(result.story.hook).toBeTruthy();
      expect(result.story.sections).toBeDefined();
      expect(Object.keys(result.story.sections)).toContain('situation');
      expect(Object.keys(result.story.sections)).toContain('task');
      expect(Object.keys(result.story.sections)).toContain('action');
      expect(Object.keys(result.story.sections)).toContain('result');
    });

    it('should return evaluation with score and suggestions', async () => {
      const entry = await createTestJournalEntry();
      const service = createStoryWizardService(true);

      const result = await service.generateStory({
        journalEntryId: entry.id,
        answers: validAnswers,
        archetype: 'firefighter',
        framework: 'STAR',
      }, TEST_USER_ID);

      expect(result.evaluation).toBeDefined();
      expect(result.evaluation.score).toBeGreaterThanOrEqual(1.0);
      expect(result.evaluation.score).toBeLessThanOrEqual(9.5);
      expect(result.evaluation.suggestions).toBeInstanceOf(Array);
      expect(result.evaluation.suggestions.length).toBeLessThanOrEqual(3);
      expect(result.evaluation.coachComment).toBeTruthy();
    });

    it('should work with empty answers', async () => {
      const entry = await createTestJournalEntry();
      const service = createStoryWizardService(true);

      const result = await service.generateStory({
        journalEntryId: entry.id,
        answers: {},
        archetype: 'firefighter',
        framework: 'STAR',
      }, TEST_USER_ID);

      expect(result.story).toBeDefined();
      expect(result.evaluation.score).toBeGreaterThanOrEqual(1.0);
    });

    it('should use default hook when no extracted context', async () => {
      const entry = await createTestJournalEntry();
      const service = createStoryWizardService(true);

      const result = await service.generateStory({
        journalEntryId: entry.id,
        answers: {},
        archetype: 'architect',
        framework: 'STAR',
      }, TEST_USER_ID);

      expect(result.story.hook).toContain('built');
    });

    it('should generate sections for different frameworks', async () => {
      const entry = await createTestJournalEntry();
      const service = createStoryWizardService(true);

      // Test SOAR framework
      const soarResult = await service.generateStory({
        journalEntryId: entry.id,
        answers: {},
        archetype: 'firefighter',
        framework: 'SOAR',
      }, TEST_USER_ID);

      expect(Object.keys(soarResult.story.sections)).toContain('situation');
      expect(Object.keys(soarResult.story.sections)).toContain('obstacles');
      expect(Object.keys(soarResult.story.sections)).toContain('actions');
      expect(Object.keys(soarResult.story.sections)).toContain('results');
    });

    it('should throw ENTRY_NOT_FOUND for non-existent entry', async () => {
      const service = createStoryWizardService(true);

      await expect(
        service.generateStory({
          journalEntryId: 'non-existent-id',
          answers: {},
          archetype: 'firefighter',
          framework: 'STAR',
        }, TEST_USER_ID)
      ).rejects.toThrow(WizardError);
    });

    it('should extract named people from answers', async () => {
      const entry = await createTestJournalEntry();
      const service = createStoryWizardService(true);

      const answersWithNames: Record<string, WizardAnswer> = {
        'firefighter-dig-2': {
          selected: [],
          freeText: 'Worked with Sarah from platform and Marcus from orders',
        },
      };

      const result = await service.generateStory({
        journalEntryId: entry.id,
        answers: answersWithNames,
        archetype: 'firefighter',
        framework: 'STAR',
      }, TEST_USER_ID);

      // Named people should boost the score
      expect(result.evaluation.score).toBeGreaterThanOrEqual(5.5);
    });
  });
});

// =============================================================================
// UNIT TESTS FOR HELPER FUNCTIONS
// =============================================================================

// =============================================================================
// UNIT TESTS FOR EXPORTED HELPERS
// =============================================================================

describe('extractNamedPeople', () => {
  it('should extract capitalized names', () => {
    const result = extractNamedPeople('Worked with Sarah and Marcus on the project');
    expect(result).toEqual(['Sarah', 'Marcus']);
  });

  it('should filter out common words', () => {
    const result = extractNamedPeople('The project started When Sarah arrived');
    expect(result).toEqual(['Sarah']);
    expect(result).not.toContain('The');
    expect(result).not.toContain('When');
  });

  it('should return undefined for no names', () => {
    const result = extractNamedPeople('worked on the project');
    expect(result).toBeUndefined();
  });

  it('should dedupe duplicate names', () => {
    const result = extractNamedPeople('Sarah helped Sarah and Sarah again');
    expect(result).toEqual(['Sarah']);
  });
});

describe('answersToContext', () => {
  it('should map dig-1 answers to realStory', () => {
    const result = answersToContext({
      'firefighter-dig-1': { selected: ['paged'], freeText: 'Got alerted at 2am' },
    });
    expect(result.realStory).toBe('paged. Got alerted at 2am');
  });

  it('should map dig-2 answers to keyDecision and extract names', () => {
    const result = answersToContext({
      'firefighter-dig-2': { selected: [], freeText: 'Called Sarah for help' },
    });
    expect(result.keyDecision).toBe('Called Sarah for help');
    expect(result.namedPeople).toEqual(['Sarah']);
  });

  it('should map impact-1 to counterfactual', () => {
    const result = answersToContext({
      'any-impact-1': { selected: ['revenue_risk'], freeText: 'Would have lost $500K' },
    });
    expect(result.counterfactual).toBe('revenue_risk. Would have lost $500K');
  });

  it('should map impact-2 to metric', () => {
    const result = answersToContext({
      'any-impact-2': { selected: [], freeText: 'Fixed in 3 hours' },
    });
    expect(result.metric).toBe('Fixed in 3 hours');
  });

  it('should map growth answers to learning', () => {
    const result = answersToContext({
      'any-growth-1': { selected: [], freeText: 'Learned to monitor better' },
    });
    expect(result.learning).toBe('Learned to monitor better');
  });

  it('should handle empty answers gracefully', () => {
    const result = answersToContext({});
    expect(result).toEqual({});
  });

  it('should handle malformed answers', () => {
    const result = answersToContext({
      'test': { selected: null as unknown as string[], freeText: undefined },
    });
    expect(result).toEqual({});
  });
});

describe('answersToContext (via integration)', () => {
  beforeAll(async () => {
    await ensureTestUserAndWorkspace();
  });

  afterEach(async () => {
    await prisma.journalEntry.deleteMany({ where: { authorId: TEST_USER_ID } });
    await prisma.careerStory.deleteMany({ where: { userId: TEST_USER_ID } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should filter out common words from named people extraction', async () => {
    const entry = await prisma.journalEntry.create({
      data: {
        authorId: TEST_USER_ID,
        workspaceId: TEST_WORKSPACE_ID,
        sourceMode: 'demo',
        title: 'Test Entry',
        description: 'Test description with enough content to pass validation',
        fullContent: 'This is a test entry with sufficient content for the wizard to process properly.',
        activityIds: [],
        skills: [],
        visibility: 'workspace',
        groupingMethod: 'temporal',
      },
    });

    const service = createStoryWizardService(true);

    // "The" and "When" should not be extracted as names
    const answers: Record<string, WizardAnswer> = {
      'firefighter-dig-2': {
        selected: [],
        freeText: 'The project involved When the deadline arrived Sarah helped',
      },
    };

    const result = await service.generateStory({
      journalEntryId: entry.id,
      answers,
      archetype: 'firefighter',
      framework: 'STAR',
    }, TEST_USER_ID);

    // Score should reflect that only "Sarah" was extracted, not "The" or "When"
    expect(result.evaluation).toBeDefined();
  });

  it('should handle malformed answer objects gracefully', async () => {
    const entry = await prisma.journalEntry.create({
      data: {
        authorId: TEST_USER_ID,
        workspaceId: TEST_WORKSPACE_ID,
        sourceMode: 'demo',
        title: 'Test Entry',
        description: 'Test description with enough content to pass validation',
        fullContent: 'This is a test entry with sufficient content for the wizard.',
        activityIds: [],
        skills: [],
        visibility: 'workspace',
        groupingMethod: 'temporal',
      },
    });

    const service = createStoryWizardService(true);

    // Malformed answers (missing selected array, null values)
    const malformedAnswers: Record<string, WizardAnswer> = {
      'test-1': { selected: null as unknown as string[], freeText: 'valid text' },
      'test-2': { selected: ['valid'], freeText: undefined },
    };

    // Should not throw
    const result = await service.generateStory({
      journalEntryId: entry.id,
      answers: malformedAnswers,
      archetype: 'firefighter',
      framework: 'STAR',
    }, TEST_USER_ID);

    expect(result.story).toBeDefined();
  });
});

describe('evaluateStory scoring', () => {
  beforeAll(async () => {
    await ensureTestUserAndWorkspace();
  });

  afterEach(async () => {
    await prisma.journalEntry.deleteMany({ where: { authorId: TEST_USER_ID } });
    await prisma.careerStory.deleteMany({ where: { userId: TEST_USER_ID } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should give higher score with metrics in answers', async () => {
    const entry = await prisma.journalEntry.create({
      data: {
        authorId: TEST_USER_ID,
        workspaceId: TEST_WORKSPACE_ID,
        sourceMode: 'demo',
        title: 'Test Entry',
        description: 'Test description with enough content to pass validation',
        fullContent: 'This is a test entry with sufficient content for the wizard.',
        activityIds: [],
        skills: [],
        visibility: 'workspace',
        groupingMethod: 'temporal',
      },
    });

    const service = createStoryWizardService(true);

    // Answers with metric
    const answersWithMetric: Record<string, WizardAnswer> = {
      'firefighter-impact-2': { selected: [], freeText: 'Improved performance by 50%' },
    };

    const withMetric = await service.generateStory({
      journalEntryId: entry.id,
      answers: answersWithMetric,
      archetype: 'firefighter',
      framework: 'STAR',
    }, TEST_USER_ID);

    // Answers without metric
    const withoutMetric = await service.generateStory({
      journalEntryId: entry.id,
      answers: {},
      archetype: 'firefighter',
      framework: 'STAR',
    }, TEST_USER_ID);

    expect(withMetric.evaluation.score).toBeGreaterThan(withoutMetric.evaluation.score);
  });

  it('should never return score above 9.5', async () => {
    const entry = await prisma.journalEntry.create({
      data: {
        authorId: TEST_USER_ID,
        workspaceId: TEST_WORKSPACE_ID,
        sourceMode: 'demo',
        title: 'Perfect Entry',
        description: 'We saved $1 million and 100 hours. Sarah and Marcus helped.',
        fullContent: 'Prevented 50% revenue loss. Would have lost 10000 users otherwise.',
        activityIds: [],
        skills: [],
        visibility: 'workspace',
        groupingMethod: 'temporal',
      },
    });

    const service = createStoryWizardService(true);

    // Answers that should max out the score
    const maxAnswers: Record<string, WizardAnswer> = {
      'firefighter-dig-1': { selected: ['paged'], freeText: 'Critical alert' },
      'firefighter-dig-2': { selected: [], freeText: 'Sarah and Marcus joined' },
      'firefighter-impact-1': { selected: ['revenue_risk'], freeText: 'Would have lost $1M' },
      'firefighter-impact-2': { selected: [], freeText: 'Saved 500 hours per week' },
    };

    const result = await service.generateStory({
      journalEntryId: entry.id,
      answers: maxAnswers,
      archetype: 'firefighter',
      framework: 'STAR',
    }, TEST_USER_ID);

    expect(result.evaluation.score).toBeLessThanOrEqual(9.5);
  });
});
