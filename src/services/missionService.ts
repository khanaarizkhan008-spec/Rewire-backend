import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

export class MissionService {
  static async getMissions(userId: string, levelNumber?: number) {
    const userProgress = await prisma.userProgress.findUnique({
      where: { userId }
    });

    const targetLevel = levelNumber || userProgress?.currentLevel || 1;

    // Get both shared system missions for this level and user custom missions
    const missions = await prisma.mission.findMany({
      where: {
        OR: [
          { levelNumber: targetLevel, createdById: null },
          { createdById: userId }
        ]
      },
      orderBy: [{ isCore: 'desc' }, { createdAt: 'asc' }]
    });

    // Check today's completions for this user
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCompletions = await prisma.missionCompletion.findMany({
      where: {
        userId,
        dateString: todayStr
      }
    });

    const completedMissionIdSet = new Set(todayCompletions.map(c => c.missionId));

    return missions.map(m => ({
      ...m,
      completed: completedMissionIdSet.has(m.id),
      completedAt: todayCompletions.find(c => c.missionId === m.id)?.completedAt || null,
      hasSelfieSaved: Boolean(todayCompletions.find(c => c.missionId === m.id)?.checkInImageReference)
    }));
  }

  static async getTodayMissions(userId: string) {
    return this.getMissions(userId);
  }

  static async getMissionById(missionId: string) {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId }
    });

    if (!mission) {
      throw new AppError('Mission not found.', 404);
    }

    return mission;
  }

  static async completeMission(
    userId: string,
    missionId: string,
    data: { checkInImageReference?: string; dateString?: string }
  ) {
    const todayStr = data.dateString || new Date().toISOString().split('T')[0];

    // 1. Verify mission exists
    const mission = await prisma.mission.findUnique({
      where: { id: missionId }
    });

    if (!mission) {
      throw new AppError('Mission not found.', 404);
    }

    // 2. Prevent duplicate completion for today
    const existingCompletion = await prisma.missionCompletion.findUnique({
      where: {
        userId_missionId_dateString: {
          userId,
          missionId,
          dateString: todayStr
        }
      }
    });

    if (existingCompletion) {
      throw new AppError('This mission has already been completed today. Duplicate rewards are prohibited.', 409);
    }

    // 3. Atomically execute completion record, XP award, progress update & streak recalculation
    const result = await prisma.$transaction(async (tx) => {
      // Create completion record
      const completion = await tx.missionCompletion.create({
        data: {
          userId,
          missionId,
          xpAwarded: mission.xpReward,
          checkInImageReference: data.checkInImageReference,
          dateString: todayStr
        }
      });

      // Record XP transaction in immutable ledger
      await tx.xPTransaction.create({
        data: {
          userId,
          amount: mission.xpReward,
          transactionType: 'earned',
          category: 'mission',
          description: `Completed Mission: ${mission.title}`
        }
      });

      // Fetch current progress
      const currentProgress = await tx.userProgress.findUniqueOrThrow({
        where: { userId }
      });

      const newLifetimeXP = currentProgress.lifetimeXP + mission.xpReward;
      const newSpendableXP = currentProgress.spendableXP + mission.xpReward;
      const newCompletedCount = currentProgress.totalCompletedMissions + 1;

      // Calculate streak: Check if all core missions for today are completed
      const todayCoreCompletions = await tx.missionCompletion.count({
        where: {
          userId,
          dateString: todayStr,
          mission: { isCore: true }
        }
      });

      const totalCoreMissions = await tx.mission.count({
        where: {
          levelNumber: currentProgress.currentLevel,
          createdById: null,
          isCore: true
        }
      });

      // If this completion puts user over the threshold for the day, advance streak
      let newStreak = currentProgress.currentStreak;
      if (todayCoreCompletions >= totalCoreMissions && currentProgress.currentStreak === 0) {
        newStreak = 1;
      }

      const newLongestStreak = Math.max(newStreak, currentProgress.longestStreak);

      // Level upgrade thresholds: Requires BOTH XP and consecutive day streaks:
      // Level 1 -> Level 2: 600 XP and 7-day streak
      // Level 2 -> Level 3: 1,800 XP and 14-day streak
      // Level 3 -> Level 4: 3,800 XP and 21-day streak
      // Level 4 -> Level 5: 7,500 XP and 30-day streak
      // Level 5 (Master): 15,000+ XP and 60-day streak
      let calculatedLevel = currentProgress.currentLevel;
      if (newLifetimeXP >= 7500 && newStreak >= 30) calculatedLevel = 5;
      else if (newLifetimeXP >= 3800 && newStreak >= 21) calculatedLevel = 4;
      else if (newLifetimeXP >= 1800 && newStreak >= 14) calculatedLevel = 3;
      else if (newLifetimeXP >= 600 && newStreak >= 7) calculatedLevel = 2;

      const updatedProgress = await tx.userProgress.update({
        where: { userId },
        data: {
          lifetimeXP: newLifetimeXP,
          spendableXP: newSpendableXP,
          totalCompletedMissions: newCompletedCount,
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          currentLevel: Math.max(currentProgress.currentLevel, calculatedLevel)
        }
      });

      return {
        completion,
        progress: updatedProgress,
        xpAwarded: mission.xpReward
      };
    });

    return result;
  }

  static async getCompletedMissions(userId: string) {
    return prisma.missionCompletion.findMany({
      where: { userId },
      include: { mission: true },
      orderBy: { completedAt: 'desc' }
    });
  }

  static async createCustomMission(userId: string, data: {
    title: string;
    description: string;
    category: string;
    difficulty: string;
    xpReward: number;
    requiresSelfie: boolean;
    targetDurationMinutes?: number;
    targetTime?: string;
  }) {
    const userProgress = await prisma.userProgress.findUnique({ where: { userId } });

    const newMission = await prisma.mission.create({
      data: {
        ...data,
        isCore: false,
        levelNumber: userProgress?.currentLevel || 1,
        createdById: userId
      }
    });

    return newMission;
  }
}

