/**
 * FrameworkPickerModal Component
 *
 * Modal for selecting narrative frameworks based on use cases.
 * Exports USE_CASE_FRAMEWORKS for shared use across components.
 */

import { NarrativeFramework } from '../../types/career-stories';

/**
 * Use-case focused framework recommendations.
 * Each use case suggests frameworks best suited for that context.
 */
export const USE_CASE_FRAMEWORKS: Record<
  string,
  {
    icon: string;
    label: string;
    description: string;
    frameworks: NarrativeFramework[];
  }
> = {
  interview: {
    icon: '💼',
    label: 'Job Interview',
    description: 'Prepare for behavioral questions',
    frameworks: ['STAR', 'STARL', 'CAR'],
  },
  performance: {
    icon: '📈',
    label: 'Performance Review',
    description: 'Document achievements and impact',
    frameworks: ['CAR', 'PAR', 'SOAR'],
  },
  portfolio: {
    icon: '📂',
    label: 'Portfolio / Case Study',
    description: 'Showcase projects in depth',
    frameworks: ['SOAR', 'SHARE', 'CARL'],
  },
  networking: {
    icon: '🤝',
    label: 'Networking / Elevator Pitch',
    description: 'Quick, impactful summaries',
    frameworks: ['CAR', 'SAR', 'PAR'],
  },
};
