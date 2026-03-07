import { ConfigService } from '@nestjs/config';
import { OutboundHttpService } from '../outbound-http/outbound-http.service';
import { AiProviderService } from './ai-provider.service';

describe('AiProviderService', () => {
  let service: AiProviderService;
  let configService: ConfigService;
  let outboundHttpService: {
    postJson: jest.Mock;
    streamSse: jest.Mock;
  };

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

    outboundHttpService = {
      postJson: jest.fn(),
      streamSse: jest.fn(),
    };

    service = new AiProviderService(
      configService,
      outboundHttpService as unknown as OutboundHttpService,
    );
    jest.clearAllMocks();
  });

  it('complete returns the response text', async () => {
    outboundHttpService.postJson.mockResolvedValue({
      choices: [{ message: { content: 'Final answer' } }],
    });

    await expect(
      service.complete({
        model: 'test-model',
        systemPrompt: 'system',
        userPrompt: 'user',
      }),
    ).resolves.toBe('Final answer');
  });

  it('stream yields parsed tokens from SSE chunks', async () => {
    outboundHttpService.streamSse.mockImplementation(async function* () {
      yield '{"choices":[{"delta":{"content":"Hel"}}]}';
      yield '{"choices":[{"delta":{"content":"lo"}}]}';
    });

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
