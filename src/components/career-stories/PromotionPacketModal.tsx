/**
 * PromotionPacketModal Component
 *
 * Allows selecting multiple stories and generating a promotion-ready document.
 * Radix Dialog modal following the same pattern as DerivationModal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Loader2, PenLine, FileText } from 'lucide-react';
import { SimpleMarkdown } from '../ui/simple-markdown';
import { cn } from '../../lib/utils';
import type { CareerStory, WritingStyle, DerivePacketResponse } from '../../types/career-stories';
import { useDerivePacket } from '../../hooks/useCareerStories';
import { WRITING_STYLES, USER_PROMPT_MAX_LENGTH } from './constants';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';

// =============================================================================
// TYPES
// =============================================================================

interface PromotionPacketModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: CareerStory[];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PromotionPacketModal({ isOpen, onClose, stories }: PromotionPacketModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tone, setTone] = useState<WritingStyle | ''>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<DerivePacketResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const packetMutation = useDerivePacket();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setTone('');
      setCustomPrompt('');
      setShowCustomPrompt(false);
      setGeneratedResult(null);
      setCopied(false);
      setError(null);
    }
  }, [isOpen]);

  const toggleStory = useCallback((storyId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(storyId)) {
        next.delete(storyId);
      } else if (next.size < 10) {
        next.add(storyId);
      }
      return next;
    });
    setGeneratedResult(null);
    setError(null);
    setCopied(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setCopied(false);

    try {
      const response = await packetMutation.mutateAsync({
        storyIds: Array.from(selectedIds),
        tone: tone || undefined,
        customPrompt: customPrompt || undefined,
      });

      if (response.success && response.data) {
        setGeneratedResult(response.data);
      } else {
        setError(response.error || 'Generation failed');
      }
    } catch (err) {
      setError((err as Error).message || 'Generation failed');
    }
  }, [selectedIds, tone, customPrompt, packetMutation]);

  const handleCopy = useCallback(async () => {
    if (!generatedResult?.text) return;
    try {
      await navigator.clipboard.writeText(generatedResult.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = generatedResult.text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedResult]);

  const isGenerating = packetMutation.isPending;
  const canGenerate = selectedIds.size >= 2 && !isGenerating;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-purple-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base leading-tight">
                Build Promotion Packet
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                Select 2-10 stories to combine into a promotion-ready document
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Story selector */}
        <div className="space-y-3">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Select stories ({selectedIds.size} selected)
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
            {stories.map((story) => {
              const isSelected = selectedIds.has(story.id);
              return (
                <label
                  key={story.id}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-purple-50 border border-purple-200'
                      : 'hover:bg-gray-50 border border-transparent',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleStory(story.id)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className={cn('text-sm truncate', isSelected ? 'text-purple-700 font-medium' : 'text-gray-700')}>
                    {story.title}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Tone pills + Custom instructions */}
        <div className="space-y-3 mt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mr-1">Voice</span>
            <button
              type="button"
              onClick={() => setTone('')}
              className={cn(
                'px-2.5 py-1 text-[10px] font-medium rounded-full transition-colors',
                tone === ''
                  ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Default
            </button>
            {WRITING_STYLES.map(({ value: styleVal, label }) => (
              <button
                key={styleVal}
                type="button"
                onClick={() => setTone(styleVal)}
                className={cn(
                  'px-2.5 py-1 text-[10px] font-medium rounded-full transition-colors',
                  tone === styleVal
                    ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {label}
              </button>
            ))}

            <div className="w-px h-4 bg-gray-200 mx-1" />

            <button
              type="button"
              onClick={() => {
                setShowCustomPrompt(!showCustomPrompt);
                if (showCustomPrompt) setCustomPrompt('');
              }}
              className={cn(
                'px-2.5 py-1 text-[10px] font-medium rounded-full transition-colors inline-flex items-center gap-1',
                showCustomPrompt
                  ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <PenLine className="h-3 w-3" />
              Custom
            </button>
          </div>

          {showCustomPrompt && (
            <div>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                maxLength={USER_PROMPT_MAX_LENGTH}
                placeholder="e.g., Focus on technical leadership growth"
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
              <div className="text-[10px] text-gray-400 mt-0.5 text-right">
                {customPrompt.length}/{USER_PROMPT_MAX_LENGTH}
              </div>
            </div>
          )}
        </div>

        {/* Preview area */}
        <div className="flex-1 min-h-0 overflow-y-auto mt-4">
          {isGenerating && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Building your promotion packet...</span>
              </div>
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-4/5" />
              </div>
            </div>
          )}

          {!isGenerating && generatedResult && (
            <div className="space-y-3">
              <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
                <SimpleMarkdown content={generatedResult.text} className="text-sm text-gray-800 leading-relaxed" />
              </div>
              {(generatedResult.wordCount || generatedResult.charCount) && (
                <div className="flex items-center gap-3 text-xs text-gray-400 px-1">
                  {generatedResult.wordCount && <span>{generatedResult.wordCount} words</span>}
                  {generatedResult.charCount && <span>{generatedResult.charCount} chars</span>}
                  <span>{generatedResult.metadata.storyCount} stories</span>
                </div>
              )}
            </div>
          )}

          {!isGenerating && !generatedResult && selectedIds.size >= 2 && (
            <div className="text-center text-xs text-gray-400 pt-8">
              {selectedIds.size} stories selected. Hit Generate.
            </div>
          )}

          {!isGenerating && !generatedResult && selectedIds.size < 2 && (
            <div className="text-center text-xs text-gray-400 pt-8">
              Select at least 2 stories to build your packet.
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-400" />
          <div className="flex items-center gap-2">
            {generatedResult ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                >
                  Try again
                </Button>
                <Button
                  size="sm"
                  onClick={handleCopy}
                  className={cn(copied && 'bg-green-600 hover:bg-green-700')}
                >
                  {copied ? (
                    <><Check className="h-3.5 w-3.5 mr-1.5" /> Copied — go get 'em</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy to clipboard</>
                  )}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={!canGenerate}
              >
                {isGenerating ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Building...</>
                ) : (
                  'Generate'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
