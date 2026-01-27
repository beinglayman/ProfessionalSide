import { prisma } from '../lib/prisma';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Level-to-value conversion for skill proficiency
const levelToValue: Record<string, number> = {
  beginner: 25,
  intermediate: 50,
  advanced: 75,
  expert: 95
};

// Weights for composite skill score calculation
const SCORE_WEIGHTS = {
  baseLevel: 0.35,       // Self-reported proficiency
  endorsements: 0.20,    // Network validation
  journalMentions: 0.20, // Active usage frequency
  projectCount: 0.15,    // Practical application
  yearsOfExp: 0.10       // Time investment
};

export interface SkillTrend {
  skill: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  period: string;
}

export interface SkillPeriod {
  label: string;
  skills: {
    name: string;
    value: number;
    category: string;
  }[];
}

export interface SkillGrowthData {
  periods: SkillPeriod[];
  benchmarks: Record<string, number>;
  trends: SkillTrend[];
}

export class SkillTrackingService {
  constructor() {
    console.log('📊 Skill Tracking Service initialized');
  }

  /**
   * Convert skill level string to numeric value
   */
  levelToNumeric(level: string): number {
    return levelToValue[level.toLowerCase()] || 50;
  }

  /**
   * Calculate composite skill score using multiple factors
   */
  async calculateCompositeScore(
    userId: string,
    skillId: string,
    skillName: string
  ): Promise<number> {
    try {
      // Get user skill data
      const userSkill = await prisma.userSkill.findUnique({
        where: {
          userId_skillId: { userId, skillId }
        }
      });

      if (!userSkill) {
        return 50; // Default mid-level for unknown skills
      }

      // Get journal mentions count (skills mentioned in journal entries)
      const journalMentions = await prisma.journalEntry.count({
        where: {
          authorId: userId,
          tags: { has: skillName }
        }
      });

      // Normalize factors to 0-100 scale
      const baseLevel = this.levelToNumeric(userSkill.level);

      // Endorsements: cap at 50 for 100% (more endorsements = higher score)
      const endorsementsFactor = Math.min((userSkill.endorsements / 50) * 100, 100);

      // Journal mentions: cap at 20 mentions for 100%
      const journalFactor = Math.min((journalMentions / 20) * 100, 100);

      // Projects: cap at 10 projects for 100%
      const projectFactor = Math.min((userSkill.projects / 10) * 100, 100);

      // Years of experience: cap at 10 years for 100%
      const yearsExpFactor = Math.min((userSkill.yearsOfExp / 10) * 100, 100);

      // Calculate weighted composite score
      const compositeScore = Math.round(
        baseLevel * SCORE_WEIGHTS.baseLevel +
        endorsementsFactor * SCORE_WEIGHTS.endorsements +
        journalFactor * SCORE_WEIGHTS.journalMentions +
        projectFactor * SCORE_WEIGHTS.projectCount +
        yearsExpFactor * SCORE_WEIGHTS.yearsOfExp
      );

      return Math.min(Math.max(compositeScore, 0), 100);
    } catch (error) {
      console.error('Error calculating composite score:', error);
      return 50;
    }
  }

