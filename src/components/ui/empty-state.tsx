import * as React from 'react';
import { AlertCircle, Building2, FileText, Users, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export type EmptyStateVariant = 'no-results' | 'no-workspaces' | 'no-entries' | 'no-members' | 'custom';

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
  'custom': AlertCircle,
};

/**
 * EmptyState - A consistent empty state component for lists and collections
 *
 * Provides visual feedback when a list is empty, with optional CTA.
 * Supports predefined variants for common scenarios.
 *
 * @example
 * // No search results
 * <EmptyState
 *   variant="no-results"
 *   title="No workspaces found"
 *   description="No workspaces match your filters"
 *   action={{ label: "Clear filters", onClick: clearFilters }}
 * />
 *
 * @example
 * // First-time user
 * <EmptyState
 *   variant="no-workspaces"
 *   title="Create your first workspace"
 *   description="Workspaces help you organize your journal entries."
 *   action={{ label: "Create Workspace", onClick: openCreate, icon: Plus }}
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
