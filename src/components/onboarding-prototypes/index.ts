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
import { OnboardingV11 } from './V11';
import { OnboardingV12 } from './V12';
import { OnboardingV13 } from './V13';
import { OnboardingV14 } from './V14';
import { OnboardingV15 } from './V15';
import { OnboardingV16 } from './V16';
import { OnboardingV17 } from './V17';
import { OnboardingV18 } from './V18';
import { OnboardingV19 } from './V19';
import { OnboardingV20 } from './V20';

export type OnboardingCategory = 'Stepper' | 'Conversational' | 'Single-page' | 'Minimal' | 'Novel';

export const onboardingPrototypes = [
  { id: 'v1', name: 'Horizontal Stepper', category: 'Stepper' as OnboardingCategory, Component: OnboardingV1 },
  { id: 'v2', name: 'Vertical Rail', category: 'Stepper' as OnboardingCategory, Component: OnboardingV2 },
  { id: 'v3', name: 'Card Stack', category: 'Stepper' as OnboardingCategory, Component: OnboardingV3 },
  { id: 'v4', name: 'Timeline Scroll', category: 'Stepper' as OnboardingCategory, Component: OnboardingV4 },
  { id: 'v5', name: 'Chat Bubbles', category: 'Conversational' as OnboardingCategory, Component: OnboardingV5 },
  { id: 'v6', name: 'Terminal CLI', category: 'Conversational' as OnboardingCategory, Component: OnboardingV6 },
  { id: 'v7', name: 'Interview Q&A', category: 'Conversational' as OnboardingCategory, Component: OnboardingV7 },
  { id: 'v8', name: 'Story-First Reveal', category: 'Conversational' as OnboardingCategory, Component: OnboardingV8 },
  { id: 'v9', name: 'Accordion', category: 'Single-page' as OnboardingCategory, Component: OnboardingV9 },
  { id: 'v10', name: 'Split Screen', category: 'Single-page' as OnboardingCategory, Component: OnboardingV10 },
  { id: 'v11', name: 'Progressive Scroll', category: 'Single-page' as OnboardingCategory, Component: OnboardingV11 },
  { id: 'v12', name: 'Before/After', category: 'Single-page' as OnboardingCategory, Component: OnboardingV12 },
  { id: 'v13', name: 'Mobile One-Question', category: 'Minimal' as OnboardingCategory, Component: OnboardingV13 },
  { id: 'v14', name: 'Search Bar', category: 'Minimal' as OnboardingCategory, Component: OnboardingV14 },
  { id: 'v15', name: 'Typewriter', category: 'Minimal' as OnboardingCategory, Component: OnboardingV15 },
  { id: 'v16', name: 'Email Preview', category: 'Minimal' as OnboardingCategory, Component: OnboardingV16 },
  { id: 'v17', name: 'Evidence Mapping', category: 'Novel' as OnboardingCategory, Component: OnboardingV17 },
  { id: 'v18', name: 'Gamified Quest', category: 'Novel' as OnboardingCategory, Component: OnboardingV18 },
  { id: 'v19', name: 'Calendar Hook', category: 'Novel' as OnboardingCategory, Component: OnboardingV19 },
  { id: 'v20', name: 'Diff View', category: 'Novel' as OnboardingCategory, Component: OnboardingV20 },
];
