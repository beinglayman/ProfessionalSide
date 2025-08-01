import React from 'react';
import { ProfileCompleteness } from '../../components/dashboard/profile-completeness';
import { JournalStreak } from '../../components/dashboard/journal-streak';
import { SkillsGrowth } from '../../components/dashboard/skills-growth';
import { GoalsScorecard } from '../../components/dashboard/goals-scorecard';
import { ActivityTimeline } from '../../components/dashboard/activity-timeline';
import { 
  useProfileCompleteness, 
  useJournalStreak, 
  useSkillsGrowth, 
  useGoalsScorecard, 
  useRecentActivity 
} from '../../hooks/useDashboard';
import { useAuth } from '../../contexts/AuthContext';
import { User, BookOpen, Award, Target, GraduationCap, FileText } from 'lucide-react';

// Sample data for profile completeness
const profileData = {
  overallProgress: 63,
  categories: [
    { name: 'Personal Info', icon: User, progress: 90, total: 5, completed: 4 },
    { name: 'Skills', icon: BookOpen, progress: 60, total: 10, completed: 6 },
    { name: 'Experience', icon: Award, progress: 80, total: 5, completed: 4 },
    { name: 'Education', icon: GraduationCap, progress: 70, total: 3, completed: 2 },
    { name: 'Goals', icon: Target, progress: 45, total: 4, completed: 2 },
  ],
  recommendations: [
    'Add your recent certification',
    'Complete your About Me section',
    'Add 2 more skills',
  ],
  timeToComplete: '~5 minutes to 90%',
  impactStats: 'Profiles with 90%+ completion get 40% more views',
};

// Sample data for journal streak
const streakData = {
  currentStreak: 14,
  personalBest: 21,
  todayCompleted: true,
  weekProgress: [
    { date: new Date('2024-03-17'), completed: true, isToday: false },
    { date: new Date('2024-03-18'), completed: true, isToday: false },
    { date: new Date('2024-03-19'), completed: true, isToday: false },
    { date: new Date('2024-03-20'), completed: true, isToday: true },
    { date: new Date('2024-03-21'), completed: false, isToday: false },
  ],
  historicalData: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
    completed: Math.random() > 0.2,
  })),
  milestones: [ { days: 5, name: 'High Five', reached: true }, { days: 10, name: 'Double Digits', reached: true }, { days: 14, name: 'Two-Week Streak', reached: true }, { days: 21, name: 'Habit Formed', reached: false }, { days: 30, name: 'Monthly Milestone', reached: false }, ],
  entryTypes: [
    { type: 'Professional Development', percentage: 40 },
    { type: 'Project Updates', percentage: 35 },
    { type: 'Achievements', percentage: 15 },
    { type: 'Feedback Received', percentage: 10 },
  ],
};

// Sample data for skills growth
const skillsData = {
  periods: [
    {
      label: 'Current',
      skills: [
        { name: 'HTML/CSS', value: 92, category: 'Technical' },
        { name: 'JavaScript', value: 85, category: 'Technical' },
        { name: 'UI Frameworks', value: 80, category: 'Technical' },
        { name: 'Visual Design', value: 75, category: 'Technical' },
        { name: 'User Testing', value: 65, category: 'Technical' },
        { name: 'Responsive Design', value: 88, category: 'Technical' },
        { name: 'Animation', value: 70, category: 'Technical' },
        { name: 'Communication', value: 82, category: 'Soft' },
      ],
    },
    {
      label: '3 Months Ago',
      skills: [
        { name: 'HTML/CSS', value: 90, category: 'Technical' },
        { name: 'JavaScript', value: 78, category: 'Technical' },
        { name: 'UI Frameworks', value: 72, category: 'Technical' },
        { name: 'Visual Design', value: 70, category: 'Technical' },
        { name: 'User Testing', value: 60, category: 'Technical' },
        { name: 'Responsive Design', value: 85, category: 'Technical' },
        { name: 'Animation', value: 62, category: 'Technical' },
        { name: 'Communication', value: 80, category: 'Soft' },
      ],
    },
    {
      label: '1 Year Ago',
      skills: [
        { name: 'HTML/CSS', value: 85, category: 'Technical' },
        { name: 'JavaScript', value: 65, category: 'Technical' },
        { name: 'UI Frameworks', value: 55, category: 'Technical' },
        { name: 'Visual Design', value: 62, category: 'Technical' },
        { name: 'User Testing', value: 45, category: 'Technical' },
        { name: 'Responsive Design', value: 70, category: 'Technical' },
        { name: 'Animation', value: 48, category: 'Technical' },
        { name: 'Communication', value: 75, category: 'Soft' },
      ],
    },
  ],
  benchmarks: {
    'HTML/CSS': 80,
    'JavaScript': 75,
    'UI Frameworks': 70,
    'Visual Design': 75,
    'User Testing': 65,
    'Responsive Design': 80,
    'Animation': 60,
    'Communication': 75,
  },
};

