import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { users } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import type { AuthConfig } from '../../config';
import { DRIZZLE_CLIENT, DrizzleClient } from '../../database';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
    private readonly configService: ConfigService,
  ) {
    const secret = configService.get<AuthConfig['jwtAccessSecret']>('auth.jwtAccessSecret');
    if (!secret) {
      throw new Error('Missing required config: auth.jwtAccessSecret');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.db.select().from(users).where(eq(users.id, payload.sub)).get();

    if (!user) {
      throw new UnauthorizedException('Invalid access token');
    }

    return user;
  }
}
