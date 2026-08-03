import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { validateUrl, sanitizeInput } from '../utils/url';
import { jobService, ProgressUpdate } from '../services/job.service';
import { streamZipToResponse } from '../services/zip.service';
import { crawlWebsite } from '../services/crawler.service';

const prisma = new PrismaClient();

/**
 * POST /api/scan — Start a new website scan
 */
export async function startScan(req: Request, res: Response): Promise<void> {
  try {
    const {
      url: rawUrl,
      deviceTypes = 'desktop',
      format = 'png',
      quality = 90,
      maxPages = 50,
      maxDepth = 3,
    } = req.body;

    if (!rawUrl) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    // Sanitize and validate
    const sanitized = sanitizeInput(rawUrl);
    const validation = await validateUrl(sanitized);

    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    // Create scan record
    const scan = await prisma.scan.create({
      data: {
        id: uuidv4(),
        url: validation.url!,
        deviceTypes,
        format,
        quality: Math.min(Math.max(quality, 1), 100),
        maxPages: Math.min(Math.max(maxPages, 1), 200),
        maxDepth: Math.min(Math.max(maxDepth, 1), 10),
        status: 'pending',
      },
    });

    // Start the scan job asynchronously
    jobService.startScan(scan.id).catch((err) => {
      console.error(`Scan job ${scan.id} failed:`, err);
    });

    res.status(201).json({
      id: scan.id,
      url: scan.url,
      status: scan.status,
      message: 'Scan started successfully',
    });
  } catch (error: any) {
    console.error('startScan error:', error);
    res.status(500).json({ error: 'Failed to start scan' });
  }
}

/**
 * POST /api/crawl — Crawl-only mode (discover pages without capturing)
 */
export async function crawlOnly(req: Request, res: Response): Promise<void> {
  try {
    const { url: rawUrl, maxPages = 50, maxDepth = 3 } = req.body;

    if (!rawUrl) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    const sanitized = sanitizeInput(rawUrl);
    const validation = await validateUrl(sanitized);

    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const result = await crawlWebsite(validation.url!, {
      maxPages: Math.min(maxPages, 200),
      maxDepth: Math.min(maxDepth, 10),
      timeout: 15000,
    });

    res.json({
      url: validation.url,
      domain: result.domain,
      pages: result.pages,
      totalFound: result.totalFound,
    });
  } catch (error: any) {
    console.error('crawlOnly error:', error);
    res.status(500).json({ error: 'Crawl failed' });
  }
}

/**
 * GET /api/progress/:id — SSE stream for live scan progress
 */
export async function getProgress(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  // Verify scan exists
  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial state
  const completedPages = await prisma.page.count({
    where: { scanId: id, status: 'completed' },
  });

  const initialProgress: ProgressUpdate = {
    scanId: id,
    status: scan.status as any,
    pagesDiscovered: scan.pagesTotal,
    pagesCompleted: completedPages,
    pagesTotal: scan.pagesTotal,
  };

  res.write(`data: ${JSON.stringify(initialProgress)}\n\n`);

  // If already completed/failed, close the stream
  if (scan.status === 'completed' || scan.status === 'failed') {
    res.end();
    return;
  }

  // Listen for progress events
  const onProgress = (progress: ProgressUpdate) => {
    res.write(`data: ${JSON.stringify(progress)}\n\n`);

    if (progress.status === 'completed' || progress.status === 'failed') {
      res.end();
    }
  };

  jobService.on(`progress:${id}`, onProgress);

  // Clean up on client disconnect
  req.on('close', () => {
    jobService.off(`progress:${id}`, onProgress);
  });
}

/**
 * GET /api/screenshots/:id — List all screenshots for a scan
 */
export async function getScreenshots(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  const scan = (await prisma.scan.findUnique({
    where: { id },
    include: {
      pages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })) as any;

  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }

  // Convert absolute paths to relative URLs for the frontend
  const pages = (scan.pages || []).map((page: any) => ({
    id: page.id,
    url: page.url,
    path: page.path,
    title: page.title,
    status: page.status,
    deviceType: page.deviceType,
    viewportWidth: page.viewportWidth,
    viewportHeight: page.viewportHeight,
    fileSize: page.fileSize,
    errorMessage: page.errorMessage,
    screenshotUrl: page.screenshotPath
      ? `/screenshots/${id}/${path.basename(page.screenshotPath)}`
      : null,
    thumbnailUrl: page.thumbnailPath
      ? `/screenshots/${id}/${path.basename(page.thumbnailPath)}`
      : null,
  }));

  res.json({
    id: scan.id,
    url: scan.url,
    status: scan.status,
    createdAt: scan.createdAt,
    completedAt: scan.completedAt,
    deviceTypes: scan.deviceTypes,
    format: scan.format,
    quality: scan.quality,
    pageCount: scan.pageCount,
    pages,
  });
}

/**
 * GET /api/download/:id — Download ZIP archive for a scan
 */
export async function downloadZip(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }

  if (scan.status !== 'completed') {
    res.status(400).json({ error: 'Scan is not yet completed' });
    return;
  }

  if (!scan.zipPath) {
    res.status(404).json({ error: 'ZIP file not found' });
    return;
  }

  try {
    await fs.access(scan.zipPath);
  } catch {
    res.status(404).json({ error: 'ZIP file no longer exists on disk' });
    return;
  }

  const domain = new URL(scan.url).hostname.replace(/\./g, '-');
  streamZipToResponse(scan.zipPath, res, `${domain}.zip`);
}

/**
 * DELETE /api/scan/:id — Delete a scan and its files
 */
export async function deleteScan(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }

  // Abort if running
  jobService.abortScan(id);

  // Delete screenshot files
  const screenshotsDir = path.resolve(
    process.env.SCREENSHOTS_DIR || './screenshots',
    id
  );
  try {
    await fs.rm(screenshotsDir, { recursive: true, force: true });
  } catch {
    // Directory may not exist
  }

  // Delete database records (cascade handles Pages and Logs)
  await prisma.scan.delete({ where: { id } });

  res.json({ message: 'Scan deleted successfully' });
}

/**
 * GET /api/scans — List all scans (for dashboard)
 */
export async function listScans(req: Request, res: Response): Promise<void> {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const pageStr = typeof req.query.page === 'string' ? req.query.page : '1';
  const limitStr = typeof req.query.limit === 'string' ? req.query.limit : '20';

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.url = { contains: search };
  }

  const pageNum = Math.max(parseInt(pageStr, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(limitStr, 10) || 20, 1), 100);

  const [scans, total] = await Promise.all([
    prisma.scan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { pages: true },
        },
      },
    }),
    prisma.scan.count({ where }),
  ]);

  res.json({
    scans: scans.map((s: any) => ({
      id: s.id,
      url: s.url,
      status: s.status,
      createdAt: s.createdAt,
      completedAt: s.completedAt,
      pageCount: s.pageCount,
      pagesTotal: s.pagesTotal,
      deviceTypes: s.deviceTypes,
      format: s.format,
      errorMessage: s.errorMessage,
      totalPages: s._count.pages,
    })),
    pagination: {
      page: pageNum,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
