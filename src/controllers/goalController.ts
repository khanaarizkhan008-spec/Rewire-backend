import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { GoalService } from '../services/goalService.js';
import { createGoalSchema, updateGoalSchema } from '../validators/goalValidator.js';

export class GoalController {
  static async getGoals(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const goals = await GoalService.getGoals(userId);

      res.status(200).json({
        success: true,
        data: goals
      });
    } catch (err) {
      next(err);
    }
  }

  static async createGoal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = createGoalSchema.parse(req.body);
      const goal = await GoalService.createGoal(userId, validated);

      res.status(201).json({
        success: true,
        message: 'Goal established.',
        data: goal
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateGoal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const goalId = req.params.id;
      const validated = updateGoalSchema.parse(req.body);
      const updated = await GoalService.updateGoal(userId, goalId, validated);

      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteGoal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const goalId = req.params.id;
      await GoalService.deleteGoal(userId, goalId);

      res.status(200).json({
        success: true,
        message: 'Goal removed.'
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleMilestone(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id: goalId, milestoneId } = req.params;
      const result = await GoalService.toggleMilestone(userId, goalId, milestoneId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

