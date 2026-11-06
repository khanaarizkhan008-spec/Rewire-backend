import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { ProgressService } from '../services/progressService.js';

export class ProgressController {
  static async getProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const progress = await ProgressService.getProgress(userId);

      res.status(200).json({
        success: true,
        data: progress
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const updated = await ProgressService.updateProgress(userId, req.body);

      res.status(200).json({
        success: true,
        message: 'Progress updated.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  static async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 100;
      const history = await ProgressService.getProgressHistory(userId, days);

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (err) {
      next(err);
    }
  }
}

