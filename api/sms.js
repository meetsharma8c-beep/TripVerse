// Vercel Serverless Function: Secure Server-Side Fast2SMS Gateway Proxy
// Bypasses browser CORS restrictions by dispatching SMS server-to-server.
import { applyCorsHeaders, checkRateLimit, getClientIp } from './rateLimiter.js';

export default async function handler(req, res) {
  // CORS & Security headers
  applyCorsHeaders(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ return: false, message: 'Method not allowed' });
  }

  // Rate Limiting: Max 5 OTP dispatches per 10 minutes per client IP
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(`sms:${clientIp}`, 5, 10 * 60 * 1000);

  res.setHeader('X-RateLimit-Limit', '5');
  res.setHeader('X-RateLimit-Remaining', String(rateLimitResult.remaining));

  if (!rateLimitResult.allowed) {
    const retrySec = Math.ceil(rateLimitResult.resetMs / 1000);
    res.setHeader('Retry-After', String(retrySec));
    return res.status(429).json({
      return: false,
      message: `Too many OTP requests from this connection. Please wait ${Math.ceil(retrySec / 60)} minute(s) before trying again.`
    });
  }

  const { numbers, variables_values, apiKey: clientApiKey } = req.body || {};
  const authHeader = req.headers['authorization'];
  
  // Prefer secure server-side environment key, falling back to client or authorization header
  const apiKey = 
    process.env.FAST2SMS_API_KEY || 
    process.env.VITE_FAST2SMS_API_KEY || 
    authHeader || 
    clientApiKey;

  if (!apiKey) {
    return res.status(503).json({
      return: false,
      message: 'Fast2SMS Gateway key is not configured on the server. Please contact support.'
    });
  }

  if (!numbers || !variables_values) {
    return res.status(400).json({ return: false, message: 'Missing phone number or OTP code.' });
  }

  // Validation: Indian 10-digit mobile number check
  const cleanNumber = String(numbers).replace(/\D/g, '').slice(-10);
  if (cleanNumber.length !== 10) {
    return res.status(400).json({ return: false, message: 'Invalid 10-digit mobile number format.' });
  }

  try {
    const payload = {
      route: 'otp',
      variables_values: String(variables_values).slice(0, 8),
      numbers: cleanNumber
    };

    const fastResponse = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await fastResponse.json().catch(() => ({}));
    return res.status(fastResponse.status || 200).json(data);
  } catch (err) {
    console.error('Fast2SMS proxy error:', err);
    return res.status(500).json({ return: false, message: 'SMS gateway network proxy error.' });
  }
}
