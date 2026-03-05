import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StatusGuard } from '../common/guards/status.guard';
import { User } from '../../drizzle/schema';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(AuthGuard('local'))
  async login(
    @Body() _dto: LoginDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(user);

    const refreshToken = (result as { refreshToken?: string }).refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Failed to issue refresh token');
    }

    response.cookie('refresh_token', refreshToken, this.buildRefreshCookieOptions());

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = this.extractRefreshTokenFromCookie(request);
    const result = await this.authService.refresh(refreshToken);

    const rotatedRefreshToken = (result as { refreshToken?: string }).refreshToken;

    if (rotatedRefreshToken) {
      response.cookie('refresh_token', rotatedRefreshToken, this.buildRefreshCookieOptions());
    }

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, StatusGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = this.extractRefreshTokenFromCookie(request);

    await this.authService.logout(refreshToken);

    response.clearCookie('refresh_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return { message: 'Logged out' };
  }

  private extractRefreshTokenFromCookie(request: Request): string {
    const rawCookie = request.headers.cookie;

    if (!rawCookie) {
      return '';
    }

    const pairs = rawCookie.split(';');

    for (const pair of pairs) {
      const [name, ...valueParts] = pair.trim().split('=');
      if (name === 'refresh_token') {
        return decodeURIComponent(valueParts.join('='));
      }
    }

    return '';
  }

  private buildRefreshCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: this.getRefreshCookieMaxAgeMs(),
      path: '/',
    };
  }

  private getRefreshCookieMaxAgeMs(): number {
    const expiry = process.env.JWT_REFRESH_EXPIRY ?? '7d';
    const match = expiry.match(/^(\d+)([smhd])$/);

    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2];

    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * unitMs[unit];
  }
}
