/**
 * Derivation Prompt Builder Tests
 *
 * Tests for:
 * - buildDerivationMessages: System + user message construction for all 6 types
 * - Archetype guidance prepended when provided
 * - Custom prompt and tone included when provided
 * - Full bill of materials passed through
 */

import { describe, it, expect } from 'vitest';
import { buildDerivationMessages, DerivationPromptParams } from './derivation.prompt';
import type { DerivationType } from '../../../controllers/career-stories.schemas';

const createParams = (overrides?: Partial<DerivationPromptParams>): DerivationPromptParams => ({
  title: 'Migrated Auth System',
  framework: 'STAR',
  sections: {
    situation: { summary: 'Team faced auth issues affecting 50K users' },
    task: { summary: 'Led migration from LDAP to OAuth2' },
    action: { summary: 'Implemented OAuth2 with zero-downtime cutover' },
    result: { summary: '50% fewer support tickets, 99.9% uptime' },
  },
  ...overrides,
});

const DERIVATION_TYPES: DerivationType[] = [
  'interview', 'linkedin', 'resume', 'one-on-one', 'self-assessment', 'team-share',
];

describe('buildDerivationMessages', () => {
  it.each(DERIVATION_TYPES)('returns [system, user] messages for %s', (type) => {
    const messages = buildDerivationMessages(type, createParams());
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it.each(DERIVATION_TYPES)('user message contains story title for %s', (type) => {
    const messages = buildDerivationMessages(type, createParams());
    const userContent = messages[1].content as string;
    expect(userContent).toContain('Migrated Auth System');
  });

  it.each(DERIVATION_TYPES)('user message contains section content for %s', (type) => {
    const messages = buildDerivationMessages(type, createParams());
    const userContent = messages[1].content as string;
    expect(userContent).toContain('50K users');
  });

  it.each(DERIVATION_TYPES)('user message contains framework for %s', (type) => {
    const messages = buildDerivationMessages(type, createParams());
    const userContent = messages[1].content as string;
    expect(userContent).toContain('STAR');
  });

  it('prepends archetype guidance to system message when provided', () => {
    const messages = buildDerivationMessages('interview', createParams({
      archetype: 'firefighter',
    }));
    const systemContent = messages[0].content as string;
    expect(systemContent).toContain('FIREFIGHTER');
    expect(systemContent).toContain('CRISIS RESPONSE');
  });

  it('does not include archetype guidance when not provided', () => {
    const messages = buildDerivationMessages('interview', createParams());
    const systemContent = messages[0].content as string;
    expect(systemContent).not.toContain('Story Archetype');
  });

  it('includes tone in user message when provided', () => {
    const messages = buildDerivationMessages('linkedin', createParams({
      tone: 'casual',
    }));
    const userContent = messages[1].content as string;
    expect(userContent).toContain('casual');
  });

  it('does not include tone when not provided', () => {
    const messages = buildDerivationMessages('linkedin', createParams());
    const userContent = messages[1].content as string;
    // The template conditionally renders tone section
    expect(userContent).not.toContain('Writing tone:');
  });

  it('includes custom prompt in user message when provided', () => {
    const messages = buildDerivationMessages('resume', createParams({
      customPrompt: 'Emphasize the security improvements',
    }));
    const userContent = messages[1].content as string;
    expect(userContent).toContain('Emphasize the security improvements');
  });

  it('does not include custom prompt when not provided', () => {
    const messages = buildDerivationMessages('resume', createParams());
    const userContent = messages[1].content as string;
    expect(userContent).not.toContain('Additional direction:');
  });

  it('includes metrics in user message when provided', () => {
    const messages = buildDerivationMessages('interview', createParams({
      metrics: '50% reduction, 99.9% uptime',
    }));
    const userContent = messages[1].content as string;
    expect(userContent).toContain('50% reduction');
  });

  it('system message contains Ann Handley specialist instructions', () => {
    const messages = buildDerivationMessages('interview', createParams());
    const systemContent = messages[0].content as string;
    expect(systemContent).toContain('Ann Handley');
    expect(systemContent).toContain('Return ONLY the derived text');
  });
});
