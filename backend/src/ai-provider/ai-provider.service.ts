import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiConfig } from '../config';

interface CompletionParams {
  model: string;
  systemPrompt: string;
  userPrompt: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

interface StreamChunkResponse {
  choices?: Array<{
    delta?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

@Injectable()
export class AiProviderService {
  constructor(private readonly configService: ConfigService) {}

  async complete(params: CompletionParams): Promise<string> {
    const response = await fetch(this.buildUrl(), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: params.model,
        stream: false,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw await this.buildHttpError(response);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;

    return this.extractContent(content);
  }

  async *stream(params: CompletionParams): AsyncGenerator<string> {
    const response = await fetch(this.buildUrl(), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: params.model,
        stream: true,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw await this.buildHttpError(response);
    }

    if (!response.body) {
      throw new Error('AI provider returned an empty stream body');
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

          const parsed = JSON.parse(payload) as StreamChunkResponse;
          const content = parsed.choices?.[0]?.delta?.content;
          const token = this.extractContent(content);

          if (token) {
            yield token;
          }
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

      const parsed = JSON.parse(payload) as StreamChunkResponse;
      const content = parsed.choices?.[0]?.delta?.content;
      const token = this.extractContent(content);

      if (token) {
        yield token;
      }
    }
  }

  private buildUrl(): string {
    const baseUrl = this.requireConfig<AiConfig['baseUrl']>('ai.baseUrl');
    return `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  }

  private buildHeaders(): HeadersInit {
    const apiKey = this.requireConfig<AiConfig['apiKey']>('ai.apiKey');

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://raziur.com',
      'X-Title': 'Nexus',
    };
  }

  private async buildHttpError(response: Response): Promise<Error> {
    const body = await response.text();
    return new Error(`AI provider request failed with status ${response.status}: ${body}`);
  }

  private extractContent(
    content: string | Array<{ type?: string; text?: string }> | undefined,
  ): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => part.text ?? '')
        .join('')
        .trim();
    }

    return '';
  }

  private requireConfig<T>(key: string): T {
    const value = this.configService.get<T>(key);
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing required config: ${key}`);
    }
    return value;
  }
}
