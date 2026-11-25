// Vercel Serverless Function: Multi-Provider Transactional Email Gateway (OTP + Itinerary Summaries)
import crypto from 'crypto';
import { applyCorsHeaders, applyRateLimitHeaders, checkDistributedRateLimit, escapeHtml, getClientIp } from './rateLimiter.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'auth@trip-verse.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'TripVerse';

const EPHEMERAL_DEV_SECRET = crypto.randomBytes(32).toString('hex');

function getHmacSecret() {
  const configured = (
    process.env.AUTH_SECRET ||
    process.env.CONCODE_API_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.RESEND_API_KEY ||
    process.env.BREVO_API_KEY ||
    ''
  ).trim();
  if (configured) return configured;
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    return '';
  }
  return EPHEMERAL_DEV_SECRET;
}

// Per-email dispatch cooldown & attempt tracking maps
const emailDispatchCooldowns = new Map();
const activeEmailOtpTokens = new Map();
const verifyAttemptCounts = new Map();
const EMAIL_COOLDOWN_MS = 60 * 1000; // 60 seconds minimum cooldown per email
const MAX_VERIFY_ATTEMPTS = 5;

function signOtp(email, code, expiresAt) {
  const secret = getHmacSecret();
  if (!secret) throw new Error('AUTH_SECRET_NOT_CONFIGURED');
  const normalized = String(email).trim().toLowerCase();
  return crypto.createHmac('sha256', secret)
    .update(`${normalized}:${code}:${expiresAt}`)
    .digest('hex');
}

function getCookie(req, name) {
  const cookieHeader = req.headers?.cookie || '';
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Multi-provider transactional email dispatcher:
 * Automatically cascades across Resend -> Brevo -> SendGrid so a revoked or
 * rate-limited provider seamlessly fails over to the next configured gateway.
 */
async function dispatchTransactionalEmail({ to, subject, html }) {
  let sandboxRestricted = false;
  let sawInvalidKey = false;
  let lastErrorMessage = '';

  // 1. Primary: Resend (`auth@trip-verse.com` -> `onboarding@resend.dev`)
  if (RESEND_API_KEY) {
    try {
      let fromAddress = `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`;
      let resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: fromAddress, to, subject, html })
      });
      let resendData = await resendRes.json().catch(() => ({}));

      if (!resendRes.ok && typeof resendData?.message === 'string' && resendData.message.includes('domain is not verified')) {
        fromAddress = `${EMAIL_FROM_NAME} <onboarding@resend.dev>`;
        resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ from: fromAddress, to, subject, html })
        });
        resendData = await resendRes.json().catch(() => ({}));
      }

      if (resendRes.ok) {
        return { ok: true, provider: 'resend', id: resendData?.id || null };
      }

      const msg = String(resendData?.message || '');
      lastErrorMessage = msg;
      if (msg.includes('You can only send testing emails to your own email address')) {
        sandboxRestricted = true;
      } else if (
        resendRes.status === 401 ||
        resendRes.status === 403 ||
        /api key is invalid|unauthorized|missing api key/i.test(msg)
      ) {
        sawInvalidKey = true;
      }
    } catch (err) {
      lastErrorMessage = err?.message || 'Resend connection error';
    }
  }

  // 2. Failover A: Brevo (Sendinblue) REST v3
  if (BREVO_API_KEY) {
    try {
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM_ADDRESS },
          to: [{ email: to }],
          subject,
          htmlContent: html
        })
      });
      const brevoData = await brevoRes.json().catch(() => ({}));
      if (brevoRes.ok) {
        return { ok: true, provider: 'brevo', id: brevoData?.messageId || null };
      }
      lastErrorMessage = String(brevoData?.message || lastErrorMessage);
    } catch (err) {
      lastErrorMessage = err?.message || lastErrorMessage;
    }
  }

  // 3. Failover B: SendGrid REST v3
  if (SENDGRID_API_KEY) {
    try {
      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: EMAIL_FROM_ADDRESS, name: EMAIL_FROM_NAME },
          subject,
          content: [{ type: 'text/html', value: html }]
        })
      });
      if (sgRes.ok || sgRes.status === 202) {
        return { ok: true, provider: 'sendgrid', id: sgRes.headers.get('x-message-id') || null };
      }
    } catch (err) {
      lastErrorMessage = err?.message || lastErrorMessage;
    }
  }

  const noProvidersConfigured = !RESEND_API_KEY && !BREVO_API_KEY && !SENDGRID_API_KEY;
  return {
    ok: false,
    sandboxRestricted,
    gatewayUnavailable: noProvidersConfigured || sawInvalidKey,
    errorMessage: lastErrorMessage
  };
}

