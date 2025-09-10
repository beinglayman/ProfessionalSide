import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  generateSkillBenchmarks,
  getUserSkillBenchmarks,
  testBenchmarkService,
  getTrendingSkillBenchmarks,
  populateAllSkillBenchmarks,
  getBulkSkillBenchmarks
} from '../controllers/skills-benchmark.controller';

const router = Router();

// All benchmark routes require authentication
router.use(authenticate);

// Generate benchmarks for specific skills
router.post('/generate', generateSkillBenchmarks);

// Get benchmarks for multiple skills (bulk fetch)
router.post('/bulk', getBulkSkillBenchmarks);

// Get benchmarks for user's skills
router.get('/user', getUserSkillBenchmarks);

// Get trending skill benchmarks
router.get('/trending', getTrendingSkillBenchmarks);

// Test benchmark service connection
router.get('/test', testBenchmarkService);

// Populate ALL skills with benchmarks (admin operation)
router.post('/populate-all', populateAllSkillBenchmarks);

export default router;