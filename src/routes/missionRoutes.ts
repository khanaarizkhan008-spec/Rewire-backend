import { Router } from 'express';
import { MissionController } from '../controllers/missionController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', MissionController.getMissions);
router.get('/today', MissionController.getTodayMissions);
router.get('/completed', MissionController.getCompleted);
router.post('/custom', MissionController.createCustomMission);
router.get('/:id', MissionController.getMissionById);
router.post('/:id/complete', MissionController.completeMission);

export default router;

