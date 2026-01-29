/**
 * ClusterList Component
 *
 * Displays a scrollable list of clusters with selection state.
 * Handles keyboard navigation for accessibility.
 */

import React, { useRef, useEffect } from 'react';
import { FolderOpen, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { Cluster, GenerateSTARResult } from '../../types/career-stories';
import { ClusterCard, ClusterStatus } from './ClusterCard';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';

interface ClusterListProps {
  clusters: Cluster[];
  selectedClusterId: string | null;
  clusterStatuses: Record<string, { status: ClusterStatus; error?: string; result?: GenerateSTARResult }>;
  isLoading: boolean;
  onSelectCluster: (cluster: Cluster) => void;
  onGenerateStar: (clusterId: string) => void;
  onGenerateClusters: () => void;
  isGeneratingClusters: boolean;
}

export function ClusterList({
  clusters,
  selectedClusterId,
  clusterStatuses,
  isLoading,
  onSelectCluster,
  onGenerateStar,
  onGenerateClusters,
  isGeneratingClusters,
}: ClusterListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!listRef.current?.contains(document.activeElement)) return;

      const currentIndex = clusters.findIndex((c) => c.id === selectedClusterId);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, clusters.length - 1);
        onSelectCluster(clusters[nextIndex]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        onSelectCluster(clusters[prevIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clusters, selectedClusterId, onSelectCluster]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 p-4" data-testid="cluster-list-loading">
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border border-gray-200 rounded-lg space-y-3">
            <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (clusters.length === 0) {
    return (
      <div className="p-4" data-testid="cluster-list-empty">
        <EmptyState
          icon={FolderOpen}
          title="No clusters yet"
          description="Generate clusters from your work activities to create STAR narratives for interview prep."
          action={{
            label: isGeneratingClusters ? 'Generating...' : 'Generate Clusters',
            onClick: onGenerateClusters,
            icon: isGeneratingClusters ? Loader2 : Plus,
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="cluster-list">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Clusters ({clusters.length})
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerateClusters}
          disabled={isGeneratingClusters}
          data-testid="generate-clusters-btn"
        >
          {isGeneratingClusters ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Cluster list */}
      <div
        ref={listRef}
        role="listbox"
        aria-label="Clusters"
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {clusters.map((cluster) => {
          const clusterState = clusterStatuses[cluster.id] || { status: 'idle' as ClusterStatus };
          return (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              isSelected={cluster.id === selectedClusterId}
              status={clusterState.status}
              errorMessage={clusterState.error}
              onSelect={() => onSelectCluster(cluster)}
              onGenerateStar={() => onGenerateStar(cluster.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
