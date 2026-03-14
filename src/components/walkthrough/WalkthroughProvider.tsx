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
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      return;
    }

    if (active) {
      const step = storedStep ? parseInt(storedStep, 10) : 0;
      setCurrentStep(step);

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

  // Navigate to the correct route for the current step
  useEffect(() => {
    if (!isActive || waitingForSync || showCompletion) return;

    const step = WALKTHROUGH_STEPS[currentStep];
    if (!step) return;

    if (location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [isActive, currentStep, waitingForSync, showCompletion, location.pathname, navigate]);

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

    // 15s timeout — if target never appears (e.g. no draft stories), skip this step
    const targetTimeout = setTimeout(() => {
      if (!found) {
        found = true;
        // Skip this step — advance to next or end tour
        next();
      }
    }, 15000);

    return () => {
      if (targetPollRef.current) clearTimeout(targetPollRef.current);
      clearTimeout(targetTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep, waitingForSync, showCompletion, getTargetSelector]);

  // Detect unexpected navigation — end tour
  useEffect(() => {
    if (!isActive || showCompletion) return;

    const step = WALKTHROUGH_STEPS[currentStep];
    if (!step) return;

    const expectedRoutes = WALKTHROUGH_STEPS.map(s => s.route);
    if (!expectedRoutes.includes(location.pathname as '/timeline' | '/stories')) {
      markComplete();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isActive, showCompletion, currentStep]);

  // ESC key handler
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skip();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const markComplete = useCallback(async () => {
    setIsActive(false);
    setShowCompletion(false);
    sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.active);
    sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.step);
    sessionStorage.removeItem(WALKTHROUGH_STORAGE_KEYS.storyId);

    try {
      await api.patch('/users/walkthrough-complete');
      refetchUser();
    } catch (err) {
      console.warn('[Walkthrough] Failed to mark complete:', err);
    }
  }, [refetchUser]);

  const next = useCallback(() => {
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

  const skip = useCallback(() => {
    markComplete();
  }, [markComplete]);

  const handleCompletionDone = useCallback(() => {
    markComplete();
  }, [markComplete]);

  const contextValue: WalkthroughContextValue = {
    isActive,
    currentStep,
    totalSteps: WALKTHROUGH_TOTAL_STEPS,
    next,
    skip,
  };

  // Inline sync-waiting banner
  const syncWaitingBanner = isActive && waitingForSync ? (
    <div className="fixed top-16 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="bg-white border border-primary-200 shadow-lg rounded-lg px-4 py-3 mx-4 mt-2 max-w-md pointer-events-auto">
        <p className="text-sm text-gray-700">
          Still importing your activities... The tour will start when your data arrives.
        </p>
        <button
          onClick={skip}
          className="mt-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          Skip to dashboard
        </button>
      </div>
    </div>
  ) : null;

  return (
    <WalkthroughContext.Provider value={contextValue}>
      {children}
      {syncWaitingBanner}
      {isActive && !waitingForSync && targetReady && (
        <WalkthroughOverlay
          step={WALKTHROUGH_STEPS[currentStep]}
          stepIndex={currentStep}
          totalSteps={WALKTHROUGH_TOTAL_STEPS}
          targetSelector={getTargetSelector(currentStep)!}
          onNext={next}
          onSkip={skip}
        />
      )}
      {showCompletion && (
        <WalkthroughCompletionScreen onDone={handleCompletionDone} />
      )}
    </WalkthroughContext.Provider>
  );
}
