import React, { useState, useMemo } from 'react';
import { Globe, Heart } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CareerStory, BragDocCategory } from '../../types/career-stories';
import { NARRATIVE_FRAMEWORKS, BRAG_DOC_CATEGORIES, CAREER_QUOTES } from './constants';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: CareerStory;
  onPublish: (category: BragDocCategory) => Promise<void>;
  isPublishing: boolean;
}

function getPreviewSections(story: CareerStory): { label: string; text: string }[] {
  const frameworkInfo = NARRATIVE_FRAMEWORKS[story.framework];
  if (!frameworkInfo) return [];
  return frameworkInfo.sections
    .map((key) => {
      const section = story.sections?.[key];
      if (!section?.summary) return null;
      return { label: key.charAt(0).toUpperCase() + key.slice(1), text: section.summary };
    })
    .filter(Boolean) as { label: string; text: string }[];
}

function extractKeyMetrics(story: CareerStory): string[] {
  const allText = Object.values(story.sections || {}).map(s => s?.summary || '').join(' ');
  const metricPattern = /(\d+(?:\.\d+)?[%xX]|\$\d+(?:,\d{3})*(?:\.\d+)?[KMB]?|\d+(?:,\d{3})*\s*(?:ms|seconds?|hours?|days?|users?))/gi;
  const matches = allText.match(metricPattern) || [];
  return [...new Set(matches)].slice(0, 3);
}

export function PublishModal({ isOpen, onClose, story, onPublish, isPublishing }: PublishModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<BragDocCategory>(
    (story.category as BragDocCategory) || 'projects-impact'
  );

  const sections = useMemo(() => getPreviewSections(story), [story]);
  const metrics = useMemo(() => extractKeyMetrics(story), [story]);
  const frameworkInfo = NARRATIVE_FRAMEWORKS[story.framework];

  const quote = useMemo(() => {
    const publishingQuotes = CAREER_QUOTES.filter(q => q.theme === 'Publishing Your Work');
    return publishingQuotes[Math.floor(Math.random() * publishingQuotes.length)];
  }, []);

  const handlePublish = async () => {
    await onPublish(selectedCategory);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Publish to Network</DialogTitle>
          <DialogDescription>
            Choose a category and publish your story to your profile and followers' feeds.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
            {/* Left panel: Story preview */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{story.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    {frameworkInfo?.label || story.framework}
                  </span>
                  {story.archetype && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 capitalize">
                      {story.archetype}
                    </span>
                  )}
                  {story.role && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                      {story.role}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span>{story.activityIds.length} activities</span>
                </div>
              </div>

              {metrics.length > 0 && (
                <div className="flex gap-1.5">
                  {metrics.map((metric, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary-50 text-primary-700 rounded">
                      {metric}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {sections.map(({ label, text }) => (
                  <div key={label}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</h4>
                    <p className="text-sm text-gray-700 mt-0.5 line-clamp-3">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel: Publish options */}
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700">Profile Category</label>
                <p className="text-xs text-gray-500 mt-0.5 mb-2">Where this story appears on your brag document</p>
                <div className="space-y-2">
                  {BRAG_DOC_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg border transition-colors',
                        selectedCategory === cat.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="text-sm font-medium text-gray-900">{cat.label}</div>
                      <div className="text-xs text-gray-500">{cat.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Globe className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-blue-900">Who will see this</div>
                  <div className="text-xs text-blue-700 mt-0.5">
                    All inChronicle users can see this on your profile and in their feed.
                  </div>
                </div>
              </div>

              {quote && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-start gap-2">
                    <Heart className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-600 italic">&ldquo;{quote.text}&rdquo;</p>
                      <p className="text-[10px] text-gray-400 mt-1">&mdash; {quote.attribution}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? 'Publishing...' : 'Publish to Network'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
