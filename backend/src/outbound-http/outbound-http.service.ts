import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import type { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';

interface BaseRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

interface JsonRequestOptions extends BaseRequestOptions {
  body?: unknown;
}

interface StreamRequestOptions extends BaseRequestOptions {
  body?: unknown;
  method?: 'GET' | 'POST';
}

@Injectable()
export class OutboundHttpService {
  constructor(private readonly httpService: HttpService) {}

  async getJson<T>(url: string, options: BaseRequestOptions = {}): Promise<T> {
    const response = await this.performRequest<T>({
      method: 'GET',
      url,
      responseType: 'json',
      headers: options.headers,
      timeout: options.timeout,
    });

    return response.data;
  }

  async getText(url: string, options: BaseRequestOptions = {}): Promise<string> {
    const response = await this.performRequest<string>({
      method: 'GET',
      url,
      responseType: 'text',
      headers: options.headers,
      timeout: options.timeout,
    });

    return typeof response.data === 'string' ? response.data : String(response.data);
  }

  async postJson<T>(url: string, options: JsonRequestOptions): Promise<T> {
    const response = await this.performRequest<T>({
      method: 'POST',
      url,
      data: options.body,
      responseType: 'json',
      headers: options.headers,
      timeout: options.timeout,
    });

    return response.data;
  }

  async *streamSse(url: string, options: StreamRequestOptions): AsyncGenerator<string> {
    const abortController = new AbortController();
    const timeoutId =
      options.timeout === undefined
        ? undefined
        : setTimeout(() => abortController.abort(), options.timeout);

    try {
      const response = await fetch(url, {
        method: options.method ?? 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw await this.buildFetchError(response);
      }

      if (!response.body) {
        throw new Error('Outbound HTTP stream returned an empty body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          const lines = event
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.startsWith('data:'));

          for (const line of lines) {
            const payload = line.slice(5).trim();

            if (!payload || payload === '[DONE]') {
              continue;
            }

            yield payload;
          }
        }
      }

      const remaining = buffer.trim();
      if (!remaining) {
        return;
      }

      for (const line of remaining.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) {
          continue;
        }

        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') {
          continue;
        }

        yield payload;
      }
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async performRequest<T>(config: AxiosRequestConfig) {
    const response = await firstValueFrom(
      this.httpService.request<T>({
        ...config,
        validateStatus: () => true,
      }),
    );

    if (response.status < 200 || response.status >= 300) {
      throw this.buildAxiosError(response.status, response.data);
    }

    return response;
  }

  private buildAxiosError(status: number, data: unknown): Error {
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    return new Error(`Outbound HTTP request failed with status ${status}: ${body}`);
  }

  private async buildFetchError(response: Response): Promise<Error> {
    const body = await response.text();
    return new Error(`Outbound HTTP request failed with status ${response.status}: ${body}`);
  }
}
