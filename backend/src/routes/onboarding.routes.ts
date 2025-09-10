import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getMyOnboardingData,
  upsertOnboardingData,
  updateCurrentStep,
  completeOnboarding,
  skipOnboarding,
  resetOnboarding,
  getOnboardingProgress,
  checkOnboardingStatus,
  syncOnboardingToProfile,
  updateStepData
} from '../controllers/onboarding.controller';

const router = Router();

// All onboarding routes require authentication
router.use(authenticate);

// Get current user's onboarding data
router.get('/data', getMyOnboardingData);

// Create or update onboarding data
router.put('/data', upsertOnboardingData);

// Update current step
router.put('/step', updateCurrentStep);

// Update specific step data
router.put('/step/:stepNumber', updateStepData);

// Complete onboarding
router.post('/complete', completeOnboarding);

// Skip onboarding
router.post('/skip', skipOnboarding);

// Reset onboarding
router.delete('/reset', resetOnboarding);

// Get onboarding progress
router.get('/progress', getOnboardingProgress);

// Check onboarding status
router.get('/status', checkOnboardingStatus);

// Manually sync onboarding data to user profile
router.post('/sync-profile', syncOnboardingToProfile);

export default router;