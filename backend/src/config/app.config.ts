import { registerAs } from '@nestjs/config';
import { getValidatedEnv } from './env.validation';

export const appConfig = registerAs('app', () => {
  const env = getValidatedEnv();
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    frontendUrl: 'http://localhost:5173',
  };
});

export type AppConfig = ReturnType<typeof appConfig>;
