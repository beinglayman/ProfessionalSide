import { Request, Response } from 'express';
import { SkillsBenchmarkService } from '../services/skills-benchmark.service';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';

const benchmarkService = new SkillsBenchmarkService();

/**
 * Generate benchmarks for a list of skills
 */
export const generateSkillBenchmarks = asyncHandler(async (req: Request, res: Response) => {
  const { skills, context } = req.body;
  
  if (!skills || !Array.isArray(skills) || skills.length === 0) {
    return sendError(res, 'Skills array is required and must not be empty', 400);
  }

  if (skills.length > 20) {
    return sendError(res, 'Maximum 20 skills allowed per request', 400);
  }

  try {
    const benchmarks = await benchmarkService.getSkillBenchmarks(skills, context);
    sendSuccess(res, benchmarks, 'Skill benchmarks generated successfully');
  } catch (error: any) {
    console.error('❌ Error generating skill benchmarks:', error);
    sendError(res, 'Failed to generate skill benchmarks', 500);
  }
});

/**
 * Get benchmarks for user's top skills
 */
export const getUserSkillBenchmarks = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    // Get user's skills from their profile
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      take: 10 // Limit to top 10 skills
    });
    
    if (userSkills.length === 0) {
      return sendSuccess(res, [], 'No skills found for user');
    }
    
    const skillNames = userSkills.map(us => us.skill.name);
    
    // Get user context for better benchmarking
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { industry: true, title: true, company: true, location: true }
    });
    
    const context = {
      industry: user?.industry || undefined,
      role: user?.title || undefined,
      company: user?.company || undefined,
      location: user?.location || undefined
    };
    
    const benchmarks = await benchmarkService.getSkillBenchmarks(skillNames, context);
    sendSuccess(res, benchmarks, 'User skill benchmarks retrieved successfully');
  } catch (error: any) {
    console.error('❌ Error getting user skill benchmarks:', error);
    sendError(res, 'Failed to get user skill benchmarks', 500);
  }
});

/**
 * Test the benchmark service connection
 */
export const testBenchmarkService = asyncHandler(async (req: Request, res: Response) => {
  try {
    const isConnected = await benchmarkService.testConnection();
    
    if (isConnected) {
      sendSuccess(res, { connected: true }, 'Skills benchmark service is working correctly');
    } else {
      sendError(res, 'Skills benchmark service connection failed', 503);
    }
  } catch (error: any) {
    console.error('❌ Error testing benchmark service:', error);
    sendError(res, 'Failed to test benchmark service', 500);
  }
});

/**
 * Get trending skills and their benchmarks
 */
export const getTrendingSkillBenchmarks = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Define trending skills for 2024-2025
    const trendingSkills = [
      'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 
      'Kubernetes', 'GraphQL', 'Next.js', 'Tailwind CSS',
      'PostgreSQL', 'MongoDB', 'Redis', 'Microservices', 'DevOps'
    ];
    
    const { industry } = req.query;
    const context = industry ? { industry: industry as string } : undefined;
    
    const benchmarks = await benchmarkService.getSkillBenchmarks(trendingSkills, context);
    
    // Sort by market demand and growth trend
    const sortedBenchmarks = benchmarks.sort((a, b) => {
      const demandOrder = { 'very-high': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const trendOrder = { 'hot': 4, 'growing': 3, 'stable': 2, 'declining': 1 };
      
      const aScore = demandOrder[a.marketDemand] + trendOrder[a.growthTrend];
      const bScore = demandOrder[b.marketDemand] + trendOrder[b.growthTrend];
      
      return bScore - aScore;
    });
    
    sendSuccess(res, sortedBenchmarks, 'Trending skill benchmarks retrieved successfully');
  } catch (error: any) {
    console.error('❌ Error getting trending skill benchmarks:', error);
    sendError(res, 'Failed to get trending skill benchmarks', 500);
  }
});

/**
 * Populate benchmarks for ALL skills in the database (production mass operation)
 */
