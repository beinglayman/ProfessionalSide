/**
 * sanitize-html Unit Tests
 */

import { describe, expect, it } from 'vitest';
import { sanitizeNoteHtml, isHtmlContent, isEmptyNoteHtml } from './sanitize-html';

describe('sanitizeNoteHtml', () => {
  it('strips <script> tags', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeNoteHtml(input)).toBe('<p>Hello</p>');
  });

  it('allows basic formatting tags (b, i, strong, em)', () => {
    const input = '<p><strong>Bold</strong> and <em>italic</em></p>';
    expect(sanitizeNoteHtml(input)).toBe('<p><strong>Bold</strong> and <em>italic</em></p>');
  });

  it('allows list tags (ul, ol, li)', () => {
    const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    expect(sanitizeNoteHtml(input)).toBe('<ul><li>Item 1</li><li>Item 2</li></ul>');
  });

  it('strips disallowed tags but keeps content', () => {
    const input = '<div><span class="bad">text</span></div>';
    expect(sanitizeNoteHtml(input)).toBe('text');
  });

  it('handles plain text (no tags)', () => {
    const input = 'Just plain text';
    expect(sanitizeNoteHtml(input)).toBe('Just plain text');
  });

  it('strips event handler attributes', () => {
    const input = '<p onclick="alert(1)">Click me</p>';
    expect(sanitizeNoteHtml(input)).toBe('<p>Click me</p>');
  });
});

describe('isHtmlContent', () => {
  it('returns true for HTML strings', () => {
    expect(isHtmlContent('<p>Hello</p>')).toBe(true);
    expect(isHtmlContent('<strong>bold</strong>')).toBe(true);
    expect(isHtmlContent('<ul><li>item</li></ul>')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(isHtmlContent('Just plain text')).toBe(false);
    expect(isHtmlContent('no tags here')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isHtmlContent('')).toBe(false);
  });

  it('returns true for strings with angle brackets forming tags', () => {
    expect(isHtmlContent('Use <br> for breaks')).toBe(true);
  });
});

describe('isEmptyNoteHtml', () => {
  it('returns true for empty string', () => {
    expect(isEmptyNoteHtml('')).toBe(true);
  });

  it('returns true for Tiptap default empty paragraph', () => {
    expect(isEmptyNoteHtml('<p></p>')).toBe(true);
  });

  it('returns true for paragraph with only whitespace', () => {
    expect(isEmptyNoteHtml('<p>   </p>')).toBe(true);
  });

  it('returns true for paragraph with br (Tiptap shift+enter in empty)', () => {
    expect(isEmptyNoteHtml('<p><br></p>')).toBe(true);
  });

  it('returns true for multiple empty paragraphs', () => {
    expect(isEmptyNoteHtml('<p></p><p></p>')).toBe(true);
  });

  it('returns true for nested empty tags', () => {
    expect(isEmptyNoteHtml('<p><strong></strong></p>')).toBe(true);
  });

  it('returns false for paragraph with actual text', () => {
    expect(isEmptyNoteHtml('<p>Hello</p>')).toBe(false);
  });

  it('returns false for list with text', () => {
    expect(isEmptyNoteHtml('<ul><li>Item</li></ul>')).toBe(false);
  });

  it('returns false for formatted text', () => {
    expect(isEmptyNoteHtml('<p><strong>Bold</strong></p>')).toBe(false);
  });
});
