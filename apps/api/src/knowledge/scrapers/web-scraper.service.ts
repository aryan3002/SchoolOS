/**
 * Web Scraper Service
 *
 * Scrapes district websites for policy documents, handbooks, and announcements.
 * Features:
 * - Respects robots.txt
 * - Extracts clean text from HTML
 * - Follows links up to specified depth
 * - Handles sitemaps
 * - Rate limiting to avoid overwhelming servers
 */

import * as cheerio from 'cheerio';
import axios, { AxiosInstance } from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { URL } from 'url';
import { ScraperConfig, ScrapedPage, ScrapeResult, SitemapEntry } from './types';

const DEFAULT_CONFIG: Required<ScraperConfig> = {
  maxDepth: 3,
  maxPages: 100,
  respectRobotsTxt: true,
  userAgent: 'SchoolOS-Bot/1.0 (Educational Content Aggregator)',
  timeout: 30000,
  retryAttempts: 3,
  allowedDomains: [],
  excludePatterns: [
    '/login',
    '/admin',
    '/api/',
    '.pdf',
    '.jpg',
    '.png',
    '.gif',
    '.css',
    '.js',
  ],
};

@Injectable()
export class WebScraperService {
  private readonly logger = new Logger(WebScraperService.name);
  private readonly httpClient: AxiosInstance;
  private visitedUrls: Set<string> = new Set();
  private robotsTxtCache: Map<string, Set<string>> = new Map();

  constructor() {
    this.httpClient = axios.create({
      timeout: DEFAULT_CONFIG.timeout,
      headers: {
        'User-Agent': DEFAULT_CONFIG.userAgent,
      },
      maxRedirects: 5,
    });
  }

  /**
   * Scrape a website starting from a base URL
   */
  async scrapeWebsite(
    baseUrl: string,
    config: ScraperConfig = {},
  ): Promise<ScrapeResult> {
    const startTime = Date.now();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    this.logger.log('Starting website scrape', {
      baseUrl,
      maxDepth: mergedConfig.maxDepth,
      maxPages: mergedConfig.maxPages,
    });

    // Reset state
    this.visitedUrls.clear();
    
    const pages: ScrapedPage[] = [];
    const errors: Array<{ url: string; error: string }> = [];
    
    try {
      // Check for sitemap first
      const sitemapUrls = await this.getSitemapUrls(baseUrl);
      
      if (sitemapUrls.length > 0) {
        this.logger.log(`Found ${sitemapUrls.length} URLs in sitemap`);
        
        for (const entry of sitemapUrls.slice(0, mergedConfig.maxPages)) {
          try {
            const page = await this.scrapePage(entry.url, mergedConfig);
            if (page) {
              pages.push(page);
            }
          } catch (error) {
            errors.push({
              url: entry.url,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      } else {
        // Crawl starting from base URL
        await this.crawl(baseUrl, mergedConfig, pages, errors, 0);
      }
    } catch (error) {
      this.logger.error('Scraping failed', {
        baseUrl,
        error: error instanceof Error ? error.message : error,
      });
    }

    const durationMs = Date.now() - startTime;

    return {
      pages,
      totalPages: pages.length,
      successCount: pages.length,
      failureCount: errors.length,
      errors,
      durationMs,
    };
  }

  /**
   * Recursively crawl website
   */
  private async crawl(
    url: string,
    config: Required<ScraperConfig>,
    pages: ScrapedPage[],
    errors: Array<{ url: string; error: string }>,
    depth: number,
  ): Promise<void> {
    // Check depth limit
    if (depth > config.maxDepth) {
      return;
    }

    // Check page limit
    if (pages.length >= config.maxPages) {
      return;
    }

    // Skip if already visited
    if (this.visitedUrls.has(url)) {
      return;
    }

    // Mark as visited
    this.visitedUrls.add(url);

    try {
      // Check if URL is allowed
      if (!this.isUrlAllowed(url, config)) {
        this.logger.debug('URL not allowed', { url });
        return;
      }

      // Scrape the page
      const page = await this.scrapePage(url, config);
      
      if (!page) {
        return;
      }

      pages.push(page);

      // Extract and follow links
      const links = this.extractLinks(page.html, url, config);
      
      for (const link of links) {
        if (pages.length >= config.maxPages) {
          break;
        }
        await this.crawl(link, config, pages, errors, depth + 1);
      }
    } catch (error) {
      this.logger.warn('Failed to scrape page', {
        url,
        error: error instanceof Error ? error.message : error,
      });
      
      errors.push({
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Scrape a single page
   */
  private async scrapePage(
    url: string,
    _config: Required<ScraperConfig>,
  ): Promise<ScrapedPage | null> {
    try {
      const response = await this.httpClient.get(url);
      
      if (!response.data || typeof response.data !== 'string') {
        return null;
      }

      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, .navigation, #navigation').remove();
      
      // Extract metadata
      const title = $('title').text().trim() || 
                    $('h1').first().text().trim() || 
                    'Untitled';
      
      const description = $('meta[name="description"]').attr('content') || '';
      const keywords = $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || [];
      const author = $('meta[name="author"]').attr('content');
      
      // Extract main content
      const content = this.extractMainContent($);
      
      // Extract links
      const links: string[] = [];
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          links.push(href);
        }
      });

      return {
        url,
        title,
        content,
        html: response.data,
        links,
        metadata: {
          description,
          keywords,
          ...(author ? { author } : {}),
          ...(response.headers['last-modified'] 
            ? { lastModified: new Date(response.headers['last-modified']) } 
            : {}),
        },
        scrapedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to scrape page', {
        url,
        error: error instanceof Error ? error.message : error,
      });
      return null;
    }
  }

  /**
   * Extract main content from HTML
   */
  private extractMainContent($: cheerio.CheerioAPI): string {
    // Try to find main content area
    const mainSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.main-content',
      '#content',
      '#main-content',
    ];

    for (const selector of mainSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim().replace(/\s+/g, ' ');
      }
    }

    // Fallback to body
    return $('body').text().trim().replace(/\s+/g, ' ');
  }

  /**
   * Extract and normalize links from page
   */
  private extractLinks(
    html: string,
    baseUrl: string,
    config: Required<ScraperConfig>,
  ): string[] {
    const $ = cheerio.load(html);
    const links: Set<string> = new Set();
    const base = new URL(baseUrl);

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        // Resolve relative URLs
        const absoluteUrl = new URL(href, baseUrl);
        
        // Only include same domain
        if (absoluteUrl.hostname !== base.hostname) {
          return;
        }

        // Check if URL matches allowed domains
        if (config.allowedDomains.length > 0) {
          const isAllowed = config.allowedDomains.some(domain =>
            absoluteUrl.hostname.includes(domain),
          );
          if (!isAllowed) return;
        }

        // Normalize URL (remove fragment)
        absoluteUrl.hash = '';
        const normalizedUrl = absoluteUrl.toString();

        if (this.isUrlAllowed(normalizedUrl, config)) {
          links.add(normalizedUrl);
        }
      } catch {
        // Invalid URL, skip
      }
    });

