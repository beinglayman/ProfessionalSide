import { Router } from 'express';
import {
  createJournalEntry,
  getJournalEntries,
  getJournalEntryById,
  updateJournalEntry,
  deleteJournalEntry,
  publishJournalEntry,
  toggleLike,
  toggleAppreciate,
  rechronicleEntry,
  recordAnalytics,
  getEntryComments,
  addComment,
  addArtifact,
  getUserRechronicles,
  getUserFeed
} from '../controllers/journal.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All journal routes require authentication
router.use(authenticate);

// Journal entry CRUD
router.get('/entries', getJournalEntries);
router.get('/feed', getUserFeed); // User feed with rechronicles
router.get('/rechronicles', getUserRechronicles); // User rechronicles
router.post('/entries', createJournalEntry);
router.get('/entries/:id', getJournalEntryById);
router.put('/entries/:id', updateJournalEntry);
router.delete('/entries/:id', deleteJournalEntry);

// Publishing
router.post('/entries/:id/publish', publishJournalEntry);

// Social interactions
router.post('/entries/:id/like', toggleLike);
router.post('/entries/:id/appreciate', toggleAppreciate);
router.post('/entries/:id/rechronicle', rechronicleEntry);

// Comments
router.get('/entries/:id/comments', getEntryComments);
router.post('/entries/:id/comments', addComment);

// Artifacts
router.post('/entries/:id/artifacts', addArtifact);

// Analytics
router.post('/entries/:id/analytics', recordAnalytics);

export default router;