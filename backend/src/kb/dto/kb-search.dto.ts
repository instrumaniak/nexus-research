import { z } from 'zod';

export const kbSearchSchema = z
  .object({
    q: z.string().min(2, 'Search query must be at least 2 characters'),
  })
  .strict();

export type KbSearchDto = z.infer<typeof kbSearchSchema>;
