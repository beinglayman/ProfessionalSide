import express from 'express';
import { AIEntryGeneratorService } from '../services/ai-entry-generator.service';
import { OpenAI } from 'openai';

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

    const baseURL = `${process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`;
    console.log('🔗 Constructed Base URL:', baseURL);

    const openai = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: baseURL,
      defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview' },
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
      max_completion_tokens: 10,
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

export default router;