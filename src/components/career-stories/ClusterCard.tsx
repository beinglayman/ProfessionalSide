/**
 * ClusterCard Component
 *
 * Displays a cluster summary with activity count, date range, and tool icons.
 * Supports selection state and STAR generation status.
 *
 * Accessibility:
 * - Uses role="option" for listbox pattern
 * - Supports keyboard navigation (Enter/Space to select)
 * - Provides aria-selected state
 */

import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Cluster, ToolType } from '../../types/career-stories';
import { Button } from '../ui/button';
import { ToolIcon } from './ToolIcon';
import { DISPLAY_LIMITS } from './constants';

export type ClusterStatus = 'idle' | 'generating' | 'ready' | 'error';

interface ClusterCardProps {
  cluster: Cluster;
  isSelected: boolean;
  status: ClusterStatus;
  errorMessage?: string;
  onSelect: () => void;
  onGenerateStar: () => void;
}

export function ClusterCard({
  cluster,
  isSelected,
  status,
  errorMessage,
  onSelect,
  onGenerateStar,
}: ClusterCardProps) {
  const toolTypes = (cluster.metrics?.toolTypes || []) as ToolType[];
  const dateRange = cluster.metrics?.dateRange;

  const formatDateRange = () => {
    if (!dateRange) return 'No dates';
    const earliest = new Date(dateRange.earliest);
    const latest = new Date(dateRange.latest);
    return `${format(earliest, 'MMM d')} - ${format(latest, 'MMM d')}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  const getStatusIndicator = () => {
    switch (status) {
      case 'generating':
        return (
          <span className="flex items-center gap-1 text-xs text-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating...
          </span>
        );
      case 'ready':
        return (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="h-3 w-3" />
            Story ready
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-xs text-amber-600" title={errorMessage}>
            <AlertTriangle className="h-3 w-3" />
            Not enough data
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      data-testid={`cluster-card-${cluster.id}`}
      className={cn(
        'group relative rounded-lg border bg-white p-4 cursor-pointer transition-all',
        'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        isSelected
          ? 'border-blue-500 shadow-md ring-1 ring-blue-500'
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 line-clamp-1">
          {cluster.name || `Cluster ${cluster.id.slice(-6)}`}
        </h3>
        {getStatusIndicator()}
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
        <span>{cluster.activityCount} activities</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDateRange()}
        </span>
      </div>

      {/* Tool icons */}
      <div className="flex items-center gap-1 mb-3">
        {toolTypes.slice(0, DISPLAY_LIMITS.TOOL_ICONS_CLUSTER).map((tool, idx) => (
          <ToolIcon key={`${tool}-${idx}`} tool={tool} />
        ))}
        {toolTypes.length > DISPLAY_LIMITS.TOOL_ICONS_CLUSTER && (
          <span className="text-xs text-gray-400">+{toolTypes.length - DISPLAY_LIMITS.TOOL_ICONS_CLUSTER}</span>
        )}
      </div>

      {/* Generate button */}
      {status !== 'generating' && status !== 'ready' && (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onGenerateStar();
          }}
          data-testid={`generate-star-${cluster.id}`}
          className="w-full"
          disabled={status === 'error'}
        >
          Generate STAR
        </Button>
      )}
    </div>
  );
}
