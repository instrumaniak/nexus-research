import { OrchestratorService } from './orchestrator.service';

describe('OrchestratorService', () => {
  const searchAgent = {
    search: jest.fn(),
  };
  const readerAgent = {
    scrape: jest.fn(),
  };
  const summarizerAgent = {
    summarize: jest.fn(),
  };
  const synthesizerAgent = {
    synthesize: jest.fn(),
  };
  const kbService = {
    search: jest.fn(),
  };
  const logging = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  let service: OrchestratorService;

  beforeEach(() => {
    service = new OrchestratorService(
      searchAgent as never,
      readerAgent as never,
      summarizerAgent as never,
      synthesizerAgent as never,
      kbService as never,
      logging as never,
    );
    jest.clearAllMocks();
  });

  it('runWebSearch emits SSE steps in the correct order', async () => {
    searchAgent.search.mockResolvedValue([
      { url: 'https://a.example', title: 'A', snippet: 'a' },
      { url: 'https://b.example', title: 'B', snippet: 'b' },
    ]);
    readerAgent.scrape.mockResolvedValue([
      { url: 'https://a.example', title: 'A', text: 'text a' },
      { url: 'https://b.example', title: 'B', text: 'text b' },
    ]);
    summarizerAgent.summarize.mockResolvedValueOnce('summary a').mockResolvedValueOnce('summary b');
    synthesizerAgent.synthesize.mockImplementation(async function* () {
      yield 'Hello';
      yield ' world';
    });

    const events = [];
    for await (const event of service.runWebSearch('what is nestjs', 1)) {
      events.push(event);
    }

    expect(events).toEqual([
      { step: 'searching', message: 'Searching the web...' },
      { step: 'reading', message: 'Reading top results...' },
      { step: 'summarising', message: 'Summarising content...' },
      { step: 'token', token: 'Hello' },
      { step: 'token', token: ' world' },
      {
        step: 'done',
        sources: [
          { title: 'A', url: 'https://a.example' },
          { title: 'B', url: 'https://b.example' },
        ],
      },
    ]);
  });

  it('runWebSearch with URL input skips search and goes directly to scrape', async () => {
    readerAgent.scrape.mockResolvedValue([
      { url: 'https://example.com', title: 'Example', text: 'text' },
    ]);
    summarizerAgent.summarize.mockResolvedValue('summary');
    synthesizerAgent.synthesize.mockImplementation(async function* () {
      yield 'Summary';
    });

    const events = [];
    for await (const event of service.runWebSearch('https://example.com', 1)) {
      events.push(event);
    }

    expect(searchAgent.search).not.toHaveBeenCalled();
    expect(events).toEqual([
      { step: 'summarising', message: 'Summarising content...' },
      { step: 'token', token: 'Summary' },
      {
        step: 'done',
        sources: [{ title: 'Example', url: 'https://example.com' }],
      },
    ]);
  });

  it('runKbSearch returns no results message when KB is empty', async () => {
    kbService.search.mockResolvedValue([]);

    const events = [];
    for await (const event of service.runKbSearch('test query', 1)) {
      events.push(event);
    }

    expect(events).toEqual([
      { step: 'progress', message: 'Searching your knowledge base...' },
      {
        step: 'done',
        answer:
          'No relevant items were found in your knowledge base for this query. Try saving more research on this topic first.',
        sources: [],
      },
    ]);
  });

  it('runKbSearch synthesizes answer from KB items', async () => {
    kbService.search.mockResolvedValue([
      {
        id: 1,
        title: 'NestJS Guide',
        content: 'NestJS is a framework for building efficient server-side applications.',
        summary: null,
        sourceUrl: 'https://docs.nestjs.com',
        tags: null,
        createdAt: new Date(),
      },
    ]);
    synthesizerAgent.synthesize.mockImplementation(async function* () {
      yield 'NestJS is a great framework';
    });

    const events = [];
    for await (const event of service.runKbSearch('what is nestjs', 1)) {
      events.push(event);
    }

    expect(events).toContainEqual({
      step: 'progress',
      message: 'Searching your knowledge base...',
    });
    expect(events).toContainEqual({
      step: 'progress',
      message: 'Synthesising answer from your knowledge base...',
    });
    expect(events).toContainEqual({ step: 'token', token: 'NestJS is a great framework' });
    expect(events).toContainEqual({
      step: 'done',
      answer: 'NestJS is a great framework',
      sources: [{ title: 'NestJS Guide', url: 'https://docs.nestjs.com' }],
    });
  });
});
