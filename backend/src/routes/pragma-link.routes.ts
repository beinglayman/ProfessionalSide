import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createPragmaLink, listPragmaLinks, revokePragmaLink } from '../controllers/pragma-link.controller';

const router = Router();

// All pragma-link management routes require authentication
router.use(authenticate);

router.post('/', createPragmaLink);
router.get('/', listPragmaLinks);
router.post('/:id/revoke', revokePragmaLink);

export default router;
