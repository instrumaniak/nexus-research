import { registerAs } from '@nestjs/config';
import { getValidatedEnv } from './env.validation';

export const loggingConfig = registerAs('logging', () => {
  const env = getValidatedEnv();
  return {
    level: env.LOG_LEVEL,
    retentionDays: env.LOG_RETENTION_DAYS,
  };
});

export type LoggingConfig = ReturnType<typeof loggingConfig>;
