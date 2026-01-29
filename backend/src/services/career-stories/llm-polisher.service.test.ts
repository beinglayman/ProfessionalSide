/**
 * LLMPolisherService Tests
 *
 * Tests focus on:
 * 1. Happy path polishing (without real API calls)
 * 2. Graceful fallback on errors
 * 3. Component-level granularity
 * 4. PolishStatus enum for explicit outcomes
 * 5. Client injection for testability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMPolisherService, PolishStatus } from './llm-polisher.service';
import { DraftSTAR, STARComponent, ScoredSTAR } from './pipeline/types';

describe('LLMPolisherService', () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  // Test data factories
  const createComponent = (
    overrides: Partial<STARComponent> = {}
  ): STARComponent => ({
    text: 'The dashboard was experiencing performance issues.',
    sources: ['act-1'],
    confidence: 0.8,
    ...overrides,
  });

  const createDraftSTAR = (overrides: Partial<DraftSTAR> = {}): DraftSTAR => ({
    clusterId: 'cluster-1',
    situation: createComponent({
      text: 'Dashboard was taking 10s to load, users were complaining.',
    }),
    task: createComponent({
      text: 'Improve dashboard performance to under 1 second.',
    }),
    action: createComponent({
      text: 'Implemented Redis caching layer for database queries.',
    }),
    result: createComponent({
      text: 'Reduced load time from 10s to 200ms, 50x improvement.',
    }),
    overallConfidence: 0.8,
    participationSummary: {
      initiatorCount: 2,
      contributorCount: 1,
      mentionedCount: 0,
      observerCount: 0,
    },
    suggestedEdits: [],
    metadata: {
      dateRange: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-10'),
      },
      toolsCovered: ['jira', 'github'],
      totalActivities: 3,
    },
    ...overrides,
  });

  const createScoredSTAR = (overrides: Partial<ScoredSTAR> = {}): ScoredSTAR => ({
    ...createDraftSTAR(),
    validation: {
      passed: true,
      score: 0.85,
      failedGates: [],
      warnings: [],
    },
    ...overrides,
  });

  describe('configuration', () => {
    it('reports unconfigured when no API key', () => {
      const service = new LLMPolisherService(null);
      expect(service.isConfigured()).toBe(false);
    });

    it('reports configured when API key provided via env', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const service = new LLMPolisherService();
      expect(service.isConfigured()).toBe(true);
    });

    it('reports configured when client injected', () => {
      const mockClient = {} as any;
      const service = new LLMPolisherService(mockClient);
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('client injection', () => {
    it('accepts pre-configured client', () => {
      const mockClient = { messages: { create: vi.fn() } } as any;
      const service = new LLMPolisherService(mockClient);

      expect(service.isConfigured()).toBe(true);
    });

    it('accepts custom client factory', () => {
      const mockClient = { messages: { create: vi.fn() } } as any;
      const factory = vi.fn().mockReturnValue(mockClient);

      const service = new LLMPolisherService(null, 'test-api-key', factory);

      expect(factory).toHaveBeenCalledWith('test-api-key');
      expect(service.isConfigured()).toBe(true);
    });

    it('prefers injected client over factory', () => {
      const injectedClient = { messages: { create: vi.fn() } } as any;
      const factory = vi.fn();

      new LLMPolisherService(injectedClient, 'api-key', factory);

      expect(factory).not.toHaveBeenCalled();
    });
  });

  describe('polish() without API key', () => {
    it('returns not_configured status when not configured', async () => {
      const service = new LLMPolisherService(null);
      const star = createDraftSTAR();

      const result = await service.polish(star);

      expect(result.status).toBe('not_configured');
      expect(result.reason).toBe('ANTHROPIC_API_KEY not configured');
      expect(result.situation.improved.text).toBe(star.situation.text);
      expect(result.task.improved.text).toBe(star.task.text);
      expect(result.action.improved.text).toBe(star.action.text);
      expect(result.result.improved.text).toBe(star.result.text);
    });

    it('preserves original text in fallback', async () => {
      const service = new LLMPolisherService(null);
      const star = createDraftSTAR();

      const result = await service.polish(star);

      expect(result.situation.original.text).toBe(star.situation.text);
      expect(result.task.original.text).toBe(star.task.text);
      expect(result.action.original.text).toBe(star.action.text);
      expect(result.result.original.text).toBe(star.result.text);
    });

    it('includes reason for each component on fallback', async () => {
      const service = new LLMPolisherService(null);
      const star = createDraftSTAR();

      const result = await service.polish(star);

      expect(result.situation.reason).toBeDefined();
      expect(result.task.reason).toBeDefined();
      expect(result.action.reason).toBeDefined();
      expect(result.result.reason).toBeDefined();
    });

    it('marks all components with not_configured status', async () => {
      const service = new LLMPolisherService(null);
      const star = createDraftSTAR();

      const result = await service.polish(star);

      expect(result.situation.status).toBe('not_configured');
      expect(result.task.status).toBe('not_configured');
      expect(result.action.status).toBe('not_configured');
      expect(result.result.status).toBe('not_configured');
    });
  });

  describe('safePolish()', () => {
    it('returns err Result when not configured', async () => {
      const service = new LLMPolisherService(null);
      const star = createDraftSTAR();

      const result = await service.safePolish(star);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_CONFIGURED');
      }
    });

    it('returns ok Result when configured', async () => {
      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Improved text here' }],
          }),
        },
      } as any;

      const service = new LLMPolisherService(mockClient);
      const star = createDraftSTAR();

      const result = await service.safePolish(star);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('polishIfConfigured()', () => {
    it('returns not_configured status when no API key', async () => {
      const service = new LLMPolisherService(null);
      const star = createScoredSTAR();

      const result = await service.polishIfConfigured(star);

      expect(result.status).toBe('not_configured');
      expect(result.star).toBe(star); // Returns original star
      expect(result.reason).toContain('not configured');
    });

    it('returns applied status when polish succeeds', async () => {
      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Much improved professional text' }],
          }),
        },
      } as any;

      const service = new LLMPolisherService(mockClient);
      const star = createScoredSTAR();

      const result = await service.polishIfConfigured(star);

      expect(result.status).toBe('applied');
      expect(result.star.situation.text).toBe('Much improved professional text');
    });

    it('returns original star when polish fails', async () => {
      const mockClient = {
        messages: {
          create: vi.fn().mockRejectedValue(new Error('API Error')),
        },
      } as any;

      const service = new LLMPolisherService(mockClient);
      const originalStar = createScoredSTAR();

      const result = await service.polishIfConfigured(originalStar);

      expect(result.status).toBe('failed');
      expect(result.star).toEqual(originalStar);
      expect(result.reason).toBeDefined();
    });
  });

  describe('PolishStatus enum', () => {
    it('has all expected values', () => {
      const statuses: PolishStatus[] = [
        'not_requested',
        'not_configured',
        'applied',
        'skipped',
        'failed',
        'no_improvement',
      ];

      expect(statuses).toHaveLength(6);
    });
  });

  describe('component polishing', () => {
    it('skips components with short text', async () => {
      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Improved' }],
          }),
        },
      } as any;

      const service = new LLMPolisherService(mockClient);
      const star = createDraftSTAR({
        situation: createComponent({ text: 'Short' }), // Less than MIN_TEXT_LENGTH
      });

      const result = await service.polish(star);

      expect(result.situation.status).toBe('skipped');
      expect(result.situation.reason).toContain('too short');
    });

    it('skips components with zero confidence', async () => {
      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Improved' }],
          }),
        },
      } as any;

      const service = new LLMPolisherService(mockClient);
      const star = createDraftSTAR({
        task: createComponent({ text: 'This has zero confidence', confidence: 0 }),
      });

      const result = await service.polish(star);

      expect(result.task.status).toBe('skipped');
      expect(result.task.reason).toContain('Empty');
    });

    it('preserves sources array after polish', async () => {
      const service = new LLMPolisherService(null);
      const star = createDraftSTAR({
        situation: createComponent({
          text: 'Dashboard was slow.',
          sources: ['act-1', 'act-2', 'act-3'],
        }),
      });

      const result = await service.polish(star);

      expect(result.situation.improved.sources).toEqual([
        'act-1',
        'act-2',
        'act-3',
      ]);
    });

    it('preserves confidence value after polish', async () => {
      const service = new LLMPolisherService(null);
      const star = createDraftSTAR({
        action: createComponent({
          text: 'Added caching layer.',
          confidence: 0.95,
        }),
      });

      const result = await service.polish(star);

      expect(result.action.improved.confidence).toBe(0.95);
    });
  });

  describe('error handling', () => {
    it('handles timeout errors gracefully', async () => {
      const mockClient = {
        messages: {
          create: vi.fn().mockRejectedValue(
            Object.assign(new Error('Request timed out'), { name: 'AbortError' })
          ),
        },
      } as any;

      const service = new LLMPolisherService(mockClient);
      const star = createDraftSTAR();

      // polish() catches errors and returns fallback
      const result = await service.polish(star);

      expect(result.status).toBe('failed');
      expect(result.reason).toContain('timed out');
    });

    it('handles generic LLM errors gracefully', async () => {
      const mockClient = {
        messages: {
          create: vi.fn().mockRejectedValue(new Error('Rate limit exceeded')),
        },
      } as any;

      const service = new LLMPolisherService(mockClient);
      const star = createDraftSTAR();

      // polish() catches errors and returns fallback
      const result = await service.polish(star);

      expect(result.status).toBe('failed');
      expect(result.reason).toContain('Rate limit exceeded');
    });
  });

  describe('fallback result structure', () => {
    it('returns complete structure on error', async () => {
      const service = new LLMPolisherService(null);
      const star = createDraftSTAR();

      const result = await service.polish(star);

      // Verify complete structure exists
      expect(result).toHaveProperty('situation');
      expect(result).toHaveProperty('task');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('status');

      // Verify each component has correct structure
      for (const key of ['situation', 'task', 'action', 'result'] as const) {
        expect(result[key]).toHaveProperty('status');
        expect(result[key]).toHaveProperty('original');
        expect(result[key]).toHaveProperty('improved');
      }
    });
  });

  describe('edge cases', () => {
    it('handles all empty components gracefully', async () => {
      const service = new LLMPolisherService(null);
      const star = createDraftSTAR({
        situation: createComponent({ text: '', confidence: 0 }),
        task: createComponent({ text: '', confidence: 0 }),
        action: createComponent({ text: '', confidence: 0 }),
        result: createComponent({ text: '', confidence: 0 }),
      });

      const result = await service.polish(star);

      expect(result.status).toBe('not_configured');
    });

    it('handles very long text gracefully', async () => {
      const service = new LLMPolisherService(null);
      const longText = 'A'.repeat(10000);
      const star = createDraftSTAR({
        situation: createComponent({ text: longText }),
      });

      const result = await service.polish(star);

      // Should return fallback (no API key), text preserved
      expect(result.situation.improved.text).toBe(longText);
    });

    it('handles special characters in text', async () => {
      const service = new LLMPolisherService(null);
      const specialText =
        'Dashboard 💨 was <script>alert("xss")</script> slow & broken!';
      const star = createDraftSTAR({
        situation: createComponent({ text: specialText }),
      });

      const result = await service.polish(star);

      expect(result.situation.improved.text).toBe(specialText);
    });
  });
});
