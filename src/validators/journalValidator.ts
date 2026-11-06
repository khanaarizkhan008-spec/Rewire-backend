import { z } from 'zod';

export const journalSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  mood: z.enum(['Amazing', 'Good', 'Normal', 'Low', 'Difficult']),
  reflection: z.string().min(1, 'Daily reflection is required'),
  bestMoment: z.string().optional(),
  biggestDistraction: z.string().optional(),
  whatDidYouLearn: z.string().optional(),
  improveTomorrow: z.string().optional(),
  tomorrowPriority: z.string().optional(),
  activitySummary: z.string().optional()
});

