/**
 * ValidationStatsStrip - Ship 4.4.
 *
 * Author-only, glanceable rollup of this story's validation state. Shown
 * underneath the Evidence summary strip in StoryEvidenceView. Numbers are
 * deliberately quiet; this is a credibility signal, not a dashboard.
 */

import React from 'react';
import { ShieldCheck, Users, Clock, AlertTriangle } from 'lucide-react';
import { useStoryValidationStats } from '../../hooks/useStoryValidations';

interface ValidationStatsStripProps {
  storyId: string;
  isOwner?: boolean;
}

function formatHours(hours: number | null): string {
  if (hours === null) return 'no responses yet';
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export const ValidationStatsStrip: React.FC<ValidationStatsStripProps> = ({ storyId, isOwner }) => {
  const { data, isLoading } = useStoryValidationStats(storyId, Boolean(isOwner));

  if (!isOwner || isLoading) return null;
  const stats = data?.stats;
  if (!stats) return null;

  const responseRate =
    stats.validatorsInvited === 0
      ? 0
      : Math.round((stats.validatorsResponded / stats.validatorsInvited) * 100);

  const hasDisputeSignal = stats.breakdown.disputed > 0 || stats.breakdown.invalidated > 0;

  return (
    <div className="flex items-center gap-5 py-2.5 px-4 bg-gray-50/60 rounded-lg border border-gray-200 text-xs">
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span className="font-medium text-gray-900">
          {stats.sectionsCoSigned} of {stats.sectionsTotal} section{stats.sectionsTotal === 1 ? '' : 's'} co-signed
        </span>
      </div>
      <div className="h-3.5 w-px bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-gray-500">
          {stats.validatorsResponded} of {stats.validatorsInvited} validator{stats.validatorsInvited === 1 ? '' : 's'} responded
          {stats.validatorsInvited > 0 && (
            <span className="text-gray-400"> &middot; {responseRate}%</span>
          )}
        </span>
      </div>
      <div className="h-3.5 w-px bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-gray-500">avg response {formatHours(stats.avgResponseHours)}</span>
      </div>
      {hasDisputeSignal && (
        <>
          <div className="h-3.5 w-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-amber-700">
              {stats.breakdown.disputed > 0 && `${stats.breakdown.disputed} disputed`}
              {stats.breakdown.disputed > 0 && stats.breakdown.invalidated > 0 && ', '}
              {stats.breakdown.invalidated > 0 && `${stats.breakdown.invalidated} invalidated`}
            </span>
          </div>
        </>
      )}
      <div className="ml-auto text-[10px] uppercase tracking-wider text-gray-400">
        Author view
      </div>
    </div>
  );
};
