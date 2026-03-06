import { Module } from '@nestjs/common';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { ReaderAgent } from './reader/reader.agent';
import { SearchAgent } from './search/search.agent';
import { SummarizerAgent } from './summarizer/summarizer.agent';
import { SynthesizerAgent } from './synthesizer/synthesizer.agent';

@Module({
  imports: [AiProviderModule],
  providers: [OrchestratorService, SearchAgent, ReaderAgent, SummarizerAgent, SynthesizerAgent],
  exports: [OrchestratorService],
})
export class AgentsModule {}
