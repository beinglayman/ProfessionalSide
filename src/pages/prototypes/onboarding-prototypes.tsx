import { useState } from 'react';
import { onboardingPrototypes } from '../../components/onboarding-prototypes';
import type { OnboardingCategory } from '../../components/onboarding-prototypes';
import { cn } from '../../lib/utils';

type DesignId = string;

const CATEGORIES: OnboardingCategory[] = ['Stepper', 'Conversational', 'Single-page', 'Minimal', 'Novel', 'Product Tour'];

export function OnboardingPrototypesPage() {
  const [activeDesign, setActiveDesign] = useState<DesignId>(onboardingPrototypes[0].id);
  const [activeCategory, setActiveCategory] = useState<OnboardingCategory | 'All'>('All');

  const filtered =
    activeCategory === 'All'
      ? onboardingPrototypes
      : onboardingPrototypes.filter((d) => d.category === activeCategory);

  const currentDesign = onboardingPrototypes.find((d) => d.id === activeDesign)!;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Onboarding Flow Prototypes
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            23 different onboarding approaches — click to switch between variants
          </p>
        </div>

        {/* Category Filter Chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('All')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-all',
              activeCategory === 'All'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            All ({onboardingPrototypes.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = onboardingPrototypes.filter((d) => d.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  activeCategory === cat
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Design Switcher */}
        <div className="mb-8 flex flex-wrap gap-2">
          {filtered.map((design) => {
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
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {currentDesign.category}
              </span>
            </div>
          </div>
          <div className="p-4">
            <currentDesign.Component />
          </div>
        </div>
      </div>
    </div>
  );
}
