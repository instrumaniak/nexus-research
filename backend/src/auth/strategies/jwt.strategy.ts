import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { users } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { DRIZZLE_CLIENT, DrizzleClient } from '../../database';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
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
