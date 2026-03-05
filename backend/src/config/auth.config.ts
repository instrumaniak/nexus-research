import { registerAs } from '@nestjs/config';
import { getValidatedEnv } from './env.validation';

export const authConfig = registerAs('auth', () => {
  const env = getValidatedEnv();
  return {
    jwtAccessSecret: env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: env.JWT_REFRESH_SECRET,
    jwtAccessExpiry: env.JWT_ACCESS_EXPIRY,
    jwtRefreshExpiry: env.JWT_REFRESH_EXPIRY,
  };
});

export type AuthConfig = ReturnType<typeof authConfig>;
