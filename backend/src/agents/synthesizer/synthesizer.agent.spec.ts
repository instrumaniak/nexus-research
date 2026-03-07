import { AiProviderService } from '../../ai-provider/ai-provider.service';
import { SynthesizerAgent } from './synthesizer.agent';

describe('SynthesizerAgent', () => {
  it('yields tokens from AiProviderService.stream', async () => {
    const aiProvider = {
      stream: jest.fn(async function* () {
        yield 'Hel';
        yield 'lo';
      }),
    } as unknown as AiProviderService;

    const agent = new SynthesizerAgent(aiProvider);
    const tokens: string[] = [];

    for await (const token of agent.synthesize(
      [
        {
          url: 'https://example.com',
          title: 'Example',
          summary: 'Summary',
        },
      ],
      'What is this?',
    )) {
      tokens.push(token);
    }

    expect(tokens).toEqual(['Hel', 'lo']);
    expect(aiProvider.stream).toHaveBeenCalled();
  });
});
