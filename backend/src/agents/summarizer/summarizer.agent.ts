import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../../ai-provider/ai-provider.service';
import { getAiModels } from '../../config/models.config';
import type { ScrapedPage } from '../reader/reader.agent';

@Injectable()
export class SummarizerAgent {
  private readonly logger = new Logger(SummarizerAgent.name);

  constructor(private readonly aiProvider: AiProviderService) {}

  async summarize(page: ScrapedPage, query: string): Promise<string> {
    this.logger.log(`Running SummarizerAgent - url: ${page.url}`);

    try {
      const summary = await this.aiProvider.complete({
        model: getAiModels().summarization,
        systemPrompt:
          'You are a research assistant. Return 3-5 concise factual bullet points only.',
        userPrompt: `Query: ${query}\nArticle URL: ${page.url}\nArticle title: ${page.title}\nArticle text:\n${page.text}`,
      });

      this.logger.log(`Completed SummarizerAgent - url: ${page.url}`);
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown summarization error';
      this.logger.warn(`SummarizerAgent failed for ${page.url}: ${message}`);
      return '';
    }
  }
}
