import { ConfigService } from '@nestjs/config';
import { AiProviderService } from './ai-provider.service';

describe('AiProviderService', () => {
  let service: AiProviderService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'ai.baseUrl') {
          return 'https://openrouter.ai/api/v1';
        }

        if (key === 'ai.apiKey') {
          return 'test-key';
        }

        return undefined;
      }),
    } as unknown as ConfigService;

    service = new AiProviderService(configService);
    jest.restoreAllMocks();
  });

  it('complete returns the response text', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Final answer' } }],
      }),
    } as unknown as Response);

    await expect(
      service.complete({
        model: 'test-model',
        systemPrompt: 'system',
        userPrompt: 'user',
      }),
    ).resolves.toBe('Final answer');
  });

  it('stream yields parsed tokens from SSE chunks', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n' +
              'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n' +
              'data: [DONE]\n\n',
          ),
        );
        controller.close();
      },
    });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      body: stream,
    } as unknown as Response);

    const tokens: string[] = [];
    for await (const token of service.stream({
      model: 'test-model',
      systemPrompt: 'system',
      userPrompt: 'user',
    })) {
      tokens.push(token);
    }

    expect(tokens).toEqual(['Hel', 'lo']);
  });
});
