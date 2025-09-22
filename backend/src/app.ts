import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Optimize Node.js performance settings
process.env.UV_THREADPOOL_SIZE = '16'; // Increase thread pool size
process.setMaxListeners(0); // Remove listener limit

// Memory optimization (avoid CommonJS require in ESM runtime)
if (process.env.NODE_ENV === 'production') {
  (async () => {
    try {
      const v8 = await import('v8');
      const maxHeapSize = v8.getHeapStatistics().heap_size_limit;
      console.log(`📊 Max heap size: ${Math.round(maxHeapSize / 1024 / 1024)}MB`);
    } catch {
      // ignore if v8 import fails; non-critical telemetry
    }
  })();
}

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import journalRoutes from './routes/journal.routes';
import networkRoutes from './routes/network.routes';
import goalRoutes from './routes/goal.routes';
import workspaceRoutes from './routes/workspace.routes';
import dashboardRoutes from './routes/dashboard';
import notificationRoutes from './routes/notification.routes';
import searchRoutes from './routes/search.routes';
import exportRoutes from './routes/export.routes';
import emailRoutes from './routes/email.routes';
import adminRoutes from './routes/admin.routes';
import auditRoutes from './routes/audit.routes';
import referenceRoutes from './routes/reference.routes';
import organizationRoutes from './routes/organization.routes';
import skillsBenchmarkRoutes from './routes/skills-benchmark.routes';
import servicesRoutes from './routes/services.routes';
import onboardingRoutes from './routes/onboarding.routes';
import aiEntriesRoutes from './routes/ai-entries.routes';
import migrationRoutes from './routes/migration.routes';
import debugRoutes from './routes/debug.routes';
import invitationRoutes from './routes/invitation.routes';
import invitationRequestRoutes from './routes/invitation-request.routes';
import { promisify } from 'util';
import { exec as execCb } from 'child_process';
const exec = promisify(execCb);

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rateLimiter.middleware';
import { auditMiddleware } from './middleware/audit.middleware';

// Import services
import { CronService } from './services/cron.service';

// Initialize Express app
const app = express();

// Trust proxy for Railway/production deployment
app.set('trust proxy', true);
const port = process.env.PORT || 8080;
console.log(`🔧 Port configuration - PORT: ${process.env.PORT}, API_PORT: ${process.env.API_PORT}, Using: ${port}`);

// Initialize Prisma client with optimized settings
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Initialize services
const cronService = new CronService();

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('combined')); // Logging

// Configure CORS with proper settings for Railway
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
  'https://inchronicle.com',
  'https://inchronicle.com',
  /https:\/\/.*\.up\.railway\.app$/,
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      console.log('✅ CORS: Allowed origin:', origin);
      callback(null, true);
    } else {
      console.warn('❌ CORS: Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Body parsing with limits and error handling
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf.toString(encoding || 'utf8'));
    } catch (error) {
      console.error('🚨 JSON Parse Error:', {
        url: req.url,
        method: req.method,
        contentType: req.get('content-type'),
        body: buf.toString(encoding || 'utf8').substring(0, 200),
        error: error.message
      });
      throw error;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Comprehensive 400 error logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Override res.send to catch 400 errors
  res.send = function(data: any) {
    if (res.statusCode === 400) {
      console.error('🔍 400 ERROR DETAILED DEBUG:', {
        timestamp: new Date().toISOString(),
        url: req.url,
        method: req.method,
        headers: {
          authorization: req.headers.authorization ? `Bearer ${req.headers.authorization.substring(7, 20)}...` : 'MISSING',
          contentType: req.headers['content-type'],
          origin: req.headers.origin,
          userAgent: req.headers['user-agent']?.substring(0, 100)
        },
        query: req.query,
        params: req.params,
        body: req.body,
        response: typeof data === 'string' ? data : JSON.stringify(data),
        userInfo: req.user ? { id: req.user.id, email: req.user.email } : 'NOT_AUTHENTICATED'
      });
    }
    return originalSend.call(this, data);
  };
  
  // Override res.json as well
  res.json = function(data: any) {
    if (res.statusCode === 400) {
      console.error('🔍 400 ERROR JSON DEBUG:', {
        timestamp: new Date().toISOString(),
        url: req.url,
        method: req.method,
        response: data
      });
    }
    return originalJson.call(this, data);
  };
  
  next();
});

