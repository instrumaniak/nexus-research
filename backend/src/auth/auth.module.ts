import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtConfigModule } from '../config/jwt.config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StatusGuard } from '../common/guards/status.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtAuthGuard, StatusGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, StatusGuard, RolesGuard],
})
export class AuthModule {}