  /**
   * Create monthly snapshots for all users' skills
   */
  async createMonthlySnapshots(): Promise<{ created: number; errors: number }> {
    console.log('📸 Creating monthly skill snapshots...');
    let created = 0;
    let errors = 0;

    try {
      const snapshotDate = startOfMonth(new Date());

      // Get all users with skills
      const usersWithSkills = await prisma.userSkill.findMany({
        select: {
          userId: true,
          skillId: true,
          skill: {
            select: {
              name: true,
              category: true
            }
          },
          level: true,
          endorsements: true,
          projects: true,
          yearsOfExp: true
        }
      });

      // Group by user
      const userSkillsMap = new Map<string, typeof usersWithSkills>();
      for (const us of usersWithSkills) {
        const existing = userSkillsMap.get(us.userId) || [];
        existing.push(us);
        userSkillsMap.set(us.userId, existing);
      }

      // Create snapshots for each user
      for (const [userId, skills] of Array.from(userSkillsMap.entries())) {
        for (const userSkill of skills) {
          try {
            // Calculate composite score
            const compositeScore = await this.calculateCompositeScore(
              userId,
              userSkill.skillId,
              userSkill.skill.name
            );

            // Upsert snapshot (update if exists for this month)
            await prisma.skillSnapshot.upsert({
              where: {
                userId_skillId_snapshotDate: {
                  userId,
                  skillId: userSkill.skillId,
                  snapshotDate
                }
              },
              update: {
                level: compositeScore,
                rawLevel: userSkill.level,
                metadata: {
                  endorsements: userSkill.endorsements,
                  projects: userSkill.projects,
                  yearsOfExp: userSkill.yearsOfExp
                }
              },
              create: {
                userId,
                skillId: userSkill.skillId,
                skillName: userSkill.skill.name,
                level: compositeScore,
                rawLevel: userSkill.level,
                snapshotDate,
                source: 'monthly',
                metadata: {
                  endorsements: userSkill.endorsements,
                  projects: userSkill.projects,
                  yearsOfExp: userSkill.yearsOfExp
                }
              }
            });

            created++;
          } catch (err) {
            errors++;
            console.error(`Error creating snapshot for user ${userId}, skill ${userSkill.skill.name}:`, err);
          }
        }
      }

      console.log(`✅ Monthly snapshots complete: ${created} created, ${errors} errors`);
      return { created, errors };
    } catch (error) {
      console.error('❌ Error in monthly snapshot creation:', error);
      throw error;
    }
  }

  /**
   * Get skill history for a user over specified months
   */
  async getSkillHistory(userId: string, months: number = 6): Promise<SkillPeriod[]> {
    try {
      const startDate = startOfMonth(subMonths(new Date(), months - 1));

      const snapshots = await prisma.skillSnapshot.findMany({
        where: {
          userId,
          snapshotDate: { gte: startDate }
        },
        include: {
          skill: {
            select: {
              category: true
            }
          }
        },
        orderBy: { snapshotDate: 'desc' }
      });

      // Group snapshots by month
      const periodMap = new Map<string, SkillPeriod>();

      for (const snapshot of snapshots) {
        const monthLabel = format(snapshot.snapshotDate, 'MMM yyyy');

        if (!periodMap.has(monthLabel)) {
          periodMap.set(monthLabel, {
            label: monthLabel,
            skills: []
          });
        }

        const period = periodMap.get(monthLabel)!;
        period.skills.push({
          name: snapshot.skillName,
          value: snapshot.level,
          category: snapshot.skill.category || 'Technical'
        });
      }

      // Convert to array and sort by date (most recent first)
      return Array.from(periodMap.values());
    } catch (error) {
      console.error('Error getting skill history:', error);
      return [];
    }
  }

  /**
   * Calculate trends by comparing current vs previous periods
   */
  async calculateTrends(userId: string): Promise<SkillTrend[]> {
    try {
      const currentMonth = startOfMonth(new Date());
      const previousMonth = startOfMonth(subMonths(new Date(), 1));

      // Get current and previous month snapshots
      const [currentSnapshots, previousSnapshots] = await Promise.all([
        prisma.skillSnapshot.findMany({
          where: {
            userId,
            snapshotDate: currentMonth
          }
        }),
        prisma.skillSnapshot.findMany({
          where: {
            userId,
            snapshotDate: previousMonth
          }
        })
      ]);

      // Build previous month lookup
      const previousMap = new Map(
        previousSnapshots.map(s => [s.skillName, s.level])
      );

      // Calculate trends
      const trends: SkillTrend[] = currentSnapshots.slice(0, 5).map(current => {
        const previousValue = previousMap.get(current.skillName);

        if (previousValue === undefined) {
          return {
            skill: current.skillName,
            trend: 'stable' as const,
            change: 0,
            period: 'new skill'
          };
        }

        const change = current.level - previousValue;
        const trend = change > 2 ? 'up' : change < -2 ? 'down' : 'stable';

        return {
          skill: current.skillName,
          trend: trend as 'up' | 'down' | 'stable',
          change: Math.abs(change),
          period: 'vs last month'
        };
      });

      return trends;
    } catch (error) {
      console.error('Error calculating trends:', error);
      return [];
    }
  }

