/**
 * Narrative Framework Registry
 *
 * Defines all available narrative frameworks with:
 * - Component structure
 * - User-friendly descriptions
 * - Example stories for UI
 * - Best-fit recommendations
 *
 * UI can use this to:
 * - Show framework options with examples
 * - Display component labels
 * - Provide tooltips/help text
 */

import { NarrativeFrameworkType, NarrativeFrameworkDefinition } from './types';

/**
 * Extended framework definition with UI content.
 */
export interface NarrativeFrameworkUIDefinition extends NarrativeFrameworkDefinition {
  /** Short tagline for UI cards */
  tagline: string;

  /** Component definitions with labels and prompts */
  componentDefinitions: {
    name: string;
    label: string;
    description: string;
    prompt: string; // Help text for user editing
  }[];

  /** Full example story for UI preview */
  example: {
    context: string; // Brief context about the scenario
    components: { name: string; text: string }[];
  };

  /** When to recommend this framework */
  recommendWhen: {
    roles: string[];
    interviewTypes: string[];
    storyTypes: string[];
  };
}

/**
 * All framework definitions with UI content.
 */
export const NARRATIVE_FRAMEWORKS: Record<NarrativeFrameworkType, NarrativeFrameworkUIDefinition> = {
  STAR: {
    type: 'STAR',
    name: 'STAR',
    tagline: 'The classic behavioral interview format',
    description: 'Situation-Task-Action-Result. The gold standard for behavioral interviews. Clear, structured, and universally understood.',
    componentOrder: ['situation', 'task', 'action', 'result'],
    bestFor: ['Behavioral interviews', 'Most interview scenarios', 'First-time interviewees'],
    notIdealFor: ['Executive presentations', 'Very technical deep-dives'],

    componentDefinitions: [
      {
        name: 'situation',
        label: 'Situation',
        description: 'The context and background',
        prompt: 'What was happening? What was the problem or opportunity?',
      },
      {
        name: 'task',
        label: 'Task',
        description: 'Your specific responsibility',
        prompt: 'What were you asked to do? What was your role?',
      },
      {
        name: 'action',
        label: 'Action',
        description: 'What you did',
        prompt: 'What specific steps did you take? How did you approach it?',
      },
      {
        name: 'result',
        label: 'Result',
        description: 'The outcome and impact',
        prompt: 'What happened? Quantify with numbers if possible.',
      },
    ],

    example: {
      context: 'Software engineer optimizing dashboard performance',
      components: [
        {
          name: 'situation',
          text: 'Our analytics dashboard was taking 5+ seconds to load, causing customer complaints and a 15% drop in daily active users.',
        },
        {
          name: 'task',
          text: 'I was tasked with reducing load time to under 1 second while maintaining all existing functionality.',
        },
        {
          name: 'action',
          text: 'I profiled the queries, identified N+1 issues, added database indexes, and implemented Redis caching for frequently accessed data.',
        },
        {
          name: 'result',
          text: 'Reduced load time from 5s to 200ms (96% improvement). DAU recovered within 2 weeks and customer satisfaction scores improved by 20%.',
        },
      ],
    },

    recommendWhen: {
      roles: ['Software Engineer', 'Product Manager', 'Designer', 'Data Analyst'],
      interviewTypes: ['Behavioral', 'FAANG', 'General'],
      storyTypes: ['Achievement', 'Problem-solving', 'Collaboration'],
    },
  },

  STARL: {
    type: 'STARL',
    name: 'STAR-L',
    tagline: 'STAR plus Learning for growth stories',
    description: 'STAR with an added Learning component. Shows self-awareness and growth mindset. Great for "tell me about a failure" questions.',
    componentOrder: ['situation', 'task', 'action', 'result', 'learning'],
    bestFor: ['Failure/challenge questions', 'Growth-focused interviews', 'Manager roles'],
    notIdealFor: ['Quick introductions', 'Time-constrained responses'],

    componentDefinitions: [
      {
        name: 'situation',
        label: 'Situation',
        description: 'The context and background',
        prompt: 'What was happening? What was the challenge?',
      },
      {
        name: 'task',
        label: 'Task',
        description: 'Your specific responsibility',
        prompt: 'What were you trying to accomplish?',
      },
      {
        name: 'action',
        label: 'Action',
        description: 'What you did',
        prompt: 'What steps did you take?',
      },
      {
        name: 'result',
        label: 'Result',
        description: 'The outcome',
        prompt: 'What happened? Include both successes and setbacks.',
      },
      {
        name: 'learning',
        label: 'Learning',
        description: 'What you learned',
        prompt: 'What did you take away? How did this change your approach?',
      },
    ],

    example: {
      context: 'Tech lead who shipped a feature that caused an outage',
      components: [
        {
          name: 'situation',
          text: 'We were rushing to ship a payments feature before Black Friday. The team was stressed and cutting corners.',
        },
        {
          name: 'task',
          text: 'As tech lead, I needed to deliver on time while ensuring quality.',
        },
        {
          name: 'action',
          text: 'I approved the release without full load testing to meet the deadline.',
        },
        {
          name: 'result',
          text: 'The feature caused a 2-hour outage on Black Friday, costing approximately $50K in lost sales.',
        },
        {
          name: 'learning',
          text: 'I learned that no deadline is worth compromising quality for critical systems. I now always budget time for load testing and have implemented a "no rush releases" policy for payment flows.',
        },
      ],
    },

    recommendWhen: {
      roles: ['Tech Lead', 'Engineering Manager', 'Senior Engineer'],
      interviewTypes: ['Behavioral', 'Leadership', 'Manager'],
      storyTypes: ['Failure', 'Challenge', 'Growth', 'Conflict'],
    },
  },

  CAR: {
    type: 'CAR',
    name: 'CAR',
    tagline: 'Concise and challenge-focused',
    description: 'Challenge-Action-Result. A streamlined format that focuses on problem-solving. Great when time is limited.',
    componentOrder: ['challenge', 'action', 'result'],
    bestFor: ['Concise responses', 'Problem-solving stories', 'Technical interviews'],
    notIdealFor: ['Complex narratives', 'Stories requiring context'],

    componentDefinitions: [
      {
        name: 'challenge',
        label: 'Challenge',
        description: 'The problem you faced',
        prompt: 'What obstacle or challenge did you encounter?',
      },
      {
        name: 'action',
        label: 'Action',
        description: 'How you addressed it',
        prompt: 'What did you do to overcome the challenge?',
      },
      {
        name: 'result',
        label: 'Result',
        description: 'The outcome',
        prompt: 'What was the result of your actions?',
      },
    ],

    example: {
      context: 'Developer fixing a critical production bug',
      components: [
        {
          name: 'challenge',
          text: 'Production database was experiencing deadlocks, causing 500 errors for 10% of users.',
        },
        {
          name: 'action',
          text: 'Analyzed query patterns, identified the locking sequence, and refactored the transaction order.',
        },
        {
          name: 'result',
          text: 'Eliminated deadlocks completely. Error rate dropped to 0.01% within hours.',
        },
      ],
    },

    recommendWhen: {
      roles: ['Software Engineer', 'DevOps', 'SRE'],
      interviewTypes: ['Technical', 'Phone Screen', 'Quick'],
      storyTypes: ['Bug fix', 'Debugging', 'Technical challenge'],
    },
  },

  PAR: {
    type: 'PAR',
    name: 'PAR',
    tagline: 'Problem-focused for technical roles',
    description: 'Problem-Action-Result. Similar to CAR but emphasizes the problem definition. Popular in engineering interviews.',
    componentOrder: ['problem', 'action', 'result'],
    bestFor: ['Engineering interviews', 'Technical problem-solving', 'System design discussions'],
    notIdealFor: ['Leadership stories', 'Collaboration narratives'],

    componentDefinitions: [
      {
        name: 'problem',
        label: 'Problem',
        description: 'The technical problem',
        prompt: 'What was the technical problem? Be specific about constraints.',
      },
      {
        name: 'action',
        label: 'Action',
        description: 'Your technical approach',
        prompt: 'What was your technical solution? Include tools and technologies.',
      },
      {
        name: 'result',
        label: 'Result',
        description: 'The measurable outcome',
        prompt: 'What metrics improved? Performance numbers, cost savings, etc.',
      },
    ],

    example: {
      context: 'Backend engineer scaling a service',
      components: [
        {
          name: 'problem',
          text: 'Our search service couldn\'t handle more than 100 QPS. We needed to support 10x growth for a product launch.',
        },
        {
          name: 'action',
          text: 'Implemented Elasticsearch with sharding, added Redis caching layer, and deployed across multiple availability zones.',
        },
        {
          name: 'result',
          text: 'Achieved 2,000 QPS with P99 latency under 50ms. Handled launch traffic with zero downtime.',
        },
      ],
    },

    recommendWhen: {
      roles: ['Software Engineer', 'Backend Engineer', 'Platform Engineer'],
      interviewTypes: ['Technical', 'System Design', 'Architecture'],
      storyTypes: ['Scaling', 'Performance', 'Infrastructure'],
    },
  },

  SAR: {
    type: 'SAR',
    name: 'SAR',
    tagline: 'Ultra-concise for quick responses',
    description: 'Situation-Action-Result. The most concise format. Perfect for elevator pitches and rapid-fire questions.',
    componentOrder: ['situation', 'action', 'result'],
    bestFor: ['Elevator pitches', 'Quick introductions', 'Time-limited responses'],
    notIdealFor: ['Complex achievements', 'Stories requiring task context'],

    componentDefinitions: [
      {
        name: 'situation',
        label: 'Situation',
        description: 'Brief context',
        prompt: 'Set the scene in one sentence.',
      },
      {
        name: 'action',
        label: 'Action',
        description: 'What you did',
        prompt: 'Describe your key actions concisely.',
      },
      {
        name: 'result',
        label: 'Result',
        description: 'The outcome',
        prompt: 'State the impact in one sentence.',
      },
    ],

    example: {
      context: 'Quick intro at a networking event',
      components: [
        {
          name: 'situation',
          text: 'Our mobile app had a 3-star rating due to crashes.',
        },
        {
          name: 'action',
          text: 'Led the stability initiative, implementing crash reporting and fixing top 10 issues.',
        },
        {
          name: 'result',
          text: 'Achieved 4.8-star rating and reduced crashes by 95%.',
        },
      ],
    },

    recommendWhen: {
      roles: ['Any'],
      interviewTypes: ['Networking', 'Phone Screen', 'Quick'],
      storyTypes: ['Introduction', 'Highlight', 'Quick win'],
    },
  },

  SOAR: {
    type: 'SOAR',
    name: 'SOAR',
    tagline: 'Obstacle-driven for business impact',
    description: 'Situation-Obstacles-Actions-Results. Emphasizes challenges and business alignment. Great for PM and leadership roles.',
    componentOrder: ['situation', 'obstacles', 'actions', 'results'],
    bestFor: ['Product management', 'Business-focused interviews', 'Strategic roles'],
    notIdealFor: ['Pure technical discussions', 'Junior roles'],

    componentDefinitions: [
      {
        name: 'situation',
        label: 'Situation',
        description: 'The business context',
        prompt: 'What was the business situation or market context?',
      },
      {
        name: 'obstacles',
        label: 'Obstacles',
        description: 'The challenges or blockers you faced',
        prompt: 'What obstacles or challenges did you encounter?',
      },
      {
        name: 'actions',
        label: 'Actions',
        description: 'How you overcame them',
        prompt: 'What strategy and actions did you take to overcome these obstacles?',
      },
      {
        name: 'results',
        label: 'Results',
        description: 'Business impact',
        prompt: 'What were the measurable results and business impact?',
      },
    ],

    example: {
      context: 'Product manager launching a new feature',
      components: [
        {
          name: 'situation',
          text: 'User retention was declining 5% month-over-month. Competitors were adding features we lacked.',
        },
        {
          name: 'obstacles',
          text: 'Limited engineering bandwidth, unclear user needs, and a tight quarterly deadline.',
        },
        {
          name: 'actions',
          text: 'Conducted user research, designed a personalized onboarding flow, A/B tested variations, and iterated based on data.',
        },
        {
          name: 'results',
          text: 'Achieved 15% improvement in 30-day retention, exceeding goal. Feature contributed to $2M ARR increase.',
        },
      ],
    },

    recommendWhen: {
      roles: ['Product Manager', 'Program Manager', 'Business Analyst'],
      interviewTypes: ['Product', 'Strategy', 'Business'],
      storyTypes: ['Product launch', 'Business impact', 'Strategy'],
    },
  },

  SHARE: {
    type: 'SHARE',
    name: 'SHARE',
    tagline: 'Collaboration-focused with hindsight',
    description: 'Situation-Hindrances-Actions-Results-Evaluation. Emphasizes reflection and collaboration. Good for leadership roles.',
    componentOrder: ['situation', 'hindrances', 'actions', 'results', 'evaluation'],
    bestFor: ['Leadership interviews', 'Collaboration stories', 'Mentorship examples'],
    notIdealFor: ['Individual contributor stories', 'Quick responses'],

    componentDefinitions: [
      {
        name: 'situation',
        label: 'Situation',
        description: 'The context',
        prompt: 'What was the team/organizational situation?',
      },
      {
        name: 'hindrances',
        label: 'Hindrances',
        description: 'What obstacles or challenges arose',
        prompt: 'What hindrances or obstacles did you encounter?',
      },
      {
        name: 'actions',
        label: 'Actions',
        description: 'What you did',
        prompt: 'What actions did you take to address the situation?',
      },
      {
        name: 'results',
        label: 'Results',
        description: 'The outcome',
        prompt: 'What were the results of your actions?',
      },
      {
        name: 'evaluation',
        label: 'Evaluation',
        description: 'Reflection and lessons learned',
        prompt: 'What did you learn or how would you evaluate the experience?',
      },
    ],

    example: {
      context: 'Engineering manager improving team culture',
      components: [
        {
          name: 'situation',
          text: 'Team had low morale after a failed project. People were reluctant to take risks.',
        },
        {
          name: 'hindrances',
          text: 'Our postmortem culture was blame-focused, making people afraid to fail.',
        },
        {
          name: 'actions',
          text: 'Introduced blameless postmortems, celebrated "good failures," and shared my own mistakes openly.',
        },
        {
          name: 'results',
          text: 'Team experimentation increased 3x. We shipped two innovative features that came from risky bets.',
        },
        {
          name: 'evaluation',
          text: 'Psychological safety is the foundation of innovation. One engineer proposed a caching approach everyone thought was too risky — we tried it and reduced costs by 40%.',
        },
      ],
    },

    recommendWhen: {
      roles: ['Engineering Manager', 'Director', 'VP'],
      interviewTypes: ['Leadership', 'Manager', 'Culture'],
      storyTypes: ['Team building', 'Culture change', 'Mentorship'],
    },
  },

  CARL: {
    type: 'CARL',
    name: 'CARL',
    tagline: 'Accountability-focused for tough questions',
    description: 'Context-Action-Result-Learning. Best for failure and accountability questions. Shows maturity and growth.',
    componentOrder: ['context', 'action', 'result', 'learning'],
    bestFor: ['Failure questions', '"Tell me about a mistake"', 'Accountability stories'],
    notIdealFor: ['Success stories', 'Technical deep-dives'],

    componentDefinitions: [
      {
        name: 'context',
        label: 'Context',
        description: 'The circumstances',
        prompt: 'What was the situation? What pressures or constraints existed?',
      },
      {
        name: 'action',
        label: 'Action',
        description: 'What you did (or didn\'t do)',
        prompt: 'What actions did you take? Be honest about mistakes.',
      },
      {
        name: 'result',
        label: 'Result',
        description: 'What happened',
        prompt: 'What was the outcome? Include negative impacts.',
      },
      {
        name: 'learning',
        label: 'Learning',
        description: 'What you learned',
        prompt: 'What did you learn? How have you changed your approach?',
      },
    ],

    example: {
      context: 'Developer who caused a data incident',
      components: [
        {
          name: 'context',
          text: 'I was migrating user data to a new schema under pressure to complete before a deadline.',
        },
        {
          name: 'action',
          text: 'I ran the migration script without a backup or dry run, confident it would work.',
        },
        {
          name: 'result',
          text: 'The script had a bug that corrupted 5% of user profiles. It took 3 days to recover.',
        },
        {
          name: 'learning',
          text: 'I learned to never run data migrations without backups, dry runs, and peer review - regardless of time pressure. I now advocate for "no shortcuts on data" on my team.',
        },
      ],
    },

    recommendWhen: {
      roles: ['Any'],
      interviewTypes: ['Behavioral', 'Amazon Leadership Principles'],
      storyTypes: ['Failure', 'Mistake', 'Accountability', 'Growth'],
    },
  },
};

