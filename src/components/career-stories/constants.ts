/**
 * Career Stories UI Constants
 *
 * Centralized constants to avoid magic numbers and improve maintainability.
 */

/** Breakpoints in pixels */
export const BREAKPOINTS = {
  /** Mobile breakpoint (px) */
  MOBILE: 768,
  /** Tablet/Desktop breakpoint (px) - matches Tailwind lg: */
  DESKTOP: 1024,
} as const;

/** UI timing constants (milliseconds) */
export const TIMING = {
  /** Duration to show "copied" feedback */
  COPY_FEEDBACK_MS: 2000,
  /** Debounce delay for resize events */
  RESIZE_DEBOUNCE_MS: 100,
} as const;

/** Maximum items to show before truncating */
export const DISPLAY_LIMITS = {
  /** Max tool icons to show in cluster card */
  TOOL_ICONS_CLUSTER: 4,
  /** Max tool icons to show in STAR preview header */
  TOOL_ICONS_PREVIEW: 3,
  /** Number of skeleton cards to show during loading */
  SKELETON_CARDS: 3,
} as const;

/** Confidence thresholds for color coding */
export const CONFIDENCE_THRESHOLDS = {
  /** Minimum confidence for green (high) */
  HIGH: 0.8,
  /** Minimum confidence for yellow (medium) */
  MEDIUM: 0.5,
} as const;

/** Mobile sheet height as viewport percentage */
export const MOBILE_SHEET_MAX_HEIGHT_VH = 85;

/** Narrative framework metadata for UI display */
export const NARRATIVE_FRAMEWORKS = {
  STAR: {
    label: 'STAR',
    description: 'Situation, Task, Action, Result',
    sections: ['situation', 'task', 'action', 'result'],
    group: 'popular',
  },
  STARL: {
    label: 'STARL',
    description: 'STAR + Learning',
    sections: ['situation', 'task', 'action', 'result', 'learning'],
    group: 'popular',
  },
  CAR: {
    label: 'CAR',
    description: 'Challenge, Action, Result (Concise)',
    sections: ['challenge', 'action', 'result'],
    group: 'concise',
  },
  PAR: {
    label: 'PAR',
    description: 'Problem, Action, Result',
    sections: ['problem', 'action', 'result'],
    group: 'concise',
  },
  SAR: {
    label: 'SAR',
    description: 'Situation, Action, Result (Simplified)',
    sections: ['situation', 'action', 'result'],
    group: 'concise',
  },
  SOAR: {
    label: 'SOAR',
    description: 'Situation, Obstacles, Actions, Results',
    sections: ['situation', 'obstacles', 'actions', 'results'],
    group: 'detailed',
  },
  SHARE: {
    label: 'SHARE',
    description: 'Situation, Hindrances, Actions, Results, Evaluation',
    sections: ['situation', 'hindrances', 'actions', 'results', 'evaluation'],
    group: 'detailed',
  },
  CARL: {
    label: 'CARL',
    description: 'Context, Action, Result, Learning',
    sections: ['context', 'action', 'result', 'learning'],
    group: 'detailed',
  },
} as const;

export type FrameworkGroup = 'popular' | 'concise' | 'detailed';

export const FRAMEWORK_GROUPS: Record<FrameworkGroup, { label: string; frameworks: (keyof typeof NARRATIVE_FRAMEWORKS)[] }> = {
  popular: { label: 'Popular', frameworks: ['STAR', 'STARL'] },
  concise: { label: 'Concise', frameworks: ['CAR', 'PAR', 'SAR'] },
  detailed: { label: 'Detailed', frameworks: ['SOAR', 'SHARE', 'CARL'] },
};

// =============================================================================
// ARCHETYPE METADATA
// =============================================================================

/** Archetype metadata for UI display */
export type ArchetypeGroup = 'proactive' | 'reactive' | 'people';

export const ARCHETYPE_METADATA: Record<string, { description: string; group: ArchetypeGroup }> = {
  architect: { description: 'Designs lasting solutions', group: 'proactive' },
  pioneer: { description: 'Explores new territory', group: 'proactive' },
  preventer: { description: 'Stops problems early', group: 'proactive' },
  firefighter: { description: 'Crisis response', group: 'reactive' },
  detective: { description: 'Root cause analysis', group: 'reactive' },
  turnaround: { description: 'Reverses decline', group: 'reactive' },
  diplomat: { description: 'Cross-team alignment', group: 'people' },
  multiplier: { description: 'Force multiplier', group: 'people' },
};

