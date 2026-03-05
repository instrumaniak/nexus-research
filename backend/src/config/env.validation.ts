import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),

    DATABASE_PATH: z.string().default('./nexus.db'),

    AI_PROVIDER_API_KEY: z.string().optional(),
    AI_PROVIDER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),

    AI_MODEL_ORCHESTRATION: z.string().default('deepseek/deepseek-r1:free'),
    AI_MODEL_SUMMARIZATION: z.string().default('meta-llama/llama-3.3-70b-instruct:free'),
    AI_MODEL_QUICK_QA: z.string().default('google/gemma-2-9b-it:free'),
    AI_MODEL_REPORT: z.string().default('mistralai/mistral-7b-instruct:free'),

    SEARCH_PROVIDER_API_KEY: z.string().optional(),
    SEARCH_PROVIDER: z.enum(['brave', 'duckduckgo']).default('duckduckgo'),

    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
    LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(30),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CALLBACK_URL: z.string().url().optional(),
  })
  .superRefine((env, ctx) => {
    const isOpenRouter = env.AI_PROVIDER_BASE_URL.includes('openrouter.ai');
    const hasApiKey = !!env.AI_PROVIDER_API_KEY && env.AI_PROVIDER_API_KEY.trim().length > 0;

    if (isOpenRouter && !hasApiKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AI_PROVIDER_API_KEY'],
        message: 'AI_PROVIDER_API_KEY is required when AI_PROVIDER_BASE_URL points to OpenRouter',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`\n❌ Invalid environment variables:\n${formatted}\n`);
  }

  validatedEnv = result.data;
  return result.data;
}

export function getValidatedEnv(): Env {
  if (!validatedEnv) {
    throw new Error('Environment has not been validated yet. Ensure ConfigModule is initialized.');
  }

  return validatedEnv;
}
