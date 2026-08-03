import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import { crawlWebsite, CrawlOptions, DiscoveredPage } from './crawler.service';
import { capturePage, CaptureOptions, VIEWPORTS, closeBrowser } from './screenshot.service';
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
 * In-memory job manager with event-based progress tracking.
 * Manages the lifecycle of scan jobs: crawl → capture → zip.
 */
class JobService extends EventEmitter {
  private activeJobs = new Map<string, { aborted: boolean }>();
  private maxConcurrent: number;

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many SSE listeners
    this.maxConcurrent = parseInt(process.env.MAX_CONCURRENT_CAPTURES || '3', 10);
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
        timeout: 15000,
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

      await this.log(scanId, 'info', `Starting screenshot capture: ${totalCaptures} total`);

      const pendingPages = await prisma.page.findMany({
        where: { scanId, status: 'pending' },
      });

      let completed = 0;
      const startTime = Date.now();
      const zipEntries: ZipEntry[] = [];

      // Process captures in batches for concurrency control
      const batches = chunkArray(pendingPages, this.maxConcurrent);

      for (const batch of batches) {
        if (jobState.aborted) break;

        const capturePromises = batch.map(async (pageRecord) => {
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
              timeout: parseInt(process.env.DEFAULT_CAPTURE_TIMEOUT || '30000', 10),
              preDelay: parseInt(process.env.DEFAULT_PRE_CAPTURE_DELAY || '1000', 10),
              deviceType: pageRecord.deviceType,
            };

            const result = await capturePage(
              pageRecord.url,
              screenshotsDir,
              filename,
              captureOptions
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
            completed++;
          }
        });

        await Promise.all(capturePromises);
      }

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
      // Close browser to free resources
      await closeBrowser();
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

/**
 * Splits an array into chunks of a given size.
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Singleton instance
export const jobService = new JobService();
