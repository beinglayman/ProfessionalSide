import { StoriesV1 } from './V1';
import { StoriesV2 } from './V2';
import { StoriesV3 } from './V3';
import { StoriesV4 } from './V4';
import { StoriesV5 } from './V5';
import { StoriesV6 } from './V6';
import { StoriesV7 } from './V7';
import { StoriesV8 } from './V8';
import { StoriesV9 } from './V9';
import { StoriesV10 } from './V10';

export const storiesPrototypes = [
  { id: 'v1', name: 'Library Shelf', Component: StoriesV1 },
  { id: 'v2', name: 'Portfolio Cards', Component: StoriesV2 },
  { id: 'v3', name: 'Notion Sidebar', Component: StoriesV3 },
  { id: 'v4', name: 'Medium Article', Component: StoriesV4 },
  { id: 'v5', name: 'Slide Deck', Component: StoriesV5 },
  { id: 'v6', name: 'Mind Map', Component: StoriesV6 },
  { id: 'v7', name: 'Bento Grid', Component: StoriesV7 },
  { id: 'v8', name: 'Comparison Split', Component: StoriesV8 },
  { id: 'v9', name: 'Card Stack', Component: StoriesV9 },
  { id: 'v10', name: 'Executive Summary', Component: StoriesV10 },
];
