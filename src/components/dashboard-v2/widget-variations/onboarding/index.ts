import { OnboardingV1 } from './V1';
import { OnboardingV2 } from './V2';
import { OnboardingV3 } from './V3';
import { OnboardingV4 } from './V4';
import { OnboardingV5 } from './V5';
import { OnboardingV6 } from './V6';
import { OnboardingV7 } from './V7';
import { OnboardingV8 } from './V8';
import { OnboardingV9 } from './V9';
import { OnboardingV10 } from './V10';

export const onboardingVariations = [
  { id: 'v1', name: 'Horizontal Stepper', Component: OnboardingV1 },
  { id: 'v2', name: 'Vertical Timeline', Component: OnboardingV2 },
  { id: 'v3', name: 'Circular Progress Ring', Component: OnboardingV3 },
  { id: 'v4', name: 'Checklist Card', Component: OnboardingV4 },
  { id: 'v5', name: 'Slim Progress Bar', Component: OnboardingV5 },
  { id: 'v6', name: 'Numbered Tile Grid', Component: OnboardingV6 },
  { id: 'v7', name: 'Accordion Steps', Component: OnboardingV7 },
  { id: 'v8', name: 'Roadmap Path', Component: OnboardingV8 },
  { id: 'v9', name: 'Split Panel', Component: OnboardingV9 },
  { id: 'v10', name: 'Contextual Nudge', Component: OnboardingV10 },
];
