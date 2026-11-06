import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { XPService } from '../services/xpService.js';

export class XPController {
  static async getWallet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const wallet = await XPService.getWallet(userId);

      res.status(200).json({
        success: true,
        data: wallet
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTransactions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const transactions = await XPService.getTransactions(userId);

      res.status(200).json({
        success: true,
        data: transactions
      });
    } catch (err) {
      next(err);
    }
  }

  static async getRewards(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const catalog = XPService.getCatalog();

      res.status(200).json({
        success: true,
        data: catalog
      });
    } catch (err) {
      next(err);
    }
  }

  static async purchaseReward(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const rewardId = req.params.id;
      const result = await XPService.purchaseReward(userId, rewardId);

      res.status(200).json({
        success: true,
        message: 'Reward purchased successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