// Serve uploaded files with CORS headers
app.use('/uploads', (req, res, next) => {
  // Add CORS headers for image requests - more permissive for Railway
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'https://inchronicle.com',
    'https://*.up.railway.app'
  ].filter(Boolean);
  
  const origin = req.get('Origin');
  const isAllowed = allowedOrigins.some(allowed => 
    allowed === origin || 
    (allowed.includes('*') && origin?.includes('.up.railway.app'))
  );
  
  if (isAllowed || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cache-Control', 'public, max-age=31536000'); // 1 year cache for avatars
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
}, express.static(process.env.UPLOAD_VOLUME_PATH || path.join(__dirname, '../uploads')));

// Serve screenshot files with CORS headers
app.use('/screenshots', (req, res, next) => {
  // Add CORS headers for screenshot requests
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'https://inchronicle.com',
    'https://*.up.railway.app'
  ].filter(Boolean);
  
  const origin = req.get('Origin');
  const isAllowed = allowedOrigins.some(allowed => 
    allowed === origin || 
    (allowed.includes('*') && origin?.includes('.up.railway.app'))
  );
  
  if (isAllowed || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cache-Control', 'public, max-age=31536000'); // 1 year cache for screenshots
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
}, express.static(path.join(__dirname, '../public/screenshots')));

// Add optimized connection handling middleware
app.use((req, res, next) => {
  // Set increased timeouts for better performance
  req.setTimeout(120000); // 2 minutes (increased from 30s)
  res.setTimeout(120000); // 2 minutes (increased from 30s)
  
  // Set keep-alive headers for better connection reuse
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=65, max=1000');
  
  // Handle connection cleanup more gracefully
  res.on('close', () => {
    if (!res.headersSent) {
      console.warn('Response closed before headers sent');
    }
  });
  
  next();
});

// Rate limiting - TEMPORARILY DISABLED
// app.use('/api/', rateLimiter);

