import { Router } from 'express';
import { XPController } from '../controllers/xpController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/wallet', XPController.getWallet);
router.get('/transactions', XPController.getTransactions);
router.get('/rewards', XPController.getRewards);
router.post('/rewards/:id/purchase', XPController.purchaseReward);

export default router;

