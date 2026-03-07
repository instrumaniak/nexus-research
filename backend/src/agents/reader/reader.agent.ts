import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { OutboundHttpService } from '../../outbound-http/outbound-http.service';

export interface ScrapedPage {
  url: string;
  title: string;
  text: string;
}

@Injectable()
export class ReaderAgent {
  private readonly logger = new Logger(ReaderAgent.name);

  constructor(private readonly outboundHttpService: OutboundHttpService) {}

  async scrape(urls: string[]): Promise<ScrapedPage[]> {
    this.logger.log(`Running ReaderAgent - urls received: ${urls.length}`);

    const pages: ScrapedPage[] = [];

    for (const url of urls.slice(0, 3)) {
      try {
        const html = await this.outboundHttpService.getText(url, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        });

        const $ = cheerio.load(html);
        $('script, style, nav, footer, header, aside').remove();

        const container = $('article').first().length
          ? $('article').first()
          : $('main').first().length
            ? $('main').first()
            : $('body').first();

        const text = container.text().replace(/\s+/g, ' ').trim().slice(0, 4000);
        const title = $('title').first().text().trim() || url;

        if (!text) {
          continue;
        }

        pages.push({ url, title, text });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown scrape error';
        this.logger.warn(`ReaderAgent skipped ${url}: ${message}`);
      }
    }

    this.logger.log(`Completed ReaderAgent - pages scraped: ${pages.length}`);
    return pages;
  }
}
