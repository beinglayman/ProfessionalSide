/**
 * WizardLoadingState
 *
 * Engaging loading screen for Analyze and Generate steps.
 * Top zone: auto-rotating facts (2s cycle).
 * Bottom zone: quote carousel with manual < > navigation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { JournalEntryMeta } from '../../types/career-stories';
import { CAREER_QUOTES, WIZARD_LOADING_FACTS } from '../career-stories/constants';

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

  useEffect(() => {
    const interval = setInterval(() => {
      setFactVisible(false);
      setTimeout(() => {
        setFactIndex((i) => (i + 1) % allFacts.length);
        setFactVisible(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, [allFacts.length]);

  const prevQuote = useCallback(() => {
    setQuoteIndex((i) => (i - 1 + CAREER_QUOTES.length) % CAREER_QUOTES.length);
  }, []);

  const nextQuote = useCallback(() => {
    setQuoteIndex((i) => (i + 1) % CAREER_QUOTES.length);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prevQuote();
    if (e.key === 'ArrowRight') nextQuote();
  }, [prevQuote, nextQuote]);

  const quote = CAREER_QUOTES[quoteIndex];

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-8 min-h-[400px]">
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

      <div
        className="w-full max-w-lg px-4"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Career coaching quotes"
      >
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
            {quote.theme}
          </p>
          <p
            data-testid="quote-text"
            className="text-sm text-gray-700 italic leading-relaxed"
          >
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="text-xs text-gray-400 mt-2">&mdash; {quote.attribution}</p>

          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={prevQuote}
              aria-label="Previous quote"
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[10px] text-gray-300">
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
        </div>
      </div>
    </div>
  );
};
