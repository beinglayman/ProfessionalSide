import React from 'react';
import { cn } from '../../lib/utils';

interface SourceCoverageHeaderProps {
  total: number;
  sourced: number;
}

export function SourceCoverageHeader({ total, sourced }: SourceCoverageHeaderProps) {
  if (total === 0) return null;

  const allSourced = sourced === total;
  const noneSourced = sourced === 0;

  return (
    <span
      className={cn(
        'text-xs font-medium',
        allSourced && 'text-green-600',
        !allSourced && !noneSourced && 'text-amber-600',
        noneSourced && 'text-gray-400'
      )}
    >
      {sourced} of {total} sections have sources
    </span>
  );
}
