import { useState } from 'react';
import { evidencePrototypes } from '../../components/evidence-prototypes';
import { cn } from '../../lib/utils';

export function EvidencePrototypesPage() {
  const [activeId, setActiveId] = useState(evidencePrototypes[0].id);
  const current = evidencePrototypes.find((p) => p.id === activeId)!;

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-[1600px]">
          <h1 className="text-lg font-bold tracking-tight text-gray-900">
            Evidence Panel Prototypes
          </h1>
          <p className="text-xs text-gray-500">
            10 design concepts for the Evidence &amp; Participants panel on story detail pages
          </p>
        </div>
      </div>

      {/* Switcher */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-2.5 sm:px-6 overflow-x-auto">
        <div className="mx-auto flex max-w-[1600px] gap-2">
          {evidencePrototypes.map((proto) => {
            const isActive = activeId === proto.id;
            return (
              <button
                key={proto.id}
                onClick={() => setActiveId(proto.id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                )}
              >
                {proto.id.toUpperCase()} — {proto.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active prototype label */}
      <div className="flex-shrink-0 bg-gray-50 px-4 py-1.5 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary-50 text-[10px] font-bold text-primary-600">
            {current.id.toUpperCase()}
          </span>
          <span className="text-xs font-medium text-gray-700">{current.name}</span>
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          key={current.id}
          src={`/prototypes/evidence/${current.file}`}
          title={current.name}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
