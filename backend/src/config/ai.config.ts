import { registerAs } from '@nestjs/config';
import { getValidatedEnv } from './env.validation';

export const aiConfig = registerAs('ai', () => {
  const env = getValidatedEnv();
  return {
    apiKey: env.AI_PROVIDER_API_KEY,
    baseUrl: env.AI_PROVIDER_BASE_URL,
    models: {
      orchestration: env.AI_MODEL_ORCHESTRATION,
      summarization: env.AI_MODEL_SUMMARIZATION,
      quickQa: env.AI_MODEL_QUICK_QA,
      report: env.AI_MODEL_REPORT,
    },
  };
});

export type AiConfig = ReturnType<typeof aiConfig>;
