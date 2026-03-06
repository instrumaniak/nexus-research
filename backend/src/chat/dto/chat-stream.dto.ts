import { z } from 'zod';

export const chatStreamSchema = z
  .object({
    query: z.string().min(1, 'Query is required'),
    mode: z.enum(['WEB_SEARCH', 'KB_SEARCH', 'DEEP_RESEARCH']),
    sessionId: z.number().int().positive().optional(),
  })
  .strict();

export type ChatStreamDto = z.infer<typeof chatStreamSchema>;
