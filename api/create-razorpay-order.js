// Vercel Serverless Function: Create Razorpay Order
import { applyCorsHeaders, applyRateLimitHeaders, checkDistributedRateLimit, getClientIp } from '../server/rateLimiter.js';

export default async function handler(req, res) {
  applyCorsHeaders(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // Rate Limiting: Max 20 order creations per 5 minutes per IP
  const clientIp = getClientIp(req);
  const rateLimitResult = await checkDistributedRateLimit(`order:${clientIp}`, 20, 5 * 60 * 1000);
  applyRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      ok: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many order requests. Please slow down.'
    });
  }

  const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return res.status(503).json({
      ok: false,
      mode: 'unavailable',
      error: 'RAZORPAY_NOT_CONFIGURED',
      message: 'Live Razorpay merchant credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured on the server.'
    });
  }

  const { amount, currency = 'INR', receipt, notes = {} } = req.body || {};

  const ALLOWED_CURRENCIES = new Set(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'AUD', 'CAD']);
  const cleanCurrency = String(currency || 'INR').trim().toUpperCase();
  if (!ALLOWED_CURRENCIES.has(cleanCurrency)) {
    return res.status(400).json({ ok: false, error: 'UNSUPPORTED_CURRENCY' });
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > 1000000) {
    return res.status(400).json({ ok: false, error: 'INVALID_AMOUNT' });
  }

  // Razorpay amounts are in the smallest currency unit (e.g. paise for INR, cents for USD)
  const amountInSubunits = Math.round(numAmount * 100);
  if (amountInSubunits < 100) {
    return res.status(400).json({
      ok: false,
      error: 'AMOUNT_TOO_SMALL',
      message: 'Minimum order amount is 100 paise (₹1.00).'
    });
  }

  // Sanitize notes (max 10 keys, max 200 chars each)
  const safeNotes = { platform: 'TripVerse' };
  if (notes && typeof notes === 'object' && !Array.isArray(notes)) {
    for (const [k, v] of Object.entries(notes).slice(0, 10)) {
      const cleanKey = String(k).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
      if (cleanKey) {
        safeNotes[cleanKey] = String(v ?? '').slice(0, 200);
      }
    }
  }

  // Server-side integrity guard for TripVerse Pro subscription orders (prevents ₹1 price spoofing)
  if (safeNotes.packageType === 'pro_subscription' && cleanCurrency === 'INR') {
    const minProAmountINR = safeNotes.billingCycle === 'annual' ? 800 : 100; // Accounts for valid promo codes (e.g. PRO50, EARLYBIRD)
    if (numAmount < minProAmountINR) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_SUBSCRIPTION_AMOUNT',
        message: 'Subscription order amount is below the authorized plan tier threshold.'
      });
    }
  }
  const safeReceipt = String(receipt || `rcpt_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `rcpt_${Date.now()}`;

  try {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountInSubunits,
        currency: cleanCurrency,
        receipt: safeReceipt,
        notes: safeNotes
      })
    });

    const orderData = await rzpResponse.json();

    if (!rzpResponse.ok) {
      console.error('Razorpay order creation failed:', orderData);
      const statusCode = rzpResponse.status === 401 ? 401 : 500;
      return res.status(statusCode).json({
        ok: false,
        error: rzpResponse.status === 401 ? 'RAZORPAY_AUTH_FAILED' : 'RAZORPAY_ORDER_FAILED',
        details: orderData
      });
    }

    const isTestKey = keyId.startsWith('rzp_test_');
    return res.status(200).json({
      ok: true,
      mode: isTestKey ? 'test' : 'live',
      keyId,
      orderId: orderData.id,
      order_id: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency
    });
  } catch (error) {
    console.error('Error in create-razorpay-order:', error);
    return res.status(500).json({
      ok: false,
      error: 'SERVER_ERROR',
      message: error?.message || 'Failed to create payment order'
    });
  }
}
