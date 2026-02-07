import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SourceGapWarningProps {
  sectionKey: string;
  vagueMetrics: Array<{ match: string; suggestion: string }>;
  onAddNote?: (sectionKey: string) => void;
}

export function SourceGapWarning({ sectionKey, vagueMetrics }: SourceGapWarningProps) {
  return (
    <div className="px-3 py-2">
      <div className="flex items-start gap-2 bg-amber-50/80 border border-amber-200/60 rounded-lg px-3 py-2 text-[11px] text-amber-700">
        <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-medium">No sources yet</span>
          {vagueMetrics.map((vm, idx) => (
            <p key={idx} className="text-[10px] text-amber-600 mt-0.5">
              &ldquo;{vm.match}&rdquo; &mdash; {vm.suggestion}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
