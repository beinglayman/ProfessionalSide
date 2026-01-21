import { Router } from 'express';
import {
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  toggleSubscription,
  getConnectedTools
} from '../controllers/journal-subscription.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All journal subscription routes require authentication
router.use(authenticate);

// Get user's connected tools (for tool selection UI)
router.get('/users/me/connected-tools', getConnectedTools);

// Workspace subscription CRUD
router.get('/workspaces/:workspaceId/journal-subscription', getSubscription);
router.post('/workspaces/:workspaceId/journal-subscription', createSubscription);
router.put('/workspaces/:workspaceId/journal-subscription', updateSubscription);
router.delete('/workspaces/:workspaceId/journal-subscription', deleteSubscription);

// Toggle subscription active status
router.patch('/workspaces/:workspaceId/journal-subscription/toggle', toggleSubscription);

export default router;
