import { TimelineV1 } from './V1';
import { TimelineV2 } from './V2';
import { TimelineV3 } from './V3';
import { TimelineV4 } from './V4';
import { TimelineV5 } from './V5';
import { TimelineV6 } from './V6';
import { TimelineV7 } from './V7';
import { TimelineV8 } from './V8';
import { TimelineV9 } from './V9';
import { TimelineV10 } from './V10';

export const timelinePrototypes = [
  { id: 'v1', name: 'Classic Feed', Component: TimelineV1 },
  { id: 'v2', name: 'Kanban Columns', Component: TimelineV2 },
  { id: 'v3', name: 'Calendar Grid', Component: TimelineV3 },
  { id: 'v4', name: 'Split Stream', Component: TimelineV4 },
  { id: 'v5', name: 'Magazine Layout', Component: TimelineV5 },
  { id: 'v6', name: 'Dense Table', Component: TimelineV6 },
  { id: 'v7', name: 'Chat Bubbles', Component: TimelineV7 },
  { id: 'v8', name: 'Swimlane Rows', Component: TimelineV8 },
  { id: 'v9', name: 'Focus Carousel', Component: TimelineV9 },
  { id: 'v10', name: 'Activity Dashboard', Component: TimelineV10 },
];
