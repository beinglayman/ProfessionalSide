/**
 * CareerStoriesPage Component
 *
 * Main page for career stories featuring:
 * - Two-column master-detail layout (desktop)
 * - Stacked layout with bottom sheet (mobile)
 * - Story list, STAR preview, and narrative generation
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, FileText, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cluster, ToolType, GenerateSTARResult, NarrativeFramework, CareerStory, StoryVisibility } from '../../types/career-stories';
import { CONFIDENCE_THRESHOLDS, NARRATIVE_FRAMEWORKS } from './constants';
import {
  useClusters,
  useCluster,
  useGenerateClusters,
  useGenerateStar,
  useDemoActivities,
  useUpdateDemoClusterActivities,
  useListCareerStories,
  useCreateCareerStory,
  useUpdateCareerStory,
  useRegenerateCareerStory,
  useDeleteCareerStory,
  usePublishCareerStory,
  useUnpublishCareerStory,
  useSetCareerStoryVisibility,
} from '../../hooks/useCareerStories';
import { ClusterStatus } from './ClusterCard';
import { NarrativePreview } from './NarrativePreview';
import { StoryTimeline } from './StoryTimeline';
import { Button } from '../ui/button';
import { BREAKPOINTS, MOBILE_SHEET_MAX_HEIGHT_VH } from './constants';
import { isDemoMode, toggleDemoMode } from '../../services/career-stories-demo-data';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { cn } from '../../lib/utils';

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
 * 4. Result stored in clusterStatuses, displayed in NarrativePreview
 *
 * TODO: Consider persisting polishEnabled preference to localStorage
 * TODO: Add optimistic updates for better UX during generation
 */
