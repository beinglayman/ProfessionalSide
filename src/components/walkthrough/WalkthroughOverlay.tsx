import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WalkthroughTooltip } from './WalkthroughTooltip';
import type { WalkthroughStep } from './walkthrough-steps';

interface WalkthroughOverlayProps {
  step: WalkthroughStep;
  stepIndex: number;
  totalSteps: number;
  targetSelector: string;
  onNext: () => void;
  onSkip: () => void;
  /** Spotlight area allows click-through to underlying elements */
  interactiveSpotlight?: boolean;
  /** Tour is paused — show overlay but hide tooltip */
  isPaused?: boolean;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PADDING = 8;

export function WalkthroughOverlay({
  step,
  stepIndex,
  totalSteps,
  targetSelector,
  onNext,
  onSkip,
  interactiveSpotlight,
  isPaused,
}: WalkthroughOverlayProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [visible, setVisible] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);

  const updateRect = useCallback(() => {
    const el = document.querySelector(targetSelector);
    if (!el) return;

    const rect = el.getBoundingClientRect();

    // Clamp to the visible viewport portion of the element
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, window.innerHeight);
    const clampedHeight = Math.max(visibleBottom - visibleTop, 0);

    // Cap height so the spotlight highlights a representative area, not the full column
    const maxHeight = Math.min(clampedHeight, 250);

    setTargetRect({
      top: visibleTop,
      left: rect.left,
      width: rect.width,
      height: maxHeight,
    });
  }, [targetSelector]);

  // Find target and track position
  useEffect(() => {
    const el = document.querySelector(targetSelector);
    if (!el) return;

    // Scroll page to top first, then bring target into view
    window.scrollTo({ top: 0, behavior: 'smooth' });
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    updateRect();

    // ResizeObserver to handle layout shifts
    observerRef.current = new ResizeObserver(updateRect);
    observerRef.current.observe(el);

    // capture: true catches scroll events from nested scrollable containers
    document.addEventListener('scroll', updateRect, { capture: true, passive: true });
    window.addEventListener('resize', updateRect, { passive: true });

    // Fade in
    requestAnimationFrame(() => setVisible(true));

    return () => {
      observerRef.current?.disconnect();
      document.removeEventListener('scroll', updateRect, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', updateRect);
    };
  }, [targetSelector, updateRect]);

  // Check reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!targetRect) return null;

  const spotlightX = targetRect.left - SPOTLIGHT_PADDING;
  const spotlightY = targetRect.top - SPOTLIGHT_PADDING;
  const spotlightW = targetRect.width + SPOTLIGHT_PADDING * 2;
  const spotlightH = targetRect.height + SPOTLIGHT_PADDING * 2;

  return (
    <div
      className={`fixed inset-0 z-[60] ${
        prefersReducedMotion
          ? 'opacity-100'
          : visible
          ? 'opacity-100 transition-opacity duration-300'
          : 'opacity-0'
      }`}
      role="dialog"
      aria-label={`Product walkthrough step ${stepIndex + 1} of ${totalSteps}`}
    >
      {/* SVG backdrop with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <mask id={`walkthrough-mask-${stepIndex}`}>
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={spotlightX}
              y={spotlightY}
              width={spotlightW}
              height={spotlightH}
              rx={8}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask={`url(#walkthrough-mask-${stepIndex})`}
          style={{ pointerEvents: interactiveSpotlight ? 'none' : 'auto' }}
          onClick={interactiveSpotlight ? undefined : onSkip}
        />
      </svg>

      {/* When interactive spotlight: 4 divs block clicks in dark area but leave spotlight open */}
      {interactiveSpotlight && (
        <>
          {/* Top bar */}
          <div className="fixed left-0 top-0 right-0" style={{ height: spotlightY, pointerEvents: 'auto' }} />
          {/* Bottom bar */}
          <div className="fixed left-0 right-0 bottom-0" style={{ top: spotlightY + spotlightH, pointerEvents: 'auto' }} />
          {/* Left bar */}
          <div className="fixed left-0" style={{ top: spotlightY, width: Math.max(spotlightX, 0), height: spotlightH, pointerEvents: 'auto' }} />
          {/* Right bar */}
          <div className="fixed right-0" style={{ top: spotlightY, left: spotlightX + spotlightW, height: spotlightH, pointerEvents: 'auto' }} />
        </>
      )}

      {/* Spotlight border highlight */}
      <div
        className="absolute rounded-lg ring-2 ring-primary-400 ring-offset-2"
        style={{
          top: spotlightY,
          left: spotlightX,
          width: spotlightW,
          height: spotlightH,
          pointerEvents: 'none',
        }}
      />

      {/* Tooltip — hidden when tour is paused (overlay stays for focus) */}
      {!isPaused && (
        <WalkthroughTooltip
          title={step.title}
          description={step.description}
          placement={step.placement}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          targetRect={targetRect}
          onNext={onNext}
          onSkip={onSkip}
          isPauseStep={step.pauseAfter}
        />
      )}
    </div>
  );
}
