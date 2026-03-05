import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtConfigModule } from './config/jwt.config';
import { DatabaseModule } from './database';
import {
  aiConfig,
  appConfig,
  authConfig,
  databaseConfig,
  emailConfig,
  loggingConfig,
  searchConfig,
  validateEnv,
} from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
      load: [
        appConfig,
        authConfig,
        databaseConfig,
        aiConfig,
        searchConfig,
        loggingConfig,
        emailConfig,
      ],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
      exclude: ['/api/*'],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtConfigModule,
    DatabaseModule,
    AuthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
