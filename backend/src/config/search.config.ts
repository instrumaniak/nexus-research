import { registerAs } from '@nestjs/config';
import { getValidatedEnv } from './env.validation';

export const searchConfig = registerAs('search', () => {
  const env = getValidatedEnv();
  return {
    provider: env.SEARCH_PROVIDER,
    providerApiKey: env.SEARCH_PROVIDER_API_KEY,
  };
});

export type SearchConfig = ReturnType<typeof searchConfig>;