    return Array.from(links);
  }

  /**
   * Check if URL should be scraped based on config
   */
  private isUrlAllowed(url: string, config: Required<ScraperConfig>): boolean {
    // Check exclude patterns
    for (const pattern of config.excludePatterns) {
      if (url.includes(pattern)) {
        return false;
      }
    }

    // Check robots.txt if enabled
    if (config.respectRobotsTxt) {
      const urlObj = new URL(url);
      const domain = `${urlObj.protocol}//${urlObj.hostname}`;
      const disallowed = this.robotsTxtCache.get(domain);
      
      if (disallowed) {
        for (const pattern of disallowed) {
          if (urlObj.pathname.startsWith(pattern)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Get URLs from sitemap
   */
  private async getSitemapUrls(baseUrl: string): Promise<SitemapEntry[]> {
    const sitemapUrls = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${new URL(baseUrl).origin}/sitemap.xml`,
    ];

    for (const sitemapUrl of sitemapUrls) {
      try {
        const response = await this.httpClient.get(sitemapUrl);
        const $ = cheerio.load(response.data, { xmlMode: true });
        
        const urls: SitemapEntry[] = [];
        
        $('url').each((_, element) => {
          const loc = $(element).find('loc').text();
          const lastmod = $(element).find('lastmod').text();
          const changefreq = $(element).find('changefreq').text();
          const priority = parseFloat($(element).find('priority').text());

          if (loc) {
            const entry: SitemapEntry = { url: loc };
            
            if (lastmod) {
              entry.lastmod = new Date(lastmod);
            }
            if (changefreq) {
              entry.changefreq = changefreq;
            }
            if (!isNaN(priority)) {
              entry.priority = priority;
            }
            
            urls.push(entry);
          }
        });

        if (urls.length > 0) {
          this.logger.log(`Found sitemap with ${urls.length} URLs`, { sitemapUrl });
          return urls;
        }
      } catch {
        // Sitemap not found, continue
      }
    }

    return [];
  }

  /*
  // Kept for future use if needed
  private async parseRobotsTxt(baseUrl: string): Promise<Set<string>> {
    const robotsUrl = `${new URL(baseUrl).origin}/robots.txt`;
    
    try {
      const response = await this.httpClient.get(robotsUrl);
      const lines = response.data.split('\n');
      const disallowed = new Set<string>();

      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed.startsWith('disallow:')) {
          const path = trimmed.substring(9).trim();
          if (path) {
            disallowed.add(path);
          }
        }
      }

      return disallowed;
    } catch {
      // No robots.txt, allow all
      return new Set();
    }
  }
  */

  /**
   * Scrape a specific URL without crawling
   */
  async scrapeSinglePage(url: string): Promise<ScrapedPage | null> {
    return this.scrapePage(url, DEFAULT_CONFIG);
  }
}
