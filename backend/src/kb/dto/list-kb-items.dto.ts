import { z } from 'zod';

export const listKbItemsSchema = z.object({
  tag: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListKbItemsDto = z.infer<typeof listKbItemsSchema>;
