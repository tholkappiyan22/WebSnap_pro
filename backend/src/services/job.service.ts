import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import { crawlWebsite, CrawlOptions, DiscoveredPage } from './crawler.service';
import { capturePage, CaptureOptions, VIEWPORTS } from './screenshot.service';
import { createZipArchive, ZipEntry } from './zip.service';
import { generateScreenshotFilename } from '../utils/filename';
import { getDomain } from '../utils/url';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

/** Progress update sent via SSE */
export interface ProgressUpdate {
  scanId: string;
  status: string;
  pagesDiscovered: number;
  pagesCompleted: number;
  pagesTotal: number;
  currentPage?: string;
  estimatedTimeRemaining?: number; // seconds
  error?: string;
}

/**
 * Runs up to `concurrency` async tasks at once using a semaphore pool.
 * Unlike chunked batching, idle workers immediately pick up the next task.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (true) {
      const taskIndex = index++;
      if (taskIndex >= tasks.length) break;
      results[taskIndex] = await tasks[taskIndex]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Attempts a capture with up to `maxRetries` retries on transient failures.
 */
async function captureWithRetry(
  url: string,
  outputDir: string,
  filename: string,
  options: CaptureOptions,
  maxRetries = 1
): Promise<Awaited<ReturnType<typeof capturePage>>> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await capturePage(url, outputDir, filename, options);
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        console.warn(`  ↩ Retrying (${attempt + 1}/${maxRetries}): ${url} — ${err.message}`);
        // Brief pause before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  throw lastError;
}

/**
 * In-memory job manager with event-based progress tracking.
 * Manages the lifecycle of scan jobs: crawl → capture → zip.
 */
