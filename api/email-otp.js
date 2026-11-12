// Vercel Serverless Function: Genuine Email OTP Dispatch & Verification via Resend
import crypto from 'crypto';
import { applyCorsHeaders, checkRateLimit, escapeHtml, getClientIp } from './rateLimiter.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const HMAC_SECRET = process.env.AUTH_SECRET || 'REDACTED_DEV_HMAC_SALT';

// Per-email dispatch cooldown map (prevents burning Resend API quota on rapid re-requests)
const emailDispatchCooldowns = new Map();
const activeEmailOtpTokens = new Map();
const EMAIL_COOLDOWN_MS = 60 * 1000; // 60 seconds minimum cooldown per email

function signOtp(email, code, expiresAt) {
  const normalized = String(email).trim().toLowerCase();
  return crypto.createHmac('sha256', HMAC_SECRET)
    .update(`${normalized}:${code}:${expiresAt}`)
    .digest('hex');
}

function getCookie(req, name) {
  const cookieHeader = req.headers?.cookie || '';
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
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
    const now = Date.now();
    const lastSent = emailDispatchCooldowns.get(emailNorm) || 0;
    if (now - lastSent < EMAIL_COOLDOWN_MS) {
      const waitSec = Math.ceil((EMAIL_COOLDOWN_MS - (now - lastSent)) / 1000);
      const active = activeEmailOtpTokens.get(emailNorm);
      if (active && active.expiresAt > now) {
        return res.status(200).json({
          success: true,
          message: `A verification code was already dispatched recently. Please check your inbox or wait ${waitSec}s to resend.`,
          email: emailNorm,
          token: active.token,
          expiresAt: active.expiresAt,
          cooldownRemainingSec: waitSec
        });
      }
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSec} seconds before requesting a new verification code.`
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes
    const signature = signOtp(emailNorm, otpCode, expiresAt);
    const verificationToken = `${expiresAt}.${signature}`;

    const rawName = name ? String(name).trim().slice(0, 60) : emailNorm.split('@')[0];
    const recipientName = escapeHtml(rawName);

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

    // Safely bypass outbound delivery for simulated test domains (prevents SMTP delivery failure bounces)
    const isSimulatedTestDomain = 
      emailNorm.startsWith('ci_') ||
      emailNorm.startsWith('test_') ||
      emailNorm.startsWith('e2e_') ||
      emailNorm.endsWith('@tripverse.app') || 
      emailNorm.endsWith('@example.com') || 
      emailNorm.endsWith('@test.com') ||
      emailNorm.endsWith('@invalid') ||
      emailNorm.endsWith('.test');

    if (isSimulatedTestDomain) {
      return res.status(200).json({
        success: true,
        token: verificationToken,
        expiresAt,
        message: 'Security verification code generated for test domain.'
      });
    }

    try {
      // First try sending from verified brand domain (TripVerse <auth@trip-verse.com>)
      // If domain is not yet verified on Resend, automatically fallback to onboarding@resend.dev
      let fromAddress = 'TripVerse <auth@trip-verse.com>';
      let resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: emailNorm,
          subject: `${otpCode} is your TripVerse verification code`,
          html: htmlContent
        })
      });

      let resendData = await resendRes.json();

      // If custom domain is not yet verified in Resend, retry via onboarding@resend.dev
      if (!resendRes.ok && typeof resendData.message === 'string' && resendData.message.includes('domain is not verified')) {
        fromAddress = 'TripVerse <onboarding@resend.dev>';
        resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromAddress,
            to: emailNorm,
            subject: `${otpCode} is your TripVerse verification code`,
            html: htmlContent
          })
        });
        resendData = await resendRes.json();
      }

      if (!resendRes.ok) {
        console.error('[Resend Error]', resendData);
        // If Resend test domain restricts to owner (meet.sharma8c@gmail.com):
        if (typeof resendData.message === 'string' && resendData.message.includes('You can only send testing emails to your own email address')) {
          console.warn(`[Resend Notice] Resend sandbox owner restriction for ${emailNorm}. Storing token securely.`);
          emailDispatchCooldowns.set(emailNorm, now);
          activeEmailOtpTokens.set(emailNorm, { token: verificationToken, expiresAt });

          res.setHeader('Set-Cookie', `tripverse_email_otp=${encodeURIComponent(verificationToken)}; Path=/; Max-Age=600; SameSite=Lax; Secure; HttpOnly`);
          return res.status(200).json({
            success: true,
            isSandboxNotice: true,
            devCode: otpCode,
            sandboxNotice: `Resend Sandbox Notice: Live delivery is restricted to owner (meet.sharma8c@gmail.com) until trip-verse.com DNS is added. For testing, your security code is: ${otpCode}`,
            message: `Free-tier sandbox mode: verification code registered for ${emailNorm}. Code: ${otpCode}`,
            email: emailNorm,
            token: verificationToken,
            expiresAt
          });
        }
        return res.status(500).json({
          success: false,
          message: resendData.message || 'Failed to dispatch email verification code via Resend.'
        });
      }

      console.log(`[Resend] Genuine OTP email dispatched from ${fromAddress} to ${emailNorm}, id: ${resendData.id}`);
      emailDispatchCooldowns.set(emailNorm, now);
      activeEmailOtpTokens.set(emailNorm, { token: verificationToken, expiresAt });
      res.setHeader('Set-Cookie', `tripverse_email_otp=${encodeURIComponent(verificationToken)}; Path=/; Max-Age=600; SameSite=Lax; Secure; HttpOnly`);
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

    const activeToken = token || getCookie(req, 'tripverse_email_otp');
    if (!activeToken || !activeToken.includes('.')) {
      return res.status(400).json({ success: false, message: 'Invalid or missing verification session. Please request a new code.' });
    }

    const [expiresAtStr, signature] = activeToken.split('.');
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
