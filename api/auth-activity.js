// Vercel Serverless Function: Real-Time Auth Activity Automation & Persistent Cloud Monitor
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { applyCorsHeaders, checkRateLimit, escapeHtml, getClientIp } from '../server/rateLimiter.js';

const MAX_ACTIVITIES = 100;
const activityLog = [];

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'meet.sharma8c@gmail.com').toLowerCase().trim();
const FOUNDER_EMAILS = new Set([
  'meet.sharma8c@gmail.com',
  'meetsharma8c@gmail.com',
  'omwani18@outlook.com',
  ADMIN_EMAIL
]);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
const VAULT_HMAC_SECRET = (process.env.VAULT_HMAC_SECRET || process.env.CONCODE_API_KEY || '').trim();

function isAutomatedTestAccount(email = '', name = '') {
  const lowerEmail = String(email || '').toLowerCase().trim();
  const lowerName = String(name || '').toLowerCase().trim();
  if (lowerName.includes('e2e launch tester') || lowerName.includes('audit test') || lowerName.includes('hdhdhdhd')) {
    return true;
  }
  if (!lowerEmail) return true;
  return (
    lowerEmail.startsWith('ci_') ||
    lowerEmail.startsWith('test_') ||
    lowerEmail.startsWith('e2e_') ||
    lowerEmail.startsWith('valid_test') ||
    lowerEmail.startsWith('toggle_test') ||
    lowerEmail.startsWith('finalized_') ||
    lowerEmail.startsWith('freemium_') ||
    lowerEmail.startsWith('existing_') ||
    lowerEmail.startsWith('test-') ||
    lowerEmail.startsWith('testuser') ||
    lowerEmail.startsWith('verify_') ||
    lowerEmail.includes('example.com') ||
    lowerEmail.includes('testmail.com') ||
    lowerEmail.includes('tripversetest.io') ||
    lowerEmail.includes('test.com') ||
    lowerEmail.includes('domain.com') ||
    lowerEmail.endsWith('@tripverse.app') ||
    lowerEmail.endsWith('@invalid') ||
    lowerEmail.endsWith('.test')
  );
}

function normalizeProvider(rawProvider = '') {
  const p = String(rawProvider || '').toLowerCase().trim();
  if (p.includes('google')) return 'google';
  if (p.includes('phone') || p.includes('sms')) return 'phone';
  if (p.includes('guest') || p.includes('anon')) return 'guest';
  return 'email';
}

