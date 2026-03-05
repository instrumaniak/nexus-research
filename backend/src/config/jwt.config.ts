import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { AuthConfig } from './auth.config';

export const JwtConfigModule = JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    secret: configService.get<AuthConfig['jwtAccessSecret']>('auth.jwtAccessSecret'),
    signOptions: {
      expiresIn: configService.get<AuthConfig['jwtAccessExpiry']>('auth.jwtAccessExpiry'),
    },
  }),
});
