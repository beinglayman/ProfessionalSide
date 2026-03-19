import { useState } from 'react';
import { storiesNavPrototypes } from '../../components/stories-nav-prototypes';
import { cn } from '../../lib/utils';

const CONCEPT_GROUPS = [
  { label: 'Side Panel', ids: ['1a', '1b'] },
  { label: 'Overlay Drawer', ids: ['2a', '2b'] },
  { label: 'Split View', ids: ['3a', '3b'] },
  { label: 'Accordion', ids: ['4a', '4b'] },
  { label: 'Nav Rail', ids: ['5a', '5b'] },
  { label: 'Hover Peek', ids: ['6a', '6b'] },
  { label: 'Tabbed Reader', ids: ['7a', '7b'] },
  { label: 'Sticky Nav', ids: ['8a', '8b'] },
  { label: 'Peek Strip', ids: ['9a', '9b'] },
  { label: 'Lightbox', ids: ['10a', '10b'] },
];

const HOVER_PEEK_GROUPS = [
  { label: 'Editorial', ids: ['hb1'] },
  { label: 'Compact', ids: ['hb2'] },
  { label: 'Island', ids: ['hb3'] },
  { label: 'Gradient', ids: ['hb4'] },
  { label: 'Mono', ids: ['hb5'] },
  { label: 'Dark', ids: ['hb6'] },
  { label: 'Pill', ids: ['hb7'] },
  { label: 'Left', ids: ['hb8'] },
  { label: 'Float', ids: ['hb9'] },
  { label: 'Colors', ids: ['hb10'] },
];

export function StoriesNavPrototypesPage() {
  const [activeId, setActiveId] = useState(storiesNavPrototypes[0].id);
  const current = storiesNavPrototypes.find((p) => p.id === activeId)!;

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-[1600px]">
          <h1 className="text-lg font-bold tracking-tight text-gray-900">
            Stories Navigation Prototypes
          </h1>
          <p className="text-xs text-gray-500">
            10 navigation concepts &times; 2 variants + 10 Hover Peek B visual variations
          </p>
        </div>
      </div>

      {/* Switcher — Navigation Concepts */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-2.5 sm:px-6 overflow-x-auto">
        <div className="mx-auto flex max-w-[1600px] gap-4">
          {CONCEPT_GROUPS.map((group) => (
            <div key={group.label} className="flex items-center gap-1">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </span>
              {group.ids.map((id) => {
                const proto = storiesNavPrototypes.find((p) => p.id === id)!;
                const isActive = activeId === id;
                const variant = id.slice(-1).toUpperCase();
                return (
                  <button
                    key={id}
                    onClick={() => setActiveId(id)}
                    title={proto.name}
                    className={cn(
                      'rounded-md px-2 py-1 text-xs font-medium transition-all',
                      isActive
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                    )}
                  >
                    {variant}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Switcher — Hover Peek B Variations */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-2 sm:px-6 overflow-x-auto">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-500 whitespace-nowrap">
            Hover Peek B
          </span>
          <div className="h-4 w-px bg-gray-200" />
          {HOVER_PEEK_GROUPS.map((group) => {
            const id = group.ids[0];
            const proto = storiesNavPrototypes.find((p) => p.id === id);
            const isActive = activeId === id;
            return (
              <button
                key={id}
                onClick={() => setActiveId(id)}
                title={proto?.name}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                )}
              >
                {group.label}
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
          src={`/prototypes/stories-nav/${current.file}`}
          title={current.name}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
