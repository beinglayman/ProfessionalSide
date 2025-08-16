import express from 'express';
import { AIEntryGeneratorService } from '../services/ai-entry-generator.service';
import { OpenAI } from 'openai';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route GET /api/debug/ai-config
 * @desc Debug Azure OpenAI configuration (no auth required)
 * @access Public
 */
router.get('/ai-config', async (req, res) => {
  try {
    console.log('🔍 Debug: Checking Azure OpenAI configuration...');
    
    const envCheck = {
      endpoint: !!process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: !!process.env.AZURE_OPENAI_API_KEY,
      deploymentName: !!process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION,
      endpointValue: process.env.AZURE_OPENAI_ENDPOINT,
      deploymentValue: process.env.AZURE_OPENAI_DEPLOYMENT_NAME
    };

    console.log('Environment variables:', envCheck);

    // Try to initialize the service
    try {
      const aiService = new AIEntryGeneratorService();
      console.log('✅ AI service initialized successfully');
      
      // Try to test connection
      console.log('🔍 About to test connection...');
      const connectionTest = await aiService.testConnection();
      console.log('Connection test result:', connectionTest);
      
      res.json({
        success: true,
        data: {
          environment: envCheck,
          serviceInitialized: true,
          connectionTest: connectionTest
        }
      });
    } catch (initError) {
      console.error('❌ AI service initialization failed:', initError);
      
      res.json({
        success: false,
        data: {
          environment: envCheck,
          serviceInitialized: false,
          initError: {
            message: initError.message,
            type: initError.constructor.name
          }
        }
      });
    }
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Debug endpoint failed',
      details: error.message
    });
  }
});

/**
 * @route GET /api/debug/direct-openai-test
 * @desc Test OpenAI SDK directly with Azure configuration
 * @access Public
 */
router.get('/direct-openai-test', async (req, res) => {
  try {
    console.log('🧪 Direct OpenAI SDK test...');
    
    if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
      return res.json({
        success: false,
        error: 'Missing environment variables'
      });
    }

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, '');
    const baseURL = `${endpoint}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`;
    console.log('🔗 Environment Variables:', {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION
    });
    console.log('🔗 Constructed Base URL:', baseURL);

    const openai = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: baseURL,
      defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-10-21' },
      defaultHeaders: {
        'api-key': process.env.AZURE_OPENAI_API_KEY,
      },
    });

    console.log('📝 Making direct API call...');
    
    const response = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages: [
        {
          role: 'user',
          content: 'Hello! This is a test. Please respond with "Connection successful!"'
        }
      ],
      max_completion_tokens: 100,
    });

    const responseContent = response.choices[0]?.message?.content;
    console.log('✅ Direct API call successful:', responseContent);

    res.json({
      success: true,
      data: {
        baseURL: baseURL,
        response: responseContent,
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME
      }
    });

  } catch (error) {
    console.error('❌ Direct OpenAI test failed:', error);
    
    res.json({
      success: false,
      error: {
        message: error.message,
        status: error.status,
        type: error.type,
        code: error.code
      }
    });
  }
});

/**
 * @route POST /api/debug/test-ai-generation
 * @desc Test AI generation without authentication
 * @access Public
 */
router.post('/test-ai-generation', async (req, res) => {
  try {
    console.log('🧪 Testing AI generation without auth...');
    
    const testData = {
      title: 'Test Entry',
      description: 'This is a test description for debugging AI generation.',
      result: 'Test results and outcomes.',
      primaryFocusArea: 'Technology',
      workCategory: 'Development',
      workTypes: ['Frontend Development'],
      skillsApplied: ['JavaScript', 'React'],
      artifacts: [],
      collaborators: [],
      reviewers: [],
      tags: ['test'],
      workspaceId: 'test-workspace',
      projects: ['test-project'],
      departments: ['engineering']
    };

    console.log('🤖 Test data:', testData);

    const aiService = new AIEntryGeneratorService();
    console.log('✅ AI service initialized');

    const generatedEntries = await aiService.generateEntries(testData);
    console.log('✅ AI entries generated successfully');

    res.json({
      success: true,
      data: generatedEntries
    });

  } catch (error) {
    console.error('❌ AI generation test failed:', error);
    
    res.json({
      success: false,
      error: {
        message: error.message,
        status: error.status,
        type: error.type,
        stack: error.stack
      }
    });
  }
});

