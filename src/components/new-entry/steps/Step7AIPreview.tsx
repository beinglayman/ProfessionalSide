import React, { useState, useRef } from 'react';
import { Sparkles, RefreshCw, Eye, Lock, Users, Globe, Shield, Trophy, Award, Star, Badge } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { Step7Props } from '../types/newEntryTypes';
import { getEntryTypeDisplayName, getPrivacyLevelDisplayName } from '../utils/formUtils';
import { useContainedConfetti } from '../../../hooks/useContainedConfetti';

interface AIGenerationButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  hasGenerated: boolean;
  canGenerate: boolean;
}

const AIGenerationButton: React.FC<AIGenerationButtonProps> = ({
  onClick,
  isGenerating,
  hasGenerated,
  canGenerate
}) => {
  const getButtonText = () => {
    if (isGenerating) return 'Generating...';
    if (hasGenerated) return 'Regenerate Content';
    return 'Generate AI Content';
  };

  const getButtonIcon = () => {
    if (isGenerating) return <RefreshCw className="w-4 h-4 animate-spin" />;
    return <Sparkles className="w-4 h-4" />;
  };

  return (
    <Button
      onClick={onClick}
      disabled={isGenerating || !canGenerate}
      className={cn(
        "w-full py-3 text-sm font-medium transition-all duration-200",
        hasGenerated && !isGenerating
          ? "bg-primary-600 hover:bg-primary-700 text-white"
          : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
      )}
    >
      {getButtonIcon()}
      <span className="ml-2">{getButtonText()}</span>
    </Button>
  );
};

interface EntryPreviewProps {
  formData: Step7Props['formData'];
  generatedEntry: any;
}

