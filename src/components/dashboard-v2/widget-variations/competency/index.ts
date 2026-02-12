import { CompetencyV1 } from './V1';
import { CompetencyV2 } from './V2';
import { CompetencyV3 } from './V3';
import { CompetencyV4 } from './V4';
import { CompetencyV5 } from './V5';
import { CompetencyV6 } from './V6';
import { CompetencyV7 } from './V7';
import { CompetencyV8 } from './V8';
import { CompetencyV9 } from './V9';
import { CompetencyV10 } from './V10';

export const competencyVariations = [
  { id: 'v1', name: 'GitHub Heatmap', Component: CompetencyV1 },
  { id: 'v2', name: 'Radar Chart', Component: CompetencyV2 },
  { id: 'v3', name: 'Sparkline Cards', Component: CompetencyV3 },
  { id: 'v4', name: 'Horizontal Bars', Component: CompetencyV4 },
  { id: 'v5', name: 'Circular Gauges', Component: CompetencyV5 },
  { id: 'v6', name: 'Stacked Area Chart', Component: CompetencyV6 },
  { id: 'v7', name: 'Compact Rows', Component: CompetencyV7 },
  { id: 'v8', name: 'Polar Area', Component: CompetencyV8 },
  { id: 'v9', name: 'Progress Dashboard', Component: CompetencyV9 },
  { id: 'v10', name: 'Bubble Matrix', Component: CompetencyV10 },
];
