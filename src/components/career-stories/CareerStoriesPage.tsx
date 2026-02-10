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
import { ArrowLeft, Briefcase, CheckCircle2, ChevronDown, ChevronRight, X, BookOpen, Loader2, Filter, Clock, LayoutGrid, TrendingUp, FileText, Users, Target, ArrowUpRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cluster, ToolType, GenerateSTARResult, NarrativeFramework, CareerStory, StoryVisibility, WritingStyle } from '../../types/career-stories';
import { CONFIDENCE_THRESHOLDS, NARRATIVE_FRAMEWORKS, BRAG_DOC_CATEGORIES } from './constants';
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
  useDeleteDerivation,
  usePublishCareerStory,
  useUnpublishCareerStory,
  useSetCareerStoryVisibility,
  useStoryActivityMap,
  usePackets,
} from '../../hooks/useCareerStories';
import { ClusterStatus } from './ClusterCard';
import { NarrativePreview } from './NarrativePreview';
import { StoryCard } from './StoryCard';
import { FormatSwitchModal } from './FormatSwitchModal';
import { PublishModal } from './PublishModal';
import { DerivationModal } from './DerivationModal';
import { DerivationViewModal } from './DerivationViewModal';
import { PromotionPacketModal } from './PromotionPacketModal';
import type { BragDocCategory } from '../../types/career-stories';
import { Button } from '../ui/button';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { BREAKPOINTS, MOBILE_SHEET_MAX_HEIGHT_VH } from './constants';
import { isDemoMode, toggleDemoMode } from '../../services/career-stories-demo-data';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useJournalEntries } from '../../hooks/useJournal';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { getAvatarUrl, handleAvatarError } from '../../utils/avatar';
import {
  groupStoriesByTimePeriod,
  groupStoriesByCategory,
  formatTimeSpan,
} from '../../utils/story-timeline';
const PACKET_PILL_META: Record<string, { label: string; Icon: React.FC<{ className?: string }>; detail: string; bg: string; text: string; iconText: string }> = {
  promotion: { label: 'Promotion', Icon: TrendingUp, detail: 'Promotion-ready document', bg: 'bg-emerald-50', text: 'text-emerald-700', iconText: 'text-emerald-500' },
  'annual-review': { label: 'Review', Icon: Clock, detail: 'Annual review summary', bg: 'bg-blue-50', text: 'text-blue-700', iconText: 'text-blue-500' },
  'skip-level': { label: 'Skip-Level', Icon: ArrowUpRight, detail: 'Skip-level prep', bg: 'bg-purple-50', text: 'text-purple-700', iconText: 'text-purple-500' },
  'portfolio-brief': { label: 'Portfolio', Icon: FileText, detail: 'Portfolio brief', bg: 'bg-indigo-50', text: 'text-indigo-700', iconText: 'text-indigo-500' },
  'self-assessment': { label: 'Assessment', Icon: Target, detail: 'Self-assessment write-up', bg: 'bg-rose-50', text: 'text-rose-700', iconText: 'text-rose-500' },
  'one-on-one': { label: '1:1 Prep', Icon: Users, detail: '1:1 talking points', bg: 'bg-amber-50', text: 'text-amber-700', iconText: 'text-amber-500' },
};

