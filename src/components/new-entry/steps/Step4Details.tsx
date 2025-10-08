import React from 'react';
import { Lock, Users, Globe, Shield, Award, Badge, Star, Trophy } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Step4Props } from '../types/newEntryTypes';

interface PrivacyLevelOption {
  value: 'private' | 'team' | 'network' | 'public';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const privacyLevels: PrivacyLevelOption[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only visible to you',
    icon: Lock,
    color: 'text-gray-600'
  },
  {
    value: 'team',
    label: 'Team',
    description: 'Visible to your workspace team',
    icon: Users,
    color: 'text-blue-600'
  },
  {
    value: 'network',
    label: 'Network',
    description: 'Visible to your professional network',
    icon: Globe,
    color: 'text-green-600'
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Publicly visible to everyone',
    icon: Shield,
    color: 'text-purple-600'
  }
];

interface AchievementTypeOption {
  value: 'certification' | 'award' | 'milestone' | 'recognition';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const achievementTypes: AchievementTypeOption[] = [
  {
    value: 'certification',
    label: 'Certification',
    description: 'Professional certifications, licenses, or qualifications',
    icon: Award,
    color: 'text-blue-600'
  },
  {
    value: 'award',
    label: 'Award',
    description: 'Recognition awards, honors, or accolades',
    icon: Trophy,
    color: 'text-yellow-600'
  },
  {
    value: 'milestone',
    label: 'Milestone',
    description: 'Project completions, goals achieved, or major accomplishments',
    icon: Star,
    color: 'text-purple-600'
  },
  {
    value: 'recognition',
    label: 'Recognition',
    description: 'Peer recognition, testimonials, or public acknowledgments',
    icon: Badge,
    color: 'text-green-600'
  }
];

export const Step4Details: React.FC<Step4Props> = ({
  formData,
  setFormData,
  validationErrors,
  setValidationErrors,
  workspaceGoals
}) => {
  const isAchievementEntry = formData.entryType === 'achievement';
  const selectedGoal = formData.linkedGoalId
    ? workspaceGoals.find(g => g.id === formData.linkedGoalId)
    : null;

  const handleGoalLinkChange = (goalId: string) => {
    setFormData({
      ...formData,
      linkedGoalId: goalId || null,
      markGoalAsComplete: false,
      goalCompletionNotes: ''
    });
  };

  const handleGoalCompletionToggle = (checked: boolean) => {
    setFormData({
      ...formData,
      markGoalAsComplete: checked,
      goalCompletionNotes: checked ? formData.goalCompletionNotes : ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Step 4 of 7</h2>
        <p className="text-sm text-gray-600">Configure privacy and add details</p>
      </div>

      {/* Privacy Level Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Privacy Level</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {privacyLevels.map(level => {
            const IconComponent = level.icon;
            const isSelected = formData.privacyLevel === level.value;

            return (
              <label
                key={level.value}
                className={cn(
                  "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  isSelected
                    ? "bg-primary-50 border-primary-300"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <input
                  type="radio"
                  name="privacyLevel"
                  value={level.value}
                  checked={isSelected}
                  onChange={(e) => setFormData({ ...formData, privacyLevel: e.target.value as any })}
                  className="sr-only"
                />
                <IconComponent className={cn("w-5 h-5", level.color)} />
                <div>
                  <div className="font-medium text-gray-900">{level.label}</div>
                  <div className="text-xs text-gray-600">{level.description}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Goal Linking */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Link to Goal (Optional)</h3>

        {workspaceGoals.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            No active goals available in this workspace
          </div>
        ) : (
          <select
            value={formData.linkedGoalId || ''}
            onChange={(e) => handleGoalLinkChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select a goal to link this entry to...</option>
            {workspaceGoals.map(goal => (
              <option key={goal.id} value={goal.id}>
                {goal.title} ({goal.status})
              </option>
            ))}
          </select>
        )}

        {/* Goal Completion Option */}
        {selectedGoal && selectedGoal.status !== 'achieved' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="markGoalComplete"
                checked={formData.markGoalAsComplete}
                onChange={(e) => handleGoalCompletionToggle(e.target.checked)}
                className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <label htmlFor="markGoalComplete" className="text-sm font-medium text-green-800 cursor-pointer">
                  Mark "{selectedGoal.title}" as completed with this entry
                </label>
                <p className="text-xs text-green-700 mt-1">
                  This will update the goal status and automatically tag this entry as an achievement.
                </p>
              </div>
            </div>

            {formData.markGoalAsComplete && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-green-700 mb-1">
                  Completion Notes (Optional)
                </label>
                <textarea
                  value={formData.goalCompletionNotes}
                  onChange={(e) => setFormData({ ...formData, goalCompletionNotes: e.target.value })}
                  placeholder="Add any notes about how you completed this goal..."
                  rows={3}
                  className="w-full rounded-md border border-green-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Achievement Details (only for achievement entries) */}
      {isAchievementEntry && (
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900">Achievement Details</h3>

          {/* Achievement Type */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Achievement Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achievementTypes.map(type => {
                const IconComponent = type.icon;
                const isSelected = formData.achievementType === type.value;

                return (
                  <label
                    key={type.value}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      isSelected
                        ? "bg-yellow-50 border-yellow-300"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="achievementType"
                      value={type.value}
                      checked={isSelected}
                      onChange={(e) => setFormData({ ...formData, achievementType: e.target.value as any })}
                      className="sr-only"
                    />
                    <IconComponent className={cn("w-5 h-5", type.color)} />
                    <div>
                      <div className="font-medium text-gray-900">{type.label}</div>
                      <div className="text-xs text-gray-600">{type.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            {validationErrors.achievementType && (
              <p className="text-red-600 text-sm">{validationErrors.achievementType}</p>
            )}
          </div>

          {/* Achievement Title */}
          <div className="space-y-2">
            <label htmlFor="achievementTitle" className="block text-sm font-medium text-gray-700">
              Achievement Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="achievementTitle"
              value={formData.achievementTitle}
              onChange={(e) => setFormData({ ...formData, achievementTitle: e.target.value })}
              placeholder="e.g., AWS Solutions Architect Certification, Employee of the Month"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              maxLength={100}
            />
            <div className="flex justify-between items-center">
              {validationErrors.achievementTitle && (
                <p className="text-red-600 text-sm">{validationErrors.achievementTitle}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {formData.achievementTitle.length}/100 characters
              </p>
            </div>
          </div>

          {/* Achievement Description */}
          <div className="space-y-2">
            <label htmlFor="achievementDescription" className="block text-sm font-medium text-gray-700">
              Achievement Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="achievementDescription"
              value={formData.achievementDescription}
              onChange={(e) => setFormData({ ...formData, achievementDescription: e.target.value })}
              placeholder="Describe what makes this achievement significant and how you earned it..."
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              {validationErrors.achievementDescription && (
                <p className="text-red-600 text-sm">{validationErrors.achievementDescription}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {formData.achievementDescription.length}/500 characters
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};