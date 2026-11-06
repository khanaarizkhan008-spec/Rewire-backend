import { Router } from 'express';
import { JournalController } from '../controllers/journalController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', JournalController.getEntries);
router.post('/', JournalController.saveEntry);
router.get('/:id', JournalController.getEntry);
router.delete('/:id', JournalController.deleteEntry);

export default router;

