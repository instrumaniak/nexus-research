import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS for frontend
  app.enableCors({
    origin: configService.get<string>('app.frontendUrl') ?? 'http://localhost:5173',
    credentials: true,
  });

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  const port = configService.get<number>('app.port') ?? 3000;
  await app.listen(port);
  console.log(`Nexus running on port ${port}`);
}

bootstrap();