  /**
   * Record skill usage from a journal entry
   */
  async recordSkillUsage(
    userId: string,
    skills: string[],
    outcomePositive: boolean = false
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const skillName of skills) {
        // Find the skill
        const skill = await prisma.skill.findUnique({
          where: { name: skillName }
        });

        if (!skill) continue;

        // Find user's current skill level
        const userSkill = await prisma.userSkill.findUnique({
          where: {
            userId_skillId: { userId, skillId: skill.id }
          }
        });

        if (!userSkill) continue;

        // Calculate score with journal boost
        let compositeScore = await this.calculateCompositeScore(userId, skill.id, skillName);

        // Small boost for positive outcomes in journal entries
        if (outcomePositive) {
          compositeScore = Math.min(compositeScore + 2, 100);
        }

        // Create or update today's snapshot (for real-time tracking)
        await prisma.skillSnapshot.upsert({
          where: {
            userId_skillId_snapshotDate: {
              userId,
              skillId: skill.id,
              snapshotDate: today
            }
          },
          update: {
            level: compositeScore,
            rawLevel: userSkill.level,
            metadata: {
              endorsements: userSkill.endorsements,
              projects: userSkill.projects,
              yearsOfExp: userSkill.yearsOfExp,
              journalUpdate: true
            }
          },
          create: {
            userId,
            skillId: skill.id,
            skillName,
            level: compositeScore,
            rawLevel: userSkill.level,
            snapshotDate: today,
            source: 'journal',
            metadata: {
              endorsements: userSkill.endorsements,
              projects: userSkill.projects,
              yearsOfExp: userSkill.yearsOfExp,
              journalUpdate: true
            }
          }
        });
      }

      console.log(`✅ Recorded skill usage for ${skills.length} skills from journal entry`);
    } catch (error) {
      console.error('Error recording skill usage:', error);
      // Non-blocking error
    }
  }

  /**
   * Get complete skills growth data for a user
   */
  async getSkillsGrowthData(userId: string): Promise<SkillGrowthData> {
    try {
      // Get historical periods
      const periods = await this.getSkillHistory(userId, 6);

      // If no historical data, create current period from user skills
      if (periods.length === 0) {
        const userSkills = await prisma.userSkill.findMany({
          where: { userId },
          include: {
            skill: {
              select: {
                name: true,
                category: true
              }
            }
          },
          take: 8
        });

        if (userSkills.length > 0) {
          periods.push({
            label: format(new Date(), 'MMM yyyy'),
            skills: userSkills.map(us => ({
              name: us.skill.name,
              value: this.levelToNumeric(us.level),
              category: us.skill.category || 'Technical'
            }))
          });
        }
      }

      // Get benchmarks
      const skillNames = periods.flatMap(p => p.skills.map(s => s.name));
      const uniqueSkillNames = Array.from(new Set(skillNames));

      const skillBenchmarks = await prisma.skillBenchmark.findMany({
        where: {
          skillName: { in: uniqueSkillNames },
          industry: 'general'
        },
        select: {
          skillName: true,
          industryAverage: true
        }
      });

      const benchmarks: Record<string, number> = {};
      for (const name of uniqueSkillNames) {
        const benchmark = skillBenchmarks.find(b => b.skillName === name);
        benchmarks[name] = benchmark?.industryAverage || 65;
      }

      // Get trends
      const trends = await this.calculateTrends(userId);

      return {
        periods,
        benchmarks,
        trends
      };
    } catch (error) {
      console.error('Error getting skills growth data:', error);
      return {
        periods: [],
        benchmarks: {},
        trends: []
      };
    }
  }
}

// Export singleton instance
export const skillTrackingService = new SkillTrackingService();
