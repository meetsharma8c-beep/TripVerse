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
      resetMs: windowMs,
      distributed: false
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
      resetMs,
      distributed: false
    };
  }

  return {
    allowed: true,
    current: existing.count,
    limit,
    remaining,
    resetMs,
    distributed: false
  };
}

/**
 * Distributed rate limiter backed by Upstash Redis REST API when
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are configured.
 * Automatically falls back to the in-memory limiter if Redis is unavailable.
 *
 * @param {string} key Identifier (e.g. endpoint:ip)
 * @param {number} limit Maximum requests allowed in window
 * @param {number} windowMs Time window in milliseconds
 * @returns {Promise<{ allowed: boolean, current: number, limit: number, remaining: number, resetMs: number, distributed: boolean }>}
 */
export async function checkDistributedRateLimit(key, limit = 20, windowMs = 60 * 1000) {
  const redisUrl = (process.env.UPSTASH_REDIS_REST_URL || '').trim().replace(/\/+$/, '');
  const redisToken = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();

  if (!redisUrl || !redisToken || typeof fetch !== 'function') {
    return checkRateLimit(key, limit, windowMs);
  }

  const redisKey = `tripverse:rl:${key}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${redisUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['PTTL', redisKey]
      ]),
      signal: controller.signal
    });

    if (!response.ok) {
      return checkRateLimit(key, limit, windowMs);
    }

    const results = await response.json();
    const count = Number(results?.[0]?.result ?? 1);
    let ttlMs = Number(results?.[1]?.result ?? -1);

    if (count === 1 || ttlMs < 0) {
      await fetch(`${redisUrl}/pexpire/${encodeURIComponent(redisKey)}/${windowMs}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redisToken}` },
        signal: controller.signal
      }).catch(() => {});
      ttlMs = windowMs;
    }

    const remaining = Math.max(0, limit - count);
    return {
      allowed: count <= limit,
      current: count,
      limit,
      remaining,
      resetMs: Math.max(0, ttlMs),
      distributed: true
    };
  } catch {
    return checkRateLimit(key, limit, windowMs);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Attach standard X-RateLimit-* response headers for transparency and client backoff.
 */
export function applyRateLimitHeaders(res, rateResult) {
  if (!res || typeof res.setHeader !== 'function' || !rateResult) return;
  res.setHeader('X-RateLimit-Limit', String(rateResult.limit));
  res.setHeader('X-RateLimit-Remaining', String(rateResult.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil((Date.now() + (rateResult.resetMs || 0)) / 1000)));
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
    'https://trip-verse.com',
    'https://www.trip-verse.com',
    'https://tripverse-pied.vercel.app',
    'https://tripverse.concode.com',
    'https://www.tripverse.concode.com',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'capacitor://localhost',
    'ionic://localhost',
    'https://localhost',
    'http://localhost'
  ];

  const origin = req.headers?.origin || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', allowedMethods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Admin-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  return corsOrigin;
}

/**
 * Sanitize untrusted strings before interpolation into HTML email templates
 * to prevent HTML/XSS injection attacks.
 */
export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function handler(req, res) {
  applyCorsHeaders(req, res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({ ok: true, service: 'rateLimiter' });
}
