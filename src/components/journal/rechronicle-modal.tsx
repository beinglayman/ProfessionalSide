import React, { useState } from 'react';
import { RepeatIcon, X } from 'lucide-react';
import { Button } from '../ui/button';
import { JournalEntry } from '../../types/journal';

interface RechronicleModalProps {
  journal: JournalEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRechronicle: (journalId: string, comment?: string) => void;
  isLoading?: boolean;
}

export function RechronicleModal({
  journal,
  open,
  onOpenChange,
  onRechronicle,
  isLoading = false
}: RechronicleModalProps) {
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRechronicle(journal.id, comment.trim() || undefined);
    setComment('');
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal */}
      <div className="relative z-50 w-full max-w-md mx-4 bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <RepeatIcon className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">ReChronicle Entry</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Entry Preview */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 text-sm mb-1">{journal.title}</h3>
            <p className="text-xs text-gray-600 line-clamp-2">
              {journal.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">by {journal.author.name}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">{journal.workspaceName}</span>
            </div>
          </div>

          {/* Comment Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add a comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this entry..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              rows={3}
              maxLength={500}
              disabled={isLoading}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">
                Share this entry with your network
              </p>
              <span className="text-xs text-gray-400">
                {comment.length}/500
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ReChronicling...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RepeatIcon className="h-4 w-4" />
                  ReChronicle
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}