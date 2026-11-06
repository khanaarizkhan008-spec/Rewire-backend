import { z } from 'zod';

export const completeMissionSchema = z.object({
  checkInImageReference: z.string().optional(),
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateString must be in YYYY-MM-DD format').optional()
});

export const createCustomMissionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().max(500).default(''),
  category: z.enum(['Physical', 'Mental', 'Productivity', 'Digital Discipline', 'Personal Growth']),
  difficulty: z.enum(['Starter', 'Intermediate', 'High Intensity']),
  xpReward: z.number().int().min(10).max(500).default(100),
  requiresSelfie: z.boolean().default(false),
  targetDurationMinutes: z.number().int().min(1).max(300).optional(),
  targetTime: z.string().optional()
});

