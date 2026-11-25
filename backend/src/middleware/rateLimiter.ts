import rateLimit from 'express-rate-limit';

// Rate limiter for telemetry ingestion: 120 requests per minute per IP
export const telemetryRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many telemetry packets sent from this IP. Please throttle update interval.',
  },
});

// General rate limiter for read queries
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
});
