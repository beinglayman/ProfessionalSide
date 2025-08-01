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

// Memory optimization
if (process.env.NODE_ENV === 'production') {
  // Increase memory limits for production
  const v8 = require('v8');
  const maxHeapSize = v8.getHeapStatistics().heap_size_limit;
  console.log(`📊 Max heap size: ${Math.round(maxHeapSize / 1024 / 1024)}MB`);
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
import servicesRoutes from './routes/services.routes';
import onboardingRoutes from './routes/onboarding.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rateLimiter.middleware';
import { auditMiddleware } from './middleware/audit.middleware';

// Import services
import { CronService } from './services/cron.service';

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

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

// Configure CORS with proper settings
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200, // Support legacy browsers
}));

// Body parsing with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files with CORS headers
app.use('/uploads', (req, res, next) => {
  // Add CORS headers for image requests
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
}, express.static(path.join(__dirname, '../uploads')));

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

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
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