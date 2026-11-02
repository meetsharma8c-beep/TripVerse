// Vercel Serverless Function: Real-Time Auth Activity Automation & Persistent Cloud Monitor
import { applyCorsHeaders, checkRateLimit, getClientIp } from './rateLimiter.js';

const MAX_ACTIVITIES = 100;
const activityLog = [];

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'meet.sharma8c@gmail.com';

// Debounce identical user alerts within a 2-minute window per container
const recentlyAlerted = new Map();

/**
 * Fetch persistent auth activity events from Resend cloud log so serverless
 * cold starts or multi-instance routing never lose a single sign-in event.
 */
async function loadPersistentCloudActivities() {
  if (!RESEND_API_KEY) return [];
  try {
    const res = await fetch('https://api.resend.com/emails', {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` }
    });
    if (!res.ok) return [];
    const payload = await res.json();
    const list = Array.isArray(payload?.data) ? payload.data : [];

    // Filter only TripVerse Real-Time Auth alerts
    const authEmails = list.filter(
      item => typeof item.subject === 'string' && item.subject.includes('[TripVerse] Real-Time')
    );

    const parsed = [];
    for (const item of authEmails.slice(0, 25)) {
      // Subject format: 🔔 [TripVerse] Real-Time PROVIDER Sign-In: Name (email | location | uid)
      const subj = item.subject || '';
      const match = subj.match(/Real-Time\s+(\S+)\s+Sign-In:\s+([^|]+?)(?:\s*\|\s*([^|]+?))?(?:\s*\|\s*([^|]+?))?(?:\s*\|\s*([^\s)]+))?$/i);
      if (match) {
        parsed.push({
          id: item.id,
          event: 'signin',
          provider: (match[1] || 'verified').toLowerCase(),
          displayName: (match[2] || '').trim(),
          email: (match[3] || '').trim(),
          location: (match[4] || 'India').trim(),
          uid: (match[5] || item.id).trim(),
          ip: 'cloud-verified',
          travelStyleTag: `${(match[1] || 'Verified').toUpperCase()} Auth`,
          timestamp: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
          deliveryStatus: item.last_event || 'sent'
        });
      } else {
        parsed.push({
          id: item.id,
          event: 'signin',
          provider: 'verified',
          displayName: subj.replace(/^🔔\s*\[TripVerse\]\s*/i, ''),
          email: '',
          location: 'Cloud',
          uid: item.id,
          ip: 'cloud-verified',
          travelStyleTag: 'Verified Explorer',
          timestamp: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
          deliveryStatus: item.last_event || 'sent'
        });
      }
    }
    return parsed;
  } catch (err) {
    console.warn('[Auth Activity Cloud Fetch Error]', err);
    return [];
  }
}

export default async function handler(req, res) {
  applyCorsHeaders(req, res, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = getClientIp(req);
  const rawCity = req.headers['x-vercel-ip-city'] ? decodeURIComponent(String(req.headers['x-vercel-ip-city'])) : '';
  const country = req.headers['x-vercel-ip-country'] || '';
  const locationStr = [rawCity, country].filter(Boolean).join(', ') || 'India';

  // ─────────────────────────────────────────────────────────────
  // GET: Return merged real-time sign-in activity (Zero DOM CLI)
  // ─────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const format = req.query?.format || 'json';
    const cloudEvents = await loadPersistentCloudActivities();

    // Merge in-memory and persistent cloud events without duplicates
    const seen = new Set();
    const merged = [];
    for (const evt of [...activityLog, ...cloudEvents]) {
      const dedupKey = `${evt.uid}:${evt.timestamp?.slice(0, 16)}`;
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey);
        merged.push(evt);
      }
    }

    if (format === 'cli' || format === 'text') {
      let output = `\n═══════════════════════════════════════════════════════════════════════\n`;
      output += `🚀 TRIPVERSE LIVE REAL-TIME AUTH ACTIVITY (${merged.length} Events)\n`;
      output += `═══════════════════════════════════════════════════════════════════════\n\n`;

      if (merged.length === 0) {
        output += `No sign-in events recorded yet.\n`;
      } else {
        merged.forEach((evt, idx) => {
          output += `[${idx + 1}] ${evt.timestamp} | ${String(evt.provider || 'AUTH').toUpperCase()} | ${evt.displayName || evt.email || 'Guest Explorer'}\n`;
          output += `    Email:    ${evt.email || 'N/A'}\n`;
          output += `    UID:      ${evt.uid}\n`;
          output += `    Location: ${evt.location}${evt.ip && evt.ip !== 'cloud-verified' ? ` (IP: ${evt.ip})` : ''}\n`;
          output += `    Badge:    ${evt.travelStyleTag || 'Verified'}\n\n`;
        });
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(output);
    }

    return res.status(200).json({
      success: true,
      count: merged.length,
      activities: merged
    });
  }

  // ─────────────────────────────────────────────────────────────
  // POST: Record new sign-in and await persistent cloud dispatch
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
      provider: provider || user.provider || 'verified',
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.name || 'Traveler Explorer',
      travelStyleTag: user.travelStyleTag || `${String(provider || user.provider || 'Verified').toUpperCase()} Auth`,
      ip: clientIp,
      location: locationStr,
      timestamp: new Date().toISOString()
    };

    activityLog.unshift(activityRecord);
    if (activityLog.length > MAX_ACTIVITIES) {
      activityLog.pop();
    }

    const alertKey = `${user.uid}:${activityRecord.provider}`;
    const lastAlertTime = recentlyAlerted.get(alertKey) || 0;
    const shouldDispatchEmail = (Date.now() - lastAlertTime > 2 * 60 * 1000) && Boolean(RESEND_API_KEY);

    let emailDispatchId = null;
    if (shouldDispatchEmail) {
      recentlyAlerted.set(alertKey, Date.now());

      const providerLabel = String(activityRecord.provider).toUpperCase();
      const userIdent = activityRecord.displayName || activityRecord.email || `Guest (${activityRecord.uid.slice(0, 8)})`;
      const emailPart = activityRecord.email || 'no-email';
      // Structured subject so GET /api/auth-activity can parse persistent cloud logs across serverless containers
      const subject = `🔔 [TripVerse] Real-Time ${providerLabel} Sign-In: ${userIdent} | ${emailPart} | ${locationStr} | ${activityRecord.uid}`;

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
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'TripVerse Live <onboarding@resend.dev>',
            to: ADMIN_EMAIL,
            subject,
            html
          })
        });
        const resendJson = await resendRes.json().catch(() => ({}));
        emailDispatchId = resendJson?.id || null;
      } catch (err) {
        console.warn('[Auth Activity Resend Alert Error]', err);
      }
    }

    return res.status(200).json({
      success: true,
      recorded: activityRecord,
      emailDispatchId
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
