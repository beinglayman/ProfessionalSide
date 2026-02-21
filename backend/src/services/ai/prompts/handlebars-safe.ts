/**
 * Safe Handlebars utilities.
 *
 * Two layers of defense against template injection from user-controlled data
 * (rawData.body, PR titles, Jira comments):
 *
 * 1. compileSafe() — compile with strict prototype access blocking
 * 2. escapeHandlebarsInput() — strip {{ from user strings BEFORE template rendering
 *
 * escapeHandlebarsInput() is called in the PROMPT LAYER (getCareerStoryUserPrompt),
 * NOT in the adapter. The adapter is a pure data normalizer — it doesn't know about
 * template engines. (RH-1: separation of concerns)
 */

import Handlebars from 'handlebars';

/** Compiled template function returned by compileSafe. */
export type SafeTemplate = (context: any, options?: Handlebars.RuntimeOptions) => string;

/**
 * Compile a template with security hardening.
 *
 * - strict:false — don't crash on missing vars, degrade gracefully
 * - preventIndent:true — preserve template whitespace
 * - noEscape:false — escape HTML entities in {{ }} output
 *
 * Prototype access is already blocked by default in Handlebars 4.6.0+,
 * but we explicitly set the runtime options as defense-in-depth.
 */
export function compileSafe(templateSource: string): SafeTemplate {
  const delegate = Handlebars.compile(templateSource, {
    strict: false,
    preventIndent: true,
    noEscape: false,
  });

  // Wrap the delegate to always pass runtime options blocking prototype access
  return (context: any, options?: Handlebars.RuntimeOptions) => {
    return delegate(context, {
      ...options,
      allowProtoMethodsByDefault: false,
      allowProtoPropertiesByDefault: false,
    });
  };
}

/**
 * Escape Handlebars syntax in user-controlled strings.
 *
 * Called in the PROMPT LAYER when building template data that includes
 * user-authored content (activity bodies, PR titles, comments).
 * NOT called in the adapter — the adapter returns raw data.
 */
export function escapeHandlebarsInput(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/\{\{\{/g, '\\{\\{\\{')
    .replace(/\{\{/g, '\\{\\{');
}
