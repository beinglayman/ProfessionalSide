import {
  LayoutGrid,
  BarChart3,
  Grid3X3,
  Columns,
  LayoutList,
  Focus,
  GitBranch,
  PanelTop,
  LayoutDashboard,
  SplitSquareHorizontal,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type LayoutId =
  | 'executive'
  | 'analytics'
  | 'bento'
  | 'kanban'
  | 'compact'
  | 'focus'
  | 'timeline'
  | 'tabs'
  | 'masonry'
  | 'split';

interface LayoutOption {
  id: LayoutId;
  name: string;
  description: string;
  bestFor: string;
  icon: React.ReactNode;
}

const layoutOptions: LayoutOption[] = [
  {
    id: 'executive',
    name: 'Executive Command Center',
    description: 'Large hero metrics, cascading priority',
    bestFor: 'Managers',
    icon: <LayoutGrid className="h-5 w-5" />,
  },
  {
    id: 'analytics',
    name: 'Analytics Dashboard',
    description: 'Dense 3-column, chart-heavy',
    bestFor: 'Data lovers',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: 'bento',
    name: 'Bento Box',
    description: 'Mixed card sizes, modern feel',
    bestFor: 'Visual thinkers',
    icon: <Grid3X3 className="h-5 w-5" />,
  },
  {
    id: 'kanban',
    name: 'Kanban Flow',
    description: '3 lanes: Track / Create / Share',
    bestFor: 'PMs & Agile teams',
    icon: <Columns className="h-5 w-5" />,
  },
  {
    id: 'compact',
    name: 'Compact Tiles',
    description: 'Maximum info density, 4-column',
    bestFor: 'Power users',
    icon: <LayoutList className="h-5 w-5" />,
  },
  {
    id: 'focus',
    name: 'Focus Mode',
    description: 'One widget large, rest in sidebar',
    bestFor: 'Deep work',
    icon: <Focus className="h-5 w-5" />,
  },
  {
    id: 'timeline',
    name: 'Timeline River',
    description: 'Vertical chronological flow',
    bestFor: 'Narrative thinkers',
    icon: <GitBranch className="h-5 w-5" />,
  },
  {
    id: 'tabs',
    name: 'Dashboard Tabs',
    description: 'Categorized into 4 sections',
    bestFor: 'Organized users',
    icon: <PanelTop className="h-5 w-5" />,
  },
  {
    id: 'masonry',
    name: 'Masonry Pinterest',
    description: 'Variable heights, 3-column flow',
    bestFor: 'Visual explorers',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    id: 'split',
    name: 'Split Decision',
    description: 'Metrics left, insights right',
    bestFor: 'Balanced view',
    icon: <SplitSquareHorizontal className="h-5 w-5" />,
  },
];

interface LayoutSwitcherProps {
  currentLayout: LayoutId;
  onLayoutChange: (layoutId: LayoutId) => void;
}

export function LayoutSwitcher({ currentLayout, onLayoutChange }: LayoutSwitcherProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {layoutOptions.map((layout) => {
        const isActive = currentLayout === layout.id;
        return (
          <button
            key={layout.id}
            onClick={() => onLayoutChange(layout.id)}
            className={cn(
              'group relative flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-all',
              isActive
                ? 'border-primary-500 bg-primary-50 shadow-sm shadow-primary-100'
                : 'border-gray-200 bg-white hover:border-primary-200 hover:bg-gray-50'
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-500 group-hover:bg-primary-100 group-hover:text-primary-600'
              )}
            >
              {layout.icon}
            </div>
            <div>
              <p
                className={cn(
                  'text-xs font-semibold leading-tight',
                  isActive ? 'text-primary-700' : 'text-gray-800'
                )}
              >
                {layout.name}
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-gray-400">
                {layout.description}
              </p>
            </div>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[9px] font-medium',
                isActive
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-gray-100 text-gray-400'
              )}
            >
              {layout.bestFor}
            </span>
          </button>
        );
      })}
    </div>
  );
}