// Sample data for goals scorecard
const goalsScorecardData = {
  summary: {
    achieved: 5,
    notAchieved: 2,
    onTrack: 7,
    delayed: 3,
    upcoming: 8,
  },
  timeline: [
    {
      title: 'Redesign Component Library',
      status: 'achieved',
      position: '8%',
      date: '2025-03-10',
    },
    {
      title: 'Design System Documentation',
      status: 'achieved',
      position: '17%',
      date: '2025-03-15',
    },
    {
      title: 'Accessibility Audit',
      status: 'on-track',
      position: '30%',
      date: '2025-03-20',
    },
    {
      title: 'Animation Framework',
      status: 'delayed',
      position: '45%',
      date: '2025-03-23',
    },
    {
      title: 'Prototype User Testing',
      status: 'upcoming',
      position: '60%',
      date: '2025-03-28',
    },
    {
      title: 'Design System Updates',
      status: 'upcoming',
      position: '75%',
      date: '2025-04-05',
    },
    {
      title: 'UI Performance Optimization',
      status: 'upcoming',
      position: '88%',
      date: '2025-04-12',
    },
  ],
  goals: [
    {
      id: 1,
      title: 'Redesign Component Library',
      status: 'achieved',
      metric: 'Completed 3 days ago',
      progress: 100,
    },
    {
      id: 2,
      title: 'Accessibility Audit',
      status: 'on-track',
      metric: 'Due in 5 days',
      progress: 75,
    },
    {
      id: 3,
      title: 'Animation Framework',
      status: 'delayed',
      metric: '2 days behind',
      progress: 40,
    },
    {
      id: 4,
      title: 'Prototype User Testing',
      status: 'upcoming',
      metric: 'Due in 12 days',
      progress: 25,
    },
    {
      id: 5,
      title: 'Cross-browser Testing',
      status: 'not-achieved',
      metric: 'Missed deadline',
      progress: 70,
    },
  ],
};

