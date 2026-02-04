/**
 * Enhancing Indicator
 *
 * Animated indicator showing that content is being AI-enhanced in the background.
 * Uses CSS animations for smooth, performant effects.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EnhancingIndicatorProps {
  /** Display variant */
  variant?: 'inline' | 'banner';
  /** Custom text to display */
  text?: string;
  /** Additional class names */
  className?: string;
}

/**
 * Inline variant: Small indicator for collapsed cards
 * Banner variant: Larger indicator for expanded views
 */
export function EnhancingIndicator({
  variant = 'inline',
  text,
  className
}: EnhancingIndicatorProps) {
  const defaultText = variant === 'banner'
    ? 'Generating story narrative...'
    : 'Enhancing...';

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-lg',
          'bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50',
          'border border-purple-100',
          className
        )}
      >
        {/* Shimmer overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"
          style={{ backgroundSize: '200% 100%' }}
        />

        {/* Content */}
        <div className="relative flex items-center gap-3 py-3 px-4">
          {/* Animated sparkle icon */}
          <div className="relative">
            <Sparkles className="w-5 h-5 text-purple-500 animate-sparkle-float" />
            {/* Glow effect */}
            <div className="absolute inset-0 w-5 h-5 bg-purple-400/30 rounded-full blur-md animate-pulse" />
          </div>

          {/* Text with gradient */}
          <span
            className="text-sm font-medium bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-text-shimmer"
            style={{ backgroundSize: '200% auto' }}
          >
            {text || defaultText}
          </span>

          {/* Animated dots */}
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-purple-400"
                style={{
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </span>
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div className={cn('flex items-center gap-1.5 text-xs', className)}>
      {/* Sparkle with float animation */}
      <Sparkles className="w-3 h-3 text-purple-500 animate-sparkle-float" />

      {/* Gradient text */}
      <span
        className="font-medium bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent animate-text-shimmer"
        style={{ backgroundSize: '200% auto' }}
      >
        {text || defaultText}
      </span>

      {/* Bouncing dots */}
      <span className="flex gap-0.5 ml-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-0.5 h-0.5 rounded-full bg-purple-400"
            style={{
              animation: `pulse 1.4s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </span>
    </div>
  );
}
