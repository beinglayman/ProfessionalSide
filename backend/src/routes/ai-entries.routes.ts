import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.middleware';
import { AIEntryGeneratorService } from '../services/ai-entry-generator.service';

const router = express.Router();

/**
 * @route POST /api/ai-entries/generate
 * @desc Generate AI-written entries (workspace and network versions)
 * @access Private
 */
router.post('/generate', 
  authenticateToken,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('result').notEmpty().withMessage('Result is required'),
    body('primaryFocusArea').notEmpty().withMessage('Primary focus area is required'),
    body('workCategory').notEmpty().withMessage('Work category is required'),
    body('workTypes').isArray().withMessage('Work types must be an array'),
    body('skillsApplied').isArray().withMessage('Skills applied must be an array'),
    body('artifacts').isArray().withMessage('Artifacts must be an array'),
    body('collaborators').isArray().withMessage('Collaborators must be an array'),
    body('reviewers').isArray().withMessage('Reviewers must be an array'),
    body('tags').isArray().withMessage('Tags must be an array'),
    body('workspaceId').notEmpty().withMessage('Workspace ID is required'),
    body('projects').isArray().withMessage('Projects must be an array'),
    body('departments').isArray().withMessage('Departments must be an array'),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const entryData = req.body;
      
      // Initialize AI service
      const aiService = new AIEntryGeneratorService();
      
      console.log('🤖 Generating AI entries for user:', req.user?.id);
      console.log('📝 Entry data:', entryData.title);
      
      // Generate both workspace and network entries
      const generatedEntries = await aiService.generateEntries(entryData);
      
      res.json({
        success: true,
        data: generatedEntries
      });
      
    } catch (error) {
      console.error('❌ AI entry generation error:', error);
      
      // Handle specific Azure OpenAI errors
      if (error.message.includes('Azure OpenAI credentials not configured')) {
        return res.status(500).json({
          success: false,
          error: 'AI service is not properly configured'
        });
      }
      
      if (error.message.includes('Failed to generate AI entries')) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate entries. Please try again.'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error while generating AI entries'
      });
    }
  }
);

/**
 * @route POST /api/ai-entries/test-connection
 * @desc Test Azure OpenAI connection
 * @access Private (admin only)
 */
router.post('/test-connection', 
  authenticateToken,
  async (req, res) => {
    try {
      // Only allow admin users to test connection (optional security measure)
      // You can uncomment this if you want to restrict access
      // if (!req.user?.isAdmin) {
      //   return res.status(403).json({
      //     success: false,
      //     error: 'Unauthorized - Admin access required'
      //   });
      // }

      const aiService = new AIEntryGeneratorService();
      const isConnected = await aiService.testConnection();
      
      res.json({
        success: true,
        data: {
          connected: isConnected,
          message: isConnected 
            ? 'Azure OpenAI connection successful' 
            : 'Azure OpenAI connection failed'
        }
      });
      
    } catch (error) {
      console.error('❌ AI connection test error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to test AI connection',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/ai-entries/config-status
 * @desc Check if AI service is configured
 * @access Private
 */
router.get('/config-status',
  authenticateToken,
  async (req, res) => {
    try {
      const isConfigured = !!(
        process.env.AZURE_OPENAI_ENDPOINT && 
        process.env.AZURE_OPENAI_API_KEY && 
        process.env.AZURE_OPENAI_DEPLOYMENT_NAME
      );
      
      res.json({
        success: true,
        data: {
          configured: isConfigured,
          requiredEnvVars: [
            'AZURE_OPENAI_ENDPOINT',
            'AZURE_OPENAI_API_KEY', 
            'AZURE_OPENAI_DEPLOYMENT_NAME',
            'AZURE_OPENAI_API_VERSION'
          ],
          missingVars: [
            !process.env.AZURE_OPENAI_ENDPOINT && 'AZURE_OPENAI_ENDPOINT',
            !process.env.AZURE_OPENAI_API_KEY && 'AZURE_OPENAI_API_KEY',
            !process.env.AZURE_OPENAI_DEPLOYMENT_NAME && 'AZURE_OPENAI_DEPLOYMENT_NAME',
            !process.env.AZURE_OPENAI_API_VERSION && 'AZURE_OPENAI_API_VERSION'
          ].filter(Boolean)
        }
      });
      
    } catch (error) {
      console.error('❌ Config status check error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to check configuration status'
      });
    }
  }
);

export default router;