function buildItineraryEmailHtml(tripSummary = {}, recipientName = 'Explorer') {
  const safeDest = escapeHtml(String(tripSummary.destination || 'Your Destination').slice(0, 100));
  const safeOrigin = escapeHtml(String(tripSummary.origin || 'Origin').slice(0, 80));
  const safeName = escapeHtml(String(tripSummary.name || `${safeDest} Getaway`).slice(0, 120));
  const safeBudget = escapeHtml(String(tripSummary.formattedBudget || '').slice(0, 40));
  const safeDuration = Number(tripSummary.durationDays) || 3;
  const safeTravelers = Number(tripSummary.travelersCount) || 1;
  const safeShareUrl = escapeHtml(String(tripSummary.shareUrl || 'https://trip-verse.com').slice(0, 200));
  const days = Array.isArray(tripSummary.days) ? tripSummary.days.slice(0, 14) : [];

  const daysHtml = days
    .map((d, idx) => {
      const dayTitle = escapeHtml(String(d?.title || `Day ${idx + 1}`).slice(0, 100));
      const stops = Array.isArray(d?.stops) ? d.stops.slice(0, 10) : [];
      const stopsHtml = stops
        .map(s => {
          const stTime = escapeHtml(String(s?.time || '').slice(0, 24));
          const stTitle = escapeHtml(String(s?.title || 'Stop').slice(0, 100));
          const stCost = s?.cost ? ` <span style="color:#2D5A3D;font-weight:700;">(${escapeHtml(String(s.cost).slice(0, 24))})</span>` : '';
          return `<li style="margin:6px 0;color:#334155;font-size:13px;"><strong>${stTime}</strong> — ${stTitle}${stCost}</li>`;
        })
        .join('');
      return `
        <div style="margin-bottom:16px;padding:14px 16px;background:#f8faf7;border:1px solid #e2ebe1;border-radius:12px;">
          <div style="font-size:12px;font-weight:800;color:#2D5A3D;text-transform:uppercase;">Day ${idx + 1} • ${dayTitle}</div>
          <ul style="margin:8px 0 0;padding-left:18px;">${stopsHtml || '<li style="font-size:13px;color:#64748b;">Flexible exploration</li>'}</ul>
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:24px;">
      <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#152A1C 0%,#2D5A3D 100%);padding:28px 24px;color:#ffffff;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#a7f3d0;">TripVerse Official Dossier</div>
          <h1 style="margin:6px 0 4px;font-size:24px;font-weight:800;">${safeName}</h1>
          <p style="margin:0;font-size:13px;color:#e2e8f0;">${safeOrigin} → ${safeDest} • ${safeDuration} Days • ${safeTravelers} Traveler(s)${safeBudget ? ` • Budget: ${safeBudget}` : ''}</p>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 16px;font-size:14px;color:#334155;">Hi <strong>${escapeHtml(recipientName)}</strong>, here is your live-priced TripVerse itinerary ready for your journey:</p>
          ${daysHtml}
          <div style="text-align:center;margin-top:24px;">
            <a href="${safeShareUrl}" style="display:inline-block;background:#2D5A3D;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;">Open Interactive Map &amp; Live GPS in TripVerse</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default async function handler(req, res) {
  applyCorsHeaders(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { action, email, code, token, name, purpose, tripSummary } = req.body || {};
  const emailNorm = String(email || '').trim().toLowerCase();

  if (!emailNorm || !emailNorm.includes('@')) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  // Rate Limiting per IP
  const clientIp = getClientIp(req);
  const rateLimitResult = await checkDistributedRateLimit(`email-otp:${clientIp}`, 12, 10 * 60 * 1000);
  applyRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      success: false,
      message: 'Too many email requests. Please wait a few minutes before trying again.'
    });
  }

  const isSimulatedTestDomain =
    emailNorm.startsWith('ci_') ||
    emailNorm.startsWith('test_') ||
    emailNorm.startsWith('e2e_') ||
    emailNorm.endsWith('@tripverse.app') ||
    emailNorm.endsWith('@example.com') ||
    emailNorm.endsWith('@test.com') ||
    emailNorm.endsWith('@invalid') ||
    emailNorm.endsWith('.test');

  // -------------------------------------------------------------
  // ACTION: SEND ITINERARY DOSSIER EMAIL
  // -------------------------------------------------------------
  if (action === 'send_itinerary') {
    if (!tripSummary || typeof tripSummary !== 'object') {
      return res.status(400).json({ success: false, message: 'Trip summary payload is required.' });
    }
    if (isSimulatedTestDomain) {
      return res.status(200).json({
        success: true,
        provider: 'test_bypass',
        message: 'Simulated itinerary dispatch completed for test domain.'
      });
    }

    const recipientName = name ? String(name).trim().slice(0, 60) : emailNorm.split('@')[0];
    const destLabel = String(tripSummary.destination || 'Your Trip').slice(0, 80);
    const subject = `✈️ Your TripVerse Itinerary: ${destLabel} (${Number(tripSummary.durationDays) || 3} Days)`;
    const html = buildItineraryEmailHtml(tripSummary, recipientName);

    const delivery = await dispatchTransactionalEmail({ to: emailNorm, subject, html });
    if (delivery.ok) {
      return res.status(200).json({
        success: true,
        provider: delivery.provider,
        id: delivery.id,
        message: `Itinerary sent to ${emailNorm}!`
      });
    }

    return res.status(503).json({
      success: false,
      code: 'EMAIL_GATEWAY_UNAVAILABLE',
      message: 'Cloud email gateway is awaiting domain key activation; opening native email draft instead.'
    });
  }

  // -------------------------------------------------------------
  // ACTION: SEND OTP EMAIL (RESEND -> BREVO -> SENDGRID)
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

    if (!getHmacSecret()) {
      return res.status(503).json({
        success: false,
        code: 'EMAIL_GATEWAY_UNAVAILABLE',
        message: 'Email verification service is temporarily unconfigured.'
      });
    }

    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes
    const signature = signOtp(emailNorm, otpCode, expiresAt);
    const verificationToken = `${expiresAt}.${signature}`;

    const rawName = name ? String(name).trim().slice(0, 60) : emailNorm.split('@')[0];
    const recipientName = escapeHtml(rawName);
    const isPasswordReset = purpose === 'password_reset';

    const emailSubject = isPasswordReset
      ? `${otpCode} is your TripVerse password reset code`
      : `${otpCode} is your TripVerse verification code`;

    const headingText = isPasswordReset ? 'Reset Your Password' : 'Verify Your Email Address';
    const bodyText = isPasswordReset
      ? `Hello <strong style="color: #0f172a;">${recipientName}</strong>, enter this 6-digit verification code in TripVerse to securely reset your account password:`
      : `Hello <strong style="color: #0f172a;">${recipientName}</strong>, enter this 6-digit confirmation code in TripVerse to verify your account:`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #2D5A3D 0%, #0B2545 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">TripVerse</h1>
            <p style="color: #cbd5e1; margin: 6px 0 0; font-size: 13px;">AI-Powered Smart Travel Route &amp; Stop Planner</p>
          </div>
          <div style="padding: 32px 24px; text-align: center;">
            <h2 style="color: #0f172a; margin: 0 0 8px; font-size: 20px; font-weight: 700;">${headingText}</h2>
            <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0 0 24px;">
              ${bodyText}
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
              TripVerse • AI Travel Assistant • trip-verse.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (isSimulatedTestDomain) {
      return res.status(200).json({
        success: true,
        token: verificationToken,
        expiresAt,
        message: 'Security verification code generated for test domain.'
      });
    }

    const delivery = await dispatchTransactionalEmail({
      to: emailNorm,
      subject: emailSubject,
      html: htmlContent
    });

    if (!delivery.ok) {
      if (delivery.sandboxRestricted) {
        const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
        if (isProduction) {
          return res.status(503).json({
            success: false,
            code: 'EMAIL_GATEWAY_UNAVAILABLE',
            message: 'Outbound email verification is restricted to verified domain recipients.'
          });
        }

        emailDispatchCooldowns.set(emailNorm, now);
        activeEmailOtpTokens.set(emailNorm, { token: verificationToken, expiresAt });
        res.setHeader('Set-Cookie', `tripverse_email_otp=${encodeURIComponent(verificationToken)}; Path=/; Max-Age=600; SameSite=Lax; Secure; HttpOnly`);
        return res.status(200).json({
          success: true,
          isSandboxNotice: true,
          devCode: otpCode,
          sandboxNotice: `Sandbox Notice (non-production): verification code is ${otpCode}`,
          message: `Sandbox mode: verification code generated for ${emailNorm}.`,
          email: emailNorm,
          token: verificationToken,
          expiresAt
        });
      }

      if (delivery.gatewayUnavailable) {
        return res.status(503).json({
          success: false,
          code: 'EMAIL_GATEWAY_UNAVAILABLE',
          message: 'Email OTP gateway is temporarily unavailable. Continuing with primary credential verification.'
        });
      }

      return res.status(502).json({
        success: false,
        code: 'EMAIL_DELIVERY_FAILED',
        message: 'Unable to dispatch email verification code right now. Please try Google Sign-In or retry shortly.'
      });
    }

    emailDispatchCooldowns.set(emailNorm, now);
    activeEmailOtpTokens.set(emailNorm, { token: verificationToken, expiresAt });
    res.setHeader('Set-Cookie', `tripverse_email_otp=${encodeURIComponent(verificationToken)}; Path=/; Max-Age=600; SameSite=Lax; Secure; HttpOnly`);
    return res.status(200).json({
      success: true,
      provider: delivery.provider,
      message: `Real verification code dispatched to ${emailNorm}.`,
      email: emailNorm,
      token: verificationToken,
      expiresAt
    });
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

    if (!getHmacSecret()) {
      return res.status(503).json({ success: false, message: 'Email verification service is unconfigured.' });
    }

    const attemptsKey = `${emailNorm}:${activeToken.slice(-16)}`;
    const priorAttempts = verifyAttemptCounts.get(attemptsKey) || 0;
    if (priorAttempts >= MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed verification attempts for this code. Please request a new code.'
      });
    }

    const [expiresAtStr, signature] = activeToken.split('.');
    const expiresAt = parseInt(expiresAtStr, 10);

    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
    }

    const expectedSig = signOtp(emailNorm, cleanCode, expiresAt);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      verifyAttemptCounts.set(attemptsKey, priorAttempts + 1);
      return res.status(400).json({ success: false, message: 'Incorrect verification code. Please check your inbox and try again.' });
    }

    verifyAttemptCounts.delete(attemptsKey);

    return res.status(200).json({
      success: true,
      verified: true,
      email: emailNorm,
      message: 'Email address verified successfully.'
    });
  }

  return res.status(400).json({ success: false, message: 'Invalid action specified.' });
}
