/**
 * HTML Sanitization for Rich Text Notes
 *
 * DOMPurify wrapper that allows only safe formatting tags
 * from Tiptap's StarterKit (bold, italic, lists, paragraphs).
 */

import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li'];
const ALLOWED_ATTR: string[] = [];

/**
 * Sanitize HTML from Tiptap editor, stripping everything except
 * basic formatting tags (p, br, strong, em, b, i, ul, ol, li).
 */
export function sanitizeNoteHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

/**
 * Detect whether a string contains HTML tags.
 * Used to decide between dangerouslySetInnerHTML vs plain text rendering.
 */
export function isHtmlContent(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/**
 * Check if Tiptap HTML output represents an empty note.
 * Tiptap wraps empty content in `<p></p>`, and whitespace-only
 * content in tags like `<p>   </p>` or `<p><br></p>`.
 */
export function isEmptyNoteHtml(html: string): boolean {
  if (!html) return true;
  if (html === '<p></p>') return true;
  return html.replace(/<[^>]*>/g, '').trim() === '';
}
