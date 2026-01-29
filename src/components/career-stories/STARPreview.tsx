/**
 * STARPreview Component
 *
 * Displays the generated STAR narrative with confidence indicators.
 * Supports editing, regeneration, and polish toggle.
 *
 * States:
 * - Loading: Shows skeleton placeholders during generation
 * - Error: Shows validation failure message with failed gates
 * - Placeholder: Shows when no cluster is selected
 * - Success: Shows full STAR narrative with edit capabilities
 */

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Check, Edit2, Copy, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { STARComponent, ToolType, GenerateSTARResult } from '../../types/career-stories';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ToolIcon } from './ToolIcon';
import { TIMING, DISPLAY_LIMITS, CONFIDENCE_THRESHOLDS } from './constants';

// Confidence dot component
const ConfidenceDot: React.FC<{ confidence: number }> = ({ confidence }) => {
  const getColor = () => {
    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'bg-green-500';
    if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full', getColor())}
      title={`Confidence: ${Math.round(confidence * 100)}%`}
      aria-label={`Confidence: ${Math.round(confidence * 100)}%`}
    />
  );
};

// STAR section component
interface STARSectionProps {
  label: string;
  component: STARComponent;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
}

const STARSection: React.FC<STARSectionProps> = ({
  label,
  component,
  isEditing,
  editValue,
  onEditChange,
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {label}
        </h4>
        <div className="flex items-center gap-2">
          <ConfidenceDot confidence={component.confidence} />
          <span className="text-xs text-gray-500">
            ({component.confidence.toFixed(2)})
          </span>
        </div>
      </div>
      {isEditing ? (
        <textarea
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
      ) : (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{component.text}</p>
        </div>
      )}
    </div>
  );
};

interface STARPreviewProps {
  /** Display name for the cluster */
  clusterName: string;
  /** Number of activities in the cluster */
  activityCount: number;
  /** Date range of activities (ISO strings) */
  dateRange?: { earliest: string; latest: string };
  /** Tool types for displaying icons */
  toolTypes: ToolType[];
  /** Generation result - null when not yet generated */
  result: GenerateSTARResult | null;
  /** Whether STAR is currently being generated */
  isLoading: boolean;
  /** Whether AI polish is enabled for regeneration */
  polishEnabled: boolean;
  /** Callback when polish toggle changes */
  onPolishToggle: (enabled: boolean) => void;
  /** Callback to regenerate the STAR */
  onRegenerate: () => void;
  /** Optional callback to save user edits - not yet connected to backend */
  // TODO: Implement save functionality in Phase 3
  onSave?: (edits: { situation?: string; task?: string; action?: string; result?: string }) => void;
}

