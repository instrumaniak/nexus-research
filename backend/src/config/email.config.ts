import { registerAs } from '@nestjs/config';
import { getValidatedEnv } from './env.validation';

export const emailConfig = registerAs('email', () => {
  const env = getValidatedEnv();
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
  };
});

export type EmailConfig = ReturnType<typeof emailConfig>;
