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

// NOTE: Authentication is applied per-route (not router.use) because this router
// is mounted at /api/v1 which overlaps with other routes like /api/v1/mcp.
// Using router.use(authenticate) would intercept ALL /api/v1/* requests.

// Get user's connected tools (for tool selection UI)
router.get('/users/me/connected-tools', authenticate, getConnectedTools);

// Workspace subscription CRUD
router.get('/workspaces/:workspaceId/journal-subscription', authenticate, getSubscription);
router.post('/workspaces/:workspaceId/journal-subscription', authenticate, createSubscription);
router.put('/workspaces/:workspaceId/journal-subscription', authenticate, updateSubscription);
router.delete('/workspaces/:workspaceId/journal-subscription', authenticate, deleteSubscription);

// Toggle subscription active status
router.patch('/workspaces/:workspaceId/journal-subscription/toggle', authenticate, toggleSubscription);

export default router;
