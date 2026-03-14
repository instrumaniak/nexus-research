import { z } from 'zod';

export const saveKbItemSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    summary: z.string().optional(),
    sourceUrl: z.string().url('Invalid URL').optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict();

export type SaveKbItemDto = z.infer<typeof saveKbItemSchema>;
