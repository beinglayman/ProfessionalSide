import { MeetingsV1 } from './V1';
import { MeetingsV2 } from './V2';
import { MeetingsV3 } from './V3';
import { MeetingsV4 } from './V4';
import { MeetingsV5 } from './V5';
import { MeetingsV6 } from './V6';
import { MeetingsV7 } from './V7';
import { MeetingsV8 } from './V8';
import { MeetingsV9 } from './V9';
import { MeetingsV10 } from './V10';

export const meetingsVariations = [
  { id: 'v1', name: 'Hero Donut', Component: MeetingsV1 },
  { id: 'v2', name: 'Treemap', Component: MeetingsV2 },
  { id: 'v3', name: 'Stacked Bar', Component: MeetingsV3 },
  { id: 'v4', name: 'Vertical Bars', Component: MeetingsV4 },
  { id: 'v5', name: 'Radial Bars', Component: MeetingsV5 },
  { id: 'v6', name: 'Bubble Chart', Component: MeetingsV6 },
  { id: 'v7', name: 'Waffle Chart', Component: MeetingsV7 },
  { id: 'v8', name: 'Pie Chart', Component: MeetingsV8 },
  { id: 'v9', name: 'Category Cards', Component: MeetingsV9 },
  { id: 'v10', name: 'Ring Segments', Component: MeetingsV10 },
];
