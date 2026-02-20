import { describe, it, expect } from 'vitest';
import { compileSafe, escapeHandlebarsInput } from './handlebars-safe';

describe('escapeHandlebarsInput', () => {
  it('escapes double braces in user input', () => {
    const input = 'PR title with {{constructor}}';
    expect(escapeHandlebarsInput(input)).not.toContain('{{constructor}}');
  });

  it('escapes triple braces in user input', () => {
    const input = 'Body with {{{malicious}}}';
    expect(escapeHandlebarsInput(input)).not.toContain('{{{');
  });

  it('preserves normal text', () => {
    const input = 'Normal PR description with {code blocks} and JSON';
    const result = escapeHandlebarsInput(input);
    expect(result).toContain('Normal PR description');
    expect(result).toContain('JSON');
  });

  it('handles null/undefined gracefully', () => {
    expect(escapeHandlebarsInput(null as any)).toBe('');
    expect(escapeHandlebarsInput(undefined as any)).toBe('');
    expect(escapeHandlebarsInput('')).toBe('');
  });

  it('escapes mixed triple and double braces in same string', () => {
    const input = '{{{foo}}} and {{bar}}';
    const result = escapeHandlebarsInput(input);
    expect(result).not.toContain('{{{');
    expect(result).not.toMatch(/(?<!\\)\{\{/);
  });

  it('escapes __proto__ and constructor patterns', () => {
    const input = '{{__proto__.polluted}}';
    expect(escapeHandlebarsInput(input)).not.toContain('{{__proto__');
  });
});

describe('compileSafe', () => {
  it('compiles templates normally', () => {
    const template = compileSafe('Hello {{name}}');
    expect(template({ name: 'World' })).toBe('Hello World');
  });

  it('blocks prototype access', () => {
    const template = compileSafe('{{constructor}}');
    const result = template({});
    expect(result).not.toContain('function');
  });

  it('blocks __proto__ access', () => {
    const template = compileSafe('{{__proto__}}');
    const result = template({});
    expect(result).not.toContain('Object');
  });

  it('handles {{#if}} and {{#each}} blocks normally', () => {
    const template = compileSafe('{{#if show}}yes{{/if}}');
    expect(template({ show: true })).toBe('yes');
    expect(template({ show: false })).toBe('');
  });

  it('handles {{#each}} loops', () => {
    const template = compileSafe('{{#each items}}{{this}},{{/each}}');
    expect(template({ items: ['a', 'b'] })).toBe('a,b,');
  });

  it('degrades gracefully on missing vars (strict:false)', () => {
    const template = compileSafe('Hello {{missing}}!');
    expect(template({})).toBe('Hello !');
  });
});
