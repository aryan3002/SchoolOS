/**
 * Web Scraper Types
 */

export interface ScraperConfig {
  maxDepth?: number;
  maxPages?: number;
  respectRobotsTxt?: boolean;
  userAgent?: string;
  timeout?: number;
  retryAttempts?: number;
  allowedDomains?: string[];
  excludePatterns?: string[];
}

export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  html: string;
  links: string[];
  metadata: {
    description?: string;
    keywords?: string[];
    author?: string;
    publishedDate?: Date;
    lastModified?: Date;
  };
  scrapedAt: Date;
}

export interface ScrapeResult {
  pages: ScrapedPage[];
  totalPages: number;
  successCount: number;
  failureCount: number;
  errors: Array<{
    url: string;
    error: string;
  }>;
  durationMs: number;
}

export interface SitemapEntry {
  url: string;
  lastmod?: Date;
  changefreq?: string;
  priority?: number;
}
