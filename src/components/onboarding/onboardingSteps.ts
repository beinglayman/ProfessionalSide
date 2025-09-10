import { OnboardingStep } from '../../types/onboarding-overlay';
import { 
  ChronicleIllustration, 
  NetworkIllustration, 
  WorkspaceIllustration 
} from './illustrations';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // Stage 1: Chronicle Your First Achievement (1/3 done)
  {
    id: 'chronicle-achievement',
    title: 'Chronicle Your First Achievement',
    primaryMessage: 'Document your first professional win - every project, success, and learning is preserved forever in your personal workspace',
    secondaryMessage: 'Share it with your network to start building meaningful professional relationships based on real work',
    progressMessage: 'You\'re ready to validate your professional profile!',
    illustration: ChronicleIllustration,
    targetElements: [
      'Journal creation button',
      'My Workspace selector', 
      'Publish to network option'
    ],
    callToAction: 'Create your first journal entry'
  },
  
  // Stage 2: Discover Your Professional Network (2/3 done)
  {
    id: 'discover-network',
    title: 'Discover Your Professional Network',
    primaryMessage: 'Welcome to your professional ecosystem - your inviter has already added you to their core network',
    secondaryMessage: 'Explore core and extended networks, browse your feed to see real work happening in real-time, not just career updates',
    progressMessage: 'You\'re ready to build a meaningful professional network!',
    illustration: NetworkIllustration,
    targetElements: [
      'Network navigation',
      'Core & Extended networks',
      'Activity feed'
    ],
    callToAction: 'Explore your network and activity feed'
  },
  
  // Stage 3: Take Control of Your Work Management (3/3 done)
  {
    id: 'control-work',
    title: 'Take Control of Your Work Management',
    primaryMessage: 'Your personal workspace is ready with your first entry already organized. Now expand your reach',
    secondaryMessage: 'Create team workspaces, invite collaborators, set goals with milestones and track progress with data-driven insights',
    progressMessage: '🎉 You\'re ready to take control of your work management! Happy InChronicle\'ing!',
    illustration: WorkspaceIllustration,
    targetElements: [
      'Workspaces section',
      'Goal creation',
      'Team invitation',
      'Milestones & tasks'
    ],
    callToAction: 'Explore workspaces and goal management'
  }
];