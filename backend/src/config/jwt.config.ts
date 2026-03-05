import { JwtModule } from '@nestjs/jwt';

export const JwtConfigModule = JwtModule.register({
  secret: process.env.JWT_ACCESS_SECRET,
  signOptions: {
    expiresIn: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  },
});
