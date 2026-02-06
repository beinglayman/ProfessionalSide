/**
 * WizardLoadingState
 *
 * Engaging loading screen for Analyze and Generate steps.
 * Top zone: auto-rotating facts (2s cycle).
 * Bottom zone: quote carousel with manual < > navigation and heart button.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { cn } from '../../lib/utils';
import { JournalEntryMeta } from '../../types/career-stories';
import { CAREER_QUOTES, WIZARD_LOADING_FACTS } from '../career-stories/constants';

/** Fact rotation cycle (ms) */
const FACT_ROTATION_MS = 2000;
/** Fade-out duration before switching facts (ms) */
const FACT_FADE_MS = 300;

interface WizardLoadingStateProps {
  journalMeta?: JournalEntryMeta;
  mode: 'analyze' | 'generate';
}

function buildEntryFacts(meta: JournalEntryMeta): string[] {
  const facts: string[] = [];
  if (meta.activityCount) {
    facts.push(`Reviewing ${meta.activityCount} activities...`);
  }
  if (meta.dateRange) {
    facts.push(`Spanning ${meta.dateRange}...`);
  }
  if (meta.tools && meta.tools.length > 0) {
    facts.push(`Found work across ${meta.tools.join(', ')}...`);
  }
  if (meta.topics && meta.topics.length > 0) {
    facts.push(`Topics: ${meta.topics.slice(0, 3).join(', ')}...`);
  }
  if (meta.impactHighlights && meta.impactHighlights.length > 0) {
    facts.push(`Key impact: ${meta.impactHighlights[0]}`);
  }
  return facts;
}

export const WizardLoadingState: React.FC<WizardLoadingStateProps> = ({
  journalMeta,
  mode,
}) => {
  const allFacts = React.useMemo(() => {
    const entryFacts = journalMeta ? buildEntryFacts(journalMeta) : [];
    return [...entryFacts, ...WIZARD_LOADING_FACTS[mode]];
  }, [journalMeta, mode]);

  const [factIndex, setFactIndex] = useState(0);
  const [factVisible, setFactVisible] = useState(true);

  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * CAREER_QUOTES.length)
  );

  // Session-only hearted quotes (no persistence)
  const [hearted, setHearted] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    let fadeTimeout: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setFactVisible(false);
      fadeTimeout = setTimeout(() => {
        setFactIndex((i) => (i + 1) % allFacts.length);
        setFactVisible(true);
      }, FACT_FADE_MS);
    }, FACT_ROTATION_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimeout);
    };
  }, [allFacts.length]);

  const prevQuote = useCallback(() => {
    setQuoteIndex((i) => (i - 1 + CAREER_QUOTES.length) % CAREER_QUOTES.length);
  }, []);

  const nextQuote = useCallback(() => {
    setQuoteIndex((i) => (i + 1) % CAREER_QUOTES.length);
  }, []);

  const toggleHeart = useCallback(() => {
    setHearted((prev) => {
      const next = new Set(prev);
      if (next.has(quoteIndex)) {
        next.delete(quoteIndex);
      } else {
        next.add(quoteIndex);
      }
      return next;
    });
  }, [quoteIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prevQuote();
    if (e.key === 'ArrowRight') nextQuote();
  }, [prevQuote, nextQuote]);

  const quote = CAREER_QUOTES[quoteIndex];
  const isHearted = hearted.has(quoteIndex);

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-8 min-h-[400px]">
      {/* Spinner + rotating facts */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
        </div>
        <div
          role="status"
          aria-live="polite"
          className={`text-sm text-gray-500 text-center max-w-md transition-opacity duration-300 ${
            factVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {allFacts[factIndex]}
        </div>
      </div>

      {/* Quote carousel — full width */}
      <div
        className="w-full px-2"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Career coaching quotes"
      >
        <div className="bg-gray-50 rounded-xl px-6 py-5 border border-gray-100">
          <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest mb-3">
            {quote.theme}
          </p>
          <p
            data-testid="quote-text"
            className="text-base text-gray-800 font-medium leading-relaxed"
          >
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="text-sm text-gray-400 mt-2 font-light">&mdash; {quote.attribution}</p>

          {/* Navigation + heart */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <button
                onClick={prevQuote}
                aria-label="Previous quote"
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[10px] text-gray-300 tabular-nums">
                {quoteIndex + 1} / {CAREER_QUOTES.length}
              </span>
              <button
                onClick={nextQuote}
                aria-label="Next quote"
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={toggleHeart}
              aria-label={isHearted ? 'Unlike quote' : 'Like quote'}
              className={cn(
                'p-1.5 rounded-full transition-all duration-200',
                isHearted
                  ? 'text-red-500 hover:text-red-600 scale-110'
                  : 'text-gray-300 hover:text-red-400 hover:bg-gray-100'
              )}
            >
              <Heart className={cn('h-4 w-4', isHearted && 'fill-current')} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
