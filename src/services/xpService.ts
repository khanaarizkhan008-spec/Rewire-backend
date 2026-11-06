import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

export const STORE_CATALOG = [
  { id: 'theme_obsidian', name: 'Monk Mode Dark Obsidian', description: 'Deep monochromatic minimal palette', cost: 300, category: 'theme' },
  { id: 'theme_neon_pulse', name: 'Electric Neon Pulse', description: 'High-contrast cyberpunk glow aesthetic', cost: 450, category: 'theme' },
  { id: 'frame_titanium', name: 'Titanium Carbon Frame', description: 'Metallic bordered avatar ring for high performers', cost: 250, category: 'frame' },
  { id: 'badge_master_strategist', name: 'Master Strategist Badge', description: 'Showcases unwavering planning and routine fidelity', cost: 500, category: 'badge' },
  { id: 'token_streak_shield', name: 'Streak Shield Token', description: 'Protects streak from resetting during emergency disruption', cost: 150, category: 'token' }
];

export class XPService {
  static async getWallet(userId: string) {
    let progress = await prisma.userProgress.findUnique({
      where: { userId }
    });

    if (!progress) {
      progress = await prisma.userProgress.create({
        data: {
          userId,
          currentLevel: 1,
          lifetimeXP: 0,
          spendableXP: 0,
          currentStreak: 0,
          longestStreak: 0,
          multiplier: 1.0,
          recoveryTokens: 1
        }
      });
    }

    const transactions = await prisma.xPTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return {
      lifetimeXP: progress.lifetimeXP,
      spendableXP: progress.spendableXP,
      recoveryTokens: progress.recoveryTokens,
      currentLevel: progress.currentLevel,
      transactions
    };
  }

  static async getTransactions(userId: string) {
    return prisma.xPTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static getCatalog() {
    return STORE_CATALOG;
  }

  static async purchaseReward(userId: string, itemId: string) {
    const item = STORE_CATALOG.find(i => i.id === itemId);
    if (!item) {
      throw new AppError('Store item not found.', 404);
    }

    let progress = await prisma.userProgress.findUnique({
      where: { userId }
    });

    if (!progress) {
      progress = await prisma.userProgress.create({
        data: {
          userId,
          currentLevel: 1,
          lifetimeXP: 0,
          spendableXP: 0,
          currentStreak: 0,
          longestStreak: 0,
          multiplier: 1.0,
          recoveryTokens: 1
        }
      });
    }

    if (progress.spendableXP < item.cost) {
      throw new AppError(`Insufficient Spendable XP. Required: ${item.cost} XP, Available: ${progress.spendableXP} XP.`, 400);
    }

    // Atomic transaction: deduct spendable XP, log transaction, update inventory/tokens
    const result = await prisma.$transaction(async (tx) => {
      const updatedProgress = await tx.userProgress.update({
        where: { userId },
        data: {
          spendableXP: { decrement: item.cost },
          recoveryTokens: item.category === 'token' ? { increment: 1 } : undefined
        }
      });

      const transaction = await tx.xPTransaction.create({
        data: {
          userId,
          amount: -item.cost,
          transactionType: 'spent',
          category: 'store_purchase',
          description: `Purchased Store Reward: ${item.name}`
        }
      });

      return {
        item,
        progress: updatedProgress,
        transaction
      };
    });

    return result;
  }
}

