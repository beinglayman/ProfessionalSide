import { KPIV1 } from './V1';
import { KPIV2 } from './V2';
import { KPIV3 } from './V3';
import { KPIV4 } from './V4';
import { KPIV5 } from './V5';
import { KPIV6 } from './V6';
import { KPIV7 } from './V7';
import { KPIV8 } from './V8';
import { KPIV9 } from './V9';
import { KPIV10 } from './V10';

export const kpiVariations = [
  { id: 'v1', name: 'Grouped Progress Bars', Component: KPIV1 },
  { id: 'v2', name: 'Radar Overview', Component: KPIV2 },
  { id: 'v3', name: 'KPI Card Grid', Component: KPIV3 },
  { id: 'v4', name: 'Gauge Dashboard', Component: KPIV4 },
  { id: 'v5', name: 'Compact Table', Component: KPIV5 },
  { id: 'v6', name: 'Status Swimlanes', Component: KPIV6 },
  { id: 'v7', name: 'Donut Summary', Component: KPIV7 },
  { id: 'v8', name: 'Horizontal Category Bars', Component: KPIV8 },
  { id: 'v9', name: 'Heat Grid', Component: KPIV9 },
  { id: 'v10', name: 'Metric Tiles Row', Component: KPIV10 },
];