export const populateAllSkillBenchmarks = asyncHandler(async (req: Request, res: Response) => {
  const { PrismaClient } = require('@prisma/client');
  const nodemailer = require('nodemailer');
  const prisma = new PrismaClient();

  const processStats = {
    startTime: new Date(),
    endTime: null as Date | null,
    totalSkills: 0,
    processedCount: 0,
    errorCount: 0,
    batchCount: 0,
    errors: [] as any[]
  };

  try {
    // Initialize email transporter
    let transporter;
    if (process.env.EMAIL_ENABLED === 'true') {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }

    console.log('🚀 Starting Production Skills Benchmark Population via API...');
    
    // Get all skills without benchmarks
    const allSkills = await prisma.skill.findMany({
      where: {
        benchmarks: {
          none: {}
        }
      },
      select: { id: true, name: true, category: true }
    });
    
    processStats.totalSkills = allSkills.length;
    console.log(`📊 Found ${allSkills.length} skills needing benchmarks`);
    
    if (allSkills.length === 0) {
      return sendSuccess(res, { message: 'All skills already have benchmarks' }, 'No skills to process');
    }

    // Send immediate response to client
    res.status(202).json({
      success: true,
      message: `Started benchmark population for ${allSkills.length} skills`,
      estimatedDuration: `${Math.ceil(allSkills.length / 10) * 2} minutes`,
      totalSkills: allSkills.length
    });

    // Continue processing in background
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < allSkills.length; i += batchSize) {
      batches.push(allSkills.slice(i, i + batchSize));
    }

    console.log(`📦 Processing ${batches.length} batches of ${batchSize} skills each`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      processStats.batchCount++;
      
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length}`);
      
      for (const skill of batch) {
        try {
          // Generate benchmark using existing service
          const benchmarks = await benchmarkService.getSkillBenchmarks([skill.name]);
          const benchmark = benchmarks[0];
          
          if (benchmark) {
            // Save to database
            await prisma.skillBenchmark.create({
              data: {
                skillId: skill.id,
                averageSalary: benchmark.averageSalary,
                marketDemand: benchmark.marketDemand,
                growthTrend: benchmark.growthTrend,
                difficulty: benchmark.difficulty,
                timeToLearn: benchmark.timeToLearn,
                relatedSkills: benchmark.relatedSkills,
                industryBreakdown: benchmark.industryBreakdown,
                source: 'api-mass-population',
                lastUpdated: new Date()
              }
            });
            
            processStats.processedCount++;
            console.log(`  ✅ ${skill.name}: ${benchmark.marketDemand} demand, ${benchmark.growthTrend} trend`);
          }
        } catch (error: any) {
          processStats.errorCount++;
          processStats.errors.push({
            skillName: skill.name,
            error: error.message
          });
          console.log(`  ❌ ${skill.name}: Error - ${error.message}`);
        }
      }
      
      // Wait between batches (except for the last one)
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ Waiting 30 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
      }
    }

    processStats.endTime = new Date();
    const durationMinutes = Math.round((processStats.endTime.getTime() - processStats.startTime.getTime()) / 60000);
    
    console.log(`\n🎉 Benchmark population completed!`);
    console.log(`📊 Processed: ${processStats.processedCount}/${processStats.totalSkills} skills`);
    console.log(`❌ Errors: ${processStats.errorCount}`);
    console.log(`⏱️ Duration: ${durationMinutes} minutes`);

    // Send completion email
    if (transporter) {
      const emailHtml = `
        <h2>🎉 Skill Benchmark Population Complete</h2>
        <p><strong>Total Skills:</strong> ${processStats.totalSkills}</p>
        <p><strong>Successfully Processed:</strong> ${processStats.processedCount}</p>
        <p><strong>Errors:</strong> ${processStats.errorCount}</p>
        <p><strong>Success Rate:</strong> ${Math.round((processStats.processedCount / processStats.totalSkills) * 100)}%</p>
        <p><strong>Duration:</strong> ${durationMinutes} minutes</p>
        <p><strong>Completed:</strong> ${processStats.endTime?.toISOString()}</p>
      `;

      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: 'honey72arora@gmail.com',
        subject: `✅ InChronicle: Benchmark Population Complete (${processStats.processedCount}/${processStats.totalSkills} skills)`,
        html: emailHtml
      });
      
      console.log('📧 Completion email sent successfully');
    }

  } catch (error: any) {
    console.error('💥 Critical error in mass benchmark population:', error);
    processStats.errorCount++;
    processStats.errors.push({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
});