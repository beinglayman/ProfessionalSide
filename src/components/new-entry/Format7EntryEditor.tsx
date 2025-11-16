import React, { useState, useEffect } from 'react';
import { Edit2, Eye, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import JournalHybrid from '../format7/journal-hybrid';
import JournalAchievement from '../format7/journal-achievement';

interface Format7EntryEditorProps {
  initialEntry: any; // Format7JournalEntry
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  editableTitle: string;
  editableDescription: string;
  className?: string;
}

export function Format7EntryEditor({
  initialEntry,
  onTitleChange,
  onDescriptionChange,
  editableTitle,
  editableDescription,
  className
}: Format7EntryEditorProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Edit Controls */}
      <div className="space-y-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Edit2 className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Edit Entry Details</h3>
        </div>

        {/* Title Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Entry Title <span className="text-red-500">*</span>
            </label>
            <button
              onClick={() => setIsEditingTitle(!isEditingTitle)}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              {isEditingTitle ? 'Preview' : 'Edit'}
            </button>
          </div>
          {isEditingTitle ? (
            <input
              type="text"
              value={editableTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Enter a descriptive title for your entry..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              autoFocus
            />
          ) : (
            <div
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-md text-sm cursor-pointer hover:border-primary-300"
              onClick={() => setIsEditingTitle(true)}
            >
              {editableTitle || (
                <span className="text-gray-400">Click to add title...</span>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500">
            A clear, concise title that summarizes your work
          </p>
        </div>

        {/* Description Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <button
              onClick={() => setIsEditingDescription(!isEditingDescription)}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              {isEditingDescription ? 'Preview' : 'Edit'}
            </button>
          </div>
          {isEditingDescription ? (
            <textarea
              value={editableDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Provide context and details about your activities..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none"
              autoFocus
            />
          ) : (
            <div
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-md text-sm min-h-[100px] cursor-pointer hover:border-primary-300"
              onClick={() => setIsEditingDescription(true)}
            >
              {editableDescription ? (
                <p className="whitespace-pre-wrap">{editableDescription}</p>
              ) : (
                <span className="text-gray-400">Click to add description...</span>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500">
            Optional: Add context about what you accomplished and learned
          </p>
        </div>

        {/* AI Suggestion Notice */}
        <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
          <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-purple-800">
            <p className="font-medium">AI-Generated Suggestions</p>
            <p className="mt-1 text-purple-700">
              The title and description above were generated by AI based on your activities. Feel free to edit them to better reflect your work.
            </p>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
          {entryType === 'achievement' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
              🏆 Achievement
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600">
          This is how your journal entry will appear in your feed
        </p>

        {/* Format7 Preview */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-1">
          <div className="bg-white rounded-md">
            {entryType === 'achievement' ? (
              <JournalAchievement entry={previewEntry} />
            ) : (
              <JournalHybrid entry={previewEntry} />
            )}
          </div>
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
