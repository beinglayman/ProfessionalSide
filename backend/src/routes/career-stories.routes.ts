/**
 * Career Stories Routes
 *
 * API routes for tool activities, clustering, and story generation.
 */

import { Router } from 'express';
import {
  // Activities
  getActivities,
  getActivityById,
  getUnclusteredActivities,
  // Clusters
  generateClusters,
  getClusters,
  getClusterById,
  updateCluster,
  deleteCluster,
  addActivityToCluster,
  removeActivityFromCluster,
  mergeClusters,
  // STAR Generation
  generateStar,
  // Stats
  getStats,
  // Mock Data (Development)
  seedMockData,
  clearMockData,
  runFullPipeline,
} from '../controllers/career-stories.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All career-stories routes require authentication
router.use(authenticate);

// ============================================================================
// STATS
// ============================================================================
router.get('/stats', getStats);

// ============================================================================
// ACTIVITIES
// ============================================================================
router.get('/activities', getActivities);
router.get('/activities/unclustered', getUnclusteredActivities);
router.get('/activities/:id', getActivityById);

// ============================================================================
// CLUSTERS
// ============================================================================
router.post('/clusters/generate', generateClusters);
router.post('/clusters/merge', mergeClusters);
router.get('/clusters', getClusters);
router.get('/clusters/:id', getClusterById);
router.patch('/clusters/:id', updateCluster);
router.delete('/clusters/:id', deleteCluster);
router.post('/clusters/:id/activities', addActivityToCluster);
router.delete('/clusters/:id/activities/:activityId', removeActivityFromCluster);
router.post('/clusters/:id/generate-star', generateStar);

// ============================================================================
// MOCK DATA (Development/Testing Only)
// ============================================================================
router.post('/mock/seed', seedMockData);
router.delete('/mock/clear', clearMockData);
router.post('/mock/full-pipeline', runFullPipeline);

export default router;
