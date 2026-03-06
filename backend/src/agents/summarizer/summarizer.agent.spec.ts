import { AiProviderService } from '../../ai-provider/ai-provider.service';
import { AI_MODELS } from '../../config/models.config';
import { SummarizerAgent } from './summarizer.agent';

describe('SummarizerAgent', () => {
  const aiProvider = {
    complete: jest.fn(),
  } as unknown as AiProviderService;

  let agent: SummarizerAgent;

  beforeEach(() => {
    agent = new SummarizerAgent(aiProvider);
    jest.clearAllMocks();
  });

  it('calls AiProviderService.complete with the summarization model', async () => {
    jest.mocked(aiProvider.complete).mockResolvedValue('summary');

    await agent.summarize(
      {
        url: 'https://example.com',
        title: 'Example',
        text: 'Body text',
      },
      'What is this?',
    );

    expect(aiProvider.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        model: AI_MODELS.summarization,
      }),
    );
  });

  it('returns an empty string on provider error', async () => {
    jest.mocked(aiProvider.complete).mockRejectedValue(new Error('provider down'));

    await expect(
      agent.summarize(
        {
          url: 'https://example.com',
          title: 'Example',
          text: 'Body text',
        },
        'What is this?',
      ),
    ).resolves.toBe('');
  });
});
