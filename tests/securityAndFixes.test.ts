import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveEmergencyCountryCode } from '../src/services/emergencySosService';
import { resolveApiUrl } from '../src/services/deviceService';

function createMockReqRes(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}) {
  let statusCode = 200;
  let jsonPayload: any = null;
  let sentBody: any = null;
  const resHeaders: Record<string, string> = {};

  const req: any = {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body,
    query: options.query || {},
  };

  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    setHeader: (k: string, v: string) => {
      resHeaders[k] = v;
      return res;
    },
    json: (data: any) => {
      jsonPayload = data;
      return res;
    },
    send: (body: any) => {
      sentBody = body;
      return res;
    },
    end: () => res,
  };

  return {
    req,
    res,
    getResult: () => ({ statusCode, jsonPayload, sentBody, resHeaders }),
  };
}

describe('Security, API & UX Fixes Verification', () => {
  const prevEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...prevEnv };
  });

  afterEach(() => {
    process.env = { ...prevEnv };
  });

  it('api/export-users rejects legacy hardcoded tripverse_admin_secret key', async () => {
    const handler = (await import('../api/export-users.js')).default;
    const { req, res, getResult } = createMockReqRes({
      method: 'GET',
      headers: {
        'x-forwarded-for': '10.0.0.42',
        'x-admin-key': 'tripverse_admin_secret',
      },
    });

    await handler(req, res);
    const { statusCode, jsonPayload } = getResult();
    expect(statusCode).toBe(401);
    expect(jsonPayload.error).toBe('UNAUTHORIZED');
  });

  it('api/rateLimiter sets Vary: Origin header for safe CORS caching', async () => {
    const { applyCorsHeaders } = await import('../api/rateLimiter.js');
    const { req, res, getResult } = createMockReqRes({
      headers: { origin: 'https://trip-verse.com' },
    });

    applyCorsHeaders(req, res);
    const { resHeaders } = getResult();
    expect(resHeaders['Vary']).toBe('Origin');
    expect(resHeaders['Access-Control-Allow-Origin']).toBe('https://trip-verse.com');
  });

  it('api/email-otp enforces brute-force lockout after 5 failed verification attempts', async () => {
    const handler = (await import('../api/email-otp.js')).default;
    const testEmail = 'ci_bruteforce_guard@example.com';

    const sendMock = createMockReqRes({
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.77' },
      body: { action: 'send', email: testEmail, name: 'Security Test' },
    });
    await handler(sendMock.req, sendMock.res);
    const sendRes = sendMock.getResult();
    expect(sendRes.statusCode).toBe(200);
    const token = sendRes.jsonPayload.token;
    expect(token).toBeTruthy();

    for (let i = 0; i < 5; i++) {
      const attemptMock = createMockReqRes({
        method: 'POST',
        headers: { 'x-forwarded-for': `10.0.1.${i}` },
        body: { action: 'verify', email: testEmail, code: '000000', token },
      });
      await handler(attemptMock.req, attemptMock.res);
      expect(attemptMock.getResult().statusCode).toBe(400);
    }

    const lockedMock = createMockReqRes({
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.1.99' },
      body: { action: 'verify', email: testEmail, code: '000000', token },
    });
    await handler(lockedMock.req, lockedMock.res);
    expect(lockedMock.getResult().statusCode).toBe(429);
  });

  it('api/razorpay-webhook fails closed in production if webhook secret is unconfigured', async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_KEY_SECRET;
    process.env.VERCEL_ENV = 'production';

    const handler = (await import('../api/razorpay-webhook.js')).default;
    const { req, res, getResult } = createMockReqRes({
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.2.15' },
      body: { event: 'payment.captured' },
    });

    await handler(req, res);
    const { statusCode, jsonPayload } = getResult();
    expect(statusCode).toBe(503);
    expect(jsonPayload.error).toBe('WEBHOOK_SECRET_NOT_CONFIGURED');
  });

  it('resolveEmergencyCountryCode maps global cities and countries accurately', () => {
    expect(resolveEmergencyCountryCode('London, United Kingdom')).toBe('GB');
    expect(resolveEmergencyCountryCode('Singapore')).toBe('SG');
    expect(resolveEmergencyCountryCode('Bangkok, Thailand')).toBe('TH');
    expect(resolveEmergencyCountryCode('Rome & Amalfi, Italy')).toBe('IT');
    expect(resolveEmergencyCountryCode('Interlaken, Switzerland')).toBe('CH');
    expect(resolveEmergencyCountryCode('Tokyo, Japan')).toBe('JP');
    expect(resolveEmergencyCountryCode('Dubai, UAE')).toBe('AE');
    expect(resolveEmergencyCountryCode('Paris, France')).toBe('FR');
    expect(resolveEmergencyCountryCode('New York, USA')).toBe('US');
    expect(resolveEmergencyCountryCode('Udaipur, Rajasthan')).toBe('IN');
  });

  it('api/rateLimiter allows Capacitor iOS and Android WebView origins in CORS headers', async () => {
    const { applyCorsHeaders } = await import('../api/rateLimiter.js');
    for (const nativeOrigin of ['https://localhost', 'capacitor://localhost', 'ionic://localhost']) {
      const { req, res, getResult } = createMockReqRes({
        method: 'OPTIONS',
        headers: { origin: nativeOrigin },
      });
      applyCorsHeaders(req, res, 'POST, OPTIONS');
      expect(getResult().resHeaders['Access-Control-Allow-Origin']).toBe(nativeOrigin);
    }
  });

  it('resolveApiUrl keeps relative /api paths on web and resolves production host on native capacitor:// protocol', () => {
    const origWindow = globalThis.window;
    try {
      (globalThis as any).window = { location: { protocol: 'https:', hostname: 'trip-verse.com' } };
      expect(resolveApiUrl('/api/chat')).toBe('/api/chat');

      (globalThis as any).window = { location: { protocol: 'capacitor:', hostname: 'localhost' } };
      expect(resolveApiUrl('/api/chat')).toBe('https://trip-verse.com/api/chat');
      expect(resolveApiUrl('api/geo')).toBe('https://trip-verse.com/api/geo');
    } finally {
      (globalThis as any).window = origWindow;
    }
  });
});
