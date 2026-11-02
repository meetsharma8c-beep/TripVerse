// Vercel Serverless Function: Real-Time Auth Activity Automation & Instant Alerts
import { applyCorsHeaders, checkRateLimit, getClientIp } from './rateLimiter.js';

// In-memory ring buffer for the latest 100 sign-in events
const MAX_ACTIVITIES = 100;
const activityLog = [];

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'meet.sharma8c@gmail.com';

// Prevent duplicate alert storms for identical session in short window
const recentlyAlerted = new Map();

export default async function handler(req, res) {
  applyCorsHeaders(req, res, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = getClientIp(req);
  const city = req.headers['x-vercel-ip-city'] || '';
  const country = req.headers['x-vercel-ip-country'] || '';
  const locationStr = [city, country].filter(Boolean).join(', ') || 'Unknown Location';

  // ─────────────────────────────────────────────────────────────
  // GET: Return recent sign-in activity (CLI / automated script)
  // ─────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const format = req.query?.format || 'json';

    if (format === 'cli' || format === 'text') {
      let output = `\n═══════════════════════════════════════════════════════════════════════\n`;
      output += `🚀 TRIPVERSE LIVE REAL-TIME AUTH ACTIVITY (${activityLog.length} Events)\n`;
      output += `═══════════════════════════════════════════════════════════════════════\n\n`;

      if (activityLog.length === 0) {
        output += `No sign-in events recorded in this instance yet.\n`;
      } else {
        activityLog.forEach((evt, idx) => {
          output += `[${idx + 1}] ${evt.timestamp} | ${evt.provider.toUpperCase()} | ${evt.displayName || evt.email || 'Guest'}\n`;
          output += `    Email:    ${evt.email || 'N/A'}\n`;
          output += `    UID:      ${evt.uid}\n`;
          output += `    Location: ${evt.location} (IP: ${evt.ip})\n`;
          output += `    Badge:    ${evt.travelStyleTag || 'Verified'}\n\n`;
        });
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(output);
    }

    return res.status(200).json({
      success: true,
      count: activityLog.length,
      activities: activityLog
    });
  }

  // ─────────────────────────────────────────────────────────────
  // POST: Record new sign-in and dispatch instant alert
  // ─────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const rate = checkRateLimit(`auth-activity:${clientIp}`, 60, 60 * 1000);
    if (!rate.allowed) {
      return res.status(429).json({ success: false, message: 'Too many requests' });
    }

    const { event, provider, user } = req.body || {};
    if (!user || !user.uid) {
      return res.status(400).json({ success: false, message: 'User payload required' });
    }

    const activityRecord = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      event: event || 'signin',
      provider: provider || user.provider || 'unknown',
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.name || '',
      travelStyleTag: user.travelStyleTag || '',
      ip: clientIp,
      location: locationStr,
      timestamp: new Date().toISOString()
    };

    // Prepend to ring buffer
    activityLog.unshift(activityRecord);
    if (activityLog.length > MAX_ACTIVITIES) {
      activityLog.pop();
    }

    // Debounce alerts per user UID within 3 minutes
    const alertKey = `${user.uid}:${activityRecord.provider}`;
    const lastAlertTime = recentlyAlerted.get(alertKey) || 0;
    const shouldDispatchEmail = (Date.now() - lastAlertTime > 3 * 60 * 1000) && Boolean(RESEND_API_KEY);

    if (shouldDispatchEmail) {
      recentlyAlerted.set(alertKey, Date.now());

      const providerLabel = activityRecord.provider.toUpperCase();
      const userIdent = activityRecord.displayName || activityRecord.email || `Guest (${activityRecord.uid.slice(0, 8)})`;
      const subject = `🔔 [TripVerse] Real-Time ${providerLabel} Sign-In: ${userIdent}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 24px;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #0B2545 0%, #134074 100%); padding: 24px; color: white;">
              <h2 style="margin: 0; font-size: 20px;">⚡ Real-Time Sign-In Alert</h2>
              <p style="margin: 4px 0 0; opacity: 0.8; font-size: 13px;">TripVerse Live Cloud Auth Monitor</p>
            </div>
            <div style="padding: 24px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 120px;">Auth Method:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">
                    <span style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; font-size: 12px;">${providerLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Display Name:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${activityRecord.displayName || '—'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${activityRecord.email || '—'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">User ID (UID):</td>
                  <td style="padding: 8px 0; color: #64748b; font-family: monospace; font-size: 12px;">${activityRecord.uid}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Location / IP:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${locationStr} (${clientIp})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Timestamp:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${activityRecord.timestamp}</td>
                </tr>
              </table>
              <div style="margin-top: 20px; padding: 12px; background: #f1f5f9; border-radius: 8px; font-size: 12px; color: #475569;">
                💡 This user's profile and data are automatically synced into Supabase in real time.
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'TripVerse Live <onboarding@resend.dev>',
          to: ADMIN_EMAIL,
          subject,
          html
        })
      }).catch(err => {
        console.warn('[Auth Activity Resend Alert Error]', err);
      });
    }

    return res.status(200).json({ success: true, recorded: activityRecord });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
