import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Globe,
  Wrench,
  Sparkles,
  Tag,
  FolderOpen,
  Check,
  AlertCircle,
  Loader2,
  Link2
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useJournalSubscriptionManager } from '../../hooks/useJournalSubscription';
import {
  DayOfWeek,
  DAY_LABELS,
  DAY_SHORT_LABELS,
  SUPPORTED_TOOLS,
  GENERATION_TIME_OPTIONS,
  TIMEZONE_OPTIONS,
  getUserTimezone,
  CreateSubscriptionInput
} from '../../types/journal-subscription';

interface JournalAutoCreationSettingsProps {
  workspaceId: string;
  onBack: () => void;
}

const ALL_DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Format relative time like "in 4 hours 27 minutes"
function formatRelativeTime(dateString: string): string {
  const targetDate = new Date(dateString);
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'soon';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  const remainingMinutes = diffMinutes % 60;

  if (diffDays > 0) {
    if (remainingHours > 0) {
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
    }
    return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }

  if (diffHours > 0) {
    if (remainingMinutes > 0) {
      return `in ${diffHours} hour${diffHours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
    }
    return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }

  return `in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
}

export function JournalAutoCreationSettings({
  workspaceId,
  onBack
}: JournalAutoCreationSettingsProps) {
  const {
    subscription,
    connectedTools,
    isLoading,
    isLoadingTools,
    isCreating,
    isUpdating,
    isToggling,
    createSubscription,
    updateSubscription,
    toggleSubscription
  } = useJournalSubscriptionManager(workspaceId);

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(['mon', 'tue', 'wed', 'thu', 'fri']); // Default to weekdays
  const [generationTime, setGenerationTime] = useState('18:00');
  const [timezone, setTimezone] = useState(getUserTimezone());
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [defaultCategory, setDefaultCategory] = useState('');
  const [defaultTags, setDefaultTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Category options
  const categoryOptions = [
    'Daily Summary',
    'Engineering',
    'Design',
    'Product',
    'Marketing',
    'Operations',
    'Research',
    'Learning'
  ];

  // Load subscription data into form
  useEffect(() => {
    if (subscription) {
      setIsEnabled(subscription.isActive);
      setSelectedDays(subscription.selectedDays);
      setGenerationTime(subscription.generationTime);
      setTimezone(subscription.timezone);
      setSelectedTools(subscription.selectedTools);
      setCustomPrompt(subscription.customPrompt || '');
      setDefaultCategory(subscription.defaultCategory || '');
      setDefaultTags(subscription.defaultTags || []);
    }
  }, [subscription]);

  // Track changes
  useEffect(() => {
    if (!subscription) {
      setHasChanges(isEnabled || selectedTools.length > 0);
      return;
    }

    const changed =
      isEnabled !== subscription.isActive ||
      JSON.stringify(selectedDays) !== JSON.stringify(subscription.selectedDays) ||
      generationTime !== subscription.generationTime ||
      timezone !== subscription.timezone ||
      JSON.stringify(selectedTools) !== JSON.stringify(subscription.selectedTools) ||
      customPrompt !== (subscription.customPrompt || '') ||
      defaultCategory !== (subscription.defaultCategory || '') ||
      JSON.stringify(defaultTags) !== JSON.stringify(subscription.defaultTags || []);

    setHasChanges(changed);
  }, [
    subscription,
    isEnabled,
    selectedDays,
    generationTime,
    timezone,
    selectedTools,
    customPrompt,
    defaultCategory,
    defaultTags
  ]);

  const handleDayToggle = (day: DayOfWeek) => {
    // Always multi-select mode
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleToolToggle = (toolId: string) => {
    setSelectedTools(prev =>
      prev.includes(toolId)
        ? prev.filter(t => t !== toolId)
        : [...prev, toolId]
    );
  };

  const handleAddTag = () => {
    if (newTag.trim() && !defaultTags.includes(newTag.trim())) {
      setDefaultTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setDefaultTags(prev => prev.filter(t => t !== tag));
  };

  const handleSave = async () => {
    setError(null);

    // Validation
    if (selectedTools.length === 0) {
      setError('Please select at least one tool');
      return;
    }

    if (selectedDays.length === 0) {
      setError('Please select at least one day');
      return;
    }

    try {
      const data: CreateSubscriptionInput = {
        selectedDays,
        generationTime,
        timezone,
        selectedTools,
        customPrompt: customPrompt || null,
        defaultCategory: defaultCategory || null,
        defaultTags
      };

      if (subscription) {
        await updateSubscription({ ...data, isActive: isEnabled });
      } else {
        await createSubscription(data);
      }

      setHasChanges(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    }
  };

  const handleToggle = async () => {
    try {
      if (subscription) {
        await toggleSubscription(!isEnabled);
        setIsEnabled(!isEnabled);
      } else {
        setIsEnabled(!isEnabled);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle subscription');
    }
  };

  const isToolConnected = (toolId: string) => {
    return connectedTools.some(t => t.toolType === toolId && t.isConnected);
  };

  const isSaving = isCreating || isUpdating;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Journal Auto-Creation</h4>
              <p className="text-sm text-gray-500">
                Automatically generate journal entries from your connected tools
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
              isEnabled ? 'bg-purple-600' : 'bg-gray-200',
              isToggling && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                isEnabled ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {subscription && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {subscription.isActive ? (
                <>
                  <span className="inline-flex items-center text-green-600">
                    <Check className="h-4 w-4 mr-1" />
                    Active
                  </span>
                  {subscription.nextRunAt && (
                    <span className="ml-2">
                      — Next sync scheduled {formatRelativeTime(subscription.nextRunAt)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-gray-500">Paused</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Configuration Sections */}
      {(isEnabled || subscription) && (
        <>
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Schedule Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-5 w-5 text-gray-600" />
              <h5 className="font-medium text-gray-900">Schedule</h5>
            </div>

            <div className="space-y-4">
              {/* Day Selection - Always shown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select days to generate journal entries
                </label>
                <div className="flex gap-2">
                  {ALL_DAYS.map(day => (
                    <button
                      key={day}
                      onClick={() => handleDayToggle(day)}
                      className={cn(
                        'w-10 h-10 rounded-full text-sm font-medium transition-colors',
                        selectedDays.includes(day)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                      title={DAY_LABELS[day]}
                    >
                      {DAY_SHORT_LABELS[day]}
                    </button>
                  ))}
                </div>
                {selectedDays.length === 0 && (
                  <p className="mt-2 text-sm text-amber-600">
                    Please select at least one day
                  </p>
                )}
              </div>

              {/* Time and Timezone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Generation Time
                  </label>
                  <select
                    value={generationTime}
                    onChange={e => setGenerationTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {GENERATION_TIME_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="h-4 w-4 inline mr-1" />
                    Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {TIMEZONE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tools Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Wrench className="h-5 w-5 text-gray-600" />
              <h5 className="font-medium text-gray-900">Tools to Include</h5>
            </div>

            {isLoadingTools ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SUPPORTED_TOOLS.map(tool => {
                  const connected = isToolConnected(tool.id);
                  const selected = selectedTools.includes(tool.id);

                  return (
                    <button
                      key={tool.id}
                      onClick={() => connected && handleToolToggle(tool.id)}
                      disabled={!connected}
                      className={cn(
                        'flex items-center space-x-2 p-3 rounded-lg border transition-colors text-left',
                        selected && connected
                          ? 'border-purple-500 bg-purple-50'
                          : connected
                          ? 'border-gray-200 hover:border-gray-300'
                          : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                      )}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
                          selected && connected
                            ? 'bg-purple-600 border-purple-600'
                            : 'border-gray-300'
                        )}
                      >
                        {selected && connected && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-sm',
                          connected ? 'text-gray-700' : 'text-gray-400'
                        )}
                      >
                        {tool.name}
                      </span>
                      {!connected && (
                        <Link2 className="h-3 w-3 text-gray-400 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {connectedTools.filter(t => t.isConnected).length === 0 && (
              <p className="mt-3 text-sm text-amber-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                No tools connected. Connect tools in your profile settings.
              </p>
            )}
          </div>

          {/* Customization Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="h-5 w-5 text-gray-600" />
              <h5 className="font-medium text-gray-900">Customization</h5>
              <span className="text-xs text-gray-400">(Optional)</span>
            </div>

            <div className="space-y-4">
              {/* Custom Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Prompt
                </label>
                <textarea
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Focus on key achievements and learnings"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  maxLength={1000}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Guide how the AI summarizes your activities
                </p>
              </div>

              {/* Default Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FolderOpen className="h-4 w-4 inline mr-1" />
                  Default Category
                </label>
                <select
                  value={defaultCategory}
                  onChange={e => setDefaultCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">None</option>
                  {categoryOptions.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Default Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="h-4 w-4 inline mr-1" />
                  Default Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {defaultTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-purple-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add a tag"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    maxLength={50}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || selectedTools.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty state when disabled and no subscription */}
      {!isEnabled && !subscription && (
        <div className="text-center py-8 text-gray-500">
          <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">
            Enable auto-creation to automatically generate journal entries from your connected tools.
          </p>
        </div>
      )}
    </div>
  );
}

export default JournalAutoCreationSettings;