// Sample data for activity timeline
const timelineData = [
  // Journal Entries (Mar 2025)
  {
    id: 1,
    type: 'journal',
    icon: <FileText size={20} />,
    title: 'Weekly reflection on product design challenges',
    date: '2025-03-18T09:00:00',
    monthYear: '2025-03',
    content: 'Documented key insights from our latest user testing session and identified three critical usability improvements for our dashboard redesign.',
    status: 'validated',
    kpis: {
      views: 45,
      reactions: 12,
      comments: 8,
      attestations: 3,
      endorsements: 5
    }
  },
  {
    id: 2,
    type: 'journal',
    icon: <FileText size={20} />,
    title: 'Client project retrospective',
    date: '2025-03-10T14:30:00',
    monthYear: '2025-03',
    content: 'Completed post-project analysis for the Westfield account. Documented success metrics, client feedback, and three specific areas for process improvement.',
    status: 'pending_validation',
    kpis: {
      views: 32,
      reactions: 8,
      comments: 5,
      attestations: 0,
      endorsements: 3
    }
  },
  
  // Achievements (Feb 2025)
  {
    id: 3,
    type: 'achievement',
    icon: <Award size={20} />,
    title: 'Completed Advanced UX Research certification',
    date: '2025-02-26T11:45:00',
    monthYear: '2025-02',
    details: {
      issuer: 'Nielsen Norman Group',
      skills: ['User Research', 'Heuristic Evaluation', 'A/B Testing'],
      credential: 'Credential ID: NNGUX-2025-03421'
    },
    status: 'attested',
    kpis: {
      views: 89,
      reactions: 24,
      comments: 12,
      attestations: 5,
      endorsements: 15
    }
  },
  {
    id: 4,
    type: 'achievement',
    icon: <Award size={20} />,
    title: 'Led team to successful product launch',
    date: '2025-02-15T10:00:00',
    monthYear: '2025-02',
    details: {
      metrics: 'Completed on time and 12% under budget',
      impact: 'Acquired 2,500 new users in first week',
      recognition: 'Recognized in company all-hands meeting'
    },
    status: 'needs_attestation',
    kpis: {
      views: 156,
      reactions: 45,
      comments: 23,
      attestations: 0,
      endorsements: 28
    }
  },
  
  // Goals (Jan 2025)
  {
    id: 5,
    type: 'goal',
    icon: <Target size={20} />,
    title: 'Set quarterly goal to improve team knowledge sharing',
    date: '2025-01-22T15:15:00',
    monthYear: '2025-01',
    details: {
      deadline: 'March 31, 2025',
      metrics: 'Increase documentation by 35%, reduce onboarding time by 25%',
      milestones: [
        { title: 'Establish knowledge base structure', completed: true },
        { title: 'Document top 10 processes', completed: false },
        { title: 'Implement feedback system', completed: false }
      ]
    },
    status: 'on_track',
    kpis: {
      views: 67,
      reactions: 18,
      comments: 9,
      attestations: 4,
      endorsements: 12,
      progress: 65
    }
  },
  {
    id: 6,
    type: 'goal',
    icon: <Target size={20} />,
    title: 'Personal development goal: Improve presentation skills',
    date: '2025-01-05T09:30:00',
    monthYear: '2025-01',
    details: {
      deadline: 'June 30, 2025',
      milestones: [
        { title: 'Complete public speaking workshop', completed: true },
        { title: 'Present at 3 team meetings', completed: true },
        { title: 'Request and implement feedback', completed: false },
        { title: 'Present at industry conference', completed: false }
      ]
    },
    status: 'delayed',
    kpis: {
      views: 45,
      reactions: 12,
      comments: 7,
      attestations: 2,
      endorsements: 8,
      progress: 50
    }
  },
  
  // Dec 2024 Entries
  {
    id: 7,
    type: 'journal',
    icon: <FileText size={20} />,
    title: 'Year-end professional reflection',
    date: '2024-12-28T16:45:00',
    monthYear: '2024-12',
    content: 'Documented key accomplishments for 2024, skills acquired, and drafted professional development plan for 2025 with focus areas in leadership and technical expertise.',
    status: 'validated',
    kpis: {
      views: 92,
      reactions: 34,
      comments: 15,
      attestations: 6,
      endorsements: 20
    }
  },
  {
    id: 8,
    type: 'achievement',
    icon: <Award size={20} />,
    title: 'Exceeded annual client satisfaction goal',
    date: '2024-12-18T13:20:00',
    monthYear: '2024-12',
    details: {
      metrics: 'Achieved 96% client satisfaction rate (goal: 90%)',
      impact: 'Secured contract renewals worth $1.2M',
      recognition: 'Selected for annual achievement award'
    },
    status: 'completed',
    kpis: {
      views: 187,
      reactions: 56,
      comments: 28,
      attestations: 8,
      endorsements: 42
    }
  }
];

export function DashboardPage() {
  const { user } = useAuth();
  
  // API queries
  const { data: profileData, isLoading: profileLoading } = useProfileCompleteness();
  const { data: streakData, isLoading: streakLoading } = useJournalStreak();
  const { data: skillsData, isLoading: skillsLoading } = useSkillsGrowth();
  const { data: goalsScorecardData, isLoading: goalsLoading } = useGoalsScorecard();
  const { data: timelineData, isLoading: timelineLoading } = useRecentActivity();

  const isLoading = profileLoading || streakLoading || skillsLoading || goalsLoading || timelineLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Welcome back, {user?.name || 'there'}!
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Track your progress and maintain your professional growth
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {profileData && <ProfileCompleteness {...profileData} />}
          {streakData && <JournalStreak {...streakData} />}
          {skillsData && <SkillsGrowth {...skillsData} />}
          {goalsScorecardData && <GoalsScorecard {...goalsScorecardData} />}
        </div>

        <div className="mt-6">
          {timelineData && <ActivityTimeline entries={timelineData} />}
        </div>
      </div>
    </div>
  );
}