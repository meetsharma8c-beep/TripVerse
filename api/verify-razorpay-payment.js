// Vercel Serverless Function: Verify Razorpay Payment Signature
import crypto from 'node:crypto';
import { applyCorsHeaders, checkRateLimit, getClientIp } from './rateLimiter.js';

export default async function handler(req, res) {
  applyCorsHeaders(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(`verify:${clientIp}`, 30, 5 * 60 * 1000);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({ ok: false, error: 'RATE_LIMIT_EXCEEDED' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    // If running in simulation/demo mode without secret
    return res.status(200).json({
      ok: true,
      verified: true,
      mode: 'simulation',
      message: 'Payment accepted in simulation mode'
    });
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      ok: false,
      error: 'MISSING_PAYMENT_DETAILS',
      message: 'order_id, payment_id, and signature are required'
    });
  }

  try {
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({
        ok: false,
        verified: false,
        error: 'SIGNATURE_VERIFICATION_FAILED',
        message: 'Cryptographic payment verification failed'
      });
    }

    return res.status(200).json({
      ok: true,
      verified: true,
      mode: 'live',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    });
  } catch (error) {
    console.error('Error in verify-razorpay-payment:', error);
    return res.status(500).json({
      ok: false,
      error: 'VERIFICATION_ERROR',
      message: error?.message || 'Server error during signature verification'
    });
  }
}
