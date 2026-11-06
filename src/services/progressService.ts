import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

export class ProgressService {
  static async getProgress(userId: string) {
    const progress = await prisma.userProgress.findUnique({
      where: { userId }
    });

    if (!progress) {
      throw new AppError('Progress record not found for this user.', 404);
    }

    return progress;
  }

  static async updateProgress(userId: string, updates: {
    currentLevel?: number;
    currentDay?: number;
    inRecoveryMode?: boolean;
    recoveryTokens?: number;
  }) {
    const updated = await prisma.userProgress.update({
      where: { userId },
      data: updates
    });

    return updated;
  }

  static async getProgressHistory(userId: string, daysRequested: number = 100) {
    const daysLimit = Math.min(100, Math.max(7, daysRequested));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysLimit);
    startDate.setHours(0, 0, 0, 0);

    const [completions, transactions, focusSessions, journals] = await Promise.all([
      prisma.missionCompletion.findMany({
        where: {
          userId,
          completedAt: { gte: startDate }
        },
        include: { mission: true },
        orderBy: { completedAt: 'asc' }
      }),
      prisma.xPTransaction.findMany({
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.deepWorkSession.findMany({
        where: {
          userId,
          completedAt: { gte: startDate }
        },
        orderBy: { completedAt: 'asc' }
      }),
      prisma.journalEntry.findMany({
        where: { userId },
        orderBy: { date: 'asc' }
      })
    ]);

    // Group activities by date string "YYYY-MM-DD"
    const dailyMap = new Map<string, {
      totalMissions: number;
      baselineHabits: number;
      deepWorkMinutes: number;
      hasJournal: boolean;
      xpEarned: number;
    }>();

    // Initialize all days in the range up to today
    for (let i = daysLimit - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      dailyMap.set(ds, {
        totalMissions: 0,
        baselineHabits: 0,
        deepWorkMinutes: 0,
        hasJournal: false,
        xpEarned: 0
      });
    }

    // Populate mission completions
    for (const c of completions) {
      const ds = c.dateString || (c.completedAt ? c.completedAt.toISOString().split('T')[0] : null);
      if (ds && dailyMap.has(ds)) {
        const item = dailyMap.get(ds)!;
        item.totalMissions += 1;
        if (c.mission?.category === 'morning' || c.mission?.isCore) {
          item.baselineHabits += 1;
        }
      }
    }

    // Populate deep work minutes
    for (const s of focusSessions) {
      const ds = s.completedAt.toISOString().split('T')[0];
      if (dailyMap.has(ds)) {
        const item = dailyMap.get(ds)!;
        item.deepWorkMinutes += s.durationMinutes || 0;
      }
    }

    // Populate journals
    for (const j of journals) {
      const ds = j.date;
      if (ds && dailyMap.has(ds)) {
        dailyMap.get(ds)!.hasJournal = true;
      }
    }

    // Populate XP earned
    for (const tx of transactions) {
      if (tx.amount > 0) {
        const ds = tx.createdAt.toISOString().split('T')[0];
        if (dailyMap.has(ds)) {
          dailyMap.get(ds)!.xpEarned += tx.amount;
        }
      }
    }

    // Scoring formula weights:
    // 50% Mission completion
    // 20% Baseline habits (morning / core)
    // 20% Deep Work target completion (target >= 45 min)
    // 10% Journal completion
    const TARGET_DAILY_MISSIONS = 5;
    const TARGET_BASELINE_HABITS = 3;
    const TARGET_DEEP_WORK_MINS = 45;

    const dailyScores: Array<{
      date: string;
      score: number;
      missionScore: number;
      habitScore: number;
      deepWorkScore: number;
      journalScore: number;
      completedMissions: number;
      deepWorkMinutes: number;
      hasJournal: boolean;
      xpEarned: number;
    }> = [];

    let totalScoreSum = 0;
    let activeDaysCount = 0;
    let bestScore = 0;
    let bestDayDate = '';
    let lowestScore = 100;
    let lowestDayDate = '';

    const todayStr = new Date().toISOString().split('T')[0];

    for (const [date, data] of dailyMap.entries()) {
      const missionScore = Math.min(50, Math.round((data.totalMissions / TARGET_DAILY_MISSIONS) * 50));
      const habitScore = Math.min(20, Math.round((data.baselineHabits / TARGET_BASELINE_HABITS) * 20));
      const deepWorkScore = Math.min(20, Math.round((data.deepWorkMinutes / TARGET_DEEP_WORK_MINS) * 20));
      const journalScore = data.hasJournal ? 10 : 0;

      const totalScore = Math.min(100, Math.max(0, missionScore + habitScore + deepWorkScore + journalScore));

      dailyScores.push({
        date,
        score: totalScore,
        missionScore,
        habitScore,
        deepWorkScore,
        journalScore,
        completedMissions: data.totalMissions,
        deepWorkMinutes: data.deepWorkMinutes,
        hasJournal: data.hasJournal,
        xpEarned: data.xpEarned
      });

      if (totalScore > 0) {
        activeDaysCount++;
        totalScoreSum += totalScore;
      }

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestDayDate = date;
      }

      if (totalScore < lowestScore && totalScore > 0) {
        lowestScore = totalScore;
        lowestDayDate = date;
      }
    }

    const todayEntry = dailyScores.find(d => d.date === todayStr);
    const todayScore = todayEntry ? todayEntry.score : 0;
    const averageProgress = activeDaysCount > 0 ? Math.round(totalScoreSum / activeDaysCount) : 0;

    const stats = {
      averageProgress,
      bestDay: { date: bestDayDate, score: bestScore },
      lowestDay: { date: lowestDayDate, score: lowestScore < 100 ? lowestScore : 0 },
      activeDays: activeDaysCount,
      todayScore
    };

    return {
      completions,
      transactions,
      focusSessions,
      journals,
      dailyScores,
      stats
    };
  }
}