export const ARCHETYPE_GROUPS: Record<ArchetypeGroup, { label: string; description: string; archetypes: string[] }> = {
  proactive: { label: 'Proactive', description: 'Building & preventing', archetypes: ['architect', 'pioneer', 'preventer'] },
  reactive: { label: 'Reactive', description: 'Responding & fixing', archetypes: ['firefighter', 'detective', 'turnaround'] },
  people: { label: 'People', description: 'Enabling & aligning', archetypes: ['diplomat', 'multiplier'] },
};

// =============================================================================
// WRITING STYLES
// =============================================================================

import type { WritingStyle, DerivationType } from '../../types/career-stories';

export const WRITING_STYLES: { value: WritingStyle; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Formal, achievement-focused' },
  { value: 'casual', label: 'Casual', description: 'Conversational, natural' },
  { value: 'technical', label: 'Technical', description: 'Engineering-focused, detailed' },
  { value: 'storytelling', label: 'Storytelling', description: 'Narrative-driven, engaging' },
];

/** Max length for user prompt to prevent excessively long LLM inputs */
export const USER_PROMPT_MAX_LENGTH = 500;

// =============================================================================
// DERIVATION TYPE METADATA
// =============================================================================

export const DERIVATION_TYPE_META: Record<DerivationType, {
  label: string;
  description: string;
  maxLength?: string;
}> = {
  interview: { label: 'Interview Answer', description: 'Spoken, ~90 seconds', maxLength: '~200 words' },
  linkedin: { label: 'LinkedIn Post', description: 'Ready to post', maxLength: '1300 chars' },
  resume: { label: 'Resume Bullet', description: 'Concise, metric-driven', maxLength: '1-2 lines' },
  'one-on-one': { label: '1:1 Talking Points', description: '3-5 bullets for your manager', maxLength: '3-5 bullets' },
  'self-assessment': { label: 'Self Assessment', description: 'For perf reviews', maxLength: '1 paragraph' },
  'team-share': { label: 'Team Share', description: 'Slack-ready, team voice', maxLength: '2-3 sentences' },
};

// =============================================================================
// CAREER QUOTES
// =============================================================================

// =============================================================================
// BRAG DOCUMENT CATEGORIES
// =============================================================================

import type { BragDocCategory } from '../../types/career-stories';

export const BRAG_DOC_CATEGORIES: { value: BragDocCategory; label: string; description: string }[] = [
  { value: 'projects-impact', label: 'Projects & Impact', description: 'Shipped features, solved problems, built systems' },
  { value: 'leadership', label: 'Leadership & Collaboration', description: 'Mentoring, cross-team alignment, hiring' },
  { value: 'growth', label: 'Growth & Learning', description: 'New skills, domain expertise, certifications' },
  { value: 'external', label: 'External', description: 'Talks, blog posts, open source, community' },
];

export interface CareerQuote {
  text: string;
  attribution: string;
  theme: string;
}

