import { Router } from 'express';
import { GoalController } from '../controllers/goalController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', GoalController.getGoals);
router.post('/', GoalController.createGoal);
router.patch('/:id', GoalController.updateGoal);
router.delete('/:id', GoalController.deleteGoal);
router.post('/:id/milestones/:milestoneId/toggle', GoalController.toggleMilestone);

export default router;

