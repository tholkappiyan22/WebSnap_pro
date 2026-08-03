import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { normalizeURL, getDomain } from '../utils/url';

/** Options for the crawler */
export interface CrawlOptions {
  maxPages: number;
  maxDepth: number;
  timeout: number;
}

/** Result of a crawl operation */
export interface CrawlResult {
  pages: DiscoveredPage[];
  totalFound: number;
  domain: string;
}

/** A single discovered page */
export interface DiscoveredPage {
  url: string;
  path: string;
  title?: string;
  depth: number;
  source: 'link' | 'sitemap' | 'common' | 'robots';
}

// Links to skip during crawling
const SKIP_PREFIXES = ['mailto:', 'tel:', 'javascript:', 'data:', 'blob:', 'ftp:'];
const SKIP_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.zip', '.tar', '.gz',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.csv',
  '.exe', '.dmg', '.apk', '.woff', '.woff2', '.ttf', '.eot',
];
const SOCIAL_DOMAINS = [
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com',
  'youtube.com', 'tiktok.com', 'pinterest.com', 'reddit.com', 'github.com',
  'wa.me', 'whatsapp.com', 't.me', 'telegram.org',
];
const COMMON_PATHS = [
  '/', '/about', '/about-us', '/services', '/products', '/blog',
  '/contact', '/contact-us', '/pricing', '/faq', '/team',
  '/careers', '/privacy', '/privacy-policy', '/terms', '/terms-of-service',
];

/**
 * Crawls a website starting from the given URL, discovering all internal pages.
 * Uses BFS with depth limiting and page count limiting.
 */
export async function crawlWebsite(
  startUrl: string,
  options: CrawlOptions,
  onPageDiscovered?: (page: DiscoveredPage) => void
): Promise<CrawlResult> {
  const domain = getDomain(startUrl);
  const visited = new Set<string>();
  const pages: DiscoveredPage[] = [];
  const queue: Array<{ url: string; depth: number }> = [];

  // Start with the provided URL
  const normalizedStart = normalizeURL(startUrl);
  visited.add(normalizedStart);
  queue.push({ url: normalizedStart, depth: 0 });

  // Try to discover pages from sitemap.xml and robots.txt
  const sitemapPages = await discoverFromSitemap(startUrl, domain);
  const robotsPages = await discoverFromRobots(startUrl, domain);

  // Add sitemap and robots discoveries to the queue
  for (const sp of sitemapPages) {
    const normalized = normalizeURL(sp);
    if (!visited.has(normalized)) {
      visited.add(normalized);
      queue.push({ url: normalized, depth: 1 });
    }
  }
  for (const rp of robotsPages) {
    const normalized = normalizeURL(rp);
    if (!visited.has(normalized)) {
      visited.add(normalized);
      queue.push({ url: normalized, depth: 1 });
    }
  }

  // Helper to append common paths
  let addedCommonPaths = false;

  // BFS crawl
  while (queue.length > 0 && pages.length < options.maxPages) {
    const current = queue.shift()!;

    if (current.depth > options.maxDepth) continue;

    try {
      const response = await axios.get(current.url, {
        timeout: options.timeout,
        headers: {
          'User-Agent': 'WebSnapPro/1.0 (Screenshot Bot)',
          'Accept': 'text/html',
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      });

      const contentType = String(response.headers['content-type'] || '');
      if (!contentType.includes('text/html')) continue;

      const html = response.data as string;
      const $ = cheerio.load(html);
      const title = $('title').first().text().trim() || undefined;
      const path = new URL(current.url).pathname;

      const page: DiscoveredPage = {
        url: current.url,
        path,
        title,
        depth: current.depth,
        source: current.depth === 0 ? 'link' : determineSouce(current.url, sitemapPages, robotsPages),
      };

      pages.push(page);
      onPageDiscovered?.(page);

      // Extract and queue new links if we haven't hit the depth limit
      if (current.depth < options.maxDepth && pages.length < options.maxPages) {
        const links = extractLinks(html, current.url);
        const internalLinks = filterInternalLinks(links, domain);

        for (const link of internalLinks) {
          const normalized = normalizeURL(link);
          if (!visited.has(normalized)) {
            visited.add(normalized);
            queue.push({ url: normalized, depth: current.depth + 1 });
          }
        }
      }

      // Add common fallback paths to check if queue is low
      if (!addedCommonPaths && queue.length === 0) {
        addedCommonPaths = true;
        for (const commonPath of COMMON_PATHS) {
          try {
            const commonUrl = new URL(commonPath, startUrl).toString();
            const normalized = normalizeURL(commonUrl);
            if (!visited.has(normalized)) {
              visited.add(normalized);
              queue.push({ url: normalized, depth: 1 });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (error: any) {
      // Don't spam console for 404s on speculative links
      if (error.response?.status !== 404) {
        console.warn(`Crawl skip: ${current.url} — ${error.message || 'Unknown error'}`);
      }
    }
  }

  return {
    pages,
    totalFound: visited.size,
    domain,
  };
}

/**
 * Extracts all href links from an HTML document.
 */
export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    // Skip non-navigational links
    if (SKIP_PREFIXES.some(prefix => href.toLowerCase().startsWith(prefix))) return;

    // Skip hash-only links
    if (href === '#' || (href.startsWith('#') && !href.startsWith('#/'))) return;

    // Resolve relative URLs
    try {
      const resolved = new URL(href, baseUrl).toString();
      links.push(resolved);
    } catch {
      // Skip malformed URLs
    }
  });

  // Also extract from canonical and alternate links
  $('link[rel="canonical"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        links.push(new URL(href, baseUrl).toString());
      } catch { /* ignore */ }
    }
  });

  return links;
}

