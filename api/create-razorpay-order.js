// Vercel Serverless Function: Create Razorpay Order
import { applyCorsHeaders, checkRateLimit, getClientIp } from './rateLimiter.js';

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
  const rateLimitResult = checkRateLimit(`order:${clientIp}`, 20, 5 * 60 * 1000);
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
    return res.status(200).json({
      ok: true,
      mode: 'simulation',
      message: 'Razorpay keys not configured. Falling back to sandbox simulation mode.'
    });
  }

  const { amount, currency = 'INR', receipt, notes = {} } = req.body || {};

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ ok: false, error: 'INVALID_AMOUNT' });
  }

  // Razorpay amounts are in the smallest currency unit (e.g. paise for INR, cents for USD)
  const amountInSubunits = Math.round(numAmount * 100);

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
        currency: currency.toUpperCase(),
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: {
          platform: 'TripVerse',
          ...notes
        }
      })
    });

    const orderData = await rzpResponse.json();

    if (!rzpResponse.ok) {
      console.error('Razorpay order creation failed:', orderData);
      return res.status(rzpResponse.status || 500).json({
        ok: false,
        error: 'RAZORPAY_ORDER_FAILED',
        details: orderData
      });
    }

    return res.status(200).json({
      ok: true,
      mode: 'live',
      keyId,
      orderId: orderData.id,
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
