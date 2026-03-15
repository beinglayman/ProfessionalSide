import React, { useRef, useEffect, useMemo } from 'react';
import * as FocusScope from '@radix-ui/react-focus-scope';

interface WalkthroughTooltipProps {
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  stepIndex: number;
  totalSteps: number;
  targetRect: { top: number; left: number; width: number; height: number };
  onNext: () => void;
  onSkip: () => void;
}

const TOOLTIP_GAP = 16;

export function WalkthroughTooltip({
  title,
  description,
  placement,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onSkip,
}: WalkthroughTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isLastStep = stepIndex === totalSteps - 1;

  // Focus trap: focus the Next button on mount
  useEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    const btn = el.querySelector<HTMLButtonElement>('[data-walkthrough-next]');
    btn?.focus();
  }, [stepIndex]);

  // Calculate position
  const style = useMemo(() => {
    const pos: React.CSSProperties = {
      position: 'fixed',
      zIndex: 61,
      maxWidth: 320,
    };

    switch (placement) {
      case 'right':
        pos.top = targetRect.top + targetRect.height / 2;
        pos.left = targetRect.left + targetRect.width + TOOLTIP_GAP;
        pos.transform = 'translateY(-50%)';
        break;
      case 'left':
        pos.top = targetRect.top + targetRect.height / 2;
        pos.right = window.innerWidth - targetRect.left + TOOLTIP_GAP;
        pos.transform = 'translateY(-50%)';
        break;
      case 'bottom':
        pos.top = targetRect.top + targetRect.height + TOOLTIP_GAP;
        pos.left = targetRect.left + targetRect.width / 2;
        pos.transform = 'translateX(-50%)';
        break;
      case 'top':
        pos.bottom = window.innerHeight - targetRect.top + TOOLTIP_GAP;
        pos.left = targetRect.left + targetRect.width / 2;
        pos.transform = 'translateX(-50%)';
        break;
    }

    // Clamp to viewport so tooltip never goes off-screen
    if (pos.top !== undefined) {
      pos.top = Math.max(16, Math.min(pos.top as number, window.innerHeight - 150));
    }
    if (pos.left !== undefined && !pos.right) {
      pos.left = Math.max(16, Math.min(pos.left as number, window.innerWidth - 340));
    }

    return pos;
  }, [placement, targetRect]);

  return (
    <FocusScope.Root trapped loop>
      <div
        ref={tooltipRef}
        style={style}
        className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
        role="dialog"
        aria-label={`Product walkthrough step ${stepIndex + 1} of ${totalSteps}`}
        aria-describedby={`walkthrough-desc-${stepIndex}`}
      >
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
        <p
          id={`walkthrough-desc-${stepIndex}`}
          className="text-sm text-gray-600 mb-4"
        >
          {description}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {stepIndex + 1} of {totalSteps}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              Skip
            </button>
            <button
              data-walkthrough-next
              onClick={onNext}
              className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </FocusScope.Root>
  );
}
