import { ConfigService } from '@nestjs/config';
import { OutboundHttpService } from '../../outbound-http/outbound-http.service';
import { SearchAgent } from './search.agent';

describe('SearchAgent', () => {
  let agent: SearchAgent;
  let outboundHttpService: {
    getJson: jest.Mock;
  };

  beforeEach(() => {
    outboundHttpService = {
      getJson: jest.fn(),
    };

    agent = new SearchAgent(
      {
        get: jest.fn((key: string) => {
          if (key === 'search.provider') {
            return 'duckduckgo';
          }

          return undefined;
        }),
      } as unknown as ConfigService,
      outboundHttpService as unknown as OutboundHttpService,
    );

    jest.clearAllMocks();
  });

  it('returns at most five results with the expected shape', async () => {
    outboundHttpService.getJson.mockResolvedValue({
      Heading: 'NestJS',
      AbstractURL: 'https://nestjs.com',
      AbstractText: 'Framework overview',
      RelatedTopics: Array.from({ length: 6 }, (_, index) => ({
        FirstURL: `https://example.com/${index}`,
        Text: `Result ${index} - snippet`,
      })),
    });

    const results = await agent.search('nestjs');

    expect(results).toHaveLength(5);
    expect(results[0]).toEqual({
      url: 'https://nestjs.com',
      title: 'NestJS',
      snippet: 'Framework overview',
    });
    expect(results[1]).toEqual({
      url: 'https://example.com/0',
      title: 'Result 0',
      snippet: 'Result 0 - snippet',
    });
  });

  it('returns an empty array on network error without throwing', async () => {
    outboundHttpService.getJson.mockRejectedValue(new Error('network down'));

    await expect(agent.search('nestjs')).resolves.toEqual([]);
  });
});
