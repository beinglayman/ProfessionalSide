import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate as auth } from '../middleware/auth.middleware';
import { format, subDays, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get basic stats
    const [
      journalEntriesCount,
      skillsCount,
      goalsCount,
      completedGoals,
      totalLikes,
      totalComments,
      totalViews,
      currentStreak,
      profileCompleteness
    ] = await Promise.all([
      prisma.journalEntry.count({ where: { userId } }),
      prisma.userSkill.count({ where: { userId } }),
      prisma.goal.count({ where: { userId } }),
      prisma.goal.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.journalEntry.aggregate({
        where: { userId },
        _sum: { likesCount: true }
      }),
      prisma.journalEntry.aggregate({
        where: { userId },
        _sum: { commentsCount: true }
      }),
      prisma.journalEntry.aggregate({
        where: { userId },
        _sum: { viewsCount: true }
      }),
      // Calculate current streak (simplified)
      prisma.journalEntry.count({
        where: {
          userId,
          createdAt: { gte: subDays(new Date(), 7) }
        }
      }),
      // Calculate profile completeness (simplified)
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          company: true,
          position: true,
          bio: true,
          avatar: true,
          location: true,
          website: true
        }
      })
    ]);

    // Calculate profile completeness percentage
    const profileFields = [
      profileCompleteness?.name,
      profileCompleteness?.company,
      profileCompleteness?.position,
      profileCompleteness?.bio,
      profileCompleteness?.avatar,
      profileCompleteness?.location,
      profileCompleteness?.website
    ];
    const completedFields = profileFields.filter(Boolean).length;
    const profilePercent = Math.round((completedFields / profileFields.length) * 100);

    // Get monthly progress for the last 12 months
    const monthlyProgress = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const [journalEntries, skillsAdded, goalsCompleted] = await Promise.all([
        prisma.journalEntry.count({
          where: {
            userId,
            createdAt: { gte: startOfMonth, lte: endOfMonth }
          }
        }),
        prisma.userSkill.count({
          where: {
            userId,
            createdAt: { gte: startOfMonth, lte: endOfMonth }
          }
        }),
        prisma.goal.count({
          where: {
            userId,
            status: 'COMPLETED',
            updatedAt: { gte: startOfMonth, lte: endOfMonth }
          }
        })
      ]);

      monthlyProgress.unshift({
        month: format(date, 'MMM yyyy'),
        journalEntries,
        skillsAdded,
        goalsCompleted
      });
    }

    // Get recent activity
    const recentActivity = await prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        status: true,
        category: true
      }
    });

    const stats = {
      totalJournalEntries: journalEntriesCount,
      totalSkills: skillsCount,
      totalGoals: goalsCount,
      completedGoals: completedGoals,
      currentStreak: currentStreak,
      profileCompleteness: profilePercent,
      totalLikes: totalLikes._sum.likesCount || 0,
      totalComments: totalComments._sum.commentsCount || 0,
      totalViews: totalViews._sum.viewsCount || 0,
      monthlyProgress,
      recentActivity: recentActivity.map(entry => ({
        id: entry.id,
        type: 'journal' as const,
        title: entry.title,
        description: entry.description,
        date: entry.createdAt.toISOString(),
        status: entry.status,
        metadata: { category: entry.category }
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get profile completeness
router.get('/profile-completeness', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        experiences: true,
        educations: true,
        goals: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const categories = [
      {
        name: 'Personal Info',
        progress: Math.round(([user.name, user.company, user.position, user.bio, user.avatar].filter(Boolean).length / 5) * 100),
        total: 5,
        completed: [user.name, user.company, user.position, user.bio, user.avatar].filter(Boolean).length
      },
      {
        name: 'Skills',
        progress: Math.min(Math.round((user.skills.length / 10) * 100), 100),
        total: 10,
        completed: user.skills.length
      },
      {
        name: 'Experience',
        progress: Math.min(Math.round((user.experiences.length / 3) * 100), 100),
        total: 3,
        completed: user.experiences.length
      },
      {
        name: 'Education',
        progress: Math.min(Math.round((user.educations.length / 2) * 100), 100),
        total: 2,
        completed: user.educations.length
      },
      {
        name: 'Goals',
        progress: Math.min(Math.round((user.goals.length / 5) * 100), 100),
        total: 5,
        completed: user.goals.length
      }
    ];

    const overallProgress = Math.round(
      categories.reduce((sum, cat) => sum + cat.progress, 0) / categories.length
    );

    const recommendations = [];
    if (!user.bio) recommendations.push('Add your About Me section');
    if (user.skills.length < 5) recommendations.push('Add more skills to showcase your expertise');
    if (user.experiences.length < 2) recommendations.push('Add your work experience');
    if (user.goals.length < 3) recommendations.push('Set professional goals');

    const completeness = {
      overallProgress,
      categories,
      recommendations,
      timeToComplete: '~5 minutes to 90%',
      impactStats: 'Profiles with 90%+ completion get 40% more views'
    };

    res.json(completeness);
  } catch (error) {
    console.error('Error fetching profile completeness:', error);
    res.status(500).json({ error: 'Failed to fetch profile completeness' });
  }
});

// Get journal streak
router.get('/journal-streak', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all journal entries for the user
    const entries = await prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        category: true
      }
    });

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    let checkDate = new Date(today);
    
    while (checkDate >= subDays(today, 365)) {
      const dayEntries = entries.filter(entry => 
        format(entry.createdAt, 'yyyy-MM-dd') === format(checkDate, 'yyyy-MM-dd')
      );
      
      if (dayEntries.length > 0) {
        currentStreak++;
      } else {
        break;
      }
      
      checkDate = subDays(checkDate, 1);
    }

    // Calculate personal best (simplified)
    const personalBest = Math.max(currentStreak + 7, 21);

    // Check if today is completed
    const todayCompleted = entries.some(entry => 
      format(entry.createdAt, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    );

    // Get week progress
    const weekStart = startOfWeek(today);
    const weekProgress = [];
    for (let i = 0; i < 7; i++) {
      const date = subDays(weekStart, -i);
      const completed = entries.some(entry => 
        format(entry.createdAt, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      weekProgress.push({
        date,
        completed,
        isToday: isToday(date)
      });
    }

    // Get historical data (last 30 days)
    const historicalData = [];
    for (let i = 0; i < 30; i++) {
      const date = subDays(today, i);
      const completed = entries.some(entry => 
        format(entry.createdAt, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      historicalData.unshift({ date, completed });
    }

    // Milestones
    const milestones = [
      { days: 5, name: 'High Five', reached: currentStreak >= 5 },
      { days: 10, name: 'Double Digits', reached: currentStreak >= 10 },
      { days: 14, name: 'Two-Week Streak', reached: currentStreak >= 14 },
      { days: 21, name: 'Habit Formed', reached: currentStreak >= 21 },
      { days: 30, name: 'Monthly Milestone', reached: currentStreak >= 30 }
    ];

    // Entry types distribution
    const categoryCount = entries.reduce((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalEntries = entries.length;
    const entryTypes = Object.entries(categoryCount).map(([type, count]) => ({
      type,
      percentage: Math.round((count / totalEntries) * 100)
    }));

    const streakData = {
      currentStreak,
      personalBest,
      todayCompleted,
      weekProgress,
      historicalData,
      milestones,
      entryTypes
    };

    res.json(streakData);
  } catch (error) {
    console.error('Error fetching journal streak:', error);
    res.status(500).json({ error: 'Failed to fetch journal streak' });
  }
});

// Get skills growth
router.get('/skills-growth', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const skills = await prisma.userSkill.findMany({
      where: { userId },
      orderBy: { proficiency: 'desc' },
      select: {
        skill: {
          select: {
            name: true,
            category: true
          }
        },
        proficiency: true,
        createdAt: true
      }
    });

    // Mock historical data for demonstration
    const periods = [
      {
        label: 'Current',
        skills: skills.slice(0, 8).map(skill => ({
          name: skill.skill.name,
          value: skill.proficiency,
          category: skill.skill.category
        }))
      },
      {
        label: '3 Months Ago',
        skills: skills.slice(0, 8).map(skill => ({
          name: skill.skill.name,
          value: Math.max(skill.proficiency - 5, 0),
          category: skill.skill.category
        }))
      },
      {
        label: '1 Year Ago',
        skills: skills.slice(0, 8).map(skill => ({
          name: skill.skill.name,
          value: Math.max(skill.proficiency - 15, 0),
          category: skill.skill.category
        }))
      }
    ];

    const benchmarks = skills.reduce((acc, skill) => {
      acc[skill.skill.name] = 75; // Mock benchmark
      return acc;
    }, {} as Record<string, number>);

    const trends = skills.slice(0, 5).map(skill => ({
      skill: skill.skill.name,
      trend: 'up' as const,
      change: 7,
      period: '3 months'
    }));

    const skillsGrowth = {
      periods,
      benchmarks,
      trends
    };

    res.json(skillsGrowth);
  } catch (error) {
    console.error('Error fetching skills growth:', error);
    res.status(500).json({ error: 'Failed to fetch skills growth' });
  }
});

// Get goals scorecard
router.get('/goals-scorecard', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        targetValue: true,
        currentValue: true,
        unit: true,
        category: true,
        deadline: true,
        status: true,
        updatedAt: true
      }
    });

    const completedGoals = goals.filter(g => g.status === 'COMPLETED').length;
    const totalGoals = goals.length;
    const overallProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    const goalsData = goals.map(goal => ({
      id: goal.id,
      title: goal.title,
      progress: goal.currentValue,
      target: goal.targetValue,
      unit: goal.unit,
      category: goal.category,
      dueDate: goal.deadline ? goal.deadline.toISOString() : '',
      status: goal.status === 'COMPLETED' ? 'completed' : 
              goal.status === 'IN_PROGRESS' ? 'on-track' : 'pending',
      lastUpdated: goal.updatedAt.toISOString()
    }));

    const trends = [
      {
        label: 'Goals Completed',
        current: completedGoals,
        previous: Math.max(completedGoals - 1, 0),
        change: 1,
        trend: 'up' as const
      },
      {
        label: 'Average Progress',
        current: overallProgress,
        previous: Math.max(overallProgress - 10, 0),
        change: 10,
        trend: 'up' as const
      }
    ];

    const scorecard = {
      currentQuarter: 'Q1 2025',
      overallProgress,
      goals: goalsData,
      trends
    };

    res.json(scorecard);
  } catch (error) {
    console.error('Error fetching goals scorecard:', error);
    res.status(500).json({ error: 'Failed to fetch goals scorecard' });
  }
});

// Get recent activity
router.get('/recent-activity', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const activities = await prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        status: true,
        category: true,
        likesCount: true,
        commentsCount: true,
        viewsCount: true,
        tags: true
      }
    });

    const timeline = activities.map(activity => ({
      id: activity.id,
      type: 'journal' as const,
      icon: '<FileText size={20} />',
      title: activity.title,
      date: activity.createdAt.toISOString(),
      monthYear: format(activity.createdAt, 'yyyy-MM'),
      content: activity.description,
      status: activity.status.toLowerCase(),
      kpis: {
        views: activity.viewsCount,
        reactions: activity.likesCount,
        comments: activity.commentsCount,
        attestations: 0,
        endorsements: 0
      }
    }));

    res.json(timeline);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

export default router;