/**
 * Filters links to keep only internal (same-domain) links, excluding
 * file downloads, social media, and other non-page resources.
 */
export function filterInternalLinks(links: string[], domain: string): string[] {
  const filtered: string[] = [];

  for (const link of links) {
    try {
      const parsed = new URL(link);

      // Same domain only
      if (parsed.hostname !== domain && !parsed.hostname.endsWith('.' + domain)) continue;

      // Skip file downloads
      const ext = parsed.pathname.split('.').pop()?.toLowerCase();
      if (ext && SKIP_EXTENSIONS.includes('.' + ext)) continue;

      // Skip social media domains (shouldn't happen since we're filtering same-domain, but just in case)
      if (SOCIAL_DOMAINS.some(sd => parsed.hostname.includes(sd))) continue;

      filtered.push(link);
    } catch {
      // Skip malformed URLs
    }
  }

  return filtered;
}

/**
 * Attempts to discover URLs from sitemap.xml.
 */
async function discoverFromSitemap(baseUrl: string, domain: string): Promise<string[]> {
  const urls: string[] = [];
  try {
    const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString();
    const response = await axios.get(sitemapUrl, {
      timeout: 10000,
      headers: { 'User-Agent': 'WebSnapPro/1.0' },
      validateStatus: (status) => status === 200,
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    $('loc').each((_, el) => {
      const loc = $(el).text().trim();
      if (loc && getDomain(loc) === domain) {
        urls.push(loc);
      }
    });
  } catch {
    // Sitemap not available — that's fine
  }
  return urls;
}

/**
 * Attempts to discover URLs from robots.txt.
 */
async function discoverFromRobots(baseUrl: string, domain: string): Promise<string[]> {
  const urls: string[] = [];
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString();
    const response = await axios.get(robotsUrl, {
      timeout: 10000,
      headers: { 'User-Agent': 'WebSnapPro/1.0' },
      validateStatus: (status) => status === 200,
    });

    const text = response.data as string;
    // Look for Sitemap directives
    const sitemapMatches = text.match(/Sitemap:\s*(.+)/gi);
    if (sitemapMatches) {
      for (const match of sitemapMatches) {
        const sitemapUrl = match.replace(/Sitemap:\s*/i, '').trim();
        if (sitemapUrl) {
          // Recursively discover from referenced sitemaps
          const sitemapPages = await discoverFromSitemap(sitemapUrl, domain);
          urls.push(...sitemapPages);
        }
      }
    }
  } catch {
    // robots.txt not available — that's fine
  }
  return urls;
}

/**
 * Determines the source of a discovered page.
 */
function determineSouce(
  url: string,
  sitemapPages: string[],
  robotsPages: string[]
): DiscoveredPage['source'] {
  if (sitemapPages.includes(url)) return 'sitemap';
  if (robotsPages.includes(url)) return 'robots';
  if (COMMON_PATHS.includes(new URL(url).pathname)) return 'common';
  return 'link';
}
