import express from 'express';
import { AIEntryGeneratorService } from '../services/ai-entry-generator.service';

const router = express.Router();

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

export default router;