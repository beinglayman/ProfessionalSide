import React from 'react';
import { CheckCircle, Circle, AlertTriangle } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface StatusBadgeProps {
  status: 'configured' | 'missing' | 'blank';
  className?: string;
}

const STATUS_CONFIG = {
  configured: {
    icon: CheckCircle,
    label: 'Connected',
    classes: 'bg-green-50 text-green-700 border-green-200',
    iconClass: 'text-green-600',
  },
  missing: {
    icon: Circle,
    label: 'Not configured',
    classes: 'bg-gray-50 text-gray-500 border-gray-200',
    iconClass: 'text-gray-400',
  },
  blank: {
    icon: AlertTriangle,
    label: 'Incomplete',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    iconClass: 'text-amber-500',
  },
} as const;

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.classes,
        className
      )}
      aria-label={`Status: ${config.label}`}
    >
      <Icon className={cn('h-3 w-3', config.iconClass)} />
      {config.label}
    </span>
  );
};
