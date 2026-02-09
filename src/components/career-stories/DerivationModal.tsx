/**
 * DerivationModal Component
 *
 * "Share As..." modal for generating audience-specific derivations from career stories.
 * Flow: format pills → preview/generate. Voice & custom instructions collapsed under Options.
 * Ephemeral — no DB storage.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Check, RefreshCw, Loader2, PenLine, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { CareerStory, DerivationType, WritingStyle, DeriveStoryResponse } from '../../types/career-stories';
import { useDeriveStory } from '../../hooks/useCareerStories';
import { DerivationPreview } from './DerivationPreview';
import { WRITING_STYLES, USER_PROMPT_MAX_LENGTH, DERIVATION_TYPE_META } from './constants';
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

interface DerivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: CareerStory;
}

// one-on-one and self-assessment moved to multi-story packets (PacketModal)
const DERIVATION_TYPES: DerivationType[] = [
  'interview', 'linkedin', 'resume', 'team-share',
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DerivationModal({ isOpen, onClose, story }: DerivationModalProps) {
  const [selectedDerivation, setSelectedDerivation] = useState<DerivationType>('interview');
  const [tone, setTone] = useState<WritingStyle | ''>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<DeriveStoryResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deriveMutation = useDeriveStory();

  // Reset all state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedDerivation('interview');
      setTone('');
      setCustomPrompt('');
      setShowCustomPrompt(false);
      setShowOptions(false);
      setGeneratedResult(null);
      setCopied(false);
      setError(null);
    }
  }, [isOpen]);

  // Clear result when derivation type changes
  useEffect(() => {
    setGeneratedResult(null);
    setError(null);
    setCopied(false);
  }, [selectedDerivation]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setCopied(false);

    try {
      const response = await deriveMutation.mutateAsync({
        storyId: story.id,
        params: {
          derivation: selectedDerivation,
          tone: tone || undefined,
          customPrompt: customPrompt || undefined,
        },
      });

      if (response.success && response.data) {
        setGeneratedResult(response.data);
      } else {
        setError(response.error || 'Generation failed');
      }
    } catch (err) {
      setError((err as Error).message || 'Generation failed');
    }
  }, [story.id, selectedDerivation, tone, customPrompt, deriveMutation]);

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

  const isGenerating = deriveMutation.isPending;
  const hasResult = !!generatedResult;
  const hasCustomOptions = tone !== '' || customPrompt.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base leading-tight">
                Share As...
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate">
                {story.title.length > 60 ? story.title.slice(0, 57) + '...' : story.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Format selector */}
        <div>
          <div className="flex flex-wrap gap-1.5">
            {DERIVATION_TYPES.map((id) => {
              const meta = DERIVATION_TYPE_META[id];
              const isSelected = selectedDerivation === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedDerivation(id)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    isSelected
                      ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {DERIVATION_TYPE_META[selectedDerivation].description} &middot; {DERIVATION_TYPE_META[selectedDerivation].maxLength}
          </p>
        </div>

        {/* Options disclosure */}
        <div className="border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronDown className={cn('h-3 w-3 transition-transform', showOptions && 'rotate-180')} />
            Options
            {hasCustomOptions && (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
            )}
          </button>

          {showOptions && (
            <div className="mt-2 space-y-2">
              {/* Voice pills */}
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

              {/* Custom instructions textarea */}
              {showCustomPrompt && (
                <div>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    maxLength={USER_PROMPT_MAX_LENGTH}
                    placeholder="e.g., Focus on the team collaboration"
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <div className="text-[10px] text-gray-400 mt-0.5 text-right">
                    {customPrompt.length}/{USER_PROMPT_MAX_LENGTH}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview area */}
        <div className="flex-1 min-h-0 overflow-y-auto mt-2">
          <DerivationPreview
            derivation={selectedDerivation}
            text={generatedResult?.text || null}
            isGenerating={isGenerating}
            charCount={generatedResult?.charCount}
            wordCount={generatedResult?.wordCount}
            speakingTimeSec={generatedResult?.speakingTimeSec}
            storySections={story.sections as Record<string, { summary: string }>}
            storyTitle={story.title}
          />

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
            {hasResult ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isGenerating && 'animate-spin')} />
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
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating...</>
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