export const CAREER_QUOTES: CareerQuote[] = [
  // Publishing Your Work
  { text: 'Make stuff you love and talk about stuff you love and you\'ll attract people who love that kind of stuff. It\'s that simple.', attribution: 'Austin Kleon, Show Your Work!', theme: 'Publishing Your Work' },
  { text: 'Once a day, after you\'ve done your day\'s work, go back to your documentation and find one little piece of your process that you can share.', attribution: 'Austin Kleon, Show Your Work!', theme: 'Publishing Your Work' },
  { text: 'The only way to find your voice is to use it. It\'s hardwired, built into you. Talk about the things you love. Your voice will follow.', attribution: 'Austin Kleon, Show Your Work!', theme: 'Publishing Your Work' },
  { text: 'Ideas in secret die. They need light and air or they starve to death.', attribution: 'Seth Godin', theme: 'Publishing Your Work' },
  { text: 'Are you a serial idea-starting person? The goal is to be an idea-shipping person.', attribution: 'Seth Godin', theme: 'Publishing Your Work' },
  { text: 'One of the best ways to build your reputation is by creating content that allows your ideas to travel beyond your immediate circle.', attribution: 'Dorie Clark, Stand Out', theme: 'Publishing Your Work' },
  { text: 'In a crowded marketplace, fitting in is failing. In a busy marketplace, not standing out is the same as being invisible.', attribution: 'Seth Godin', theme: 'Publishing Your Work' },

  // Thinking About Work
  { text: 'Spend 10% of your week thinking about the work, not just doing the work.', attribution: 'Unattributed', theme: 'Thinking About Work' },
  { text: 'Most people work in their career. Very few work on their career. That\'s the gap.', attribution: 'Unattributed', theme: 'Thinking About Work' },
  { text: 'I want to spend time on what\'s important, instead of what\'s immediate.', attribution: 'Cal Newport, So Good They Can\'t Ignore You', theme: 'Thinking About Work' },
  { text: 'Playing the long game — eschewing short-term gratification in order to work toward an uncertain but worthy future goal — isn\'t easy. But it\'s the surest path to meaningful and lasting success.', attribution: 'Dorie Clark, The Long Game', theme: 'Thinking About Work' },
  { text: 'In today\'s competitive economy, it\'s not enough to simply do your job well. Developing a reputation as an expert in your field attracts people who want to hire you, do business with you, and spread your ideas.', attribution: 'Dorie Clark, Stand Out', theme: 'Thinking About Work' },
  { text: 'Guard your time. Forget the money.', attribution: 'Naval Ravikant', theme: 'Thinking About Work' },

  // Narrating Your Story
  { text: 'Everybody loves a good story, but good storytelling doesn\'t come easy to everybody. It\'s a skill that takes a lifetime to master. So study the great stories and then go find some of your own.', attribution: 'Austin Kleon, Show Your Work!', theme: 'Narrating Your Story' },
  { text: 'Human beings want to know where things came from, how they were made, and who made them.', attribution: 'Austin Kleon, Show Your Work!', theme: 'Narrating Your Story' },
  { text: 'If you don\'t tell your story, someone else will — and they\'ll get it wrong.', attribution: 'Unattributed', theme: 'Narrating Your Story' },
  { text: 'Marketing is the generous act of helping others become who they seek to become. It involves creating honest stories — stories that resonate and spread.', attribution: 'Seth Godin, This Is Marketing', theme: 'Narrating Your Story' },
  { text: 'Your tactics can make a difference, but your strategy — your commitment to a way of being and a story to be told and a promise to be made — can change everything.', attribution: 'Seth Godin, This Is Marketing', theme: 'Narrating Your Story' },
  { text: 'If you don\'t design your own life plan, chances are you\'ll fall into someone else\'s plan. And guess what they have planned for you? Not much.', attribution: 'Jim Rohn', theme: 'Narrating Your Story' },
  { text: 'A career without a narrative is just a list of jobs. A career with a narrative is a trajectory.', attribution: 'Unattributed', theme: 'Narrating Your Story' },

  // Building Perception
  { text: 'The brand is a story. But it\'s a story about you, not about the brand.', attribution: 'Seth Godin', theme: 'Building Perception' },
  { text: 'You can\'t build a reputation on what you\'re going to do.', attribution: 'Confucius', theme: 'Building Perception' },
  { text: 'You can\'t be seen until you learn to see.', attribution: 'Seth Godin, This Is Marketing', theme: 'Building Perception' },
  { text: 'Expectations are the engines of our perceptions.', attribution: 'Seth Godin', theme: 'Building Perception' },
  { text: 'The people who have the ability to fail in public under their own name actually gain a lot of power.', attribution: 'Naval Ravikant', theme: 'Building Perception' },
  { text: 'Embrace accountability and take business risks under your own name. Society will reward you with responsibility, equity, and leverage.', attribution: 'Naval Ravikant', theme: 'Building Perception' },
  { text: 'Persistent, consistent, and frequent stories, delivered to an aligned audience, will earn attention, trust, and action.', attribution: 'Seth Godin, This Is Marketing', theme: 'Building Perception' },
  { text: 'Those who work hard and constantly seek to be visible to their superiors, those who showcase their hard work, are the ones who advance to positions of greater power and responsibility.', attribution: 'Abhishek Ratna, No Parking. No Halt. Success Non Stop!', theme: 'Building Perception' },

  // Career Capital
  { text: 'If your goal is to love what you do, you must first build up \'career capital\' by mastering rare and valuable skills, and then cash in this capital for the traits that define great work.', attribution: 'Cal Newport, So Good They Can\'t Ignore You', theme: 'Career Capital' },
  { text: 'Don\'t follow your passion; rather, let it follow you in your quest to become, in the words of my favorite Steve Martin quote, \'so good that they can\'t ignore you.\'', attribution: 'Cal Newport, So Good They Can\'t Ignore You', theme: 'Career Capital' },
  { text: 'If you want to love what you do, abandon the passion mindset (\'what can the world offer me?\') and instead adopt the craftsman mindset (\'what can I offer the world?\').', attribution: 'Cal Newport, So Good They Can\'t Ignore You', theme: 'Career Capital' },
  { text: 'All returns in life, whether in wealth, relationships, or knowledge, come from compound interest.', attribution: 'Naval Ravikant', theme: 'Career Capital' },
  { text: 'Become the best in the world at what you do. Keep redefining what you do until this is true.', attribution: 'Naval Ravikant', theme: 'Career Capital' },
  { text: 'We live in an age of infinite leverage, and the economic rewards for genuine intellectual curiosity have never been higher.', attribution: 'Naval Ravikant', theme: 'Career Capital' },
  { text: 'What I\'ve come to love about patience is that, ultimately, it\'s the truest test of merit: Are you willing to do the work, despite no guaranteed outcome?', attribution: 'Dorie Clark, The Long Game', theme: 'Career Capital' },

  // Evidence
  { text: 'If you don\'t remember everything important you did, your manager — no matter how great they are — probably doesn\'t either.', attribution: 'Julia Evans, Get your work recognized: write a brag document', theme: 'Evidence' },
  { text: 'Instead of trying to remember everything you did with your brain, maintain a \'brag document\' that lists everything so you can refer to it when you get to performance review season.', attribution: 'Julia Evans, Get your work recognized: write a brag document', theme: 'Evidence' },
  { text: 'It\'s really easy to lose track of what skills you\'re learning, and usually when I reflect on this I realize I learned a lot more than I thought.', attribution: 'Julia Evans, Get your work recognized: write a brag document', theme: 'Evidence' },
  { text: 'Don\'t do invisible work.', attribution: 'Chris Albon', theme: 'Evidence' },
  { text: 'The discipline of writing something down is the first step toward making it happen.', attribution: 'Lee Iacocca', theme: 'Evidence' },
  { text: 'An accomplishment without evidence is just a claim. An accomplishment with evidence is a case.', attribution: 'Unattributed', theme: 'Evidence' },

  // Building Skills
  { text: 'Specific knowledge is found by pursuing your innate talents, your genuine curiosity, and your passion. It\'s not by going to school for whatever is the hottest job.', attribution: 'Naval Ravikant', theme: 'Building Skills' },
  { text: 'Following your genuine intellectual curiosity is a better foundation for a career than following whatever is making money right now.', attribution: 'Naval Ravikant', theme: 'Building Skills' },
  { text: 'Learn to sell. Learn to build. If you can do both, you will be unstoppable.', attribution: 'Naval Ravikant', theme: 'Building Skills' },
  { text: 'If you just show up and work hard, you\'ll soon hit a performance plateau beyond which you fail to get any better.', attribution: 'Cal Newport, So Good They Can\'t Ignore You', theme: 'Building Skills' },
  { text: 'The most important skill for getting rich is becoming a perpetual learner. You have to know how to learn anything you want to learn.', attribution: 'Naval Ravikant', theme: 'Building Skills' },

  // Proving Progression
  { text: 'Compelling careers often have complex origins that reject the simple idea that all you have to do is follow your passion.', attribution: 'Cal Newport, So Good They Can\'t Ignore You', theme: 'Proving Progression' },
  { text: 'The people who get what they\'re after are very often the ones who just stick around long enough.', attribution: 'Austin Kleon, Show Your Work!', theme: 'Proving Progression' },
  { text: 'Careers are a jungle gym, not a ladder.', attribution: 'Sheryl Sandberg, Lean In', theme: 'Proving Progression' },
  { text: '20% of one\'s time is not going to bankrupt anybody… if it actually turns out that that 20% is allocated to something that is interesting, it could be a thing.', attribution: 'Dorie Clark, The Long Game', theme: 'Proving Progression' },
];

// =============================================================================
// WIZARD LOADING FACTS
// =============================================================================

export const WIZARD_LOADING_FACTS = {
  analyze: [
    'Stories with specific metrics score 40% higher in interviews',
    'The best career stories show impact, not just effort',
    'Great stories follow a narrative arc: challenge \u2192 action \u2192 result',
    'Interviewers remember stories 22x more than facts alone',
    'Your story archetype shapes how others perceive your contribution',
  ],
  generate: [
    'Crafting your opening hook...',
    'Structuring the narrative arc...',
    'Connecting evidence to impact...',
    'Scoring story strength...',
    'Weaving in your unique perspective...',
  ],
};
