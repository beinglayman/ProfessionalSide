import React, { useState } from 'react';
import { RepeatIcon, X } from 'lucide-react';
import { Button } from '../ui/button';
import { JournalEntry } from '../../types/journal';
import { cn } from '../../lib/utils';

interface RechronicleSidePanelProps {
  journal: JournalEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRechronicle: (journalId: string, comment?: string) => void;
  isLoading?: boolean;
}

export function RechronicleSidePanel({
  journal,
  open,
  onOpenChange,
  onRechronicle,
  isLoading = false
}: RechronicleSidePanelProps) {
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journal) return;
    
    onRechronicle(journal.id, comment.trim() || undefined);
    setComment('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setComment('');
    onOpenChange(false);
  };

  if (!journal) return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={handleClose}
        />
      )}
      
      {/* Side Panel */}
      <div className={cn(
        "fixed top-0 right-0 h-screen w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <RepeatIcon className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">ReChronicle Entry</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
            {/* Entry Preview */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-medium text-gray-900 text-sm mb-2">{journal.title}</h3>
              <p className="text-xs text-gray-600 line-clamp-3 mb-3">
                {journal.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>by {journal.author.name}</span>
                <span>•</span>
                <span>{journal.workspaceName}</span>
              </div>
              
              {/* Skills */}
              {journal.skills.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex flex-wrap gap-1">
                    {journal.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700"
                      >
                        {skill}
                      </span>
                    ))}
                    {journal.skills.length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
                        +{journal.skills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Add a comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts about this entry..."
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                rows={4}
                maxLength={500}
                disabled={isLoading}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  Share this entry with your network
                </p>
                <span className="text-xs text-gray-400">
                  {comment.length}/500
                </span>
              </div>
            </div>

            {/* ReChronicle Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-purple-900 mb-2">What happens when you ReChronicle?</h4>
              <ul className="text-xs text-purple-800 space-y-1">
                <li>• This entry will be shared with your professional network</li>
                <li>• Your comment (if added) will be included with the share</li>
                <li>• The original author will be credited</li>
                <li>• Your network can see your professional insights</li>
              </ul>
            </div>
          </div>

        {/* Actions */}
        <div className="border-t bg-gray-50 p-4 flex-shrink-0">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
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
    </>
  );
}