/**
 * @route POST /api/debug/validate-journal-payload
 * @desc Test journal entry payload validation without creating entry
 * @access Public
 */
router.post('/validate-journal-payload', async (req, res) => {
  try {
    console.log('🧪 Testing journal payload validation...');
    console.log('📥 Received payload:', JSON.stringify(req.body, null, 2));
    
    // Import validation schema
    const { createJournalEntrySchema } = require('../types/journal.types');
    
    try {
      const validatedData = createJournalEntrySchema.parse(req.body);
      console.log('✅ Validation passed');
      console.log('✅ Validated data:', JSON.stringify(validatedData, null, 2));
      
      res.json({
        success: true,
        message: 'Payload validation passed',
        data: {
          originalPayload: req.body,
          validatedData: validatedData
        }
      });
    } catch (validationError) {
      console.error('❌ Validation failed:', validationError);
      
      res.json({
        success: false,
        error: 'Validation failed',
        details: {
          message: validationError.message,
          issues: validationError.issues || validationError.errors,
          originalPayload: req.body
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Debug validation endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Debug endpoint failed',
      details: error.message
    });
  }
});

/**
 * @route GET /api/debug/execution-status
 * @desc Check if depth coverage scripts have been executed
 * @access Public
 */
router.get('/execution-status', async (req, res) => {
  try {
    console.log('🔍 Checking execution status...');

    // Check Supply Chain work types
    const supplyChainWorkTypes = await prisma.workType.findMany({
      where: {
        id: { startsWith: 'operations-scm-' }
      },
      include: {
        workTypeSkills: { include: { skill: true } }
      }
    });

    const supplyChainFixed = supplyChainWorkTypes.filter(wt => wt.workTypeSkills.length > 0).length;

    // Check depth coverage for primary focus areas
    const targetFocusAreas = ['Design', 'Development', 'Leadership', 'Marketing', 'Operations', 'Product Management', 'Sales', 'Strategy'];
    let completeAreas = 0;

    for (const focusAreaName of targetFocusAreas) {
      const focusArea = await prisma.focusArea.findFirst({
        where: { label: { contains: focusAreaName, mode: 'insensitive' } },
        include: {
          workCategories: {
            include: {
              workTypes: { include: { workTypeSkills: true } }
            }
          }
        }
      });

      if (focusArea) {
        let categoriesWithSkills = 0;
        focusArea.workCategories.forEach(category => {
          const hasSkills = category.workTypes.some(wt => wt.workTypeSkills.length > 0);
          if (hasSkills) categoriesWithSkills++;
        });

        if (categoriesWithSkills === focusArea.workCategories.length) {
          completeAreas++;
        }
      }
    }

    // Check recent activity
    const recentMappings = await prisma.workTypeSkill.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    // Database stats
    const [totalSkills, totalMappings, totalWorkTypes] = await Promise.all([
      prisma.skill.count(),
      prisma.workTypeSkill.count(),
      prisma.workType.count()
    ]);

    const status = {
      timestamp: new Date().toISOString(),
      supplyChain: {
        workTypesWithSkills: supplyChainFixed,
        totalWorkTypes: supplyChainWorkTypes.length,
        isFixed: supplyChainFixed === supplyChainWorkTypes.length && supplyChainWorkTypes.length > 0,
        details: supplyChainWorkTypes.map(wt => ({
          id: wt.id,
          label: wt.label,
          skillCount: wt.workTypeSkills.length,
          hasSkills: wt.workTypeSkills.length > 0
        }))
      },
      depthCoverage: {
        completeAreas,
        totalAreas: 8,
        isComplete: completeAreas >= 6
      },
      recentActivity: {
        mappingsLast24h: recentMappings,
        hasRecentActivity: recentMappings > 0
      },
      database: {
        totalSkills,
        totalMappings,
        totalWorkTypes,
        avgSkillsPerWorkType: totalWorkTypes > 0 ? (totalMappings / totalWorkTypes).toFixed(2) : 0
      },
      scriptsExecuted: {
        supplyChainFix: supplyChainFixed === supplyChainWorkTypes.length && supplyChainWorkTypes.length > 0,
        depthCoverage: completeAreas >= 6,
        overallStatus: (supplyChainFixed === supplyChainWorkTypes.length && completeAreas >= 6) ? 'EXECUTED' : 'NOT_EXECUTED'
      }
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error checking execution status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check execution status'
    });
  }
});

export default router;