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
  // Demo Mode (Production-safe)
  getDemoClusters,
  getDemoClusterById,
  generateDemoStar,
  clearDemoData,
  // Story Publishing (Demo Mode - legacy)
  publishDemoStory,
  unpublishDemoStory,
  setDemoStoryVisibility,
  getDemoStory,
  // Stories CRUD (unified)
  listStories,
  getStoryById,
  createStory,
  updateStory,
  deleteStory,
  regenerateStory,
  publishStory,
  unpublishStory,
  setStoryVisibility,
  // Profile: Published Stories
  getPublishedStories,
  // Story Sources
  addStorySource,
  updateStorySource,
  // Story Derivations
  deriveStory,
} from '../controllers/career-stories.controller';
import {
  analyzeEntry,
  generateStory,
} from '../controllers/story-wizard.controller';
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

// ============================================================================
// DEMO MODE (Production-safe - uses separate demo_* tables)
// ============================================================================
router.get('/demo/clusters', getDemoClusters);
router.get('/demo/clusters/:id', getDemoClusterById);
router.post('/demo/clusters/:id/generate-star', generateDemoStar);
// Note: DELETE /demo/clear removed - use DELETE /journal/entries/bulk/all with X-Demo-Mode header

// ============================================================================
// CAREER STORIES CRUD (Unified - uses x-demo-mode header for demo/prod routing)
// ============================================================================
router.get('/stories', listStories);
router.get('/stories/:id', getStoryById);
router.post('/stories', createStory);
router.put('/stories/:id', updateStory);
router.patch('/stories/:id', updateStory);  // Support both PUT and PATCH
router.delete('/stories/:id', deleteStory);
router.post('/stories/:id/regenerate', regenerateStory);
router.post('/stories/:id/publish', publishStory);
router.post('/stories/:id/unpublish', unpublishStory);
router.put('/stories/:id/visibility', setStoryVisibility);
router.patch('/stories/:id/visibility', setStoryVisibility);  // Support both PUT and PATCH

// ============================================================================
// STORY SOURCES
// ============================================================================
router.post('/stories/:storyId/sources', addStorySource);
router.patch('/stories/:storyId/sources/:sourceId', updateStorySource);

// ============================================================================
// STORY DERIVATIONS
// ============================================================================
router.post('/stories/:storyId/derive', deriveStory);

// ============================================================================
// STORY PUBLISHING (Demo Mode - legacy routes for backward compatibility)
// ============================================================================
router.get('/demo/stories/:id', getDemoStory);
router.post('/demo/stories/:id/publish', publishDemoStory);
router.post('/demo/stories/:id/unpublish', unpublishDemoStory);
router.put('/demo/stories/:id/visibility', setDemoStoryVisibility);

// ============================================================================
// PROFILE: PUBLISHED STORIES
// Single endpoint - demo/prod routing based on isDemoMode from request context
// ============================================================================
router.get('/users/:userId/published-stories', getPublishedStories);

// ============================================================================
// STORY WIZARD (Two-step promotion flow)
// Step 1: Analyze journal entry → archetype + questions
// Step 2: Generate story with answers → story + evaluation
// ============================================================================
router.post('/wizard/analyze', analyzeEntry);
router.post('/wizard/generate', generateStory);

export default router;
