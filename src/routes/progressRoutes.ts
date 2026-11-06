import { Router } from 'express';
import { ProgressController } from '../controllers/progressController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', ProgressController.getProgress);
router.patch('/', ProgressController.updateProgress);
router.get('/history', ProgressController.getHistory);

export default router;

