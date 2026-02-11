import { useState } from 'react';
import { LayoutSwitcher, type LayoutId } from '../../components/dashboard-v2/LayoutSwitcher';
import { ExecutiveCommandCenter } from '../../components/dashboard-v2/layouts/ExecutiveCommandCenter';
import { AnalyticsDashboard } from '../../components/dashboard-v2/layouts/AnalyticsDashboard';
import { BentoBox } from '../../components/dashboard-v2/layouts/BentoBox';
import { KanbanFlow } from '../../components/dashboard-v2/layouts/KanbanFlow';
import { CompactTiles } from '../../components/dashboard-v2/layouts/CompactTiles';
import { FocusMode } from '../../components/dashboard-v2/layouts/FocusMode';
import { TimelineRiver } from '../../components/dashboard-v2/layouts/TimelineRiver';
import { DashboardTabs } from '../../components/dashboard-v2/layouts/DashboardTabs';
import { MasonryPinterest } from '../../components/dashboard-v2/layouts/MasonryPinterest';
import { SplitDecision } from '../../components/dashboard-v2/layouts/SplitDecision';

const LAYOUT_MAP: Record<LayoutId, React.FC> = {
  executive: ExecutiveCommandCenter,
  analytics: AnalyticsDashboard,
  bento: BentoBox,
  kanban: KanbanFlow,
  compact: CompactTiles,
  focus: FocusMode,
  timeline: TimelineRiver,
  tabs: DashboardTabs,
  masonry: MasonryPinterest,
  split: SplitDecision,
};

export function DashboardPrototypePage() {
  const [currentLayout, setCurrentLayout] = useState<LayoutId>('bento');
  const LayoutComponent = LAYOUT_MAP[currentLayout];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Dashboard Prototype
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Explore 10 different dashboard layouts — click a design to switch
          </p>
        </div>

        {/* Layout Switcher */}
        <div className="mb-8">
          <LayoutSwitcher
            currentLayout={currentLayout}
            onLayoutChange={setCurrentLayout}
          />
        </div>

        {/* Active Layout */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <LayoutComponent />
        </div>
      </div>
    </div>
  );
}
