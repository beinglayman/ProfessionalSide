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
}: WalkthroughOverlayProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [visible, setVisible] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);

  const updateRect = useCallback(() => {
    const el = document.querySelector(targetSelector);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [targetSelector]);

  // Find target and track position
  useEffect(() => {
    const el = document.querySelector(targetSelector);
    if (!el) return;

    // Scroll target into view
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
          style={{ pointerEvents: 'auto' }}
          onClick={onSkip}
        />
      </svg>

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

      {/* Tooltip */}
      <WalkthroughTooltip
        title={step.title}
        description={step.description}
        placement={step.placement}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        targetRect={targetRect}
        onNext={onNext}
        onSkip={onSkip}
      />
    </div>
  );
}
