import { z } from 'zod';

export const createGoalSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().max(1000).optional(),
  category: z.enum(['Fitness', 'Career', 'Discipline', 'Mindset', 'Digital']),
  deadline: z.string().optional(),
  milestones: z.array(z.string().min(1)).optional()
});

export const updateGoalSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().max(1000).optional(),
  category: z.enum(['Fitness', 'Career', 'Discipline', 'Mindset', 'Digital']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'PAUSED']).optional()
});

