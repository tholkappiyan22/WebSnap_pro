import { Router } from 'express';
import {
  startScan,
  crawlOnly,
  getProgress,
  getScreenshots,
  downloadZip,
  deleteScan,
  listScans,
} from '../controllers/scan.controller';
import { scanRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/scan — Start a new scan (rate-limited)
router.post('/scan', scanRateLimiter, startScan);

// POST /api/crawl — Crawl-only mode (rate-limited)
router.post('/crawl', scanRateLimiter, crawlOnly);

// GET /api/progress/:id — SSE stream for live progress
router.get('/progress/:id', getProgress);

// GET /api/screenshots/:id — List screenshots for a scan
router.get('/screenshots/:id', getScreenshots);

// GET /api/download/:id — Download ZIP
router.get('/download/:id', downloadZip);

// DELETE /api/scan/:id — Delete a scan
router.delete('/scan/:id', deleteScan);

// GET /api/scans — List all scans (dashboard)
router.get('/scans', listScans);

export default router;
