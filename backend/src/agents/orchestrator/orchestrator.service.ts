import { Injectable } from '@nestjs/common';
import { KbService } from '../../kb/kb.service';
import { LoggingService } from '../../logging/logging.service';
import { ReaderAgent } from '../reader/reader.agent';
import { SearchAgent } from '../search/search.agent';
import { SummarizerAgent } from '../summarizer/summarizer.agent';
import { SynthesizerAgent } from '../synthesizer/synthesizer.agent';

export type SseEvent =
  | { step: 'searching'; message: string }
  | { step: 'reading'; message: string }
  | { step: 'summarising'; message: string }
  | { step: 'progress'; message: string }
  | { step: 'token'; token: string }
  | { step: 'done'; answer?: string; sources: Array<{ title: string; url: string }> }
  | { step: 'error'; message: string };

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly searchAgent: SearchAgent,
    private readonly readerAgent: ReaderAgent,
    private readonly summarizerAgent: SummarizerAgent,
    private readonly synthesizerAgent: SynthesizerAgent,
    private readonly kbService: KbService,
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

  async *runKbSearch(query: string, userId: number): AsyncGenerator<SseEvent> {
    try {
      // Step 1 — search KB
      yield { step: 'progress', message: 'Searching your knowledge base...' };
      const results = await this.kbService.search(userId, query);

      if (results.length === 0) {
        yield {
          step: 'done',
          answer:
            'No relevant items were found in your knowledge base for this query. Try saving more research on this topic first.',
          sources: [],
        };
        return;
      }

      // Step 2 — synthesise
      yield { step: 'progress', message: 'Synthesising answer from your knowledge base...' };

      const context = results
        .slice(0, 5)
        .map((item, i) => `[${i + 1}] ${item.title}\n${item.summary ?? item.content.slice(0, 500)}`)
        .join('\n\n---\n\n');

      const kbSystemPrompt =
        'You are a research assistant answering questions from a personal knowledge base. ' +
        'Answer the question using ONLY the provided KB items. ' +
        'Cite items by their number [1], [2], etc. ' +
        'If the KB items do not contain enough information to answer, say so clearly.';

      const kbUserPrompt = `Question: ${query}\n\nKnowledge Base Items:\n${context}`;

      let fullAnswer = '';
      for await (const token of this.synthesizerAgent.synthesize([], query, {
        systemPrompt: kbSystemPrompt,
        userPrompt: kbUserPrompt,
      })) {
        fullAnswer += token;
        yield { step: 'token', token };
      }

      const sources = results
        .slice(0, 5)
        .filter((item) => item.sourceUrl)
        .map((item) => ({ title: item.title, url: item.sourceUrl! }));

      yield { step: 'done', answer: fullAnswer, sources };
    } catch (error) {
      this.logging.error('Orchestrator runKbSearch failed', 'OrchestratorService', userId, {
        query,
        error: error instanceof Error ? { message: error.message, name: error.name } : error,
      });
      yield {
        step: 'error',
        message: error instanceof Error ? error.message : 'Unknown orchestrator error',
      };
    }
  }

  async *runDeepResearch(_query: string, _userId: number): AsyncGenerator<SseEvent> {
    void _query;
    void _userId;
    yield { step: 'error', message: 'Coming in Phase 2' };
  }
}
