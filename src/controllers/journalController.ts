import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { JournalService } from '../services/journalService.js';
import { journalSchema } from '../validators/journalValidator.js';

export class JournalController {
  static async getEntries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const entries = await JournalService.getEntries(userId);

      res.status(200).json({
        success: true,
        data: entries
      });
    } catch (err) {
      next(err);
    }
  }

  static async getEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const entry = await JournalService.getEntry(userId, req.params.id);

      res.status(200).json({
        success: true,
        data: entry
      });
    } catch (err) {
      next(err);
    }
  }

  static async saveEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = journalSchema.parse(req.body);
      const result = await JournalService.saveEntry(userId, validated);

      res.status(200).json({
        success: true,
        message: 'Daily Log saved successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await JournalService.deleteEntry(userId, req.params.id);

      res.status(200).json({
        success: true,
        message: 'Journal entry removed.'
      });
    } catch (err) {
      next(err);
    }
  }
}

