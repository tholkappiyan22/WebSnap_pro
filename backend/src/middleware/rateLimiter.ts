import rateLimit from 'express-rate-limit';

/**
 * Rate limiter middleware to prevent abuse.
 * Default: 100 requests per 15-minute window.
 */
export const apiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes',
  },
});

/**
 * Stricter rate limiter specifically for scan endpoints.
 * 10 scans per 15 minutes to prevent abuse of the screenshot engine.
 */
export const scanRateLimiter = rateLimit({
  windowMs: 900000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many scan requests. Please wait before starting another scan.',
    retryAfter: '15 minutes',
  },
});
