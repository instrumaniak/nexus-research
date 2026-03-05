import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
  })
  .strict();

export type LoginDto = z.infer<typeof loginSchema>;
