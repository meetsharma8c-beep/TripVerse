import { describe, it, expect } from 'vitest';
import { checkRateLimit, getClientIp } from '../api/rateLimiter.js';

describe('Serverless Rate Limiter Unit Tests', () => {
  it('allows requests within limit', () => {
    const key = `test_ip_${Date.now()}_1`;
    const res1 = checkRateLimit(key, 3, 10000);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit(key, 3, 10000);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit(key, 3, 10000);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it('blocks requests exceeding limit', () => {
    const key = `test_ip_${Date.now()}_2`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 10000);
    }
    const blockedRes = checkRateLimit(key, 5, 10000);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
    expect(blockedRes.current).toBe(6);
  });

  it('correctly extracts client IP from headers', () => {
    const reqWithForwarded = {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' }
    };
    expect(getClientIp(reqWithForwarded)).toBe('203.0.113.195');

    const reqWithRealIp = {
      headers: { 'x-real-ip': '198.51.100.22' }
    };
    expect(getClientIp(reqWithRealIp)).toBe('198.51.100.22');
  });
});
