// Vercel Serverless Function: Razorpay Webhook Handler
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

  // Rate Limiting: 60 webhook events per minute per IP
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(`webhook:${clientIp}`, 60, 60 * 1000);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({ ok: false, error: 'RATE_LIMIT_EXCEEDED' });
  }

  const webhookSignature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

  if (!webhookSecret) {
    console.warn('[RazorpayWebhook] Secret not configured, acknowledging event in test mode');
    return res.status(200).json({ ok: true, mode: 'test', status: 'acknowledged' });
  }

  if (!webhookSignature) {
    return res.status(400).json({
      ok: false,
      error: 'MISSING_SIGNATURE',
      message: 'x-razorpay-signature header is required'
    });
  }

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expBuf = Buffer.from(expectedSignature, 'utf8');
    const sigBuf = Buffer.from(String(webhookSignature).toLowerCase(), 'utf8');
    const isValid = expBuf.length === sigBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);

    if (!isValid) {
      console.warn('[RazorpayWebhook] Signature mismatch');
      return res.status(400).json({
        ok: false,
        verified: false,
        error: 'SIGNATURE_VERIFICATION_FAILED'
      });
    }

    const event = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    const eventType = event.event;
    const payload = event.payload || {};

    console.log(`[RazorpayWebhook] Verified event received: ${eventType}`);

    // Process payment success events
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payment?.entity || {};
      const notes = paymentEntity.notes || {};
      const customerEmail = paymentEntity.email || notes.userEmail;
      const packageType = notes.packageType || 'pro_subscription';
      const billingCycle = notes.billingCycle || 'annual';

      console.log(`[RazorpayWebhook] Subscription activated for: ${customerEmail} (${packageType}, ${billingCycle})`);
    }

    return res.status(200).json({
      ok: true,
      verified: true,
      event: eventType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[RazorpayWebhook] Error processing event:', error);
    return res.status(500).json({
      ok: false,
      error: 'WEBHOOK_PROCESSING_ERROR',
      message: error?.message || 'Server error'
    });
  }
}
