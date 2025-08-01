import React from 'react';
import { AlertTriangle, Users, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NetworkProgressProps {
  type: 'core' | 'extended';
  current: number;
  max: number;
  warningThreshold: number;
  className?: string;
}

export function NetworkProgress({ type, current, max, warningThreshold, className }: NetworkProgressProps) {
  const percentage = (current / max) * 100;
  const isWarning = current >= warningThreshold;
  const isNearMax = current >= max * 0.95;
  
  const getStatusColor = () => {
    if (isNearMax) return 'bg-red-500';
    if (isWarning) return 'bg-yellow-500';
    return type === 'core' ? 'bg-blue-500' : 'bg-purple-500';
  };
  
  const getBackgroundColor = () => {
    if (isNearMax) return 'bg-red-100';
    if (isWarning) return 'bg-yellow-100';
    return type === 'core' ? 'bg-blue-100' : 'bg-purple-100';
  };
  
  const getTextColor = () => {
    if (isNearMax) return 'text-red-700';
    if (isWarning) return 'text-yellow-700';
    return type === 'core' ? 'text-blue-700' : 'text-purple-700';
  };
  
  const Icon = type === 'core' ? Users : Globe;
  
  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isWarning && (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
            <div className={cn('text-sm font-medium', getTextColor())}>
              {current}/{max}
            </div>
          </div>
        </div>
        <div className={cn('w-full h-3 rounded-full', getBackgroundColor())}>
          <div 
            className={cn('h-3 rounded-full transition-all duration-300', getStatusColor())}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        
        {/* Status message */}
        {isNearMax ? (
          <p className="text-xs text-red-600 font-medium">
            Network nearly full! Consider reviewing connections.
          </p>
        ) : isWarning ? (
          <p className="text-xs text-yellow-600 font-medium">
            Approaching capacity ({warningThreshold} connection warning)
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            {max - current} connections remaining
          </p>
        )}
      </div>
    </div>
  );
}

export default NetworkProgress;