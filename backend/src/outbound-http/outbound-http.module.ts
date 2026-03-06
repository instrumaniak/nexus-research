import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { OutboundHttpService } from './outbound-http.service';

@Module({
  imports: [HttpModule],
  providers: [OutboundHttpService],
  exports: [OutboundHttpService],
})
export class OutboundHttpModule {}
