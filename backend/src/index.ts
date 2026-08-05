import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import scanRoutes from './routes/scan.routes';
import { apiRateLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// --- Middleware ---
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(url => url.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    const cleanOrigin = origin.trim().replace(/\/$/, '');
    
    // Allow if in allowedOrigins list, if localhost, or if a .vercel.app domain
    if (
      allowedOrigins.includes(cleanOrigin) ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.includes('localhost')
    ) {
      return callback(null, true);
    }
    
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter
app.use('/api', apiRateLimiter);

// --- Static file serving for screenshots ---
const screenshotsDir = path.resolve(process.env.SCREENSHOTS_DIR || './screenshots');
app.use('/screenshots', express.static(screenshotsDir));

// --- API Routes ---
app.use('/api', scanRoutes);

// --- Health check ---
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// --- 404 handler ---
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// --- Error handler ---
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║                                          ║
  ║   🚀 WebSnap Pro Backend                 ║
  ║   Running on http://localhost:${PORT}       ║
  ║                                          ║
  ╚══════════════════════════════════════════╝
  `);
});

export default app;
