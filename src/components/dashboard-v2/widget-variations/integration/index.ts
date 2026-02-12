import { IntegrationV1 } from './V1';
import { IntegrationV2 } from './V2';
import { IntegrationV3 } from './V3';
import { IntegrationV4 } from './V4';
import { IntegrationV5 } from './V5';
import { IntegrationV6 } from './V6';
import { IntegrationV7 } from './V7';
import { IntegrationV8 } from './V8';
import { IntegrationV9 } from './V9';
import { IntegrationV10 } from './V10';

export const integrationVariations = [
  { id: 'v1', name: 'List with Sparklines', Component: IntegrationV1 },
  { id: 'v2', name: 'Card Grid', Component: IntegrationV2 },
  { id: 'v3', name: 'Status Columns', Component: IntegrationV3 },
  { id: 'v4', name: 'Compact Table', Component: IntegrationV4 },
  { id: 'v5', name: 'Icon Row', Component: IntegrationV5 },
  { id: 'v6', name: 'Activity Bars', Component: IntegrationV6 },
  { id: 'v7', name: 'Split Connected / Available', Component: IntegrationV7 },
  { id: 'v8', name: 'Tile Mosaic', Component: IntegrationV8 },
  { id: 'v9', name: 'Status Ring', Component: IntegrationV9 },
  { id: 'v10', name: 'Timeline Sync', Component: IntegrationV10 },
];