function canonicalEmail(raw = '') {
  const clean = String(raw || '').toLowerCase().trim();
  if (!clean || !clean.includes('@')) return clean;
  const [localPart, domain] = clean.split('@');
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${localPart.split('+')[0].replace(/\./g, '')}@gmail.com`;
  }
  return `${localPart}@${domain}`;
}

function isAuthorizedFounderEmail(raw = '') {
  const canon = canonicalEmail(raw);
  if (!canon) return false;
  for (const fe of FOUNDER_EMAILS) {
    if (canonicalEmail(fe) === canon) return true;
  }
  return false;
}

async function verifyUserIdentityEmail(rawToken, sb) {
  const token = String(rawToken || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || token.startsWith('session-')) return null;

  // 1. Verify Supabase JWT
  if (sb) {
    try {
      const { data, error } = await sb.auth.getUser(token);
      if (!error && data?.user?.email && !data.user.email.endsWith('@vault.tripverse.app')) {
        return canonicalEmail(data.user.email);
      }
    } catch {}
  }

  // 2. Verify Firebase ID token via IdentityToolkit lookup (rejecting shadow @vault.tripverse.app tokens)
  if (FIREBASE_API_KEY) {
    try {
      const fbRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token })
      });
      if (fbRes.ok) {
        const fbJson = await fbRes.json();
        const fbUser = Array.isArray(fbJson?.users) ? fbJson.users[0] : null;
        if (fbUser) {
          const candidateEmails = [
            fbUser.email,
            ...(Array.isArray(fbUser.providerUserInfo) ? fbUser.providerUserInfo.map(p => p.email) : [])
          ].filter(em => em && !String(em).toLowerCase().endsWith('@vault.tripverse.app'));
          if (candidateEmails.length > 0) {
            return canonicalEmail(candidateEmails[0]);
          }
        }
      }
    } catch {}
  }

  // 3. Verify Google GIS OIDC ID token via Google tokeninfo
  try {
    const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    if (gRes.ok) {
      const gJson = await gRes.json();
      if (gJson?.email && String(gJson.email_verified) === 'true' && !String(gJson.email).toLowerCase().endsWith('@vault.tripverse.app')) {
        return canonicalEmail(gJson.email);
      }
    }
  } catch {}

  return null;
}

async function verifyFounderIdentityToken(rawToken, sb) {
  const verifiedEmail = await verifyUserIdentityEmail(rawToken, sb);
  return Boolean(verifiedEmail && isAuthorizedFounderEmail(verifiedEmail));
}

// Debounce identical user alerts within a 2-minute window per container
const recentlyAlerted = new Map();

/**
 * Fetch persistent auth activity events from Resend cloud log so serverless
 * cold starts or multi-instance routing never lose a single sign-in event.
 */
async function loadPersistentCloudActivities() {
  if (process.env.ENABLE_AUTH_ACTIVITY_EMAILS !== 'true' || !RESEND_API_KEY) return [];
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
  // GET: Return merged real-time sign-in activity (Protected Admin CLI)
  // ─────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const providedKey = String(
      req.headers['x-admin-key'] ||
      (req.headers.authorization || '').replace(/^Bearer\s+/i, '') ||
      req.query?.key ||
      ''
    ).trim();

    const expectedKey = RESEND_API_KEY
      ? crypto.createHmac('sha256', RESEND_API_KEY).update('tripverse-admin-read').digest('hex')
      : '';

    const keyBuf = Buffer.from(providedKey, 'utf8');
    const expBuf = Buffer.from(expectedKey, 'utf8');
    const isAuthorized = expectedKey.length > 0 && keyBuf.length === expBuf.length && crypto.timingSafeEqual(keyBuf, expBuf);

    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Valid cryptographic X-Admin-Key is required to view user activity logs.'
      });
    }

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

    if (format === 'csv') {
      const headers = ['Date & Time (IST)', 'Full Name', 'Email Address', 'Sign-In Method', 'Location', 'User ID', 'Account Status'];
      const rows = merged.map(evt => {
        let dateStr = evt.timestamp;
        try {
          dateStr = new Date(evt.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        } catch {}
        return [
          `"${String(dateStr).replace(/"/g, '""')}"`,
          `"${String(evt.displayName || 'Explorer').replace(/"/g, '""')}"`,
          `"${String(evt.email || 'N/A').replace(/"/g, '""')}"`,
          `"${String(evt.provider || 'AUTH').toUpperCase().replace(/"/g, '""')}"`,
          `"${String(evt.location || 'India').replace(/"/g, '""')}"`,
          `"${String(evt.uid || '').replace(/"/g, '""')}"`,
          `"${String(evt.travelStyleTag || 'Verified Genuine User').replace(/"/g, '""')}"`
        ].join(',');
      });
      const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="tripverse_genuine_users.csv"');
      return res.status(200).send(csv);
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

    const { event, provider, user, targetEmail, subscriptionTier, expiresAt } = req.body || {};

    // ── Server-HMAC Firestore Vault Session Minter (Eliminates client-side password derivation) ──
    if (event === 'mint_vault_session') {
      if (!FIREBASE_API_KEY || !VAULT_HMAC_SECRET) {
        return res.status(503).json({ success: false, error: 'VAULT_UNCONFIGURED' });
      }
      const sb = SUPABASE_URL && SUPABASE_ANON_KEY
        ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
        : null;
      const authHeader = req.headers.authorization || req.body?.authToken || '';
      const verifiedEmail = await verifyUserIdentityEmail(authHeader, sb);
      if (!verifiedEmail) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Valid verified identity token required to mint cloud vault session.'
        });
      }

      const canonicalKey = `email:${verifiedEmail}`;
      const acctHash = crypto
        .createHmac('sha256', VAULT_HMAC_SECRET)
        .update(`tv_vault_v2_acct:${canonicalKey}`)
        .digest('hex')
        .slice(0, 32);
      const pwdHash = crypto
        .createHmac('sha256', VAULT_HMAC_SECRET)
        .update(`tv_vault_v2_secret:${canonicalKey}`)
        .digest('hex')
        .slice(0, 40);

      const vaultEmail = `tvs_${acctHash}@vault.tripverse.app`;
      const vaultPassword = `TvSec#${pwdHash}!`;

      let fbRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: vaultEmail, password: vaultPassword, returnSecureToken: true })
        }
      );

      if (!fbRes.ok) {
        fbRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: vaultEmail, password: vaultPassword, returnSecureToken: true })
          }
        );
      }

      if (!fbRes.ok) {
        return res.status(502).json({ success: false, error: 'VAULT_AUTH_FAILED' });
      }

      const fbData = await fbRes.json();
      const expiresInSec = Number(fbData.expiresIn) || 3600;
      return res.status(200).json({
        success: true,
        canonicalKey,
        localId: fbData.localId,
        idToken: fbData.idToken,
        expiresAt: Date.now() + expiresInSec * 1000
      });
    }

    // ── Special Founder Action: Cloud Pro Grant / Revoke ──
    if (event === 'admin_pro_override') {
      const cleanTarget = String(targetEmail || '').toLowerCase().trim();
      if (!cleanTarget || !cleanTarget.includes('@')) {
        return res.status(400).json({ success: false, message: 'Valid targetEmail required' });
      }
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return res.status(503).json({ success: false, message: 'Supabase cloud backend unavailable' });
      }
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const authHeader = req.headers.authorization || req.body?.founderToken || '';
      const verified = await verifyFounderIdentityToken(authHeader, sb);
      if (!verified) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Cryptographic VIP Founder token required for cloud tier updates.'
        });
      }

      const tierValue = subscriptionTier === 'pro' ? 'pro' : 'free';
      const nowIso = new Date().toISOString();
      const { data: overrideRow, error: overrideErr } = await sb.auth.signInAnonymously({
        options: {
          data: {
            record_type: 'admin_pro_override',
            target_email: cleanTarget,
            subscription_tier: tierValue,
            expires_at: tierValue === 'pro' ? (expiresAt || new Date(Date.now() + 365 * 86400 * 1000).toISOString()) : nowIso,
            updated_at: nowIso
          }
        }
      });

      if (overrideErr) {
        return res.status(500).json({ success: false, message: overrideErr.message });
      }

      return res.status(200).json({
        success: true,
        cloudPersisted: true,
        targetEmail: cleanTarget,
        subscriptionTier: tierValue,
        overrideId: overrideRow?.user?.id || null
      });
    }

    if (!user || !user.uid) {
      return res.status(400).json({ success: false, message: 'User payload required' });
    }

    const cleanEmail = String(user.email || '').toLowerCase().trim();
    const normalizedProvider = normalizeProvider(provider || user.provider);

    const activityRecord = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      event: event || 'signin',
      provider: normalizedProvider,
      uid: user.uid,
      email: cleanEmail,
      displayName: user.displayName || user.name || (cleanEmail ? cleanEmail.split('@')[0] : 'Traveler Explorer'),
      travelStyleTag: user.travelStyleTag || `${normalizedProvider.toUpperCase()} Auth`,
      ip: clientIp,
      location: user.location || locationStr,
      timestamp: new Date().toISOString()
    };

    activityLog.unshift(activityRecord);
    if (activityLog.length > MAX_ACTIVITIES) {
      activityLog.pop();
    }

    let supabaseProfileId = null;
    const isTestEmail = isAutomatedTestAccount(cleanEmail, activityRecord.displayName);

    // 1. Server-side deduplicated guarantee: ensure every genuine Google / Firebase / Email user
    //    is permanently indexed in Supabase `get_all_registered_users` WITHOUT creating duplicates.
    if (SUPABASE_URL && SUPABASE_ANON_KEY && cleanEmail && !isTestEmail) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false }
        });

        const { data: existingUsers } = await sb.rpc('get_all_registered_users');
        const targetCanon = canonicalEmail(cleanEmail);
        const existingRow = Array.isArray(existingUsers)
          ? existingUsers.find(r => {
              if (r?.metadata?.record_type === 'admin_pro_override') return false;
              const rowEmail = String(r?.email || r?.metadata?.user_email || r?.metadata?.email || '').toLowerCase().trim();
              return rowEmail && canonicalEmail(rowEmail) === targetCanon;
            })
          : null;

        if (existingRow) {
          supabaseProfileId = existingRow.id;
        } else {
          const { data: anonData } = await sb.auth.signInAnonymously({
            options: {
              data: {
                record_type: 'external_user_sync',
                full_name: activityRecord.displayName,
                name: activityRecord.displayName,
                user_email: cleanEmail,
                email: cleanEmail,
                auth_provider: normalizedProvider,
                external_uid: activityRecord.uid,
                location: activityRecord.location || locationStr,
                original_created_at: user.createdAt || activityRecord.timestamp,
                last_sign_in_at: activityRecord.timestamp
              }
            }
          });
          if (anonData?.user?.id) {
            supabaseProfileId = anonData.user.id;
            await sb.from('profiles').upsert({
              id: anonData.user.id,
              email: cleanEmail,
              display_name: activityRecord.displayName,
              traveler_style: user.travelerStyle || 'Smart Roadtripper',
              travel_style_tag: `${activityRecord.travelStyleTag} • ${normalizedProvider.toUpperCase()}`,
              location: activityRecord.location || locationStr,
              updated_at: activityRecord.timestamp
            });
          }
        }
      } catch (sbErr) {
        console.warn('[Auth Activity Supabase Sync Notice]', sbErr);
      }
    }

    const alertKey = `${user.uid}:${activityRecord.provider}`;
    const lastAlertTime = recentlyAlerted.get(alertKey) || 0;
    // CRITICAL: Prevent wasting Resend quota! Sign-in activity emails are strictly disabled
    // unless explicitly requested via ENABLE_AUTH_ACTIVITY_EMAILS='true'.
    // This preserves 100% of the Resend email quota for user-facing 2FA & OTP verification.
    const shouldDispatchEmail = process.env.ENABLE_AUTH_ACTIVITY_EMAILS === 'true' && !isTestEmail && Boolean(RESEND_API_KEY) && (Date.now() - lastAlertTime > 2 * 60 * 1000);

    let emailDispatchId = null;

    // 2. Real-Time Excel / Google Sheets Webhook Automation
    const sheetWebhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || process.env.EXCEL_WEBHOOK_URL;
    if (sheetWebhookUrl && !isTestEmail && activityRecord.email) {
      try {
        fetch(sheetWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: activityRecord.timestamp,
            displayName: activityRecord.displayName,
            email: activityRecord.email,
            provider: activityRecord.provider,
            location: activityRecord.location || locationStr,
            uid: activityRecord.uid,
            travelStyleTag: activityRecord.travelStyleTag || 'Verified Explorer',
            tier: user.subscriptionTier || 'free',
            tripsCount: user.tripsCount || 0
          })
        }).catch(err => console.warn('[Excel Webhook Error]', err));
      } catch (sheetErr) {
        console.warn('[Excel Webhook Dispatch Notice]', sheetErr);
      }
    }

    if (shouldDispatchEmail) {
      recentlyAlerted.set(alertKey, Date.now());

      const providerLabel = String(activityRecord.provider).toUpperCase();
      const userIdent = activityRecord.displayName || activityRecord.email || `Guest (${activityRecord.uid.slice(0, 8)})`;
      const emailPart = activityRecord.email || 'no-email';
      // Structured subject so GET /api/auth-activity can parse persistent cloud logs across serverless containers
      const subject = `🔔 [TripVerse] Real-Time ${providerLabel} Sign-In: ${userIdent} | ${emailPart} | ${locationStr} | ${activityRecord.uid}`;

      const safeProvider = escapeHtml(providerLabel);
      const safeName = escapeHtml(activityRecord.displayName || '—');
      const safeEmail = escapeHtml(activityRecord.email || '—');
      const safeUid = escapeHtml(activityRecord.uid);
      const safeLoc = escapeHtml(`${locationStr} (${clientIp})`);
      const safeTime = escapeHtml(activityRecord.timestamp);

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
                    <span style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; font-size: 12px;">${safeProvider}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Display Name:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${safeName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${safeEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">User ID (UID):</td>
                  <td style="padding: 8px 0; color: #64748b; font-family: monospace; font-size: 12px;">${safeUid}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Location / IP:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${safeLoc}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Timestamp:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${safeTime}</td>
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
      supabaseProfileId,
      emailDispatchId
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
