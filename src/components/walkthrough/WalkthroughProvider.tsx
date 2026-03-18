import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { SYNC_IN_PROGRESS_KEY } from '../../constants/sync';
import {
  WALKTHROUGH_STEPS,
  WALKTHROUGH_STORAGE_KEYS,
  WALKTHROUGH_TOTAL_STEPS,
} from './walkthrough-steps';
import { WalkthroughOverlay } from './WalkthroughOverlay';
import { WalkthroughCompletionScreen } from './WalkthroughCompletionScreen';

interface WalkthroughContextValue {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  next: () => void;
  previous: () => void;
  skip: () => void;
}

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null);

export function useWalkthrough() {
  return useContext(WalkthroughContext);
}

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const { user, refetchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [waitingForSync, setWaitingForSync] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [targetReady, setTargetReady] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausePhase, setPausePhase] = useState<'expand' | 'create'>('expand');
  const [wizardOpen, setWizardOpen] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPausedRef = useRef(false);

  // Check if user has already seen the overlay
  const hasSeenOverlay = user?.hasSeenOnboardingOverlay === true;

  // Initialize from sessionStorage on mount
  useEffect(() => {
    const active = sessionStorage.getItem(WALKTHROUGH_STORAGE_KEYS.active) === 'true';
    const storedStep = sessionStorage.getItem(WALKTHROUGH_STORAGE_KEYS.step);

    if (hasSeenOverlay) {
      // DB says already seen — clean up any stale sessionStorage
      sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.active);
      sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.step);
      sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.storyId);
      sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.paused);
      sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.resumePending);
      return;
    }

    if (active) {
      const step = storedStep ? parseInt(storedStep, 10) : 0;
      setCurrentStep(step);

      // Restore paused state if applicable
      const paused = sessionStorage.getItem(WALKTHROUGH_STORAGE_KEYS.paused) === 'true';
      if (paused) {
        setIsPaused(true);
        isPausedRef.current = true;
      }

      // Check if sync is still in progress
      const syncInProgress = sessionStorage.getItem(SYNC_IN_PROGRESS_KEY) === 'true';
      if (syncInProgress) {
        setWaitingForSync(true);
        setIsActive(true);
      } else {
        setIsActive(true);
      }
    }
  }, [hasSeenOverlay]);

  // Listen for activation event from completeOnboarding()
  useEffect(() => {
    if (hasSeenOverlay) return;

    const handleActivate = () => {
      const active = sessionStorage.getItem(WALKTHROUGH_STORAGE_KEYS.active) === 'true';
      if (!active) return;

      const storedStep = sessionStorage.getItem(WALKTHROUGH_STORAGE_KEYS.step);
      const step = storedStep ? parseInt(storedStep, 10) : 0;
      setCurrentStep(step);

      const syncInProgress = sessionStorage.getItem(SYNC_IN_PROGRESS_KEY) === 'true';
      if (syncInProgress) {
        setWaitingForSync(true);
      }
      setIsActive(true);
    };

    window.addEventListener('walkthrough-activate', handleActivate);
    return () => window.removeEventListener('walkthrough-activate', handleActivate);
  }, [hasSeenOverlay]);

  // Watch for sync completion
  useEffect(() => {
    if (!waitingForSync) return;

    let syncFinished = false;

    const checkSync = () => {
      if (syncFinished) return;
      const stillSyncing = sessionStorage.getItem(SYNC_IN_PROGRESS_KEY) === 'true';
      if (!stillSyncing) {
        syncFinished = true;
        // Sync done — wait 500ms then start tour
        setTimeout(() => {
          setWaitingForSync(false);
        }, 500);
      }
    };

    // Poll every 500ms for sync completion
    const interval = setInterval(checkSync, 500);

    // 30s timeout — if sync takes too long, start tour anyway
    syncTimeoutRef.current = setTimeout(() => {
      if (!syncFinished) {
        syncFinished = true;
        setWaitingForSync(false);
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [waitingForSync]);

  // Get the correct selector based on screen size
  const getTargetSelector = useCallback((stepIndex: number) => {
    const step = WALKTHROUGH_STEPS[stepIndex];
    if (!step) return null;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (!isDesktop && step.mobileTargetSelector) {
      return step.mobileTargetSelector;
    }
    return step.targetSelector;
  }, []);

  // Navigate to the correct route for the current step (skip during pause)
  useEffect(() => {
    if (!isActive || waitingForSync || showCompletion || isPaused) return;

    const step = WALKTHROUGH_STEPS[currentStep];
    if (!step) return;

    if (location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [isActive, currentStep, waitingForSync, showCompletion, isPaused, location.pathname, navigate]);

  // Listen for wizard visibility changes during pause
  useEffect(() => {
    if (!isPaused) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.isOpen) {
        setWizardOpen(true);
      } else {
        // Wizard closed — check if resume is pending to avoid overlay flash
        const resumePending = sessionStorage.getItem(WALKTHROUGH_STORAGE_KEYS.resumePending) === 'true';
        if (!resumePending) {
          setWizardOpen(false);
        }
      }
    };

    window.addEventListener('walkthrough-wizard-visibility', handler);
    return () => window.removeEventListener('walkthrough-wizard-visibility', handler);
  }, [isPaused]);

  // Poll for Create Story button when paused in 'expand' phase
  useEffect(() => {
    if (!isPaused || pausePhase !== 'expand') return;
    const check = () => {
      if (document.querySelector('[data-walkthrough="create-story-button"]')) {
        setPausePhase('create');
      }
    };
    const interval = setInterval(check, 300);
    return () => clearInterval(interval);
  }, [isPaused, pausePhase]);

  // Listen for walkthrough-resume event (wizard completed, navigated to /stories)
  useEffect(() => {
    if (!isPaused) return;

    const handler = () => {
      setIsPaused(false);
      isPausedRef.current = false;
      setPausePhase('expand');
      setWizardOpen(false);
      sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.paused);
      sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.resumePending);

      // Advance to next step
      const nextStep = currentStep + 1;
      if (nextStep >= WALKTHROUGH_TOTAL_STEPS) {
        setIsActive(false);
        setShowCompletion(true);
        sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.active);
        sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.step);
        return;
      }
      setCurrentStep(nextStep);
      sessionStorage.setItem(WALKTHROUGH_STORAGE_KEYS.step, String(nextStep));
    };

    window.addEventListener('walkthrough-resume', handler);
    return () => window.removeEventListener('walkthrough-resume', handler);
  }, [isPaused, currentStep]);

  // Poll for target element in DOM
  useEffect(() => {
    if (!isActive || waitingForSync || showCompletion) return;

    setTargetReady(false);
    let found = false;

    const selector = getTargetSelector(currentStep);
    if (!selector) return;

    const checkTarget = () => {
      if (found) return;
      const el = document.querySelector(selector);
      if (el) {
        found = true;
        setTargetReady(true);
        return;
      }
      targetPollRef.current = setTimeout(checkTarget, 200);
    };

    // Small delay to let route render
    targetPollRef.current = setTimeout(checkTarget, 300);

    // 15s timeout — if target never appears (e.g. no draft stories)
    const stepDef = WALKTHROUGH_STEPS[currentStep];
    const targetTimeout = setTimeout(() => {
      if (!found) {
        found = true;
        // If this is a pause step with no target, end tour gracefully
        if (stepDef?.pauseAfter) {
          skip();
        } else {
          next();
        }
      }
    }, 15000);

    return () => {
      if (targetPollRef.current) clearTimeout(targetPollRef.current);
      clearTimeout(targetTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep, waitingForSync, showCompletion, getTargetSelector]);

  // Detect unexpected navigation — end tour (skip during pause — user navigates freely)
  useEffect(() => {
    if (!isActive || showCompletion || waitingForSync || isPaused) return;

    const step = WALKTHROUGH_STEPS[currentStep];
    if (!step) return;

    const expectedRoutes = WALKTHROUGH_STEPS.map(s => s.route);
    if (!expectedRoutes.includes(location.pathname as '/timeline' | '/stories')) {
      markComplete();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isActive, showCompletion, currentStep, waitingForSync, isPaused]);

  // ESC key handler — exits tour when active but not during pause (user is interacting)
  useEffect(() => {
    if (!isActive || isPaused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skip();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isPaused]);

  const markComplete = useCallback(async () => {
    setIsActive(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setPausePhase('expand');
    setWizardOpen(false);
    setShowCompletion(false);
    sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.active);
    sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.step);
    sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.storyId);
    sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.paused);
    sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.resumePending);

    try {
      await api.patch('/users/walkthrough-complete');
      refetchUser();
    } catch (err) {
      console.warn('[Walkthrough] Failed to mark complete:', err);
    }
  }, [refetchUser]);

  const next = useCallback(() => {
    const step = WALKTHROUGH_STEPS[currentStep];

    // If this step pauses the tour, enter paused state instead of advancing
    if (step?.pauseAfter) {
      setIsPaused(true);
      isPausedRef.current = true;
      sessionStorage.setItem(WALKTHROUGH_STORAGE_KEYS.paused, 'true');
      return;
    }

    const nextStep = currentStep + 1;
    if (nextStep >= WALKTHROUGH_TOTAL_STEPS) {
      // Tour complete — show completion screen
      setIsActive(false);
      setShowCompletion(true);
      sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.active);
      sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.step);
      return;
    }

    setCurrentStep(nextStep);
    sessionStorage.setItem(WALKTHROUGH_STORAGE_KEYS.step, String(nextStep));
  }, [currentStep]);

  const previous = useCallback(() => {
    if (currentStep <= 0) return;
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    sessionStorage.setItem(WALKTHROUGH_STORAGE_KEYS.step, String(prevStep));
  }, [currentStep]);

  const skip = useCallback(() => {
    markComplete();
  }, [markComplete]);

  const handleCompletionDone = useCallback(() => {
    markComplete();
  }, [markComplete]);

  const pauseGuidance = isPaused
    ? currentStep === 1
      ? pausePhase === 'expand'
        ? 'Go ahead, click on a draft to expand it'
        : 'Now click Create Story to build your first career story'
      : currentStep === 3
        ? 'Go ahead — click Use As and pick any option'
        : undefined
    : undefined;

  const contextValue: WalkthroughContextValue = {
    isActive,
    currentStep,
    totalSteps: WALKTHROUGH_TOTAL_STEPS,
    next,
    previous,
    skip,
  };

  // Sync-waiting overlay
  const syncWaitingBanner = isActive && waitingForSync ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white border border-primary-200 shadow-xl rounded-xl px-6 py-5 mx-4 max-w-md text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" />
        <p className="text-sm text-gray-700">
          Still importing your activities... The tour will start when your data arrives.
        </p>
        <div className="mt-3 flex items-center justify-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <WalkthroughContext.Provider value={contextValue}>
      {children}
      {syncWaitingBanner}
      {/* Single overlay — stays mounted across pause transitions to avoid remount flicker */}
      {isActive && !waitingForSync && targetReady && !(isPaused && wizardOpen) && (
        <WalkthroughOverlay
          step={WALKTHROUGH_STEPS[currentStep]}
          stepIndex={currentStep}
          totalSteps={WALKTHROUGH_TOTAL_STEPS}
          targetSelector={getTargetSelector(currentStep)!}
          onNext={next}
          onPrevious={previous}
          onSkip={skip}
          isPaused={isPaused}
          interactiveSpotlight={isPaused && WALKTHROUGH_STEPS[currentStep]?.interactiveSpotlight}
          pauseGuidance={pauseGuidance}
        />
      )}
      {showCompletion && (
        <WalkthroughCompletionScreen onDone={handleCompletionDone} />
      )}
    </WalkthroughContext.Provider>
  );
}