export function STARPreview({
  clusterName,
  activityCount,
  dateRange,
  toolTypes,
  result,
  isLoading,
  polishEnabled,
  onPolishToggle,
  onRegenerate,
  onSave,
}: STARPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [edits, setEdits] = useState({
    situation: '',
    task: '',
    action: '',
    result: '',
  });

  // Ref to track timeout for cleanup
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const star = result?.star;

  // Initialize edits when star is loaded
  useEffect(() => {
    if (star) {
      setEdits({
        situation: star.situation.text,
        task: star.task.text,
        action: star.action.text,
        result: star.result.text,
      });
    }
  }, [star]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const formatDateRange = () => {
    if (!dateRange) return '';
    try {
      const earliest = new Date(dateRange.earliest);
      const latest = new Date(dateRange.latest);
      // Validate dates are valid
      if (isNaN(earliest.getTime()) || isNaN(latest.getTime())) {
        return '';
      }
      return `${format(earliest, 'MMM d')} - ${format(latest, 'MMM d')}`;
    } catch {
      return '';
    }
  };

  /**
   * Copy STAR narrative to clipboard.
   * Handles clipboard API failures gracefully.
   */
  const handleCopy = async () => {
    if (!star) return;

    const text = `SITUATION:\n${star.situation.text}\n\nTASK:\n${star.task.text}\n\nACTION:\n${star.action.text}\n\nRESULT:\n${star.result.text}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError(false);

      // Clear any existing timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      // Reset copied state after delay
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, TIMING.COPY_FEEDBACK_MS);
    } catch (err) {
      // Clipboard API can fail due to permissions or browser support
      console.warn('Failed to copy to clipboard:', err);
      setCopyError(true);

      // Reset error state after delay
      copyTimeoutRef.current = setTimeout(() => {
        setCopyError(false);
      }, TIMING.COPY_FEEDBACK_MS);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(edits);
    }
    setIsEditing(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card data-testid="star-preview-loading">
        <CardHeader>
          <CardTitle className="text-lg">{clusterName}</CardTitle>
          <p className="text-sm text-gray-500">Generating STAR...</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['SITUATION', 'TASK', 'ACTION', 'RESULT'].map((section) => (
              <div key={section}>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Validation failed state
  if (result && !star) {
    return (
      <Card data-testid="star-preview-error">
        <CardHeader>
          <CardTitle className="text-lg">{clusterName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Can't generate STAR
            </h3>
            <p className="text-sm text-gray-600 mb-4 max-w-sm">
              This cluster needs more data to create a meaningful story.
            </p>
            {result.failedGates && result.failedGates.length > 0 && (
              <ul className="text-sm text-gray-600 list-disc list-inside mb-4">
                {result.failedGates.map((gate, idx) => (
                  <li key={idx}>{gate}</li>
                ))}
              </ul>
            )}
            <p className="text-sm text-gray-500">
              Try adding more related work or merging with another cluster.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No result yet (placeholder)
  if (!result || !star) {
    return (
      <Card data-testid="star-preview-placeholder">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">📁</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Select a cluster to preview
          </h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Choose a cluster from the list and generate a STAR narrative for your interview preparation.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Full STAR display
  return (
    <Card data-testid="star-preview" aria-live="polite">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{clusterName}</CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <span>{activityCount} activities</span>
              <span>•</span>
              <span>{formatDateRange()}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                {toolTypes.slice(0, DISPLAY_LIMITS.TOOL_ICONS_PREVIEW).map((tool, idx) => (
                  <ToolIcon key={`${tool}-${idx}`} tool={tool} className="w-4 h-4 text-[8px]" />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              data-testid="edit-star"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              data-testid="copy-star"
              aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : copyError ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-1">
        <STARSection
          label="Situation"
          component={star.situation}
          isEditing={isEditing}
          editValue={edits.situation}
          onEditChange={(v) => setEdits({ ...edits, situation: v })}
        />
        <STARSection
          label="Task"
          component={star.task}
          isEditing={isEditing}
          editValue={edits.task}
          onEditChange={(v) => setEdits({ ...edits, task: v })}
        />
        <STARSection
          label="Action"
          component={star.action}
          isEditing={isEditing}
          editValue={edits.action}
          onEditChange={(v) => setEdits({ ...edits, action: v })}
        />
        <STARSection
          label="Result"
          component={star.result}
          isEditing={isEditing}
          editValue={edits.result}
          onEditChange={(v) => setEdits({ ...edits, result: v })}
        />

        {/* Polish toggle and actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={polishEnabled}
              onChange={(e) => onPolishToggle(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              data-testid="polish-toggle"
            />
            <span className="text-sm text-gray-700">Polish with AI</span>
          </label>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              data-testid="regenerate-star"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Regenerate
            </Button>
            {isEditing && (
              <Button
                size="sm"
                onClick={handleSave}
                data-testid="save-star"
              >
                Save
              </Button>
            )}
          </div>
        </div>

        {/* Processing time */}
        {result.processingTimeMs && (
          <p className="text-xs text-gray-400 text-right">
            Generated in {result.processingTimeMs}ms
            {result.polishStatus && ` • Polish: ${result.polishStatus}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
