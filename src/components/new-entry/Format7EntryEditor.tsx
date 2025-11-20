import React, { useState, useRef } from 'react';
import { Eye, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';
import JournalEnhanced from '../format7/journal-enhanced';
import { Badge } from '../ui/badge';
import { useContainedConfetti } from '../../hooks/useContainedConfetti';

interface Format7EntryEditorProps {
  initialEntry: any; // Format7JournalEntry
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  editableTitle: string;
  editableDescription: string;
  isPreview?: boolean;
  selectedWorkspaceId?: string;
  onWorkspaceChange?: (workspaceId: string, workspaceName: string) => void;
  className?: string;
  // Explicit correlations and categories props to override entry data
  correlations?: any[];
  categories?: any[];
}

export function Format7EntryEditor({
  initialEntry,
  onTitleChange,
  onDescriptionChange,
  editableTitle,
  editableDescription,
  isPreview = false,
  selectedWorkspaceId,
  onWorkspaceChange,
  className,
  correlations,
  categories
}: Format7EntryEditorProps) {
  // Create preview entry with edited values
  const previewEntry = {
    ...initialEntry,
    entry_metadata: {
      ...initialEntry?.entry_metadata,
      title: editableTitle
    },
    context: {
      ...initialEntry?.context,
      primary_focus: editableDescription
    }
  };

  const entryType = previewEntry?.entry_metadata?.type || 'learning';
  const isAchievement = entryType === 'achievement';

  // Achievement confetti state
  const [lastConfettiTime, setLastConfettiTime] = useState(0);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const { triggerContainedConfetti } = useContainedConfetti();

  const handleAchievementHover = () => {
    if (isAchievement && previewCardRef.current) {
      const now = Date.now();
      if (now - lastConfettiTime > 3000) {
        triggerContainedConfetti(previewCardRef, {
          particleCount: 40,
          spread: 60,
          colors: ['#5D259F', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'],
          duration: 2000,
          origin: {
            x: { min: 0.2, max: 0.8 },
            y: 0.85
          }
        });
        setLastConfettiTime(now);
      }
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Preview Section with Inline Editing */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Preview Entry</h3>
          {isAchievement && (
            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs px-2 py-0.5">
              <Trophy className="w-3 h-3 mr-1" />
              Achievement
            </Badge>
          )}
        </div>

        {/* Enhanced Format7 Preview with Achievement UI */}
        <div
          ref={previewCardRef}
          onMouseEnter={handleAchievementHover}
          className={cn(
            'rounded-lg border bg-white shadow-sm transition-all hover:shadow-md overflow-hidden',
            isAchievement
              ? 'border-purple-300 shadow-purple-100'
              : 'border-gray-200'
          )}
        >
          {/* Achievement Banner - Only for achievement entries */}
          {isAchievement && (
            <div className="bg-purple-50 border-b border-purple-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">Achievement Unlocked</span>
              </div>
              <p className="text-sm text-purple-700">
                {editableTitle || previewEntry?.entry_metadata?.title || 'Achievement description'}
              </p>
            </div>
          )}

          {/* Journal Entry Preview */}
          <JournalEnhanced
            entry={previewEntry}
            correlations={correlations || initialEntry?.correlations || []}
            categories={categories || initialEntry?.categories || []}
            editMode={true}
            isPreview={isPreview}
            selectedWorkspaceId={selectedWorkspaceId}
            onWorkspaceChange={onWorkspaceChange}
            onTitleChange={onTitleChange}
            onDescriptionChange={onDescriptionChange}
          />
        </div>
      </div>

      {/* Character Counts */}
      <div className="flex gap-4 text-xs text-gray-500">
        <div>
          Title: <span className={cn(
            'font-medium',
            editableTitle.length > 100 && 'text-red-600'
          )}>
            {editableTitle.length}/100
          </span>
        </div>
        <div>
          Description: <span className={cn(
            'font-medium',
            editableDescription.length > 500 && 'text-red-600'
          )}>
            {editableDescription.length}/500
          </span>
        </div>
      </div>
    </div>
  );
}
