// Vercel Serverless Function: Verify Razorpay Payment Signature & Persist Cloud Pro Entitlement
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { applyCorsHeaders, checkRateLimit, getClientIp } from '../server/rateLimiter.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

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

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userEmail: bodyUserEmail,
    packageType: bodyPackageType,
    billingCycle: bodyBillingCycle
  } = req.body || {};

  const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    return res.status(503).json({
      ok: false,
      verified: false,
      mode: 'unavailable',
      error: 'RAZORPAY_NOT_CONFIGURED',
      message: 'Live Razorpay merchant secret (RAZORPAY_KEY_SECRET) is not configured on the server.'
    });
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      ok: false,
      error: 'MISSING_PAYMENT_DETAILS',
      message: 'order_id, payment_id, and signature are required'
    });
  }

  const orderIdStr = String(razorpay_order_id).trim();
  const paymentIdStr = String(razorpay_payment_id).trim();
  const signatureStr = String(razorpay_signature).trim();

  if (
    !/^order_[A-Za-z0-9]{10,32}$/.test(orderIdStr) ||
    !/^pay_[A-Za-z0-9]{10,32}$/.test(paymentIdStr) ||
    !/^[a-fA-F0-9]{64}$/.test(signatureStr)
  ) {
    return res.status(400).json({
      ok: false,
      verified: false,
      error: 'INVALID_PAYMENT_FORMAT',
      message: 'Invalid Razorpay payment identifier or signature format'
    });
  }

  try {
    const text = `${orderIdStr}|${paymentIdStr}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    const expBuf = Buffer.from(expectedSignature, 'utf8');
    const sigBuf = Buffer.from(signatureStr.toLowerCase(), 'utf8');
    const isValid = expBuf.length === sigBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);

    if (!isValid) {
      return res.status(400).json({
        ok: false,
        verified: false,
        error: 'SIGNATURE_VERIFICATION_FAILED',
        message: 'Cryptographic payment verification failed'
      });
    }

    const verifiedAt = new Date().toISOString();
    let cloudProPersisted = false;

    // Fetch authoritative order notes from Razorpay REST API (prevents client spoofing packageType/billingCycle)
    let orderNotes = {};
    if (keyId) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderIdStr)}`, {
          headers: { Authorization: authHeader }
        });
        if (orderRes.ok) {
          const orderJson = await orderRes.json();
          orderNotes = orderJson?.notes || {};
        }
      } catch {}
    }

    const effectivePackageType = String(orderNotes.packageType || bodyPackageType || '').trim();
    const effectiveBillingCycle = String(orderNotes.billingCycle || bodyBillingCycle || 'annual').trim();
    const effectiveEmail = String(orderNotes.userEmail || bodyUserEmail || '').toLowerCase().trim();

    if (
      effectivePackageType === 'pro_subscription' &&
      effectiveEmail &&
      effectiveEmail.includes('@') &&
      SUPABASE_URL &&
      SUPABASE_ANON_KEY
    ) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        const durationDays = effectiveBillingCycle === 'monthly' ? 31 : 366;
        const expiresAt = new Date(Date.now() + durationDays * 86400 * 1000).toISOString();
        const { error: sbErr } = await sb.auth.signInAnonymously({
          options: {
            data: {
              record_type: 'admin_pro_override',
              target_email: effectiveEmail,
              subscription_tier: 'pro',
              billing_cycle: effectiveBillingCycle,
              razorpay_order_id: orderIdStr,
              razorpay_payment_id: paymentIdStr,
              expires_at: expiresAt,
              updated_at: verifiedAt
            }
          }
        });
        if (!sbErr) cloudProPersisted = true;
      } catch (persistErr) {
        console.warn('[VerifyRazorpay] Cloud Pro persistence notice:', persistErr);
      }
    }

    return res.status(200).json({
      ok: true,
      verified: true,
      cloudProPersisted,
      mode: keyId?.startsWith('rzp_test_') ? 'test' : 'live',
      orderId: orderIdStr,
      paymentId: paymentIdStr,
      verifiedAt
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
