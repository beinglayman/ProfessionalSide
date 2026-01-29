/**
 * ToolIcon Component
 *
 * Displays a colored badge for tool types (GitHub, Jira, etc.).
 * Shared component to avoid duplication across cluster and preview components.
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { ToolType, TOOL_ICONS } from '../../types/career-stories';

interface ToolIconProps {
  tool: ToolType;
  className?: string;
}

/**
 * Renders a circular badge with the first letter of the tool name.
 * Color-coded based on the tool type.
 */
export const ToolIcon: React.FC<ToolIconProps> = ({ tool, className }) => {
  const config = TOOL_ICONS[tool];

  // Fallback for unknown tool types
  if (!config) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white bg-gray-400',
          className
        )}
        title="Unknown"
        aria-label="Unknown tool"
      >
        ?
      </span>
    );
  }

  const { name, color } = config;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white',
        className
      )}
      style={{ backgroundColor: color }}
      title={name}
      aria-label={name}
    >
      {name.charAt(0)}
    </span>
  );
};
