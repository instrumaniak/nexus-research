import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { refreshTokens, User, users } from '../../drizzle/schema';
import { DRIZZLE_CLIENT, DrizzleClient } from '../database';
import { RegisterDto } from './dto/register.dto';

interface TokenPayload {
  sub: number;
  email: string;
  role: string;
}

interface RefreshTokenPayload {
  sub: number;
  jti: string;
  exp: number;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existingByEmail = await this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .get();

    if (existingByEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingByUsername = await this.db
      .select()
      .from(users)
      .where(eq(users.username, dto.username))
      .get();

    if (existingByUsername) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    await this.db.insert(users).values({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      role: 'USER',
      status: 'PENDING',
      createdAt: new Date(),
      lastLoginAt: null,
    });

    return { message: 'Account pending approval' };
  }

  async login(
    user: User,
  ): Promise<{
    accessToken: string;
    user: { id: number; username: string; email: string; role: string };
  }> {
    if (user.status === 'PENDING') {
      throw new ForbiddenException('Account pending approval');
    }

    if (user.status === 'BANNED') {
      throw new ForbiddenException('Account suspended');
    }

    const { accessToken, refreshToken } = this.issueTokens(user);

    // Phase 1 decision: store raw refresh tokens in DB for direct revocation checks.
    await this.db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      revoked: false,
      expiresAt: this.getRefreshTokenExpiry(refreshToken),
      createdAt: new Date(),
    });

    await this.db
      .update(users)
      .set({
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const response: {
      accessToken: string;
      user: { id: number; username: string; email: string; role: string };
      refreshToken: string;
    } = {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };

    return response;
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    let payload: RefreshTokenPayload;

    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenRow = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken))
      .get();

    if (!tokenRow || tokenRow.revoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRow.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, payload.sub), eq(users.status, 'ACTIVE')))
      .get();

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.id, tokenRow.id));

    const nextTokens = this.issueTokens(user);

    await this.db.insert(refreshTokens).values({
      userId: user.id,
      token: nextTokens.refreshToken,
      revoked: false,
      expiresAt: this.getRefreshTokenExpiry(nextTokens.refreshToken),
      createdAt: new Date(),
    });

    const response: { accessToken: string; refreshToken: string } = {
      accessToken: nextTokens.accessToken,
      refreshToken: nextTokens.refreshToken,
    };

    return response;
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.token, refreshToken));
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.db.select().from(users).where(eq(users.email, email)).get();

    if (!user || !user.password) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return null;
    }

    return user;
  }

  async revokeAllTokensForUser(userId: number): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.userId, userId));
  }

  private issueTokens(user: User): { accessToken: string; refreshToken: string } {
    const accessPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const refreshPayload = {
      sub: user.id,
      jti: randomUUID(),
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRY ?? '15m',
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRY ?? '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private getRefreshTokenExpiry(token: string): Date {
    const decoded = this.jwtService.decode(token) as RefreshTokenPayload | null;

    if (!decoded || !decoded.exp) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return new Date(decoded.exp * 1000);
  }
}
