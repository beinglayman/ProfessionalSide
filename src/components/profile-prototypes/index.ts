import { ProfileV1 } from './V1';
import { ProfileV2 } from './V2';
import { ProfileV3 } from './V3';
import { ProfileV4 } from './V4';
import { ProfileV5 } from './V5';
import { ProfileV6 } from './V6';
import { ProfileV7 } from './V7';
import { ProfileV8 } from './V8';
import { ProfileV9 } from './V9';
import { ProfileV10 } from './V10';

export const profilePrototypes = [
  { id: 'v1', name: 'LinkedIn Classic', Component: ProfileV1 },
  { id: 'v2', name: 'Portfolio Showcase', Component: ProfileV2 },
  { id: 'v3', name: 'Resume / CV', Component: ProfileV3 },
  { id: 'v4', name: 'Dashboard Profile', Component: ProfileV4 },
  { id: 'v5', name: 'Bento Mosaic', Component: ProfileV5 },
  { id: 'v6', name: 'Split Bio + Tabs', Component: ProfileV6 },
  { id: 'v7', name: 'Magazine Feature', Component: ProfileV7 },
  { id: 'v8', name: 'Minimal Clean', Component: ProfileV8 },
  { id: 'v9', name: 'Social Feed', Component: ProfileV9 },
  { id: 'v10', name: 'Career Timeline', Component: ProfileV10 },
];
