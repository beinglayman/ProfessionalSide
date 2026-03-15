export interface WalkthroughStep {
  targetSelector: string;
  mobileTargetSelector?: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'bottom-right';
  route: '/timeline' | '/stories';
  /** Step pauses the tour after CTA click — overlay stays, tooltip hides */
  pauseAfter?: boolean;
  /** Spotlight area allows click-through (pointer events pass to underlying elements) */
  interactiveSpotlight?: boolean;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    targetSelector: '[data-walkthrough="activity-stream"]',
    title: 'Your Activity Stream',
    description: 'Your work activity flows in automatically.',
    placement: 'bottom-right',
    route: '/timeline',
  },
  {
    targetSelector: '[data-walkthrough="draft-sidebar"]',
    mobileTargetSelector: '[data-walkthrough="draft-peek-bar"]',
    title: 'A Story Is Ready for You',
    description:
      "Click a draft to expand it, then hit 'Create Story' to build your first career story.",
    placement: 'left',
    route: '/timeline',
    pauseAfter: true,
    interactiveSpotlight: true,
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
  paused: 'walkthrough-paused',
  resumePending: 'walkthrough-resume-pending',
} as const;

export const WALKTHROUGH_TOTAL_STEPS = WALKTHROUGH_STEPS.length;
