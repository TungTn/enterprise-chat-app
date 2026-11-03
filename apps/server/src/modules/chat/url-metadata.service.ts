import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { LinkPreviewMetadata } from '@enterprise-chat/shared-types';
import * as crypto from 'crypto';

@Injectable()
export class UrlMetadataService {
  private readonly logger = new Logger(UrlMetadataService.name);

  // Cache duration: 3 days (in seconds)
  private readonly CACHE_TTL = 3 * 24 * 60 * 60;

  // Regex to extract the first valid http/https URL in text
  private readonly URL_REGEX = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/i;

  constructor(private readonly redisService: RedisService) {}

  /**
   * Extract the first valid URL found in text content.
   */
  public extractFirstUrl(text: string): string | null {
    if (!text) return null;
    const match = text.match(this.URL_REGEX);
    if (!match) return null;

    let url = match[0];
    // Strip trailing punctuation often typed at the end of sentences (., !, ?, etc.)
    url = url.replace(/[.,!?;:)]+$/, '');

    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return url;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Check if a hostname/IP is private (SSRF protection).
   */
  private isPrivateHost(hostname: string): boolean {
    const clean = hostname.toLowerCase().trim();
    if (
      clean === 'localhost' ||
      clean.endsWith('.local') ||
      clean.endsWith('.internal') ||
      clean === '127.0.0.1' ||
      clean === '0.0.0.0' ||
      clean === '::1'
    ) {
      return true;
    }

    // Check private IPv4 ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const m = clean.match(ipv4Regex);
    if (m) {
      const b1 = parseInt(m[1], 10);
      const b2 = parseInt(m[2], 10);
      if (b1 === 10) return true;
      if (b1 === 127) return true;
      if (b1 === 169 && b2 === 254) return true;
      if (b1 === 192 && b2 === 168) return true;
      if (b1 === 172 && b2 >= 16 && b2 <= 31) return true;
    }

    return false;
  }

  /**
   * Fetch link metadata, using Redis cache if available.
   */
  public async getMetadata(url: string): Promise<LinkPreviewMetadata | null> {
    try {
      const parsed = new URL(url);
      if (this.isPrivateHost(parsed.hostname)) {
        this.logger.warn(`Blocked potential SSRF access to: ${url}`);
        return null;
      }

      // Check Redis cache first
      const cacheKey = `cache:link_meta:${crypto.createHash('md5').update(url).digest('hex')}`;
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore corrupted cache
        }
      }

      // Fetch HTML head from URL with timeout & size cap
      const metadata = await this.scrapeMetadata(url);
      if (metadata) {
        await this.redisService.set(cacheKey, JSON.stringify(metadata), this.CACHE_TTL);
        return metadata;
      }
    } catch (err: any) {
      this.logger.debug(`Could not scrape metadata for ${url}: ${err.message}`);
    }

    return null;
  }

  /**
   * Scrape HTML meta tags safely.
   */
  private async scrapeMetadata(rawUrl: string): Promise<LinkPreviewMetadata | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

    try {
      const response = await fetch(rawUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 EnterpriseChatBot/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi,en;q=0.9',
        },
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        return null;
      }

      // Read at most 64KB to avoid loading large payloads
      const reader = response.body?.getReader();
      let html = '';
      if (reader) {
        let totalBytes = 0;
        const maxBytes = 65536; // 64 KB

        while (totalBytes < maxBytes) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          totalBytes += value.length;
          html += new TextDecoder('utf-8', { fatal: false }).decode(value, { stream: true });
          if (html.includes('</head>') || html.includes('<body')) {
            break;
          }
        }
        try {
          reader.cancel();
        } catch {}
      } else {
        html = await response.text();
      }

      return this.parseHtmlMeta(rawUrl, html);
    } catch (err: any) {
      clearTimeout(timeoutId);
      return null;
    }
  }

  /**
   * Parse meta tags from HTML string.
   */
  private parseHtmlMeta(rawUrl: string, html: string): LinkPreviewMetadata | null {
    const getTag = (prop: string): string | null => {
      // <meta property="..." content="..."> or <meta name="..." content="...">
      const regex1 = new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`,
        'i'
      );
      const regex2 = new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`,
        'i'
      );
      const m1 = html.match(regex1);
      if (m1 && m1[1]) return this.decodeHtmlEntities(m1[1]);
      const m2 = html.match(regex2);
      if (m2 && m2[1]) return this.decodeHtmlEntities(m2[1]);
      return null;
    };

    let title =
      getTag('og:title') ||
      getTag('twitter:title') ||
      (() => {
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        return titleMatch ? this.decodeHtmlEntities(titleMatch[1].trim()) : null;
      })();

    let description =
      getTag('og:description') ||
      getTag('twitter:description') ||
      getTag('description');

    let imageUrl =
      getTag('og:image') ||
      getTag('og:image:url') ||
      getTag('twitter:image') ||
      getTag('twitter:image:src');

    let siteName =
      getTag('og:site_name') ||
      getTag('application-name');

    // Parse URL object for defaults
    try {
      const urlObj = new URL(rawUrl);
      if (!siteName) {
        siteName = urlObj.hostname.replace(/^www\./i, '');
      }

      // Resolve relative imageUrl
      if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        imageUrl = new URL(imageUrl, rawUrl).toString();
      }

      const favIcon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;

      // Don't return empty preview
      if (!title && !description && !imageUrl) {
        return null;
      }

      return {
        url: rawUrl,
        title: title || siteName || rawUrl,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        siteName: siteName || urlObj.hostname,
        favIcon,
      };
    } catch {
      return null;
    }
  }

  private decodeHtmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
}
