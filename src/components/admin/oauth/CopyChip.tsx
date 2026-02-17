import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface CopyChipProps {
  value: string;
  className?: string;
}

export const CopyChip: React.FC<CopyChipProps> = ({ value, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 font-mono text-xs text-gray-600',
        'hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer',
        className
      )}
      aria-label={copied ? 'Copied!' : `Copy ${value}`}
    >
      <span className="truncate max-w-[280px]">{value}</span>
      {copied ? (
        <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
      ) : (
        <Copy className="h-3 w-3 text-gray-400 flex-shrink-0" />
      )}
    </button>
  );
};
