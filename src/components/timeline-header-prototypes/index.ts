import { TimelineHeaderV1 } from './V1';
import { TimelineHeaderV2 } from './V2';
import { TimelineHeaderV3 } from './V3';
import { TimelineHeaderV4 } from './V4';
import { TimelineHeaderV5 } from './V5';
import { TimelineHeaderV6 } from './V6';
import { TimelineHeaderV7 } from './V7';
import { TimelineHeaderV8 } from './V8';
import { TimelineHeaderV9 } from './V9';
import { TimelineHeaderV10 } from './V10';

export const timelineHeaderPrototypes = [
  { id: 'v1', name: 'Command Center', Component: TimelineHeaderV1 },
  { id: 'v2', name: 'Minimal Bar', Component: TimelineHeaderV2 },
  { id: 'v3', name: 'Stats Dashboard', Component: TimelineHeaderV3 },
  { id: 'v4', name: 'Tabbed Header', Component: TimelineHeaderV4 },
  { id: 'v5', name: 'Notion-Style', Component: TimelineHeaderV5 },
  { id: 'v6', name: 'Split Panel', Component: TimelineHeaderV6 },
  { id: 'v7', name: 'Toolbar + Breadcrumb', Component: TimelineHeaderV7 },
  { id: 'v8', name: 'Hero Greeting', Component: TimelineHeaderV8 },
  { id: 'v9', name: 'Compact Chip Bar', Component: TimelineHeaderV9 },
  { id: 'v10', name: 'Magazine Masthead', Component: TimelineHeaderV10 },
];
