import * as React from 'react';
import { AlertCircle, Building2, FileText, Users, GitCommitVertical, BookOpen, Plug, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export type EmptyStateVariant = 'no-results' | 'no-workspaces' | 'no-entries' | 'no-members' | 'no-timeline' | 'no-stories' | 'custom';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  /** Predefined variant for common empty states */
  variant?: EmptyStateVariant;
  /** Custom icon (overrides variant default) */
  icon?: LucideIcon;
  /** Main heading text */
  title: string;
  /** Descriptive text below the heading */
  description?: string;
  /** Primary action button */
  action?: EmptyStateAction;
  /** Secondary action button */
  secondaryAction?: EmptyStateAction;
  /** Optional className for the container */
  className?: string;
}

// Default icons for each variant
const variantIcons: Record<EmptyStateVariant, LucideIcon> = {
  'no-results': AlertCircle,
  'no-workspaces': Building2,
  'no-entries': FileText,
  'no-members': Users,
  'no-timeline': GitCommitVertical,
  'no-stories': BookOpen,
  'custom': AlertCircle,
};

/**
 * EmptyState - A consistent empty state component for lists and collections
 *
 * Provides visual feedback when a list is empty, with optional CTA.
 * Supports predefined variants for common scenarios.
 *
 * @example
 * // Empty timeline
 * <EmptyState
 *   variant="no-timeline"
 *   title="No activity yet"
 *   description="Connect your tools to see your work activity here."
 *   action={{ label: "Connect Tools", onClick: goToSettings, icon: Plug }}
 * />
 *
 * @example
 * // Empty stories
 * <EmptyState
 *   variant="no-stories"
 *   title="No stories yet"
 *   description="Stories are created from your activity. Once you have timeline entries, you can turn them into stories."
 *   action={{ label: "Go to Timeline", onClick: goToTimeline }}
 * />
 */
function EmptyState({
  variant = 'custom',
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const Icon = icon || variantIcons[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center',
        className
      )}
    >
      <Icon className="h-12 w-12 text-gray-400" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-500 max-w-sm">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {action && (
            <Button onClick={action.onClick}>
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4 mr-2" />}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

EmptyState.displayName = 'EmptyState';

export { EmptyState };
