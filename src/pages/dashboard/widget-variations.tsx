import { useState } from 'react';
import {
  onboardingVariations,
  competencyVariations,
  integrationVariations,
  meetingsVariations,
  storyHealthVariations,
} from '../../components/dashboard-v2/widget-variations';
import {
  Footprints,
  Grid3X3,
  Plug,
  Clock,
  BookOpen,
} from 'lucide-react';
import { cn } from '../../lib/utils';

type WidgetTab = 'onboarding' | 'competency' | 'integration' | 'meetings' | 'story-health';

const TABS: { id: WidgetTab; label: string; icon: React.FC<{ className?: string }>; variations: { id: string; name: string; Component: React.FC }[] }[] = [
  { id: 'onboarding', label: 'Onboarding', icon: Footprints, variations: onboardingVariations },
  { id: 'competency', label: 'Competency Matrix', icon: Grid3X3, variations: competencyVariations },
  { id: 'integration', label: 'Integration Health', icon: Plug, variations: integrationVariations },
  { id: 'meetings', label: 'Meetings', icon: Clock, variations: meetingsVariations },
  { id: 'story-health', label: 'Story Health', icon: BookOpen, variations: storyHealthVariations },
];

export function WidgetVariationsPage() {
  const [activeTab, setActiveTab] = useState<WidgetTab>('onboarding');
  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Widget Design Variations
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Pick your favorite design for each widget — 10 variations to compare
          </p>
        </div>

        {/* Tab Bar */}
        <div className="mb-8 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary-500 text-white shadow-sm shadow-primary-200'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-200 hover:text-primary-600'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Variations Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {currentTab.variations.map((variation) => (
            <div key={variation.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              {/* Variation Header */}
              <div className="border-b border-gray-100 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-50 text-xs font-bold text-primary-600">
                    {variation.id.toUpperCase().replace('V', '')}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {variation.name}
                  </span>
                </div>
              </div>
              {/* Variation Content */}
              <div className="p-4">
                <variation.Component />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
