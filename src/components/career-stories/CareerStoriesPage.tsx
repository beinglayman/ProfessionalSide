/**
 * CareerStoriesPage Component
 *
 * Main page for career stories featuring:
 * - Two-column master-detail layout (desktop)
 * - Stacked layout with bottom sheet (mobile)
 * - Cluster list, STAR preview, and generation
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Cluster, ToolType, GenerateSTARResult } from '../../types/career-stories';
import {
  useClusters,
  useGenerateClusters,
  useGenerateStar,
} from '../../hooks/useCareerStories';
import { ClusterList } from './ClusterList';
import { ClusterStatus } from './ClusterCard';
import { STARPreview } from './STARPreview';
import { Button } from '../ui/button';

// Mobile bottom sheet component
interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const MobileSheet: React.FC<MobileSheetProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-2xl shadow-xl overflow-hidden animate-slide-up"
      >
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-2rem)] p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export function CareerStoriesPage() {
  const navigate = useNavigate();

  // State
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [polishEnabled, setPolishEnabled] = useState(true);
  const [clusterStatuses, setClusterStatuses] = useState<
    Record<string, { status: ClusterStatus; error?: string; result?: GenerateSTARResult }>
  >({});
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Queries
  const { data: clusters = [], isLoading: isLoadingClusters } = useClusters();

  // Mutations
  const generateClustersMutation = useGenerateClusters();
  const generateStarMutation = useGenerateStar();

  // Handlers
  const handleSelectCluster = useCallback((cluster: Cluster) => {
    setSelectedCluster(cluster);
    // Open mobile sheet on mobile
    if (window.innerWidth < 1024) {
      setMobileSheetOpen(true);
    }
  }, []);

  const handleGenerateClusters = useCallback(() => {
    generateClustersMutation.mutate({});
  }, [generateClustersMutation]);

  const handleGenerateStar = useCallback(
    (clusterId: string) => {
      // Update status to generating
      setClusterStatuses((prev) => ({
        ...prev,
        [clusterId]: { status: 'generating' },
      }));

      generateStarMutation.mutate(
        {
          clusterId,
          options: { options: { polish: polishEnabled } },
        },
        {
          onSuccess: (response) => {
            if (response.success && response.data) {
              const result = response.data;
              setClusterStatuses((prev) => ({
                ...prev,
                [clusterId]: {
                  status: result.star ? 'ready' : 'error',
                  result,
                  error: result.star ? undefined : result.failedGates?.join(', '),
                },
              }));
            } else {
              setClusterStatuses((prev) => ({
                ...prev,
                [clusterId]: {
                  status: 'error',
                  error: response.error || 'Generation failed',
                },
              }));
            }
          },
          onError: (error) => {
            setClusterStatuses((prev) => ({
              ...prev,
              [clusterId]: {
                status: 'error',
                error: error instanceof Error ? error.message : 'Generation failed',
              },
            }));
          },
        }
      );
    },
    [generateStarMutation, polishEnabled]
  );

  const handleRegenerate = useCallback(() => {
    if (selectedCluster) {
      handleGenerateStar(selectedCluster.id);
    }
  }, [selectedCluster, handleGenerateStar]);

  // Computed values
  const selectedClusterState = useMemo(() => {
    if (!selectedCluster) return null;
    return clusterStatuses[selectedCluster.id] || { status: 'idle' as ClusterStatus };
  }, [selectedCluster, clusterStatuses]);

  const selectedToolTypes = useMemo(() => {
    if (!selectedCluster?.metrics?.toolTypes) return [];
    return selectedCluster.metrics.toolTypes as ToolType[];
  }, [selectedCluster]);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="career-stories-page">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="lg:hidden"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Career Stories
              </h1>
            </div>
            <Button
              variant="outline"
              onClick={handleGenerateClusters}
              disabled={generateClustersMutation.isPending}
              data-testid="header-generate-clusters"
              className="hidden lg:flex"
            >
              Generate Clusters
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto">
        {/* Desktop: Two-column layout */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6 lg:p-6 min-h-[calc(100vh-4rem)]">
          {/* Left column: Cluster list */}
          <div className="lg:col-span-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <ClusterList
              clusters={clusters}
              selectedClusterId={selectedCluster?.id || null}
              clusterStatuses={clusterStatuses}
              isLoading={isLoadingClusters}
              onSelectCluster={handleSelectCluster}
              onGenerateStar={handleGenerateStar}
              onGenerateClusters={handleGenerateClusters}
              isGeneratingClusters={generateClustersMutation.isPending}
            />
          </div>

          {/* Right column: STAR preview */}
          <div className="lg:col-span-8">
            <STARPreview
              clusterName={selectedCluster?.name || `Cluster ${selectedCluster?.id?.slice(-6) || ''}`}
              activityCount={selectedCluster?.activityCount || 0}
              dateRange={selectedCluster?.metrics?.dateRange}
              toolTypes={selectedToolTypes}
              result={selectedClusterState?.result || null}
              isLoading={selectedClusterState?.status === 'generating'}
              polishEnabled={polishEnabled}
              onPolishToggle={setPolishEnabled}
              onRegenerate={handleRegenerate}
            />
          </div>
        </div>

        {/* Mobile: Full-width cluster list */}
        <div className="lg:hidden">
          <ClusterList
            clusters={clusters}
            selectedClusterId={selectedCluster?.id || null}
            clusterStatuses={clusterStatuses}
            isLoading={isLoadingClusters}
            onSelectCluster={handleSelectCluster}
            onGenerateStar={handleGenerateStar}
            onGenerateClusters={handleGenerateClusters}
            isGeneratingClusters={generateClustersMutation.isPending}
          />
        </div>

        {/* Mobile: Bottom sheet for STAR preview */}
        <MobileSheet
          isOpen={mobileSheetOpen && selectedCluster !== null}
          onClose={() => setMobileSheetOpen(false)}
        >
          <STARPreview
            clusterName={selectedCluster?.name || `Cluster ${selectedCluster?.id?.slice(-6) || ''}`}
            activityCount={selectedCluster?.activityCount || 0}
            dateRange={selectedCluster?.metrics?.dateRange}
            toolTypes={selectedToolTypes}
            result={selectedClusterState?.result || null}
            isLoading={selectedClusterState?.status === 'generating'}
            polishEnabled={polishEnabled}
            onPolishToggle={setPolishEnabled}
            onRegenerate={handleRegenerate}
          />
        </MobileSheet>
      </main>
    </div>
  );
}
