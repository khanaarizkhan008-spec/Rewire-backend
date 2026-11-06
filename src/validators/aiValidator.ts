import { z } from 'zod';

export const chatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  conversationId: z.string().uuid().optional(),
  includeJournal: z.boolean().default(false)
});

