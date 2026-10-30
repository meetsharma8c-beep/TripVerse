// Vercel Serverless Function: Genuine Email OTP Dispatch & Verification via Resend
import crypto from 'crypto';
import { applyCorsHeaders, checkRateLimit, getClientIp } from './rateLimiter.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const HMAC_SECRET = process.env.AUTH_SECRET || process.env.SUPABASE_JWT_SECRET || 'tripverse-auth-secret-verification-key-2026';

function signOtp(email, code, expiresAt) {
  const normalized = String(email).trim().toLowerCase();
  return crypto.createHmac('sha256', HMAC_SECRET)
    .update(`${normalized}:${code}:${expiresAt}`)
    .digest('hex');
}

export default async function handler(req, res) {
  applyCorsHeaders(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { action, email, code, token, name } = req.body || {};
  const emailNorm = String(email || '').trim().toLowerCase();

  if (!emailNorm || !emailNorm.includes('@')) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  // Rate Limiting per IP
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(`email-otp:${clientIp}`, 10, 10 * 60 * 1000);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      success: false,
      message: 'Too many verification attempts. Please wait a few minutes before trying again.'
    });
  }

  // -------------------------------------------------------------
  // ACTION: SEND OTP EMAIL VIA RESEND
  // -------------------------------------------------------------
  if (action === 'send') {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    const signature = signOtp(emailNorm, otpCode, expiresAt);
    const verificationToken = `${expiresAt}.${signature}`;

    const recipientName = name ? String(name).trim() : emailNorm.split('@')[0];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #2D5A3D 0%, #0B2545 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">TripVerse</h1>
            <p style="color: #cbd5e1; margin: 6px 0 0; font-size: 13px;">AI-Powered Smart Travel Route & Stop Planner</p>
          </div>
          <div style="padding: 32px 24px; text-align: center;">
            <h2 style="color: #0f172a; margin: 0 0 8px; font-size: 20px; font-weight: 700;">Verify Your Email Address</h2>
            <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0 0 24px;">
              Hello <strong style="color: #0f172a;">${recipientName}</strong>, enter this 6-digit confirmation code in TripVerse to verify your account:
            </p>
            <div style="background: #F4F7F5; border: 2px dashed #2D5A3D; border-radius: 14px; padding: 18px 24px; display: inline-block; margin: 0 auto 24px;">
              <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #2D5A3D; display: block;">${otpCode}</span>
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This code will expire in <strong>10 minutes</strong>. Never share this code with anyone.
            </p>
          </div>
          <div style="border-top: 1px solid #f1f5f9; padding: 16px 24px; text-align: center; background: #f8fafc;">
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">
              TripVerse • AI Travel Assistant • Sent via Resend
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'TripVerse <onboarding@resend.dev>',
          to: emailNorm,
          subject: `${otpCode} is your TripVerse verification code`,
          html: htmlContent
        })
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        console.error('[Resend Error]', resendData);
        return res.status(500).json({
          success: false,
          message: resendData.message || 'Failed to dispatch email verification code via Resend.'
        });
      }

      console.log(`[Resend] Genuine OTP email dispatched to ${emailNorm}, id: ${resendData.id}`);
      return res.status(200).json({
        success: true,
        message: `Real verification code dispatched to ${emailNorm}.`,
        email: emailNorm,
        token: verificationToken,
        expiresAt
      });
    } catch (err) {
      console.error('[Resend Network Error]', err);
      return res.status(500).json({
        success: false,
        message: 'Could not connect to email delivery service.'
      });
    }
  }

  // -------------------------------------------------------------
  // ACTION: VERIFY OTP CODE
  // -------------------------------------------------------------
  if (action === 'verify') {
    const cleanCode = String(code || '').trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      return res.status(400).json({ success: false, message: 'Please enter the complete 6-digit code.' });
    }

    if (!token || !token.includes('.')) {
      return res.status(400).json({ success: false, message: 'Invalid or missing verification session.' });
    }

    const [expiresAtStr, signature] = token.split('.');
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
    }

    const expectedSig = signOtp(emailNorm, cleanCode, expiresAt);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return res.status(400).json({ success: false, message: 'Incorrect verification code. Please check your inbox and try again.' });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      email: emailNorm,
      message: 'Email address verified successfully.'
    });
  }

  return res.status(400).json({ success: false, message: 'Invalid action specified.' });
}
