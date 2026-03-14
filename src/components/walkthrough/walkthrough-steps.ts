export interface WalkthroughStep {
  targetSelector: string;
  mobileTargetSelector?: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  route: '/timeline' | '/stories';
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    targetSelector: '[data-walkthrough="activity-stream"]',
    title: 'Your Activity Stream',
    description: 'Your work activity flows in automatically.',
    placement: 'right',
    route: '/timeline',
  },
  {
    targetSelector: '[data-walkthrough="draft-sidebar"]',
    mobileTargetSelector: '[data-walkthrough="draft-peek-bar"]',
    title: 'Draft Stories',
    description: 'We spotted a story in your recent work.',
    placement: 'left',
    route: '/timeline',
  },
  {
    targetSelector: '[data-walkthrough="narrative-preview"]',
    mobileTargetSelector: '[data-walkthrough="mobile-story-sheet"]',
    title: 'Evidence-Based Stories',
    description:
      'Your story is built from real evidence — each section is backed by your work.',
    placement: 'left',
    route: '/stories',
  },
  {
    targetSelector: '[data-walkthrough="use-as-dropdown"]',
    title: 'Use Your Story Anywhere',
    description:
      'Use your story anywhere — Interview Answer, LinkedIn Post, or Sprint Review.',
    placement: 'bottom',
    route: '/stories',
  },
];

export const WALKTHROUGH_STORAGE_KEYS = {
  active: 'walkthrough-active',
  step: 'walkthrough-step',
  storyId: 'walkthrough-story-id',
} as const;

export const WALKTHROUGH_TOTAL_STEPS = WALKTHROUGH_STEPS.length;
