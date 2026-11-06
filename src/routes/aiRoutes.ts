import { Router } from 'express';
import { AIController } from '../controllers/aiController.js';
import { authenticate } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(authenticate);

router.post('/chat', aiLimiter, AIController.chat);
router.get('/conversations', AIController.getConversations);
router.get('/conversations/:id', AIController.getConversation);
router.delete('/conversations/:id', AIController.deleteConversation);
router.delete('/history', AIController.clearHistory);

export default router;

