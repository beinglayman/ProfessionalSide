/**
 * FrameworkPickerModal Component
 *
 * Modal for selecting a narrative framework when promoting a journal entry to career story.
 * Shows use-case focused framework recommendations matching the RegenerateButton UI.
 */

import React, { useState } from 'react';
import { X, Sparkles, Check, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useFrameworkRecommendations } from '../../hooks/useCareerStories';
import { NarrativeFramework } from '../../types/career-stories';
import { NARRATIVE_FRAMEWORKS } from './constants';

/**
 * Use-case focused framework recommendations for career personas.
 * Shared between FrameworkPickerModal and RegenerateButton.
 */
export const USE_CASE_FRAMEWORKS: Record<string, {
  label: string;
  description: string;
  frameworks: NarrativeFramework[];
  icon: string;
}> = {
  interview: {
    label: 'Job Interview',
    description: 'Behavioral questions, "Tell me about a time..."',
    frameworks: ['STAR', 'CAR', 'SOAR'],
    icon: '💼',
  },
  promotion: {
    label: 'Promotion Discussion',
    description: 'Manager 1:1, leveling conversations',
    frameworks: ['SOAR', 'SHARE', 'STARL'],
    icon: '📈',
  },
  bragDoc: {
    label: 'Brag Document',
    description: 'Monthly/quarterly achievements, self-review',
    frameworks: ['STARL', 'SOAR', 'CARL'],
    icon: '📝',
  },
  technical: {
    label: 'Technical Discussion',
    description: 'Problem-solving, debugging stories',
    frameworks: ['CAR', 'PAR', 'STAR'],
    icon: '🔧',
  },
  leadership: {
    label: 'Leadership Story',
    description: 'Cross-team work, stakeholder management',
    frameworks: ['SHARE', 'SOAR', 'STARL'],
    icon: '👥',
  },
};

interface FrameworkPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: string;
  entryTitle: string;
  onSelectFramework: (framework: NarrativeFramework) => void;
  isCreating?: boolean;
}

export const FrameworkPickerModal: React.FC<FrameworkPickerModalProps> = ({
  isOpen,
  onClose,
  entryId,
  entryTitle,
  onSelectFramework,
  isCreating = false,
}) => {
  const [selectedFramework, setSelectedFramework] = useState<NarrativeFramework | null>(null);
  const [selectedTab, setSelectedTab] = useState<'useCases' | 'allFormats'>('useCases');
  const { data: recommendations, isLoading, error } = useFrameworkRecommendations(entryId, isOpen);

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCreating) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCreating, onClose]);

  // Reset selection when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedFramework(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (selectedFramework) {
      onSelectFramework(selectedFramework);
    } else if (recommendations?.primary) {
      onSelectFramework(recommendations.primary.framework as NarrativeFramework);
    } else {
      onSelectFramework('STAR');
    }
  };

  const currentSelection = selectedFramework || (recommendations?.primary?.framework as NarrativeFramework) || 'STAR';

  // Determine recommended use case from API or default
  const recommendedUseCase = recommendations?.recommendedUseCase?.id || 'interview';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !isCreating && onClose()}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="framework-picker-title"
        className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 id="framework-picker-title" className="text-lg font-semibold text-gray-900">
              Create Career Story
            </h2>
            <button
              onClick={onClose}
              disabled={isCreating}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-1">
            {entryTitle}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setSelectedTab('useCases')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              selectedTab === 'useCases'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Choose by Use Case
          </button>
          <button
            onClick={() => setSelectedTab('allFormats')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              selectedTab === 'allFormats'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            All Formats
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <span className="ml-2 text-gray-500">Analyzing entry...</span>
            </div>
          ) : selectedTab === 'useCases' ? (
            /* Use-case focused view */
            <div className="p-4 space-y-3">
              {/* AI Recommendation banner */}
              {recommendations?.recommendedUseCase && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-sm text-amber-800">
                    Based on your entry, we recommend <strong>{recommendations.recommendedUseCase.label}</strong>
                  </span>
                </div>
              )}

              {Object.entries(USE_CASE_FRAMEWORKS).map(([key, useCase]) => {
                const isRecommendedUseCase = key === recommendedUseCase;
                return (
                  <div
                    key={key}
                    className={cn(
                      'rounded-lg border overflow-hidden transition-all',
                      isRecommendedUseCase ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'
                    )}
                  >
                    <div className={cn(
                      'px-4 py-3 flex items-center gap-3',
                      isRecommendedUseCase ? 'bg-amber-50' : 'bg-gray-50'
                    )}>
                      <span className="text-2xl">{useCase.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{useCase.label}</span>
                          {isRecommendedUseCase && (
                            <span className="text-xs text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded font-medium">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{useCase.description}</div>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex flex-wrap gap-2 bg-white">
                      {useCase.frameworks.map((fw, idx) => {
                        const meta = NARRATIVE_FRAMEWORKS[fw];
                        const isSelected = fw === currentSelection;
                        const isBest = idx === 0;
                        return (
                          <button
                            key={fw}
                            onClick={() => setSelectedFramework(fw)}
                            className={cn(
                              'px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1.5',
                              isSelected
                                ? 'bg-blue-600 text-white font-medium shadow-sm'
                                : isBest
                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 ring-1 ring-amber-300'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            )}
                            title={meta.description}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            {meta.label}
                            {isBest && !isSelected && <span className="text-amber-600">★</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* All formats view */
            <div className="py-2">
              {(Object.keys(NARRATIVE_FRAMEWORKS) as NarrativeFramework[]).map((fw) => {
                const meta = NARRATIVE_FRAMEWORKS[fw];
                const isSelected = fw === currentSelection;
                const isRecommended = fw === recommendations?.primary?.framework;
                return (
                  <button
                    key={fw}
                    onClick={() => setSelectedFramework(fw)}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 transition-colors',
                      isSelected && 'bg-blue-50'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{meta.label}</span>
                        {isRecommended && (
                          <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Pick
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{meta.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Selected: <span className="font-medium text-gray-900">{NARRATIVE_FRAMEWORKS[currentSelection].label}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isLoading || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Story'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrameworkPickerModal;
