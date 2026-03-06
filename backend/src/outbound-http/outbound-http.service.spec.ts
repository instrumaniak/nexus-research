import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { OutboundHttpService } from './outbound-http.service';

describe('OutboundHttpService', () => {
  let service: OutboundHttpService;
  let httpService: { request: jest.Mock };

  beforeEach(() => {
    httpService = {
      request: jest.fn(),
    };

    service = new OutboundHttpService(httpService as unknown as HttpService);
    jest.restoreAllMocks();
  });

  it('getJson returns parsed JSON data', async () => {
    httpService.request.mockReturnValue(
      of({
        status: 200,
        data: { ok: true },
      }),
    );

    await expect(service.getJson<{ ok: boolean }>('https://example.com')).resolves.toEqual({
      ok: true,
    });
  });

  it('getText returns response text', async () => {
    httpService.request.mockReturnValue(
      of({
        status: 200,
        data: '<html>ok</html>',
      }),
    );

    await expect(service.getText('https://example.com')).resolves.toBe('<html>ok</html>');
  });

  it('postJson throws descriptive errors on non-2xx responses', async () => {
    httpService.request.mockReturnValue(
      of({
        status: 502,
        data: { error: 'bad gateway' },
      }),
    );

    await expect(
      service.postJson('https://example.com', {
        body: { hello: 'world' },
      }),
    ).rejects.toThrow('Outbound HTTP request failed with status 502: {"error":"bad gateway"}');
  });

  it('streamSse yields raw SSE payloads', async () => {
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

    const payloads: string[] = [];
    for await (const payload of service.streamSse('https://example.com', {})) {
      payloads.push(payload);
    }

    expect(payloads).toEqual([
      '{"choices":[{"delta":{"content":"Hel"}}]}',
      '{"choices":[{"delta":{"content":"lo"}}]}',
    ]);
  });
});
