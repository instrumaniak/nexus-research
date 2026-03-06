import axios from 'axios';
import { ReaderAgent } from './reader.agent';

jest.mock('axios');

const mockedAxios = jest.mocked(axios);

describe('ReaderAgent', () => {
  let agent: ReaderAgent;

  beforeEach(() => {
    agent = new ReaderAgent();
    jest.clearAllMocks();
  });

  it('truncates extracted text to 4000 characters', async () => {
    mockedAxios.get.mockResolvedValue({
      data: `<html><head><title>Example</title></head><body><main>${'a'.repeat(5000)}</main></body></html>`,
    });

    const pages = await agent.scrape(['https://example.com']);

    expect(pages).toHaveLength(1);
    expect(pages[0]?.title).toBe('Example');
    expect(pages[0]?.text).toHaveLength(4000);
  });

  it('skips failed URLs without throwing', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({
      data: '<html><head><title>Ok</title></head><body><article>content</article></body></html>',
    });

    await expect(
      agent.scrape(['https://bad.example.com', 'https://good.example.com']),
    ).resolves.toEqual([
      {
        url: 'https://good.example.com',
        title: 'Ok',
        text: 'content',
      },
    ]);
  });
});
