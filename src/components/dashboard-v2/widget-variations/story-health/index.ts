import { StoryHealthV1 } from './V1';
import { StoryHealthV2 } from './V2';
import { StoryHealthV3 } from './V3';
import { StoryHealthV4 } from './V4';
import { StoryHealthV5 } from './V5';
import { StoryHealthV6 } from './V6';
import { StoryHealthV7 } from './V7';
import { StoryHealthV8 } from './V8';
import { StoryHealthV9 } from './V9';
import { StoryHealthV10 } from './V10';

export const storyHealthVariations = [
  { id: 'v1', name: 'Full Dashboard', Component: StoryHealthV1 },
  { id: 'v2', name: 'Donut + Stats', Component: StoryHealthV2 },
  { id: 'v3', name: 'Health Score Hero', Component: StoryHealthV3 },
  { id: 'v4', name: 'Split View', Component: StoryHealthV4 },
  { id: 'v5', name: 'Stat Cards Grid', Component: StoryHealthV5 },
  { id: 'v6', name: 'Progress Bars', Component: StoryHealthV6 },
  { id: 'v7', name: 'Sparkline Trend', Component: StoryHealthV7 },
  { id: 'v8', name: 'Bento Grid', Component: StoryHealthV8 },
  { id: 'v9', name: 'Infographic', Component: StoryHealthV9 },
  { id: 'v10', name: 'Compact Row', Component: StoryHealthV10 },
];
