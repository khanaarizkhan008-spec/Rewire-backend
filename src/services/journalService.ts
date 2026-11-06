import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

export class JournalService {
  static async getEntries(userId: string) {
    return prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    });
  }

  static async getEntry(userId: string, idOrDate: string) {
    const entry = await prisma.journalEntry.findFirst({
      where: {
        userId,
        OR: [{ id: idOrDate }, { date: idOrDate }]
      }
    });

    if (!entry) {
      throw new AppError('Journal entry not found.', 404);
    }

    return entry;
  }

  static async saveEntry(userId: string, data: {
    date: string;
    mood: string;
    reflection: string;
    bestMoment?: string;
    biggestDistraction?: string;
    whatDidYouLearn?: string;
    improveTomorrow?: string;
    tomorrowPriority?: string;
    activitySummary?: string;
  }) {
    const existing = await prisma.journalEntry.findUnique({
      where: {
        userId_date: {
          userId,
          date: data.date
        }
      }
    });

    const isNew = !existing;

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.upsert({
        where: {
          userId_date: {
            userId,
            date: data.date
          }
        },
        create: {
          userId,
          date: data.date,
          mood: data.mood,
          reflection: data.reflection,
          bestMoment: data.bestMoment,
          biggestDistraction: data.biggestDistraction,
          whatDidYouLearn: data.whatDidYouLearn,
          improveTomorrow: data.improveTomorrow,
          tomorrowPriority: data.tomorrowPriority,
          activitySummary: data.activitySummary
        },
        update: {
          mood: data.mood,
          reflection: data.reflection,
          bestMoment: data.bestMoment,
          biggestDistraction: data.biggestDistraction,
          whatDidYouLearn: data.whatDidYouLearn,
          improveTomorrow: data.improveTomorrow,
          tomorrowPriority: data.tomorrowPriority,
          activitySummary: data.activitySummary
        }
      });

      // Award 10 XP only if this is the first reflection for this date
      let xpAwarded = 0;
      if (isNew) {
        xpAwarded = 10;
        await tx.userProgress.update({
          where: { userId },
          data: {
            lifetimeXP: { increment: 10 },
            spendableXP: { increment: 10 }
          }
        });

        await tx.xPTransaction.create({
          data: {
            userId,
            amount: 10,
            transactionType: 'earned',
            category: 'journal',
            description: `Saved Daily Log Journal for ${data.date} (${data.mood})`
          }
        });
      }

      const updatedProgress = await tx.userProgress.findUnique({ where: { userId } });

      return {
        entry,
        xpAwarded,
        progress: updatedProgress
      };
    });

    return result;
  }

  static async deleteEntry(userId: string, id: string) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, userId }
    });

    if (!entry) {
      throw new AppError('Journal entry not found.', 404);
    }

    await prisma.journalEntry.delete({
      where: { id }
    });

    return { success: true };
  }
}

