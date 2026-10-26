// In-memory sliding window rate limiter for Vercel serverless functions
const ipRequestCounts = new Map();

// Periodically clean up old entries every 5 minutes to prevent memory accumulation
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, record] of ipRequestCounts.entries()) {
    if (now > record.resetTime) {
      ipRequestCounts.delete(key);
    }
  }
}

/**
 * Check if the given IP address is within rate limit.
 * @param {string} key Identifier (e.g. IP + endpoint)
 * @param {number} limit Maximum requests allowed in window
 * @param {number} windowMs Time window in milliseconds
 * @returns {{ allowed: boolean, current: number, limit: number, remaining: number, resetMs: number }}
 */
export function checkRateLimit(key, limit = 20, windowMs = 60 * 1000) {
  cleanup();
  const now = Date.now();
  const existing = ipRequestCounts.get(key);

  if (!existing || now > existing.resetTime) {
    ipRequestCounts.set(key, { count: 1, resetTime: now + windowMs });
    return {
      allowed: true,
      current: 1,
      limit,
      remaining: limit - 1,
      resetMs: windowMs
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const resetMs = Math.max(0, existing.resetTime - now);

  if (existing.count > limit) {
    return {
      allowed: false,
      current: existing.count,
      limit,
      remaining: 0,
      resetMs
    };
  }

  return {
    allowed: true,
    current: existing.count,
    limit,
    remaining,
    resetMs
  };
}

/**
 * Extract caller's real client IP address from Vercel / Cloudflare headers
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown-client';
}

/**
 * Apply secure CORS headers restricted to TripVerse production & dev domains
 */
export function applyCorsHeaders(req, res, allowedMethods = 'GET, POST, OPTIONS') {
  const allowedOrigins = [
    'https://tripverse-pied.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'capacitor://localhost',
    'http://localhost'
  ];

  const origin = req.headers?.origin || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', allowedMethods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-store');

  return corsOrigin;
}
