import { Module } from '@nestjs/common';
import { OutboundHttpModule } from '../outbound-http/outbound-http.module';
import { AiProviderService } from './ai-provider.service';

@Module({
  imports: [OutboundHttpModule],
  providers: [AiProviderService],
  exports: [AiProviderService],
})
export class AiProviderModule {}