const EntryPreview: React.FC<EntryPreviewProps> = ({ formData, generatedEntry }) => {
  const { triggerContainedConfetti } = useContainedConfetti();
  const previewRef = useRef<HTMLDivElement>(null);
  const [lastConfettiTime, setLastConfettiTime] = useState(0);

  const getPrivacyIcon = () => {
    switch (formData.privacyLevel) {
      case 'private':
        return <Lock className="w-4 h-4 text-gray-600" />;
      case 'team':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'network':
        return <Globe className="w-4 h-4 text-green-600" />;
      case 'public':
        return <Shield className="w-4 h-4 text-purple-600" />;
      default:
        return <Lock className="w-4 h-4 text-gray-600" />;
    }
  };

  // Get achievement info for achievement entries (same logic as journal-card.tsx)
  const getAchievementInfo = () => {
    // For goal completion achievements
    if (formData.markGoalAsComplete && formData.linkedGoalId) {
      return {
        icon: Star,
        title: `Completed Goal: Goal Title`,
        description: formData.goalCompletionNotes?.trim() || 'Successfully completed the goal through this journal entry.',
        type: 'milestone'
      };
    }

    // For regular achievement entries
    if (formData.entryType === 'achievement' && formData.achievementType && formData.achievementTitle) {
      const achievementIcons = {
        'certification': Award,
        'award': Trophy,
        'milestone': Star,
        'recognition': Badge
      };

      const AchievementIcon = achievementIcons[formData.achievementType] || Award;

      return {
        icon: AchievementIcon,
        title: formData.achievementTitle,
        description: formData.achievementDescription,
        type: formData.achievementType
      };
    }

    return null;
  };

  const achievementInfo = getAchievementInfo();

  // Handler for achievement hover confetti with throttling
  const handleAchievementHover = () => {
    if (achievementInfo && previewRef.current) {
      const now = Date.now();
      // Throttle confetti to max once every 3 seconds
      if (now - lastConfettiTime > 3000) {
        triggerContainedConfetti(previewRef, {
          particleCount: 40,
          colors: ['#5D259F', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE']
        });
        setLastConfettiTime(now);
      }
    }
  };

  return (
    <div
      ref={previewRef}
      className={cn(
        "bg-white rounded-lg p-6 space-y-4 transition-shadow hover:shadow-md overflow-hidden",
        achievementInfo ? "border border-purple-300" : "border border-gray-200"
      )}
      onMouseEnter={handleAchievementHover}
    >
      {/* Entry Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <span className="capitalize">{getEntryTypeDisplayName(formData.entryType)}</span>
            <span>•</span>
            <div className="flex items-center space-x-1">
              {getPrivacyIcon()}
              <span>{getPrivacyLevelDisplayName(formData.privacyLevel)}</span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {generatedEntry?.title || formData.title}
          </h3>
        </div>
      </div>

      {/* Achievement Box (same as journal-card.tsx) */}
      {achievementInfo && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <achievementInfo.icon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-purple-900 mb-1">
                Achievement
              </h4>
              <p className="text-sm font-medium text-purple-800 mb-1">
                {achievementInfo.title}
              </p>
              {achievementInfo.description && (
                <p className="text-xs text-purple-700">
                  {achievementInfo.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content Preview */}
      <div className="prose prose-sm max-w-none">
        {generatedEntry ? (
          <div>
            <p className="text-gray-700 mb-4">
              {generatedEntry.description}
            </p>
            {generatedEntry.outcomes && generatedEntry.outcomes.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Outcomes & Results:</h4>
                <div className="space-y-3">
                  {generatedEntry.outcomes.map((outcome: any, index: number) => (
                    <div key={index} className="border-l-4 border-blue-200 pl-4">
                      <h5 className="font-medium text-gray-800">
                        {outcome.title} <span className="text-xs text-gray-500">({outcome.category})</span>
                      </h5>
                      <p className="text-sm text-gray-600">{outcome.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-600">
            <p className="mb-4">{formData.content}</p>
            {formData.abstractContent && (
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-medium text-gray-800 mb-2">Summary:</h4>
                <p className="text-sm">{formData.abstractContent}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Skills and Artifacts */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
        {formData.skills.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Skills</h5>
            <div className="flex flex-wrap gap-1">
              {formData.skills.slice(0, 5).map(skill => (
                <span
                  key={skill.id}
                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                >
                  {skill.name}
                </span>
              ))}
              {formData.skills.length > 5 && (
                <span className="text-xs text-gray-500">+{formData.skills.length - 5} more</span>
              )}
            </div>
          </div>
        )}

        {formData.artifacts.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Attachments</h5>
            <div className="text-xs text-gray-600">
              {formData.artifacts.length} file{formData.artifacts.length !== 1 ? 's' : ''} attached
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const Step7AIPreview: React.FC<Step7Props> = ({
  formData,
  workspaceId,
  onGenerate,
  isGenerating,
  generatedEntry
}) => {
  const canGenerate = !!(
    formData.title.trim() &&
    formData.content.trim() &&
    formData.entryType &&
    formData.selectedSkillIds.length > 0
  );

  const hasGenerated = !!generatedEntry;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Step 7 of 7</h2>
        <p className="text-sm text-gray-600">
          Preview and enhance your entry with AI
        </p>
      </div>

      {/* AI Generation Section */}
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Sparkles className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-purple-900 mb-1">
                AI-Enhanced Content
              </h3>
              <p className="text-sm text-purple-800 mb-3">
                Our AI can enhance your entry with structured outcomes, professional formatting,
                and optimized content for better visibility and impact.
              </p>
              <AIGenerationButton
                onClick={onGenerate}
                isGenerating={isGenerating}
                hasGenerated={hasGenerated}
                canGenerate={canGenerate}
              />
            </div>
          </div>
        </div>

        {!canGenerate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Complete all required fields to enable AI generation:
              {!formData.title.trim() && ' Title'}
              {!formData.content.trim() && ' Content'}
              {!formData.entryType && ' Entry Type'}
              {formData.selectedSkillIds.length === 0 && ' Skills'}
            </p>
          </div>
        )}
      </div>

      {/* Entry Preview */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Entry Preview</h3>
        </div>
        <EntryPreview formData={formData} generatedEntry={generatedEntry} />
      </div>

      {/* Publishing Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          Ready to Publish
        </h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Your entry will be saved with <strong>{getPrivacyLevelDisplayName(formData.privacyLevel)}</strong> visibility</p>
          <p>• Skills and achievements will be added to your profile</p>
          {formData.markGoalAsComplete && formData.linkedGoalId && (
            <p>• The linked goal will be marked as completed</p>
          )}
          {formData.artifacts.length > 0 && (
            <p>• {formData.artifacts.length} file{formData.artifacts.length !== 1 ? 's' : ''} will be attached</p>
          )}
        </div>
      </div>

      {/* Final Check */}
      {hasGenerated && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-900 mb-2">
            ✓ Ready to Create Entry
          </h3>
          <p className="text-sm text-green-800">
            Your AI-enhanced content is ready. Review the preview above and click "Create Entry" when you're satisfied.
          </p>
        </div>
      )}
    </div>
  );
};