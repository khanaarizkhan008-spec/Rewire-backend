import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { MissionService } from '../services/missionService.js';
import { completeMissionSchema, createCustomMissionSchema } from '../validators/missionValidator.js';

export class MissionController {
  static async getMissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const level = req.query.level ? parseInt(req.query.level as string, 10) : undefined;
      const missions = await MissionService.getMissions(userId, level);

      res.status(200).json({
        success: true,
        data: missions
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTodayMissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const missions = await MissionService.getTodayMissions(userId);

      res.status(200).json({
        success: true,
        data: missions
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMissionById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const mission = await MissionService.getMissionById(req.params.id);

      res.status(200).json({
        success: true,
        data: mission
      });
    } catch (err) {
      next(err);
    }
  }

  static async completeMission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const missionId = req.params.id;
      const validated = completeMissionSchema.parse(req.body);

      const result = await MissionService.completeMission(userId, missionId, validated);

      res.status(200).json({
        success: true,
        message: 'Mission completed. XP awarded.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCompleted(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const completions = await MissionService.getCompletedMissions(userId);

      res.status(200).json({
        success: true,
        data: completions
      });
    } catch (err) {
      next(err);
    }
  }

  static async createCustomMission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = createCustomMissionSchema.parse(req.body);
      const mission = await MissionService.createCustomMission(userId, validated);

      res.status(201).json({
        success: true,
        message: 'Custom mission created.',
        data: mission
      });
    } catch (err) {
      next(err);
    }
  }
}

