/**
 * PacketModal Component
 *
 * Multi-story document generator.
 * Supports: Promotion Packet, Annual Review, Skip-Level Prep, Portfolio Brief,
 * Self Assessment, 1:1 Prep.
 * Flow: type pills → story selector → generate. Voice & custom collapsed under Options.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Copy, Check, Loader2, PenLine, RefreshCw, Briefcase, Calendar, ChevronDown } from 'lucide-react';
import { SimpleMarkdown } from '../ui/simple-markdown';
import { cn } from '../../lib/utils';
import type { CareerStory, WritingStyle, PacketType, DerivePacketResponse } from '../../types/career-stories';
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
// PACKET TYPE METADATA
// =============================================================================

const PACKET_TYPE_META: Record<PacketType, {
  label: string;
  description: string;
  loadingText: string;
}> = {
  promotion: {
    label: 'Promotion',
    description: 'Combine stories into a promotion-ready document',
    loadingText: 'Building your promotion packet...',
  },
  'annual-review': {
    label: 'Annual Review',
    description: 'Impact summary for your review period',
    loadingText: 'Building your annual review summary...',
  },
  'skip-level': {
    label: 'Skip-Level',
    description: 'Strategic themes for director/VP meetings',
    loadingText: 'Building your skip-level prep...',
  },
  'portfolio-brief': {
    label: 'Portfolio Brief',
    description: 'External-facing 1-pager for recruiters',
    loadingText: 'Building your portfolio brief...',
  },
  'self-assessment': {
    label: 'Self Assessment',
    description: 'Evidence-backed performance review write-up',
    loadingText: 'Building your self-assessment...',
  },
  'one-on-one': {
    label: '1:1 Prep',
    description: 'Talking points with receipts for your manager',
    loadingText: 'Building your 1:1 talking points...',
  },
};

const PACKET_TYPES: PacketType[] = [
  'promotion', 'annual-review', 'self-assessment', 'one-on-one', 'skip-level', 'portfolio-brief',
];

// =============================================================================
// TYPES
// =============================================================================

interface PromotionPacketModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: CareerStory[];
}

// =============================================================================
// DATE RANGE PICKER
// =============================================================================

function DateRangePicker({ startValue, endValue, onStartChange, onEndChange }: {
  startValue: string;
  endValue: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  const maxMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Period</span>
      <input
        type="month"
        value={startValue}
        onChange={(e) => onStartChange(e.target.value)}
        min="2020-01"
        max={endValue || maxMonth}
        className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
      />
      <span className="text-xs text-gray-400">to</span>
      <input
        type="month"
        value={endValue}
        onChange={(e) => onEndChange(e.target.value)}
        min={startValue || '2020-01'}
        max={maxMonth}
        className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
      />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PromotionPacketModal({ isOpen, onClose, stories }: PromotionPacketModalProps) {
  const [packetType, setPacketType] = useState<PacketType>('promotion');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tone, setTone] = useState<WritingStyle | ''>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<DerivePacketResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');

  const packetMutation = useDerivePacket();
  const meta = PACKET_TYPE_META[packetType];

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPacketType('promotion');
      setSelectedIds(new Set());
      setTone('');
      setCustomPrompt('');
      setShowCustomPrompt(false);
      setShowOptions(false);
      setGeneratedResult(null);
      setCopied(false);
      setError(null);
      setDateRangeStart('');
      setDateRangeEnd('');
    }
  }, [isOpen]);

  const handlePacketTypeChange = useCallback((type: PacketType) => {
    setPacketType(type);
    setGeneratedResult(null);
    setError(null);
    setCopied(false);
  }, []);

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
        packetType,
        tone: tone || undefined,
        customPrompt: customPrompt || undefined,
        dateRange: packetType === 'annual-review' && dateRangeStart && dateRangeEnd
          ? { startDate: dateRangeStart, endDate: dateRangeEnd }
          : undefined,
      });

      if (response.success && response.data) {
        setGeneratedResult(response.data);
      } else {
        setError(response.error || 'Generation failed');
      }
    } catch (err) {
      setError((err as Error).message || 'Generation failed');
    }
  }, [selectedIds, packetType, tone, customPrompt, dateRangeStart, dateRangeEnd, packetMutation]);

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
  const hasCustomOptions = tone !== '' || customPrompt.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-4 w-4 text-purple-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base leading-tight">
                Build Packet
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                Select stories and generate a combined document
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Packet type selector */}
        <div>
          <div className="flex flex-wrap gap-1.5">
            {PACKET_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handlePacketTypeChange(type)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  packetType === type
                    ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                )}
              >
                {PACKET_TYPE_META[type].label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {meta.description}
          </p>
        </div>

        {/* Date range picker for annual-review */}
        {packetType === 'annual-review' && (
          <DateRangePicker
            startValue={dateRangeStart}
            endValue={dateRangeEnd}
            onStartChange={setDateRangeStart}
            onEndChange={setDateRangeEnd}
          />
        )}

        {/* Story selector */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Stories ({selectedIds.size} selected)
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
            {stories.map((story) => {
              const isSelected = selectedIds.has(story.id);
              return (
                <label
                  key={story.id}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors',
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
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-purple-400" />
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
          )}
        </div>

        {/* Preview area */}
        <div className="flex-1 min-h-0 overflow-y-auto mt-2">
          {isGenerating && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{meta.loadingText}</span>
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
              Select at least 2 stories to get started.
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
