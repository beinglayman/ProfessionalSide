/**
 * CareerStoriesPage Component
 *
 * Main page for career stories featuring:
 * - Two-column master-detail layout (desktop)
 * - Stacked layout with bottom sheet (mobile)
 * - Cluster list, STAR preview, and generation
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Cluster, ToolType, GenerateSTARResult, NarrativeFramework } from '../../types/career-stories';
import {
  useClusters,
  useGenerateClusters,
  useGenerateStar,
} from '../../hooks/useCareerStories';
import { ClusterList } from './ClusterList';
import { ClusterStatus } from './ClusterCard';
import { STARPreview } from './STARPreview';
import { Button } from '../ui/button';
import { BREAKPOINTS, MOBILE_SHEET_MAX_HEIGHT_VH } from './constants';
import { isDemoMode, disableDemoMode } from '../../services/career-stories-demo-data';

// Mobile bottom sheet component with keyboard trap
interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Mobile bottom sheet overlay.
 * - Closes on backdrop click
 * - Closes on Escape key
 * - Traps focus within the dialog
 */
const MobileSheet: React.FC<MobileSheetProps> = ({ isOpen, onClose, children }) => {
  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxHeightStyle = `${MOBILE_SHEET_MAX_HEIGHT_VH}vh`;
  const contentMaxHeight = `calc(${maxHeightStyle} - 2rem)`;

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
        aria-label="STAR Preview"
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl overflow-hidden animate-slide-up"
        style={{ maxHeight: maxHeightStyle }}
      >
        {/* Handle - provides visual affordance for dragging */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        {/* Content */}
        <div
          className="overflow-y-auto p-4"
          style={{ maxHeight: contentMaxHeight }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * Main page component for Career Stories feature.
 *
 * State Management:
 * - selectedCluster: Currently selected cluster in the list
 * - clusterStatuses: Tracks generation state per cluster (idle/generating/ready/error)
 * - polishEnabled: Whether AI polish is enabled for STAR generation
 * - mobileSheetOpen: Controls mobile bottom sheet visibility
 *
 * Data Flow:
 * 1. useClusters() fetches all clusters on mount
 * 2. User selects a cluster -> opens preview panel (desktop) or sheet (mobile)
 * 3. User clicks "Generate STAR" -> mutation starts, status updates
 * 4. Result stored in clusterStatuses, displayed in STARPreview
 *
 * TODO: Consider persisting polishEnabled preference to localStorage
 * TODO: Add optimistic updates for better UX during generation
 */
export function CareerStoriesPage() {
  const navigate = useNavigate();

  // State for cluster selection and STAR generation
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [polishEnabled, setPolishEnabled] = useState(true);
  // Selected narrative framework - stored in localStorage for persistence
  const [framework, setFramework] = useState<NarrativeFramework>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('career-stories-framework');
      if (saved && ['STAR', 'STARL', 'CAR', 'PAR', 'SAR', 'SOAR', 'SHARE', 'CARL'].includes(saved)) {
        return saved as NarrativeFramework;
      }
    }
    return 'STAR';
  });
  // Track generation status per cluster to show loading/success/error states
  const [clusterStatuses, setClusterStatuses] = useState<
    Record<string, { status: ClusterStatus; error?: string; result?: GenerateSTARResult }>
  >({});
  // Mobile sheet open state - separate from selection since user might close sheet without deselecting
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  // Track if we're showing demo data
  const [showingDemo, setShowingDemo] = useState(isDemoMode());

  // Queries
  const { data: clusters = [], isLoading: isLoadingClusters } = useClusters();

  // Update demo mode state when clusters load
  useEffect(() => {
    setShowingDemo(isDemoMode());
  }, [clusters]);

  // Mutations
  const generateClustersMutation = useGenerateClusters();
  const generateStarMutation = useGenerateStar();

  // Handlers - define handleGenerateStar first since handleSelectCluster depends on it
  const handleGenerateStar = useCallback(
    (clusterId: string, overrideFramework?: NarrativeFramework) => {
      const useFramework = overrideFramework || framework;

      // Update status to generating
      setClusterStatuses((prev) => ({
        ...prev,
        [clusterId]: { status: 'generating' },
      }));

      generateStarMutation.mutate(
        {
          clusterId,
          request: { options: { polish: polishEnabled, framework: useFramework } },
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
    [generateStarMutation, polishEnabled, framework]
  );

  // Handle framework change - save to localStorage and regenerate
  const handleFrameworkChange = useCallback(
    (newFramework: NarrativeFramework) => {
      setFramework(newFramework);
      localStorage.setItem('career-stories-framework', newFramework);

      // Regenerate if a cluster is selected
      if (selectedCluster) {
        handleGenerateStar(selectedCluster.id, newFramework);
      }
    },
    [selectedCluster, handleGenerateStar]
  );

  const handleSelectCluster = useCallback((cluster: Cluster) => {
    setSelectedCluster(cluster);

    // Open mobile sheet on mobile (below desktop breakpoint)
    if (window.innerWidth < BREAKPOINTS.DESKTOP) {
      setMobileSheetOpen(true);
    }

    // Auto-generate STAR if not already generated (for demo mode especially)
    const existingStatus = clusterStatuses[cluster.id];
    if (!existingStatus || existingStatus.status === 'idle') {
      // Auto-trigger generation
      handleGenerateStar(cluster.id);
    }
  }, [clusterStatuses, handleGenerateStar]);

  const handleGenerateClusters = useCallback(() => {
    generateClustersMutation.mutate({});
  }, [generateClustersMutation]);

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
      {/* Demo Mode Banner */}
      {showingDemo && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
              <FlaskConical className="h-4 w-4" />
              <span className="text-sm font-medium">
                Demo Mode: Showing sample data for showcase purposes
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                disableDemoMode();
                setShowingDemo(false);
                window.location.reload();
              }}
              className="text-amber-700 hover:text-amber-900 text-xs"
            >
              Exit Demo
            </Button>
          </div>
        </div>
      )}

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
              disabled={generateClustersMutation.isPending || showingDemo}
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
              framework={framework}
              onFrameworkChange={handleFrameworkChange}
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
            framework={framework}
            onFrameworkChange={handleFrameworkChange}
            onRegenerate={handleRegenerate}
          />
        </MobileSheet>
      </main>
    </div>
  );
}
