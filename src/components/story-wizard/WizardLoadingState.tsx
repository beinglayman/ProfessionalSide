/**
 * WizardLoadingState
 *
 * Loading screen for Analyze and Generate steps.
 * Shows a spinner with auto-rotating contextual facts (2s cycle).
 */

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { JournalEntryMeta } from '../../types/career-stories';
import { WIZARD_LOADING_FACTS } from '../career-stories/constants';

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

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4 min-h-[200px]">
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
  );
};
