import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

export class GoalService {
  static async getGoals(userId: string) {
    return prisma.goal.findMany({
      where: { userId },
      include: { milestones: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createGoal(userId: string, data: {
    title: string;
    description?: string;
    category: string;
    deadline?: string;
    milestones?: string[];
  }) {
    const goal = await prisma.goal.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        category: data.category,
        deadline: data.deadline ? new Date(data.deadline) : null,
        progress: 0,
        status: 'ACTIVE',
        milestones: {
          create: (data.milestones || []).map(m => ({
            title: m,
            completed: false
          }))
        }
      },
      include: { milestones: true }
    });

    return goal;
  }

  static async updateGoal(userId: string, goalId: string, updates: {
    title?: string;
    description?: string;
    category?: string;
    progress?: number;
    status?: string;
  }) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId }
    });

    if (!goal) {
      throw new AppError('Goal not found or does not belong to you.', 404);
    }

    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: updates,
      include: { milestones: true }
    });

    return updated;
  }

  static async deleteGoal(userId: string, goalId: string) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId }
    });

    if (!goal) {
      throw new AppError('Goal not found or does not belong to you.', 404);
    }

    await prisma.goal.delete({
      where: { id: goalId }
    });

    return { success: true };
  }

  static async toggleMilestone(userId: string, goalId: string, milestoneId: string) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      include: { milestones: true }
    });

    if (!goal) {
      throw new AppError('Goal not found.', 404);
    }

    const milestone = goal.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      throw new AppError('Milestone not found.', 404);
    }

    const newCompleted = !milestone.completed;

    await prisma.goalMilestone.update({
      where: { id: milestoneId },
      data: { completed: newCompleted }
    });

    // Recalculate progress
    const updatedMilestones = goal.milestones.map(m =>
      m.id === milestoneId ? { ...m, completed: newCompleted } : m
    );

    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const progress = updatedMilestones.length > 0
      ? Math.round((completedCount / updatedMilestones.length) * 100)
      : (newCompleted ? 100 : 0);

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        progress,
        status: progress === 100 ? 'COMPLETED' : 'ACTIVE'
      },
      include: { milestones: true }
    });

    // Award bonus XP if milestone reached 100%
    if (progress === 100 && goal.progress < 100) {
      await prisma.$transaction([
        prisma.userProgress.update({
          where: { userId },
          data: {
            lifetimeXP: { increment: 50 },
            spendableXP: { increment: 50 }
          }
        }),
        prisma.xPTransaction.create({
          data: {
            userId,
            amount: 50,
            transactionType: 'earned',
            category: 'mission',
            description: `Goal Milestone Conquered: ${goal.title}`
          }
        })
      ]);
    }

    return updatedGoal;
  }
}