export function CareerStoriesPage() {
  useDocumentTitle('Career Stories');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State for cluster/story selection and STAR generation
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedStoryDirect, setSelectedStoryDirect] = useState<CareerStory | null>(null);
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
  // Track demo mode state
  const [showingDemo, setShowingDemo] = useState(isDemoMode());
  // Celebration state for newly created stories
  const [showCelebration, setShowCelebration] = useState(false);

  // Trigger confetti when celebration starts
  useEffect(() => {
    if (!showCelebration) return;

    // Fire confetti burst
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#10b981', '#059669', '#fbbf24', '#f59e0b'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#10b981', '#059669', '#fbbf24', '#f59e0b'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, [showCelebration]);
  // Track saved stories by cluster
  const [savedStories, setSavedStories] = useState<Record<string, CareerStory>>({});

  // Queries - will use demo or real data based on isDemoMode()
  const { data: clusters = [], isLoading: isLoadingClusters, refetch: refetchClusters } = useClusters();
  // Fetch selected cluster with activities for evidence linking
  const { data: clusterWithActivities } = useCluster(selectedCluster?.id || '');
  // Fetch existing career stories to hydrate savedStories state
  const { data: existingStories } = useListCareerStories();

  // Hydrate savedStories from existing career stories on load
  useEffect(() => {
    if (existingStories?.stories) {
      const storyMap: Record<string, CareerStory> = {};
      existingStories.stories.forEach((story) => {
        // Map stories by their activityIds to match with clusters
        // This allows finding saved stories when selecting a cluster
        if (story.activityIds.length > 0) {
          // Use a key based on sorted activityIds for matching
          const key = story.activityIds.sort().join(',');
          storyMap[key] = story;
        }
      });
      // Also keep stories indexed by ID for direct lookup
      existingStories.stories.forEach((story) => {
        storyMap[story.id] = story;
      });
      setSavedStories(storyMap);
    }
  }, [existingStories]);

  // Keyboard shortcut: Cmd/Ctrl + E to toggle demo mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        const newDemoMode = toggleDemoMode();
        setShowingDemo(newDemoMode);
        setSelectedCluster(null);
        // Refetch clusters with new mode
        refetchClusters();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [refetchClusters]);

  // Mutations
  const generateClustersMutation = useGenerateClusters();
  const generateStarMutation = useGenerateStar();
  const updateClusterActivitiesMutation = useUpdateDemoClusterActivities();
  const createStoryMutation = useCreateCareerStory();
  const updateStoryMutation = useUpdateCareerStory();
  const regenerateStoryMutation = useRegenerateCareerStory();
  const deleteStoryMutation = useDeleteCareerStory();
  const publishStoryMutation = usePublishCareerStory();
  const unpublishStoryMutation = useUnpublishCareerStory();
  const setVisibilityMutation = useSetCareerStoryVisibility();

  // Fetch all activities for the edit modal (in demo mode)
  const { data: allActivities = [] } = useDemoActivities();

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

      // Regenerate story if one is directly selected (from wizard)
      if (selectedStoryDirect) {
        regenerateStoryMutation.mutate(
          { id: selectedStoryDirect.id, framework: newFramework },
          {
            onSuccess: (response) => {
              if (response.success && response.data) {
                setSelectedStoryDirect(response.data);
              }
            },
          }
        );
        return;
      }

      // Regenerate if a cluster is selected
      if (selectedCluster) {
        handleGenerateStar(selectedCluster.id, newFramework);
      }
    },
    [selectedCluster, selectedStoryDirect, handleGenerateStar, regenerateStoryMutation]
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

  // Handle selecting a story directly (without cluster)
  const handleSelectStory = useCallback((story: CareerStory) => {
    setSelectedStoryDirect(story);
    setSelectedCluster(null); // Clear cluster selection
    // Open mobile sheet on mobile
    if (window.innerWidth < BREAKPOINTS.DESKTOP) {
      setMobileSheetOpen(true);
    }
  }, []);

  // Handle query parameters - auto-select story or cluster by ID
  useEffect(() => {
    const storyId = searchParams.get('storyId');
    const clusterId = searchParams.get('clusterId');

    // Check for celebrate param (from wizard flow)
    const shouldCelebrate = searchParams.get('celebrate') === 'true';

    // If we have a storyId (from promote flow), find and select the story
    if (storyId && existingStories?.stories) {
      const matchingStory = existingStories.stories.find((s) => s.id === storyId);
      if (matchingStory && !selectedStoryDirect) {
        handleSelectStory(matchingStory);
        // Show celebration if this is a new story from wizard
        if (shouldCelebrate) {
          setShowCelebration(true);
          // Auto-hide after 5 seconds
          setTimeout(() => setShowCelebration(false), 5000);
        }
        setSearchParams({}, { replace: true });
        return;
      }
    }

    // Check for clusterId param (from promote flow)
    if (clusterId && clusters.length > 0 && !selectedCluster) {
      const matchingCluster = clusters.find((cluster) => cluster.id === clusterId);
      if (matchingCluster) {
        handleSelectCluster(matchingCluster);
        setSearchParams({}, { replace: true });
        return;
      }
    }

    // Legacy: handle promote param (journal entry ID - may not match directly)
    const promoteEntryId = searchParams.get('promote');
    if (!promoteEntryId || clusters.length === 0 || selectedCluster) return;

    // Find cluster that matches the journal entry ID
    const matchingCluster = clusters.find((cluster) => {
      if (cluster.sourceEntryId === promoteEntryId) return true;
      if (cluster.activityIds?.includes(promoteEntryId)) return true;
      if (cluster.id === promoteEntryId) return true;
      return false;
    });

    if (matchingCluster) {
      handleSelectCluster(matchingCluster);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, clusters, existingStories, selectedCluster, selectedStoryDirect, handleSelectCluster, handleSelectStory, setSearchParams]);

  const handleGenerateClusters = useCallback(() => {
    generateClustersMutation.mutate({});
  }, [generateClustersMutation]);

  const handleRegenerate = useCallback(() => {
    // If a story is selected directly, regenerate it via API
    if (selectedStoryDirect) {
      // Use the current framework from state, not the story's saved framework
      // This allows regenerating with a different framework (e.g., STAR → SHARE)
      regenerateStoryMutation.mutate(
        { id: selectedStoryDirect.id, framework },
        {
          onSuccess: (response) => {
            if (response.success && response.data) {
              setSelectedStoryDirect(response.data);
            }
          },
        }
      );
      return;
    }
    // Otherwise, regenerate via cluster
    if (selectedCluster) {
      handleGenerateStar(selectedCluster.id);
    }
  }, [selectedCluster, selectedStoryDirect, handleGenerateStar, regenerateStoryMutation, framework]);

  const handleDeleteStory = useCallback(() => {
    if (selectedStoryDirect) {
      if (window.confirm('Are you sure you want to delete this story?')) {
        deleteStoryMutation.mutate(selectedStoryDirect.id, {
          onSuccess: () => {
            setSelectedStoryDirect(null);
          },
        });
      }
    }
  }, [selectedStoryDirect, deleteStoryMutation]);

  const handleUpdateClusterActivities = useCallback(
    async (clusterId: string, activityIds: string[]) => {
      await updateClusterActivitiesMutation.mutateAsync({ clusterId, activityIds });
    },
    [updateClusterActivitiesMutation]
  );

  // Computed values
  const selectedClusterState = useMemo(() => {
    if (!selectedCluster) return null;
    return clusterStatuses[selectedCluster.id] || { status: 'idle' as ClusterStatus };
  }, [selectedCluster, clusterStatuses]);

  const selectedStory = useMemo(() => {
    // If a story is selected directly (not via cluster), use it
    if (selectedStoryDirect) return selectedStoryDirect;
    // Otherwise, try to find a story linked to the selected cluster
    if (!selectedCluster) return null;
    return savedStories[selectedCluster.id] || null;
  }, [savedStories, selectedCluster, selectedStoryDirect]);

  const selectedToolTypes = useMemo(() => {
    if (!selectedCluster?.metrics?.toolTypes) return [];
    return selectedCluster.metrics.toolTypes as ToolType[];
  }, [selectedCluster]);

  // Convert a CareerStory into a GenerateSTARResult format for display in NarrativePreview
  const storyAsResult = useMemo((): GenerateSTARResult | null => {
    if (!selectedStoryDirect) return null;

    const sections = selectedStoryDirect.sections;
    const mapSection = (key: string): { text: string; sources: string[]; confidence: number } => {
      const section = sections[key];
      return {
        text: section?.summary || `${key}: details pending`,
        sources: section?.evidence?.map((e) => e.activityId) || [],
        confidence: section?.summary ? 0.8 : 0.3,
      };
    };

    // Map framework sections to STAR components
    const situationKeys = ['situation', 'context', 'challenge', 'problem'];
    const taskKeys = ['task', 'objective'];
    const actionKeys = ['action', 'actions'];
    const resultKeys = ['result', 'results', 'evaluation', 'learning', 'outcome'];

    const findSection = (keys: string[]) => {
      for (const key of keys) {
        if (sections[key]) return mapSection(key);
      }
      return { text: 'Details pending', sources: [], confidence: 0.3 };
    };

    const situation = findSection(situationKeys);
    const task = findSection(taskKeys);
    const action = findSection(actionKeys);
    const result = findSection(resultKeys);

    const overallConfidence = (situation.confidence + task.confidence + action.confidence + result.confidence) / 4;

    return {
      star: {
        clusterId: selectedStoryDirect.id,
        situation,
        task,
        action,
        result,
        overallConfidence,
        participationSummary: { initiatorCount: 0, contributorCount: 0, mentionedCount: 0, observerCount: 0 },
        suggestedEdits: [],
        metadata: {
          dateRange: { start: selectedStoryDirect.generatedAt || '', end: selectedStoryDirect.generatedAt || '' },
          toolsCovered: [],
          totalActivities: selectedStoryDirect.activityIds.length,
        },
        validation: { passed: true, score: 1, failedGates: [], warnings: [] },
      },
      polishStatus: 'success',
      processingTimeMs: 0,
    };
  }, [selectedStoryDirect]);

  // Compute stats for the stats bar - include both clusters and standalone stories
  // Get all stories for timeline
  const allStories = useMemo(() => {
    return existingStories?.stories || [];
  }, [existingStories]);

  const stats = useMemo(() => {
    let complete = 0;
    let inProgress = 0;
    let draft = 0;
    let totalActivities = 0;

    // Count from clusters
    clusters.forEach((cluster) => {
      totalActivities += cluster.activityCount || 0;
      const state = clusterStatuses[cluster.id];
      if (state?.result?.star) {
        const confidence = state.result.star.overallConfidence;
        if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
          complete++;
        } else if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
          inProgress++;
        } else {
          draft++;
        }
      }
    });

    // Count from standalone stories (not linked to clusters)
    const stories = existingStories?.stories || [];
    stories.forEach((story) => {
      totalActivities += story.activityIds.length;
      if (story.isPublished) {
        complete++;
      } else if (story.needsRegeneration) {
        inProgress++;
      } else {
        draft++;
      }
    });

    const totalItems = clusters.length + stories.length;
    return { complete, inProgress, draft, totalActivities, totalClusters: totalItems };
  }, [clusters, clusterStatuses, existingStories]);

  const mapSectionToComponent = useCallback((section: string) => {
    const mapping: Record<string, 'situation' | 'task' | 'action' | 'result'> = {
      situation: 'situation',
      context: 'situation',
      challenge: 'situation',
      problem: 'situation',
      obstacles: 'situation',
      hindrances: 'situation',
      task: 'task',
      objective: 'task',
      action: 'action',
      actions: 'action',
      result: 'result',
      results: 'result',
      evaluation: 'result',
      learning: 'result',
    };
    return mapping[section] || 'result';
  }, []);

  const buildStorySections = useCallback((
    frameworkKey: NarrativeFramework,
    star: GenerateSTARResult['star'],
    edits: { situation?: string; task?: string; action?: string; result?: string },
    activityIds: string[]
  ) => {
    if (!star) return {};
    const sectionKeys = NARRATIVE_FRAMEWORKS[frameworkKey]?.sections || ['situation', 'task', 'action', 'result'];
    const evidenceFallback = activityIds.map((activityId) => ({ activityId }));

    // Map STAR output to framework-specific sections as a best-effort default.
    return sectionKeys.reduce<Record<string, { summary: string; evidence: { activityId: string }[] }>>((acc, section) => {
      const componentKey = mapSectionToComponent(section);
      const component = star[componentKey];
      const summary = (edits[componentKey] || component.text || '').trim();
      const evidence = component.sources?.length
        ? component.sources.map((activityId) => ({ activityId }))
        : evidenceFallback;

      acc[section] = {
        summary: summary || `${section}: details pending`,
        evidence,
      };
      return acc;
    }, {});
  }, [mapSectionToComponent]);

  const handleSaveStory = useCallback(async (edits: { situation?: string; task?: string; action?: string; result?: string }) => {
    if (!selectedCluster || !selectedClusterState?.result?.star) return;

    const activityIds = selectedCluster.activityIds || [];
    const payload = {
      title: selectedCluster.name || `Story ${selectedCluster.id.slice(-6)}`,
      activityIds,
      framework,
      sections: buildStorySections(framework, selectedClusterState.result.star, edits, activityIds),
    };

    try {
      const existing = savedStories[selectedCluster.id];
      if (existing) {
        const response = await updateStoryMutation.mutateAsync({ id: existing.id, data: payload });
        if (response.success && response.data) {
          setSavedStories((prev) => ({ ...prev, [selectedCluster.id]: response.data }));
          return response.data;
        }
        return;
      }

      const response = await createStoryMutation.mutateAsync(payload);
      if (response.success && response.data) {
        setSavedStories((prev) => ({ ...prev, [selectedCluster.id]: response.data }));
        return response.data;
      }
    } catch (error) {
      console.error('Failed to save story:', error);
    }
    return;
  }, [
    selectedCluster,
    selectedClusterState,
    framework,
    buildStorySections,
    savedStories,
    updateStoryMutation,
    createStoryMutation,
  ]);

  const ensureStory = useCallback(async (edits: { situation?: string; task?: string; action?: string; result?: string }) => {
    // If we have a directly selected story, use it
    if (selectedStoryDirect) {
      return selectedStoryDirect;
    }
    // Otherwise, check for cluster-linked story
    if (selectedCluster && savedStories[selectedCluster.id]) {
      return savedStories[selectedCluster.id];
    }
    const created = await handleSaveStory(edits);
    return created || null;
  }, [handleSaveStory, savedStories, selectedCluster, selectedStoryDirect]);

  const handlePublishStory = useCallback(async (
    visibility: StoryVisibility,
    edits: { situation?: string; task?: string; action?: string; result?: string }
  ) => {
    const story = await ensureStory(edits);
    if (!story) return;

    try {
      const response = await publishStoryMutation.mutateAsync({ id: story.id, visibility });
      if (response.success && response.data?.story) {
        // Update the directly selected story if applicable
        if (selectedStoryDirect) {
          setSelectedStoryDirect(response.data.story);
        } else if (selectedCluster) {
          setSavedStories((prev) => ({ ...prev, [selectedCluster.id]: response.data!.story! }));
        }
      }
    } catch (error) {
      console.error('Failed to publish story:', error);
    }
  }, [ensureStory, publishStoryMutation, selectedCluster, selectedStoryDirect]);

  const handleUnpublishStory = useCallback(async () => {
    // Get the current story - either directly selected or from cluster
    const story = selectedStoryDirect || (selectedCluster ? savedStories[selectedCluster.id] : null);
    if (!story) return;

    try {
      const response = await unpublishStoryMutation.mutateAsync(story.id);
      if (response.success && response.data?.story) {
        if (selectedStoryDirect) {
          setSelectedStoryDirect(response.data.story);
        } else if (selectedCluster) {
          setSavedStories((prev) => ({ ...prev, [selectedCluster.id]: response.data!.story! }));
        }
      }
    } catch (error) {
      console.error('Failed to unpublish story:', error);
    }
  }, [savedStories, selectedCluster, selectedStoryDirect, unpublishStoryMutation]);

  const handleVisibilityChange = useCallback(async (visibility: StoryVisibility) => {
    // Get the current story - either directly selected or from cluster
    const story = selectedStoryDirect || (selectedCluster ? savedStories[selectedCluster.id] : null);
    if (!story) return;

    try {
      const response = await setVisibilityMutation.mutateAsync({ id: story.id, visibility });
      if (response.success && response.data?.story) {
        if (selectedStoryDirect) {
          setSelectedStoryDirect(response.data.story);
        } else if (selectedCluster) {
          setSavedStories((prev) => ({ ...prev, [selectedCluster.id]: response.data!.story! }));
        }
      }
    } catch (error) {
      console.error('Failed to update story visibility:', error);
    }
  }, [savedStories, selectedCluster, selectedStoryDirect, setVisibilityMutation]);

  // Sidebar collapsed state - auto-collapse when story is selected
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-collapse sidebar when a story is selected on desktop
  useEffect(() => {
    if (selectedStoryDirect && window.innerWidth >= BREAKPOINTS.DESKTOP) {
      setSidebarCollapsed(true);
    }
  }, [selectedStoryDirect]);

  return (
    <div className="h-full bg-gray-50 flex" data-testid="career-stories-page">
      {/* Celebration toast - positioned fixed */}
      {showCelebration && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Story created!</span>
          <button onClick={() => setShowCelebration(false)} className="ml-2 hover:text-white/80">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Desktop: Sidebar + Main content - seamless with header */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Collapsible sidebar with timeline - no extra header */}
        <div
          className={cn(
            'flex-shrink-0 bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden',
            sidebarCollapsed ? 'w-0' : 'w-64'
          )}
        >
          <div className="w-64 h-full overflow-y-auto">
            <StoryTimeline
              stories={allStories}
              selectedStoryId={selectedStoryDirect?.id || null}
              isLoading={isLoadingClusters}
              onSelectStory={handleSelectStory}
            />
          </div>
        </div>

        {/* Toggle button - thin rail */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            'flex-shrink-0 w-4 bg-gray-100/50 border-r border-gray-200 flex items-center justify-center',
            'text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors'
          )}
          title={sidebarCollapsed ? 'Show stories' : 'Hide stories'}
        >
          {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        {/* Main content - full width for story focus */}
        <div className="flex-1 overflow-y-auto">
          <div className="w-full px-6 py-4">
            <NarrativePreview
              clusterName={selectedStoryDirect?.title || selectedCluster?.name || `Cluster ${selectedCluster?.id?.slice(-6) || ''}`}
              activityCount={selectedStoryDirect?.activityIds.length || selectedCluster?.activityCount || 0}
              dateRange={selectedCluster?.metrics?.dateRange}
              toolTypes={selectedToolTypes}
              activities={clusterWithActivities?.activities}
              result={storyAsResult || selectedClusterState?.result || null}
              isLoading={selectedClusterState?.status === 'generating' || regenerateStoryMutation.isPending}
              polishEnabled={polishEnabled}
              onPolishToggle={setPolishEnabled}
              framework={selectedStoryDirect?.framework || framework}
              onFrameworkChange={handleFrameworkChange}
              onRegenerate={handleRegenerate}
              story={selectedStory}
              onSave={handleSaveStory}
              onPublish={handlePublishStory}
              onUnpublish={handleUnpublishStory}
              onVisibilityChange={handleVisibilityChange}
              isSaving={createStoryMutation.isPending || updateStoryMutation.isPending}
              isPublishing={publishStoryMutation.isPending || unpublishStoryMutation.isPending || setVisibilityMutation.isPending}
              onDelete={selectedStoryDirect ? handleDeleteStory : undefined}
              isDeleting={deleteStoryMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Mobile: Full-width layout */}
      <div className="lg:hidden flex-1 overflow-hidden flex flex-col">
        {/* Mobile header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <FileText className="h-4 w-4 text-primary-600" />
          <span className="text-sm font-semibold text-gray-900">Stories</span>
        </div>

        {/* Mobile timeline */}
        <div className="flex-1 overflow-y-auto bg-white">
          <StoryTimeline
            stories={allStories}
            selectedStoryId={selectedStoryDirect?.id || null}
            isLoading={isLoadingClusters}
            onSelectStory={handleSelectStory}
          />
        </div>

        {/* Mobile: Bottom sheet for STAR preview */}
        <MobileSheet
          isOpen={mobileSheetOpen && (selectedCluster !== null || selectedStoryDirect !== null)}
          onClose={() => setMobileSheetOpen(false)}
        >
          <NarrativePreview
            clusterName={selectedStoryDirect?.title || selectedCluster?.name || `Cluster ${selectedCluster?.id?.slice(-6) || ''}`}
            activityCount={selectedStoryDirect?.activityIds.length || selectedCluster?.activityCount || 0}
            dateRange={selectedCluster?.metrics?.dateRange}
            toolTypes={selectedToolTypes}
            activities={clusterWithActivities?.activities}
            result={storyAsResult || selectedClusterState?.result || null}
            isLoading={selectedClusterState?.status === 'generating' || regenerateStoryMutation.isPending}
            polishEnabled={polishEnabled}
            onPolishToggle={setPolishEnabled}
            framework={selectedStoryDirect?.framework || framework}
            onFrameworkChange={handleFrameworkChange}
            onRegenerate={handleRegenerate}
            story={selectedStory}
            onSave={handleSaveStory}
            onPublish={handlePublishStory}
            onUnpublish={handleUnpublishStory}
            onVisibilityChange={handleVisibilityChange}
            isSaving={createStoryMutation.isPending || updateStoryMutation.isPending}
            isPublishing={publishStoryMutation.isPending || unpublishStoryMutation.isPending || setVisibilityMutation.isPending}
            onDelete={selectedStoryDirect ? handleDeleteStory : undefined}
            isDeleting={deleteStoryMutation.isPending}
          />
        </MobileSheet>
      </div>
    </div>
  );
}
