import { useState } from 'react';
import { timelineHeaderPrototypes } from '../../components/timeline-header-prototypes';
import { cn } from '../../lib/utils';

type DesignId = string;

export function TimelineHeaderPrototypesPage() {
  const [activeDesign, setActiveDesign] = useState<DesignId>(timelineHeaderPrototypes[0].id);
  const currentDesign = timelineHeaderPrototypes.find((d) => d.id === activeDesign)!;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Timeline Header Prototypes
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            10 header redesign approaches for the Timeline page — click to switch
          </p>
        </div>

        {/* Design Switcher */}
        <div className="mb-8 flex flex-wrap gap-2">
          {timelineHeaderPrototypes.map((design) => {
            const isActive = activeDesign === design.id;
            return (
              <button
                key={design.id}
                onClick={() => setActiveDesign(design.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary-500 text-white shadow-sm shadow-primary-200'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-200 hover:text-primary-600'
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-white/20 text-xs font-bold">
                  {design.id.toUpperCase().replace('V', '')}
                </span>
                {design.name}
              </button>
            );
          })}
        </div>

        {/* Active Design */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-50 text-xs font-bold text-primary-600">
                {currentDesign.id.toUpperCase().replace('V', '')}
              </span>
              <span className="text-sm font-semibold text-gray-800">
                {currentDesign.name}
              </span>
            </div>
          </div>
          <div>
            <currentDesign.Component />
          </div>
        </div>
      </div>
    </div>
  );
}
