import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { KbController } from './kb.controller';
import { KbService } from './kb.service';

@Module({
  imports: [DatabaseModule, EmbeddingsModule],
  controllers: [KbController],
  providers: [KbService],
  exports: [KbService],
})
export class KbModule {}