// Audit logging (after authentication middleware)
// app.use('/api/', auditMiddleware()); // Temporarily disabled due to missing audit_logs table

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Test API route
app.get('/api/v1/test', (req, res) => {
  res.json({ message: 'API working', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/api/v1/health/database', async (req, res) => {
  try {
    // Simple database connectivity test
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Benchmark import endpoint (simple, no auth)
app.post('/api/v1/import-benchmarks', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    console.log('🚀 Starting benchmark import...');
    
    // Read JSON export data
    const exportFile = path.join(__dirname, '../skill-benchmarks-export.json');
    if (!fs.existsSync(exportFile)) {
      return res.status(404).json({
        success: false,
        message: 'Benchmark export file not found'
      });
    }

    const benchmarks = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    console.log(`📊 Loaded ${benchmarks.length} benchmarks`);

    // Check current state
    const currentCount = await prisma.skillBenchmark.count();
    console.log(`📈 Current benchmarks: ${currentCount}`);

    let successCount = 0;
    let errorCount = 0;

    // Import records one by one
    for (const benchmark of benchmarks) {
      try {
        await prisma.skillBenchmark.create({
          data: {
            id: benchmark.id,
            skillName: benchmark.skillName,
            industry: benchmark.industry,
            role: benchmark.role,
            industryAverage: benchmark.industryAverage,
            juniorLevel: benchmark.juniorLevel,
            midLevel: benchmark.midLevel,
            seniorLevel: benchmark.seniorLevel,
            expertLevel: benchmark.expertLevel,
            marketDemand: benchmark.marketDemand,
            growthTrend: benchmark.growthTrend,
            description: benchmark.description,
            createdAt: benchmark.createdAt ? new Date(benchmark.createdAt) : new Date(),
            updatedAt: benchmark.updatedAt ? new Date(benchmark.updatedAt) : new Date()
          }
        });
        successCount++;
      } catch (error) {
        if (error.code === 'P2002') {
          // Record already exists, count as success
          successCount++;
        } else {
          errorCount++;
        }
      }
    }

    const finalCount = await prisma.skillBenchmark.count();
    
    res.json({
      success: true,
      message: 'Benchmark import completed',
      results: {
        processed: benchmarks.length,
        successful: successCount,
        errors: errorCount,
        finalCount: finalCount,
        imported: finalCount - currentCount
      }
    });

  } catch (error) {
    console.error('💥 Import error:', error);
    res.status(500).json({
      success: false,
      message: 'Import failed',
      error: error.message
    });
  }
});

// Database migration endpoint for Railway
app.post('/api/v1/run-migrations', async (req, res) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    console.log('🔧 Running database migrations...');
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
    
    if (stderr) {
      console.error('Migration stderr:', stderr);
    }
    
    console.log('Migration stdout:', stdout);
    res.json({ 
      success: true, 
      message: 'Database migrations completed',
      output: stdout
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Migration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Manual seeding endpoint for Railway
app.post('/api/v1/admin/seed-reference', async (req, res) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    console.log('🌱 Starting manual reference data seeding...');
    const { stdout, stderr } = await execAsync('npm run db:seed-reference');
    
    if (stderr) {
      console.error('Seeding stderr:', stderr);
    }
    
    console.log('Seeding stdout:', stdout);
    res.json({ 
      success: true, 
      message: 'Reference data seeding completed',
      output: stdout
    });
  } catch (error) {
    console.error('❌ Manual seeding failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Seeding failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin: Resolve a specific Prisma migration state (use with caution)
app.post('/api/v1/migrations/resolve', async (req, res) => {
  try {
    const name = (req.body?.name || '').toString();
    const action = (req.body?.action || 'applied').toString(); // 'applied' | 'rolled-back'
    if (!name) {
      return res.status(400).json({ success: false, message: 'Missing migration name' });
    }
    const flag = action === 'rolled-back' ? '--rolled-back' : '--applied';
    const { stdout, stderr } = await exec(`npx prisma migrate resolve ${flag} ${name}`);
    res.json({ success: true, message: 'Migration resolve executed', output: stdout, errors: stderr || null });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Migration resolve failed', error: error.message });
  }
});

// Benchmark migration endpoint for Railway
app.post('/api/v1/migrate-benchmarks', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    console.log('🚀 Starting benchmark migration...');
    
    // Read JSON export data
    const exportFile = path.join(__dirname, '../skill-benchmarks-export.json');
    if (!fs.existsSync(exportFile)) {
      return res.status(404).json({
        success: false,
        message: 'Benchmark export file not found'
      });
    }

    const benchmarks = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    console.log(`📊 Loaded ${benchmarks.length} benchmarks from export file`);

    // Check current state
    const existingCount = await prisma.skillBenchmark.count();
    console.log(`📈 Current production benchmarks: ${existingCount}`);

    // Send immediate response
    res.status(202).json({
      success: true,
      message: `Started benchmark migration for ${benchmarks.length} records`,
      currentCount: existingCount,
      totalToMigrate: benchmarks.length
    });

    // Continue processing in background
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;

    console.log(`📦 Processing ${Math.ceil(benchmarks.length / batchSize)} batches...`);

    for (let i = 0; i < benchmarks.length; i += batchSize) {
      const batch = benchmarks.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(benchmarks.length / batchSize);
      
      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} records)`);

      for (const benchmark of batch) {
        try {
          await prisma.skillBenchmark.upsert({
            where: { id: benchmark.id },
            update: {
              skillName: benchmark.skillName,
              industry: benchmark.industry,
              role: benchmark.role,
              industryAverage: benchmark.industryAverage,
              juniorLevel: benchmark.juniorLevel,
              midLevel: benchmark.midLevel,
              seniorLevel: benchmark.seniorLevel,
              expertLevel: benchmark.expertLevel,
              marketDemand: benchmark.marketDemand,
              growthTrend: benchmark.growthTrend,
              description: benchmark.description,
              updatedAt: new Date()
            },
            create: {
              id: benchmark.id,
              skillName: benchmark.skillName,
              industry: benchmark.industry,
              role: benchmark.role,
              industryAverage: benchmark.industryAverage,
              juniorLevel: benchmark.juniorLevel,
              midLevel: benchmark.midLevel,
              seniorLevel: benchmark.seniorLevel,
              expertLevel: benchmark.expertLevel,
              marketDemand: benchmark.marketDemand,
              growthTrend: benchmark.growthTrend,
              description: benchmark.description,
              createdAt: benchmark.createdAt ? new Date(benchmark.createdAt) : new Date(),
              updatedAt: benchmark.updatedAt ? new Date(benchmark.updatedAt) : new Date()
            }
          });
          
          successCount++;
          process.stdout.write('✅');
        } catch (error) {
          errorCount++;
          process.stdout.write('❌');
        }
      }

      // Small delay between batches
      if (i + batchSize < benchmarks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Final verification
    const finalCount = await prisma.skillBenchmark.count();
    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Results:`);
    console.log(`   - Successfully migrated: ${successCount}/${benchmarks.length}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Final count: ${finalCount}`);
    console.log(`   - Net increase: ${finalCount - existingCount}`);

  } catch (error) {
    console.error('💥 Benchmark migration error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Benchmark migration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Database migration endpoint for production
app.post('/api/v1/run-migrations', async (req, res) => {
  try {
    console.log('🚀 Running database migrations...');

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Run Prisma migrations
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');

    console.log('✅ Migration output:', stdout);
    if (stderr) {
      console.log('⚠️ Migration stderr:', stderr);
    }

    res.json({
      success: true,
      message: 'Database migrations completed',
      output: stdout,
      errors: stderr || null
    });

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});


// Debug endpoint to check user/profile data
app.get('/api/v1/debug-profile', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    const profileCount = await prisma.userProfile.count();
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
      take: 3
    });
    
    res.json({
      success: true,
      counts: { users: userCount, profiles: profileCount },
      sampleUsers: users,
      message: `Found ${userCount} users and ${profileCount} profiles`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to test profile endpoint behavior
app.get('/api/v1/debug-profile-test', async (req, res) => {
  try {
    // Test the profile endpoint logic directly
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({
        success: false,
        error: 'No Bearer token provided',
        authHeader: authHeader ? 'Present but invalid format' : 'Missing',
        expectedFormat: 'Bearer <token>'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Try to verify the token (without importing auth utils for simplicity)
    res.json({
      success: true,
      debug: {
        hasAuthHeader: !!authHeader,
        tokenLength: token.length,
        tokenStart: token.substring(0, 10) + '...',
        timestamp: new Date().toISOString(),
        message: 'Token received and formatted correctly'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    });
  }
});

// API Routes with debug logging
console.log('Mounting API routes...');
app.use('/api/v1/auth', authRoutes);
console.log('Auth routes mounted');
app.use('/api/v1/users', userRoutes);
console.log('User routes mounted');
app.use('/api/v1/journal', journalRoutes);
app.use('/api/v1/network', networkRoutes);
app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/email', emailRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/reference', referenceRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/ai-entries', aiEntriesRoutes);
app.use('/api/v1/skills-benchmark', skillsBenchmarkRoutes);
app.use('/api/v1/migration', migrationRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/v1/invitations', invitationRoutes);
app.use('/api/v1/invitation-requests', invitationRequestRoutes);

// EMERGENCY: Database reset route (enable via env flag)
if (process.env.EMERGENCY_ENABLE === 'true') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const emergencyResetRoutes = require('./routes/emergency-reset');
  app.use('/api/v1/emergency', emergencyResetRoutes);
}

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.originalUrl} not found` 
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  cronService.stopJobs();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  cronService.stopJobs();
  await prisma.$disconnect();
  process.exit(0);
});

// Create HTTP server with proper configuration
const server = app.listen(port, () => {
  console.log(`🚀 InChronicle Backend running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API URL: http://localhost:${port}/api/v1`);
  console.log(`❤️  Health Check: http://localhost:${port}/health`);
  console.log(`🔧 Max connections: 1000`);
  console.log(`⏱️  Timeouts: Request=120s, KeepAlive=65s`);
  console.log(`🧵 Thread pool size: ${process.env.UV_THREADPOOL_SIZE}`);
  
  // Test server binding
  console.log(`🔍 Server address:`, server.address());
  
  // Start scheduled jobs
  cronService.startJobs();
  console.log(`⏰ Scheduled jobs started`);
});

// Configure server settings for high performance
server.keepAliveTimeout = 65000; // 65 seconds (increased from 30s)
server.headersTimeout = 66000; // Slightly longer than keepAliveTimeout
server.maxConnections = 1000; // Increased from 100 to handle more concurrent connections
server.requestTimeout = 120000; // 2 minutes timeout for complex operations
server.timeout = 120000; // Overall server timeout

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
  }
});

// Handle connection errors
server.on('clientError', (err, socket) => {
  console.error('Client connection error:', err);
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

export default app;