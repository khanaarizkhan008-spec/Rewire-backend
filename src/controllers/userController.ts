import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/db.js';

export class UserController {
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          progress: true,
          settings: true
        }
      });

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          createdAt: user.createdAt,
          progress: user.progress,
          settings: user.settings
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { fullName, settings } = req.body;

      if (fullName) {
        await prisma.user.update({
          where: { id: userId },
          data: { fullName }
        });
      }

      if (settings) {
        await prisma.userSettings.upsert({
          where: { userId },
          create: {
            userId,
            ...settings
          },
          update: {
            ...settings
          }
        });
      }

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { progress: true, settings: true }
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await prisma.user.delete({ where: { id: userId } });

      res.status(200).json({
        success: true,
        message: 'Account and all associated records permanently purged.'
      });
    } catch (err) {
      next(err);
    }
  }
}