/**
 * Get all framework definitions for UI.
 */
export function getAllFrameworks(): NarrativeFrameworkUIDefinition[] {
  return Object.values(NARRATIVE_FRAMEWORKS);
}

/**
 * Get a specific framework definition.
 */
export function getFramework(type: NarrativeFrameworkType): NarrativeFrameworkUIDefinition {
  return NARRATIVE_FRAMEWORKS[type];
}

/**
 * Recommend frameworks based on context.
 */
export function recommendFrameworks(context: {
  role?: string;
  interviewType?: string;
  storyType?: string;
}): NarrativeFrameworkType[] {
  const scores = new Map<NarrativeFrameworkType, number>();

  for (const [type, framework] of Object.entries(NARRATIVE_FRAMEWORKS)) {
    let score = 0;

    if (context.role && framework.recommendWhen.roles.some((r) =>
      r.toLowerCase().includes(context.role!.toLowerCase()) || context.role!.toLowerCase().includes(r.toLowerCase())
    )) {
      score += 3;
    }

    if (context.interviewType && framework.recommendWhen.interviewTypes.some((t) =>
      t.toLowerCase().includes(context.interviewType!.toLowerCase())
    )) {
      score += 2;
    }

    if (context.storyType && framework.recommendWhen.storyTypes.some((s) =>
      s.toLowerCase().includes(context.storyType!.toLowerCase())
    )) {
      score += 2;
    }

    scores.set(type as NarrativeFrameworkType, score);
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0)
    .map(([type]) => type);
}

/**
 * Get framework for a specific interview question type.
 */
export const QUESTION_TO_FRAMEWORK: Record<string, NarrativeFrameworkType> = {
  'Tell me about yourself': 'SAR',
  'Tell me about a time you failed': 'CARL',
  'Tell me about a mistake': 'CARL',
  'Tell me about a challenge': 'CAR',
  'Tell me about a technical problem': 'PAR',
  'Tell me about a time you led': 'SHARE',
  'Tell me about a time you influenced': 'SOAR',
  'Walk me through a project': 'STAR',
  'Tell me about an achievement': 'STAR',
  'What did you learn from': 'STARL',
};
