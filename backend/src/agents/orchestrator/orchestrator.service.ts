import { Injectable } from '@nestjs/common';
import { LoggingService } from '../../logging/logging.service';
import { ReaderAgent } from '../reader/reader.agent';
import { SearchAgent } from '../search/search.agent';
import { SummarizerAgent } from '../summarizer/summarizer.agent';
import { SynthesizerAgent } from '../synthesizer/synthesizer.agent';

export type SseEvent =
  | { step: 'searching'; message: string }
  | { step: 'reading'; message: string }
  | { step: 'summarising'; message: string }
  | { step: 'token'; token: string }
  | { step: 'done'; sources: Array<{ title: string; url: string }> }
  | { step: 'error'; message: string };

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly searchAgent: SearchAgent,
    private readonly readerAgent: ReaderAgent,
    private readonly summarizerAgent: SummarizerAgent,
    private readonly synthesizerAgent: SynthesizerAgent,
    private readonly logging: LoggingService,
  ) {}

  async *runWebSearch(query: string, userId: number): AsyncGenerator<SseEvent> {
    try {
      const isUrl = /^https?:\/\//.test(query.trim());

      let pages: Array<{ url: string; title: string; text: string }> = [];

      if (isUrl) {
        pages = await this.readerAgent.scrape([query.trim()]);
      } else {
        yield { step: 'searching', message: 'Searching the web...' };
        const results = await this.searchAgent.search(query);

        yield { step: 'reading', message: 'Reading top results...' };
        pages = await this.readerAgent.scrape(results.map((result) => result.url));
      }

      yield { step: 'summarising', message: 'Summarising content...' };
      const summaryTexts = await Promise.all(
        pages.map((page) => this.summarizerAgent.summarize(page, query)),
      );

      const summaries = pages.map((page, index) => ({
        url: page.url,
        title: page.title,
        summary: summaryTexts[index] ?? '',
      }));

      for await (const token of this.synthesizerAgent.synthesize(summaries, query)) {
        yield { step: 'token', token };
      }

      yield {
        step: 'done',
        sources: pages.map((page) => ({
          title: page.title,
          url: page.url,
        })),
      };
    } catch (error) {
      this.logging.error('Orchestrator runWebSearch failed', 'OrchestratorService', userId, {
        query,
        error: error instanceof Error ? { message: error.message, name: error.name } : error,
      });
      yield {
        step: 'error',
        message: error instanceof Error ? error.message : 'Unknown orchestrator error',
      };
    }
  }

  async *runKbSearch(_query: string, _userId: number): AsyncGenerator<SseEvent> {
    void _query;
    void _userId;
    yield { step: 'error', message: 'Coming in Phase 2' };
  }

  async *runDeepResearch(_query: string, _userId: number): AsyncGenerator<SseEvent> {
    void _query;
    void _userId;
    yield { step: 'error', message: 'Coming in Phase 2' };
  }
}