// Timeline spine (dot + connecting line) — shared between timeline and category views
function TimelineSpine({ isLast }: { isLast: boolean }) {
  return (
    <div className="flex flex-col items-center flex-shrink-0 w-5">
      <div className="w-3 h-3 rounded-full mt-4 flex-shrink-0 ring-4 ring-gray-50 z-10 bg-primary-500" />
      {!isLast && <div className="w-px flex-1 bg-gray-200" />}
    </div>
  );
}

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
  const { user } = useAuth();
  const { profile } = useProfile();
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
  // Format switch modal state — modal owns its own form state internally
  const [formatSwitchStoryId, setFormatSwitchStoryId] = useState<string | null>(null);
  const [formatSwitchInitial, setFormatSwitchInitial] = useState<{
    framework: NarrativeFramework;
    style: WritingStyle;
  } | null>(null);
  // Publish modal state
  const [publishModalStoryId, setPublishModalStoryId] = useState<string | null>(null);
  // Derivation modal state
  const [derivationStoryId, setDerivationStoryId] = useState<string | null>(null);
  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Promotion packet modal state
  const [showPromotionPacket, setShowPromotionPacket] = useState(false);
  // Packet view modal state
  const [viewPacket, setViewPacket] = useState<import('../../types/career-stories').StoryDerivation | null>(null);
  // Saved packets accordion state
  const [showSavedPackets, setShowSavedPackets] = useState(false);

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
  const { data: existingStories, isLoading: isLoadingStories } = useListCareerStories();
  const { data: packets } = usePackets();

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
  const deleteDerivationMutation = useDeleteDerivation();
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

  // Handle framework change - save to localStorage and open modal or regenerate
  const handleFrameworkChange = useCallback(
    (newFramework: NarrativeFramework) => {
      setFramework(newFramework);
      localStorage.setItem('career-stories-framework', newFramework);

      // Open format switch modal if a story is directly selected
      if (selectedStoryDirect) {
        setFormatSwitchStoryId(selectedStoryDirect.id);
        setFormatSwitchInitial({ framework: newFramework, style: 'professional' });
        return;
      }

      // Regenerate if a cluster is selected
      if (selectedCluster) {
        handleGenerateStar(selectedCluster.id, newFramework);
      }
    },
    [selectedCluster, selectedStoryDirect, handleGenerateStar]
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

  // Sync selectedStoryDirect with query cache when story list refetches
  // (e.g. after adding a note or excluding a source)
  useEffect(() => {
    if (!selectedStoryDirect || !existingStories?.stories) return;
    const fresh = existingStories.stories.find((s) => s.id === selectedStoryDirect.id);
    if (fresh && fresh !== selectedStoryDirect) {
      setSelectedStoryDirect(fresh);
    }
  }, [existingStories?.stories]);

  const handleGenerateClusters = useCallback(() => {
    generateClustersMutation.mutate({});
  }, [generateClustersMutation]);

  const handleRegenerate = useCallback(() => {
    // If a story is selected directly, open the format switch modal
    if (selectedStoryDirect) {
      setFormatSwitchStoryId(selectedStoryDirect.id);
      setFormatSwitchInitial({
        framework: selectedStoryDirect.framework || framework,
        style: 'professional',
      });
      return;
    }
    // Otherwise, regenerate via cluster
    if (selectedCluster) {
      handleGenerateStar(selectedCluster.id);
    }
  }, [selectedCluster, selectedStoryDirect, handleGenerateStar, framework]);

  // Format switch handlers
  const handleFormatSwitch = useCallback((storyId: string, newFramework: NarrativeFramework, style: WritingStyle) => {
    setFormatSwitchStoryId(storyId);
    setFormatSwitchInitial({ framework: newFramework, style });
  }, []);

  const formatSwitchStory = useMemo(() => {
    if (!formatSwitchStoryId) return null;
    return existingStories?.stories?.find((s) => s.id === formatSwitchStoryId) || null;
  }, [formatSwitchStoryId, existingStories]);

  const derivationStory = useMemo(() => {
    if (!derivationStoryId) return null;
    return existingStories?.stories?.find((s) => s.id === derivationStoryId) || null;
  }, [derivationStoryId, existingStories]);

  const handleFormatRegenerate = useCallback(async (
    fw: NarrativeFramework,
    style: WritingStyle,
    userPrompt?: string,
    archetype?: string,
  ) => {
    if (!formatSwitchStoryId) return;
    const response = await regenerateStoryMutation.mutateAsync({
      id: formatSwitchStoryId,
      framework: fw,
      style,
      userPrompt,
      archetype,
    });
    if (response.success && response.data) {
      if (selectedStoryDirect?.id === formatSwitchStoryId) {
        setSelectedStoryDirect(response.data);
      }
    }
    setFormatSwitchStoryId(null);
    setFormatSwitchInitial(null);
  }, [formatSwitchStoryId, regenerateStoryMutation, selectedStoryDirect]);

  const handleDeleteStory = useCallback(() => {
    if (selectedStoryDirect) {
      setShowDeleteConfirm(true);
    }
  }, [selectedStoryDirect]);

  const handleConfirmDelete = useCallback(() => {
    if (selectedStoryDirect) {
      deleteStoryMutation.mutate(selectedStoryDirect.id, {
        onSuccess: () => {
          setSelectedStoryDirect(null);
          setShowDeleteConfirm(false);
        },
      });
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

  // Story view toggle: timeline (by quarter) vs category (by brag doc)
  const [storyView, setStoryView] = useState<'timeline' | 'category'>('category');

  // Build O(1) activity lookup for timeline quarter grouping
  const activityMap = useStoryActivityMap(allStories);

  // Fetch recent journal entries for empty-category hover preview
  const { data: journalData } = useJournalEntries({ sortBy: 'createdAt', sortOrder: 'desc', limit: 20 });

  // Journal entries not yet promoted to career stories
  const unpromotedEntries = useMemo(() => {
    const entries = journalData?.entries ?? [];
    const promotedIds = new Set(allStories.map((s) => s.journalEntryId).filter(Boolean));
    return entries.filter((e) => !promotedIds.has(e.id));
  }, [journalData, allStories]);

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

  // Update the currently selected story (direct or cluster-linked) with fresh data
  const updateSelectedStory = useCallback((updatedStory: CareerStory) => {
    if (selectedStoryDirect) {
      setSelectedStoryDirect(updatedStory);
    } else if (selectedCluster) {
      setSavedStories((prev) => ({ ...prev, [selectedCluster.id]: updatedStory }));
    }
  }, [selectedCluster, selectedStoryDirect]);

  const handlePublishStory = useCallback(async (
    visibility: StoryVisibility,
    edits: { situation?: string; task?: string; action?: string; result?: string }
  ) => {
    const story = await ensureStory(edits);
    if (!story) return;

    try {
      const response = await publishStoryMutation.mutateAsync({ id: story.id, visibility });
      if (response.success && response.data) {
        updateSelectedStory(response.data);
      }
    } catch (error) {
      console.error('Failed to publish story:', error);
    }
  }, [ensureStory, publishStoryMutation, updateSelectedStory]);

  const handleUnpublishStory = useCallback(async () => {
    const story = selectedStoryDirect || (selectedCluster ? savedStories[selectedCluster.id] : null);
    if (!story) return;

    try {
      const response = await unpublishStoryMutation.mutateAsync(story.id);
      if (response.success && response.data) {
        updateSelectedStory(response.data);
      }
    } catch (error) {
      console.error('Failed to unpublish story:', error);
    }
  }, [savedStories, selectedCluster, selectedStoryDirect, unpublishStoryMutation, updateSelectedStory]);

  const handlePublishWithCategory = useCallback(async (category: BragDocCategory) => {
    if (!publishModalStoryId) return;
    try {
      const response = await publishStoryMutation.mutateAsync({
        id: publishModalStoryId,
        visibility: 'network' as StoryVisibility,
        category,
      });
      if (response.success && response.data) {
        updateSelectedStory(response.data);
      }
    } catch (error) {
      console.error('Failed to publish story:', error);
    } finally {
      setPublishModalStoryId(null);
    }
  }, [publishModalStoryId, publishStoryMutation, updateSelectedStory]);

  const handleVisibilityChange = useCallback(async (visibility: StoryVisibility) => {
    const story = selectedStoryDirect || (selectedCluster ? savedStories[selectedCluster.id] : null);
    if (!story) return;

    try {
      const response = await setVisibilityMutation.mutateAsync({ id: story.id, visibility });
      if (response.success && response.data) {
        updateSelectedStory(response.data);
      }
    } catch (error) {
      console.error('Failed to update story visibility:', error);
    }
  }, [savedStories, selectedCluster, selectedStoryDirect, setVisibilityMutation, updateSelectedStory]);

  // View mode: 'list' shows cards, 'detail' shows full story
  const viewMode = selectedStoryDirect ? 'detail' : 'list';

  // Source filter for timeline view - 'all' shows everything, or filter by sourceMode
  const [sourceFilter, setSourceFilter] = useState<'all' | 'demo' | 'production'>('all');

  // Handle Escape key to close detail view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedStoryDirect) {
        e.preventDefault();
        setSelectedStoryDirect(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedStoryDirect]);

  // Filter stories by source
  const filteredStories = useMemo(() => {
    if (sourceFilter === 'all') return allStories;
    return allStories.filter(story => story.sourceMode === sourceFilter);
  }, [allStories, sourceFilter]);

  // Get unique sources for filter options
  const availableSources = useMemo(() => {
    const sources = new Set(allStories.map(s => s.sourceMode));
    return Array.from(sources);
  }, [allStories]);

  // Group stories by time period (This Week / Last Week / quarter)
  const storiesByTimePeriod = useMemo(
    () => groupStoriesByTimePeriod(filteredStories, activityMap),
    [filteredStories, activityMap],
  );

  // Group stories by brag doc category
  const storiesByCategory = useMemo(() => groupStoriesByCategory(filteredStories), [filteredStories]);

  // Close detail view
  const handleCloseDetail = useCallback(() => {
    setSelectedStoryDirect(null);
  }, []);

  return (
    <div className="h-full bg-gray-50" data-testid="career-stories-page">
      {/* Celebration toast */}
      {showCelebration && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Story created!</span>
          <button onClick={() => setShowCelebration(false)} className="ml-2 hover:text-white/80">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main content area - same width as Activity tab (max-w-7xl) */}
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          {/* Detail View: Full story with back button */}
          {viewMode === 'detail' && selectedStoryDirect && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Back button */}
              <button
                onClick={handleCloseDetail}
                className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to stories</span>
                <span className="text-xs text-gray-400 ml-2">(Esc)</span>
              </button>

              {/* Full story preview */}
              <NarrativePreview
                clusterName={selectedStoryDirect.title}
                activityCount={selectedStoryDirect.activityIds.length}
                dateRange={selectedCluster?.metrics?.dateRange}
                toolTypes={selectedToolTypes}
                activities={clusterWithActivities?.activities}
                result={storyAsResult || selectedClusterState?.result || null}
                isLoading={selectedClusterState?.status === 'generating' || regenerateStoryMutation.isPending}
                polishEnabled={polishEnabled}
                onPolishToggle={setPolishEnabled}
                framework={selectedStoryDirect.framework || framework}
                onFrameworkChange={handleFrameworkChange}
                onRegenerate={handleRegenerate}
                story={selectedStory}
                sources={selectedStoryDirect.sources}
                sourceCoverage={selectedStoryDirect.sourceCoverage}
                onSave={handleSaveStory}
                onPublish={handlePublishStory}
                onUnpublish={handleUnpublishStory}
                onVisibilityChange={handleVisibilityChange}
                onOpenPublishModal={() => selectedStoryDirect && setPublishModalStoryId(selectedStoryDirect.id)}
                isSaving={createStoryMutation.isPending || updateStoryMutation.isPending}
                isPublishing={publishStoryMutation.isPending || unpublishStoryMutation.isPending || setVisibilityMutation.isPending}
                onDelete={handleDeleteStory}
                isDeleting={deleteStoryMutation.isPending}
                onShareAs={() => selectedStoryDirect && setDerivationStoryId(selectedStoryDirect.id)}
              />
            </div>
          )}

          {/* List View: Story cards grouped by year */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {/* Header with avatar, title, toggle + filter */}
              <div className="flex items-center justify-between gap-4 mb-2">
                  {/* Left: Avatar + Title + Subtitle */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={getAvatarUrl(profile?.avatar)}
                      alt={profile?.name || user?.name || 'Profile'}
                      className="h-10 w-10 rounded-full object-cover bg-gradient-to-br from-primary-400 to-primary-600 flex-shrink-0"
                      onError={handleAvatarError}
                    />
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900 truncate">
                        {profile?.name || user?.name || 'Your'}&apos;s Career Stories
                      </h2>
                      <p className="text-xs text-gray-500">
                        {filteredStories.length} {filteredStories.length === 1 ? 'story' : 'stories'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Promotion Packet + Saved Narratives + Filter */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Build Narratives button */}
                    {allStories.length >= 2 && (
                      <Button
                        onClick={() => setShowPromotionPacket(true)}
                        size="sm"
                        className="gap-1.5"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        Build Narratives
                      </Button>
                    )}
                    {/* Saved narratives dropdown */}
                    {packets && packets.length > 0 && (
                      <div className="relative">
                        <Button
                          onClick={() => setShowSavedPackets(!showSavedPackets)}
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-primary-200 text-primary-700 hover:bg-primary-50"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          Saved
                          <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none bg-primary-100 text-primary-700">
                            {packets.length}
                          </span>
                          <ChevronDown className={cn(
                            'w-3 h-3 transition-transform duration-200',
                            showSavedPackets && 'rotate-180'
                          )} />
                        </Button>
                        {showSavedPackets && (
                          <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 min-w-[260px] max-w-[340px]">
                            <div className="flex flex-col gap-0.5">
                              {packets.map((p) => {
                                const meta = PACKET_PILL_META[p.type];
                                const PillIcon = meta?.Icon || Clock;
                                const pillLabel = meta?.label || p.type;
                                const pillDetail = meta?.detail || p.type;
                                const date = new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                                // Use stored snapshots for durable display (survive story deletion)
                                const snapshots = p.storySnapshots ?? [];
                                const storyCount = snapshots.length || p.storyIds?.length || 0;

                                // Compute overall date range from activity ranges (or fall back to generatedAt)
                                const allDates: number[] = [];
                                for (const snap of snapshots) {
                                  if (snap.dateRange) {
                                    allDates.push(new Date(snap.dateRange.earliest).getTime());
                                    allDates.push(new Date(snap.dateRange.latest).getTime());
                                  } else if (snap.generatedAt) {
                                    allDates.push(new Date(snap.generatedAt).getTime());
                                  }
                                }
                                const validDates = allDates.filter(t => t > 0);
                                const dateRange = validDates.length >= 2
                                  ? `${new Date(Math.min(...validDates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(Math.max(...validDates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                  : null;

                                return (
                                  <button
                                    key={p.id}
                                    onClick={() => setViewPacket(p)}
                                    title={`${pillDetail} · ${p.wordCount} words · ${date}`}
                                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-md hover:bg-gray-50 transition-colors text-left group"
                                  >
                                    <span className={cn(
                                      'flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0',
                                      meta?.bg || 'bg-gray-100'
                                    )}>
                                      <PillIcon className={cn('w-3.5 h-3.5', meta?.iconText || 'text-gray-400')} />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <span className={cn('font-medium block truncate', meta?.text || 'text-gray-700')}>{pillLabel}</span>
                                      <span className="text-[10px] text-gray-400">
                                        {dateRange || `${storyCount} ${storyCount === 1 ? 'story' : 'stories'}`}
                                        {p.wordCount ? ` · ${p.wordCount} words` : ''}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 flex-shrink-0">{date}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Source filter dropdown */}
                    {availableSources.length > 1 && (
                      <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-gray-400" />
                        <select
                          value={sourceFilter}
                          onChange={(e) => setSourceFilter(e.target.value as 'all' | 'demo' | 'production')}
                          className="text-xs bg-white border border-gray-200 rounded-md px-2 py-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="all">All Sources</option>
                          {availableSources.includes('demo') && <option value="demo">Demo</option>}
                          {availableSources.includes('production') && <option value="production">Real Data</option>}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

              {/* Educational banner */}
              <div className="mb-2 px-4 py-2.5 rounded-lg flex items-center gap-2.5 bg-primary-50 border border-primary-200">
                <BookOpen className="h-4 w-4 text-primary-600 flex-shrink-0" />
                <p className="text-sm text-primary-700">Turn your work into polished stories — ready for interviews, professional network sharing, or your next promotion narrative.</p>
              </div>

              {/* Timeline / Category toggle */}
              <div className="border-b border-gray-200 mb-2">
                <nav className="-mb-px flex space-x-1">
                  {([
                    { key: 'category' as const, label: 'By Category', Icon: LayoutGrid },
                    { key: 'timeline' as const, label: 'By Timeline', Icon: Clock },
                  ]).map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      onClick={() => setStoryView(key)}
                      className={cn(
                        'inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-4 text-sm font-medium transition-all duration-200',
                        storyView === key
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Loading state */}
              {(isLoadingClusters || isLoadingStories) && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              )}

              {/* Empty state - no stories at all */}
              {!isLoadingClusters && !isLoadingStories && allStories.length === 0 && (
                <div className="text-center py-12">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <BookOpen className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">No stories yet</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Promote journal entries from the Journal page to create career stories.
                  </p>
                </div>
              )}

              {/* Empty state - filtered results empty */}
              {!isLoadingClusters && allStories.length > 0 && filteredStories.length === 0 && (
                <div className="text-center py-12">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Filter className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">No matching stories</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    No stories match the current filter. Try selecting "All Sources".
                  </p>
                  <button
                    onClick={() => setSourceFilter('all')}
                    className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Clear filter
                  </button>
                </div>
              )}

              {/* Conditional: Timeline (quarters) or Category (brag doc) */}
              {storyView === 'timeline' ? (
                <>
                  {storiesByTimePeriod.map((group) => (
                    <div key={group.label}>
                      {/* Quarter header */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-semibold text-gray-700">{group.label}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                          {group.stories.length}
                        </span>
                      </div>

                      {/* Timeline spine + cards */}
                      <div>
                        {group.stories.map(({ story, timeRange }, i) => (
                          <div key={story.id} className="relative flex gap-4">
                            <TimelineSpine isLast={i === group.stories.length - 1} />
                            <div className="flex-1 min-w-0 pb-4">
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <StoryCard
                                  story={story}
                                  isSelected={false}
                                  onClick={() => handleSelectStory(story)}
                                  onFormatChange={handleFormatSwitch}
                                />
                              </div>
                              {timeRange.earliest.toDateString() !== timeRange.latest.toDateString() && (
                                <p className="text-[11px] text-gray-400 mt-1 ml-1">
                                  {formatTimeSpan(timeRange.earliest, timeRange.latest)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Category chips */}
                      {group.categories.size > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1 ml-9">
                          {BRAG_DOC_CATEGORIES.filter((c) => group.categories.has(c.value)).map((cat) => (
                            <span
                              key={cat.value}
                              className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-[10px]"
                            >
                              {cat.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {allStories.length < 3 && (
                    <button
                      onClick={() => navigate('/timeline')}
                      className="w-full border border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-gray-300 hover:bg-gray-50/50 transition-colors"
                    >
                      <p className="text-xs text-gray-400">
                        More stories to tell &middot; <span className="text-primary-500 font-medium">Promote from journal</span>
                      </p>
                    </button>
                  )}
                </>
              ) : (
                <>
                  {BRAG_DOC_CATEGORIES.map((cat) => {
                    const catStories = storiesByCategory.get(cat.value) ?? [];
                    return (
                      <div key={cat.value} className="pt-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-sm font-semibold text-gray-700">{cat.label}</span>
                          <div className="flex-1 h-px bg-gray-200" />
                          {catStories.length > 0 && (
                            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                              {catStories.length}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{cat.description}</p>

                        {catStories.length === 0 ? (
                          <div className="group/empty relative">
                            <button
                              onClick={() => navigate('/timeline')}
                              className="w-full border border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-gray-300 hover:bg-gray-50/50 transition-colors"
                            >
                              <p className="text-xs text-gray-400">
                                No stories yet
                                {unpromotedEntries.length > 0 && (
                                  <> &middot; <span className="text-gray-500 font-medium">{unpromotedEntries.length} journal {unpromotedEntries.length === 1 ? 'entry' : 'entries'}</span></>
                                )}
                                {' '}&middot; <span className="text-primary-500 font-medium">Promote from journal</span>
                              </p>
                            </button>
                            {unpromotedEntries.length > 0 && (
                              <div className="absolute left-0 right-0 top-full mt-1 z-20 hidden group-hover/empty:block">
                                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 space-y-2">
                                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Recent journal entries</p>
                                  {unpromotedEntries.slice(0, 3).map((entry) => (
                                    <div key={entry.id} className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium text-gray-700 truncate">{entry.title}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                      </div>
                                    </div>
                                  ))}
                                  {unpromotedEntries.length > 3 && (
                                    <p className="text-[10px] text-gray-400">+{unpromotedEntries.length - 3} more</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            {catStories.map((story) => (
                              <StoryCard
                                key={story.id}
                                story={story}
                                isSelected={false}
                                onClick={() => handleSelectStory(story)}
                                onFormatChange={handleFormatSwitch}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {storiesByCategory.has('other') && (
                    <div className="pt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-bold text-gray-600">Other</span>
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                          {storiesByCategory.get('other')!.length}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">Uncategorized stories</p>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {storiesByCategory.get('other')!.map((story) => (
                          <StoryCard
                            key={story.id}
                            story={story}
                            isSelected={false}
                            onClick={() => handleSelectStory(story)}
                            onFormatChange={handleFormatSwitch}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Spacer for scroll */}
              <div className="h-[30vh]" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Bottom sheet for STAR preview (legacy support) */}
      <MobileSheet
        isOpen={mobileSheetOpen && selectedCluster !== null}
        onClose={() => setMobileSheetOpen(false)}
      >
        <NarrativePreview
          clusterName={selectedCluster?.name || ''}
          activityCount={selectedCluster?.activityCount || 0}
          dateRange={selectedCluster?.metrics?.dateRange}
          toolTypes={selectedToolTypes}
          activities={clusterWithActivities?.activities}
          result={selectedClusterState?.result || null}
          isLoading={selectedClusterState?.status === 'generating'}
          polishEnabled={polishEnabled}
          onPolishToggle={setPolishEnabled}
          framework={framework}
          onFrameworkChange={handleFrameworkChange}
          onRegenerate={handleRegenerate}
          story={selectedStory}
          sources={selectedStory?.sources}
          sourceCoverage={selectedStory?.sourceCoverage}
          onSave={handleSaveStory}
          onPublish={handlePublishStory}
          onUnpublish={handleUnpublishStory}
          onVisibilityChange={handleVisibilityChange}
          onOpenPublishModal={() => {
            const story = selectedStoryDirect || (selectedCluster ? savedStories[selectedCluster.id] : null);
            if (story) setPublishModalStoryId(story.id);
          }}
          isSaving={createStoryMutation.isPending || updateStoryMutation.isPending}
          isPublishing={publishStoryMutation.isPending || unpublishStoryMutation.isPending || setVisibilityMutation.isPending}
        />
      </MobileSheet>

      {/* Format Switch Modal */}
      {formatSwitchStory && formatSwitchStoryId && (
        <FormatSwitchModal
          isOpen={!!formatSwitchStoryId}
          onClose={() => { setFormatSwitchStoryId(null); setFormatSwitchInitial(null); }}
          story={formatSwitchStory}
          initialFramework={formatSwitchInitial?.framework}
          initialStyle={formatSwitchInitial?.style}
          onRegenerate={handleFormatRegenerate}
          isRegenerating={regenerateStoryMutation.isPending}
        />
      )}

      {/* Publish Modal */}
      {publishModalStoryId && (() => {
        const publishStory = existingStories?.stories?.find((s) => s.id === publishModalStoryId);
        if (!publishStory) return null;
        return (
          <PublishModal
            isOpen={!!publishModalStoryId}
            onClose={() => setPublishModalStoryId(null)}
            story={publishStory}
            onPublish={handlePublishWithCategory}
            isPublishing={publishStoryMutation.isPending}
          />
        );
      })()}

      {/* Derivation Modal */}
      {derivationStory && derivationStoryId && (
        <DerivationModal
          isOpen={!!derivationStoryId}
          onClose={() => setDerivationStoryId(null)}
          story={derivationStory}
        />
      )}

      {/* Promotion Packet Modal */}
      {showPromotionPacket && allStories.length >= 2 && (
        <PromotionPacketModal
          isOpen={showPromotionPacket}
          onClose={() => setShowPromotionPacket(false)}
          stories={allStories}
        />
      )}

      {/* Packet View Modal */}
      {viewPacket && (
        <DerivationViewModal
          isOpen={!!viewPacket}
          onClose={() => setViewPacket(null)}
          derivation={viewPacket}
          onDelete={(id) => {
            deleteDerivationMutation.mutate(id, {
              onSuccess: () => setViewPacket(null),
            });
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Story"
        description="This will permanently delete this career story and all its sources. This can't be undone."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        isLoading={deleteStoryMutation.isPending}
      />
    </div>
  );
}
