import React from 'react';
import { Eye } from 'lucide-react';
import { cn } from '../../lib/utils';
import JournalEnhanced from '../format7/journal-enhanced';

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
      {/* Preview Section with Inline Editing */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Preview & Edit</h3>
          {entryType === 'achievement' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
              🏆 Achievement
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600">
          Click the edit icons to modify title and description. Your changes will update instantly.
        </p>

        {/* Enhanced Format7 Preview with Inline Editing */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-1">
          <div className="bg-white rounded-md">
            <JournalEnhanced
              entry={previewEntry}
              correlations={initialEntry?.correlations || []}
              categories={initialEntry?.categories || []}
              editMode={true}
              onTitleChange={onTitleChange}
              onDescriptionChange={onDescriptionChange}
            />
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
