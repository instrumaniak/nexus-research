import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiConfig } from '../config';
import { OutboundHttpService } from '../outbound-http/outbound-http.service';

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
  constructor(
    private readonly configService: ConfigService,
    private readonly outboundHttpService: OutboundHttpService,
  ) {}

  async complete(params: CompletionParams): Promise<string> {
    const data = await this.outboundHttpService.postJson<ChatCompletionResponse>(this.buildUrl(), {
      headers: this.buildHeaders(),
      body: {
        model: params.model,
        stream: false,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
      },
    });
    const content = data.choices?.[0]?.message?.content;

    return this.extractContent(content);
  }

  async *stream(params: CompletionParams): AsyncGenerator<string> {
    for await (const payload of this.outboundHttpService.streamSse(this.buildUrl(), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: {
        model: params.model,
        stream: true,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
      },
    })) {
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

  private buildHeaders(): Record<string, string> {
    const apiKey = this.requireConfig<AiConfig['apiKey']>('ai.apiKey');

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://raziur.com',
      'X-Title': 'Nexus',
    };
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
