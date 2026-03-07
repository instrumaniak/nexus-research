import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../../ai-provider/ai-provider.service';
import { AI_MODELS } from '../../config/models.config';

export interface SynthesizerSummary {
  url: string;
  title: string;
  summary: string;
}

@Injectable()
export class SynthesizerAgent {
  private readonly logger = new Logger(SynthesizerAgent.name);

  constructor(private readonly aiProvider: AiProviderService) {}

  async *synthesize(summaries: SynthesizerSummary[], query: string): AsyncGenerator<string> {
    this.logger.log(`Running SynthesizerAgent - summaries: ${summaries.length}`);

    const numberedSources = summaries
      .map(
        (summary, index) =>
          `[${index + 1}] ${summary.title}\nURL: ${summary.url}\nSummary:\n${summary.summary}`,
      )
      .join('\n\n');

    try {
      for await (const token of this.aiProvider.stream({
        model: AI_MODELS.quickQA,
        systemPrompt:
          'You are a helpful research assistant. Answer clearly and cite sources inline as [1][2].',
        userPrompt: `Query: ${query}\n\nSources:\n${numberedSources}`,
      })) {
        yield token;
      }

      this.logger.log(`Completed SynthesizerAgent - summaries: ${summaries.length}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown synthesis error';
      this.logger.warn(`SynthesizerAgent failed: ${message}`);
      throw error;
    }
  }
}
