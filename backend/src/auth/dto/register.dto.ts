import { z } from 'zod';

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(32, 'Username must be at most 32 characters')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Username may only contain letters, numbers, hyphens, underscores',
      ),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
  })
  .strict();

export type RegisterDto = z.infer<typeof registerSchema>;
