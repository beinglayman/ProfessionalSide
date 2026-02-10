import React, { useState, useEffect } from 'react';
import { Mic, Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getSectionColor, formatTime, type SectionTiming } from './constants';

interface PracticeTimerProps {
  totalSeconds: number;
  sectionTimings: SectionTiming[];
  isActive: boolean;
  onToggle: () => void;
  onReset: () => void;
}

export const PracticeTimer: React.FC<PracticeTimerProps> = ({
  totalSeconds,
  sectionTimings,
  isActive,
  onToggle,
  onReset,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleReset = () => {
    setElapsed(0);
    onReset();
  };

  const isOverTime = elapsed > totalSeconds;
  const idealRange = elapsed >= totalSeconds * 0.8 && elapsed <= totalSeconds * 1.2;

  // Calculate which section we should be in based on elapsed time
  const getCurrentSection = (): string | null => {
    let cumulative = 0;
    for (const section of sectionTimings) {
      cumulative += section.seconds;
      if (elapsed < cumulative) {
        return section.key;
      }
    }
    return null;
  };

  const currentSection = getCurrentSection();

  return (
    <div className="flex items-center gap-3">
      {/* Timer + Controls - all inline */}
      <Mic className={cn('h-3.5 w-3.5 flex-shrink-0', isActive ? 'text-red-500 animate-pulse' : 'text-gray-400')} />
      <span className={cn(
        'font-mono text-sm font-semibold tabular-nums',
        isOverTime ? 'text-red-500' : idealRange ? 'text-green-600' : 'text-gray-900'
      )}>
        {formatTime(elapsed)}
      </span>
      <span className="text-xs text-gray-400">/ {formatTime(totalSeconds)}</span>

      {/* Section progress bar - inline, compact */}
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 flex overflow-hidden" title="Section timing">
        {sectionTimings.map((section) => (
          <div
            key={section.key}
            className={cn(
              'h-full transition-opacity',
              getSectionColor(section.key).bg,
              currentSection === section.key && isActive ? 'opacity-100' : 'opacity-50'
            )}
            style={{ width: `${section.percentage}%` }}
            title={`${section.label}: ${formatTime(section.seconds)}`}
          />
        ))}
      </div>

      {/* Play/Pause + Reset */}
      <button
        onClick={onToggle}
        className={cn(
          'p-1.5 rounded transition-colors',
          isActive ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600'
        )}
        title={isActive ? 'Pause' : 'Start practice'}
      >
        {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <button onClick={handleReset} className="p-1.5 rounded text-gray-400 hover:bg-gray-100" title="Reset">
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
