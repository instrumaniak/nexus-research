import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SearchConfig } from '../../config';

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

interface BraveSearchResponse {
  web?: {
    results?: Array<{
      url?: string;
      title?: string;
      description?: string;
    }>;
  };
}

interface DuckDuckGoTopic {
  FirstURL?: string;
  Text?: string;
  Result?: string;
  Topics?: DuckDuckGoTopic[];
}

interface DuckDuckGoResponse {
  Heading?: string;
  AbstractURL?: string;
  AbstractText?: string;
  RelatedTopics?: DuckDuckGoTopic[];
}

@Injectable()
export class SearchAgent {
  private readonly logger = new Logger(SearchAgent.name);

  constructor(private readonly configService: ConfigService) {}

  async search(query: string): Promise<SearchResult[]> {
    this.logger.log(`Running SearchAgent - query length: ${query.length}`);

    try {
      const provider =
        this.configService.get<SearchConfig['provider']>('search.provider') ?? 'duckduckgo';

      const results =
        provider === 'brave' ? await this.searchBrave(query) : await this.searchDuckDuckGo(query);

      const limited = results.slice(0, 5);
      this.logger.log(`Completed SearchAgent - results: ${limited.length}`);
      return limited;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown search error';
      this.logger.warn(`SearchAgent failed: ${message}`);
      return [];
    }
  }

  private async searchBrave(query: string): Promise<SearchResult[]> {
    const apiKey = this.configService.get<SearchConfig['providerApiKey']>('search.providerApiKey');

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: apiKey ? { 'X-Subscription-Token': apiKey } : {},
      },
    );

    if (!response.ok) {
      throw new Error(`Brave search failed with status ${response.status}`);
    }

    const data = (await response.json()) as BraveSearchResponse;

    return (data.web?.results ?? [])
      .filter(
        (
          result,
        ): result is {
          url: string;
          title: string;
          description: string;
        } => Boolean(result.url && result.title && result.description),
      )
      .map((result) => ({
        url: result.url,
        title: result.title,
        snippet: result.description,
      }));
  }

  private async searchDuckDuckGo(query: string): Promise<SearchResult[]> {
    const response = await fetch(
      `https://api.duckduckgo.com/?format=json&q=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed with status ${response.status}`);
    }

    const data = (await response.json()) as DuckDuckGoResponse;
    const results: SearchResult[] = [];

    if (data.AbstractURL && data.AbstractText) {
      results.push({
        url: data.AbstractURL,
        title: data.Heading || data.AbstractURL,
        snippet: data.AbstractText,
      });
    }

    for (const topic of this.flattenTopics(data.RelatedTopics ?? [])) {
      if (!topic.FirstURL || !topic.Text) {
        continue;
      }

      results.push({
        url: topic.FirstURL,
        title: this.extractDuckDuckGoTitle(topic),
        snippet: topic.Text,
      });
    }

    return results;
  }

  private flattenTopics(topics: DuckDuckGoTopic[]): DuckDuckGoTopic[] {
    return topics.flatMap((topic) => {
      if (topic.Topics?.length) {
        return this.flattenTopics(topic.Topics);
      }

      return [topic];
    });
  }

  private extractDuckDuckGoTitle(topic: DuckDuckGoTopic): string {
    const candidate = topic.Result ?? topic.Text ?? topic.FirstURL ?? 'Untitled result';
    const withoutTags = candidate.replace(/<[^>]+>/g, '');
    return withoutTags.split(' - ')[0]?.trim() || 'Untitled result';
  }
}