class JobService extends EventEmitter {
  private activeJobs = new Map<string, { aborted: boolean }>();
  private maxConcurrent: number;

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many SSE listeners
    // Default concurrency to 1 (prevents OOM on 512MB free cloud tiers)
    this.maxConcurrent = parseInt(process.env.MAX_CONCURRENT_CAPTURES || '1', 10);
  }

  /**
   * Starts a new scan job. Runs asynchronously — returns immediately.
   * Progress is emitted via events that SSE clients can subscribe to.
   */
  async startScan(scanId: string): Promise<void> {
    const jobState = { aborted: false };
    this.activeJobs.set(scanId, jobState);

    try {
      // Fetch scan config from database
      const scan = await prisma.scan.findUnique({ where: { id: scanId } });
      if (!scan) throw new Error('Scan not found');

      // --- Phase 1: Crawl ---
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: 'crawling' },
      });

      this.emitProgress(scanId, {
        scanId,
        status: 'crawling',
        pagesDiscovered: 0,
        pagesCompleted: 0,
        pagesTotal: 0,
      });

      await this.log(scanId, 'info', `Starting crawl of ${scan.url}`);

      const crawlOptions: CrawlOptions = {
        maxPages: scan.maxPages,
        maxDepth: scan.maxDepth,
        timeout: 12000, // Reduced from 15000ms for faster crawl
      };

      let pagesDiscoveredCount = 0;
      const crawlResult = await crawlWebsite(scan.url, crawlOptions, (page) => {
        pagesDiscoveredCount++;
        this.emitProgress(scanId, {
          scanId,
          status: 'crawling',
          pagesDiscovered: pagesDiscoveredCount,
          pagesCompleted: 0,
          pagesTotal: 0,
          currentPage: page.url,
        });
      });

      if (jobState.aborted) return;

      await this.log(scanId, 'info', `Crawl complete: ${crawlResult.pages.length} pages found`);

      // Determine device types to capture
      const deviceTypes = scan.deviceTypes.split(',').map(d => d.trim()).filter(Boolean);

      // Total captures = pages × devices
      const totalCaptures = crawlResult.pages.length * deviceTypes.length;

      // Save discovered pages to database
      const screenshotsDir = path.resolve(
        process.env.SCREENSHOTS_DIR || './screenshots',
        scanId
      );
      await fs.mkdir(screenshotsDir, { recursive: true });

      // Create Page records for each page × device combination
      for (const page of crawlResult.pages) {
        for (const deviceType of deviceTypes) {
          const viewport = VIEWPORTS[deviceType] || VIEWPORTS.desktop;
          await prisma.page.create({
            data: {
              scanId,
              url: page.url,
              path: page.path,
              title: page.title,
              deviceType,
              viewportWidth: viewport.width,
              viewportHeight: viewport.height,
              status: 'pending',
            },
          });
        }
      }

      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'capturing',
          pagesTotal: totalCaptures,
        },
      });

      // --- Phase 2: Capture Screenshots ---
      this.emitProgress(scanId, {
        scanId,
        status: 'capturing',
        pagesDiscovered: crawlResult.pages.length,
        pagesCompleted: 0,
        pagesTotal: totalCaptures,
      });

      await this.log(scanId, 'info', `Starting screenshot capture: ${totalCaptures} total (concurrency: ${this.maxConcurrent})`);

      const pendingPages = await prisma.page.findMany({
        where: { scanId, status: 'pending' },
      });

      let completed = 0;
      const startTime = Date.now();
      const zipEntries: ZipEntry[] = [];

      // Build task list for the concurrency pool
      const captureTasks = pendingPages.map((pageRecord) => async () => {
        if (jobState.aborted) return;

        try {
          await prisma.page.update({
            where: { id: pageRecord.id },
            data: { status: 'capturing' },
          });

          const filename = generateScreenshotFilename(
            pageRecord.path,
            pageRecord.deviceType,
            scan.format
          );

          const captureOptions: CaptureOptions = {
            format: scan.format as 'png' | 'jpeg' | 'webp',
            quality: scan.quality,
            // Use 25s Playwright timeout — gives buffer for slow pages
            timeout: parseInt(process.env.DEFAULT_CAPTURE_TIMEOUT || '25000', 10),
            // Default pre-delay to 0 for speed; user can override via env
            preDelay: parseInt(process.env.DEFAULT_PRE_CAPTURE_DELAY || '0', 10),
            deviceType: pageRecord.deviceType,
          };

          // Capture with 1 automatic retry on transient failures
          const result = await captureWithRetry(
            pageRecord.url,
            screenshotsDir,
            filename,
            captureOptions,
            1
          );

          await prisma.page.update({
            where: { id: pageRecord.id },
            data: {
              status: 'completed',
              screenshotPath: result.screenshotPath,
              thumbnailPath: result.thumbnailPath,
              fileSize: result.fileSize,
              title: result.title || pageRecord.title,
            },
          });

          zipEntries.push({
            filePath: result.screenshotPath,
            urlPath: pageRecord.path,
            deviceType: pageRecord.deviceType,
            format: scan.format,
          });

          if (result.additionalParts && result.additionalParts.length > 0) {
            for (let i = 0; i < result.additionalParts.length; i++) {
              zipEntries.push({
                filePath: result.additionalParts[i],
                urlPath: `${pageRecord.path}-part${i + 2}`,
                deviceType: pageRecord.deviceType,
                format: scan.format,
              });
            }
          }
        } catch (error: any) {
          console.error(`Screenshot failed: ${pageRecord.url}`, error.message);

          await prisma.page.update({
            where: { id: pageRecord.id },
            data: {
              status: 'failed',
              errorMessage: error.message || 'Screenshot capture failed',
            },
          });

          await this.log(scanId, 'error', `Failed: ${pageRecord.url} — ${error.message}`);
        } finally {
          completed++;
          const elapsed = (Date.now() - startTime) / 1000;
          const avgTime = elapsed / completed;
          const remaining = Math.round(avgTime * (totalCaptures - completed));

          this.emitProgress(scanId, {
            scanId,
            status: 'capturing',
            pagesDiscovered: crawlResult.pages.length,
            pagesCompleted: completed,
            pagesTotal: totalCaptures,
            currentPage: pageRecord.url,
            estimatedTimeRemaining: remaining,
          });
        }
      });

      // Run all captures through the concurrency pool (idle workers pick up immediately)
      await runWithConcurrency(captureTasks, this.maxConcurrent);

      if (jobState.aborted) return;

      // --- Phase 3: Create ZIP ---
      await this.log(scanId, 'info', 'Creating ZIP archive...');

      const domain = getDomain(scan.url);
      const zipFilename = `${domain.replace(/\./g, '-')}.zip`;

      let zipPath: string | null = null;
      if (zipEntries.length > 0) {
        zipPath = await createZipArchive(zipEntries, screenshotsDir, zipFilename);
      }

      // --- Done ---
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          pageCount: completed,
          zipPath,
        },
      });

      await this.log(scanId, 'info', `Scan completed: ${completed} screenshots captured`);

      this.emitProgress(scanId, {
        scanId,
        status: 'completed',
        pagesDiscovered: crawlResult.pages.length,
        pagesCompleted: completed,
        pagesTotal: totalCaptures,
      });
    } catch (error: any) {
      console.error(`Scan failed: ${scanId}`, error);

      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'failed',
          errorMessage: error.message || 'Scan failed',
        },
      });

      await this.log(scanId, 'error', `Scan failed: ${error.message}`);

      this.emitProgress(scanId, {
        scanId,
        status: 'failed',
        pagesDiscovered: 0,
        pagesCompleted: 0,
        pagesTotal: 0,
        error: error.message,
      });
    } finally {
      this.activeJobs.delete(scanId);
      // NOTE: Browser is intentionally kept alive between scans for warm reuse.
      // Chromium cold start costs ~2-3s; reusing saves significant time across multiple scans.
    }
  }

  /**
   * Aborts a running scan job.
   */
  abortScan(scanId: string): boolean {
    const job = this.activeJobs.get(scanId);
    if (job) {
      job.aborted = true;
      return true;
    }
    return false;
  }

  /**
   * Emits a progress event for SSE listeners.
   */
  private emitProgress(scanId: string, progress: ProgressUpdate): void {
    this.emit(`progress:${scanId}`, progress);
  }

  /**
   * Logs a message for the scan.
   */
  private async log(scanId: string, level: string, message: string): Promise<void> {
    try {
      await prisma.scanLog.create({
        data: { scanId, level, message },
      });
    } catch {
      console.error(`Failed to write log for scan ${scanId}: ${message}`);
    }
  }
}

// Singleton instance
export const jobService = new JobService();
