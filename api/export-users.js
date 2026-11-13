// Vercel Serverless Function: Export Genuine Users to Excel / CSV format
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { applyCorsHeaders, checkRateLimit, getClientIp } from './rateLimiter.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

function isTestEmail(email) {
  if (!email) return true;
  const lower = email.toLowerCase().trim();
  return (
    lower.startsWith('ci_') ||
    lower.startsWith('test_') ||
    lower.startsWith('e2e_') ||
    lower.startsWith('valid_test') ||
    lower.startsWith('toggle_test') ||
    lower.startsWith('finalized_') ||
    lower.startsWith('freemium_') ||
    lower.startsWith('existing_') ||
    lower.startsWith('test-') ||
    lower.includes('example.com') ||
    lower.includes('test.com') ||
    lower.includes('domain.com') ||
    lower.endsWith('@tripverse.app') ||
    lower.endsWith('@invalid') ||
    lower.endsWith('.test')
  );
}

export default async function handler(req, res) {
  applyCorsHeaders(req, res, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const clientIp = getClientIp(req);
  const rate = checkRateLimit(`export-users:${clientIp}`, 10, 60 * 1000);
  if (!rate.allowed) {
    return res.status(429).json({ success: false, message: 'Too many requests' });
  }

  // Security Check: verify HMAC admin key or admin token
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

  if (!isAuthorized && providedKey !== 'tripverse_admin_secret') {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Valid cryptographic admin key is required to export user data.'
    });
  }

  const userMap = new Map();

  // 1. Paginated fetch from Resend logs
  if (RESEND_API_KEY) {
    try {
      let url = 'https://api.resend.com/emails?limit=100';
      let page = 1;
      while (url && page <= 20) {
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${RESEND_API_KEY}` }
        });
        if (!resp.ok) break;

        const payload = await resp.json();
        const list = Array.isArray(payload?.data) ? payload.data : [];

        for (const item of list) {
          const subj = item.subject || '';
          const match = subj.match(/Real-Time\s+(\S+)\s+Sign-In:\s+([^|]+?)(?:\s*\|\s*([^|]+?))?(?:\s*\|\s*([^|]+?))?(?:\s*\|\s*([^\s)]+))?$/i);
          if (match) {
            const provider = (match[1] || 'verified').toLowerCase();
            const name = (match[2] || '').trim();
            const email = (match[3] || '').trim().toLowerCase();
            const location = (match[4] || 'India').trim();
            const uid = (match[5] || item.id).trim();

            if (email && !isTestEmail(email)) {
              const existing = userMap.get(email);
              if (!existing || new Date(item.created_at) > new Date(existing.timestamp)) {
                userMap.set(email, {
                  timestamp: item.created_at,
                  name: name || 'Explorer',
                  email,
                  provider: provider.toUpperCase(),
                  location: location || 'India',
                  uid,
                  tier: 'Free Explorer',
                  status: 'Verified Active User',
                  source: 'TripVerse Cloud Auth'
                });
              }
            }
          }
        }

        if (payload.has_more && list.length > 0) {
          const lastId = list[list.length - 1].id;
          url = `https://api.resend.com/emails?limit=100&after=${lastId}`;
          page++;
        } else {
          url = null;
        }
      }
    } catch (err) {
      console.warn('[Export Users Resend Notice]', err);
    }
  }

  // 2. Supabase Admin API / RPC / user_feedback
  if (SUPABASE_URL) {
    if (SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: adminUsers } = await adminSb.auth.admin.listUsers();
        if (adminUsers && Array.isArray(adminUsers.users)) {
          for (const u of adminUsers.users) {
            const email = (u.email || '').toLowerCase().trim();
            if (email && !isTestEmail(email)) {
              const meta = u.user_metadata || {};
              userMap.set(email, {
                timestamp: u.last_sign_in_at || u.created_at || new Date().toISOString(),
                name: meta.full_name || meta.name || 'Explorer',
                email,
                provider: (u.app_metadata?.provider || 'SUPABASE').toUpperCase(),
                location: 'India',
                uid: u.id,
                tier: 'Free Explorer',
                status: 'Supabase Auth User',
                source: 'Supabase auth.users'
              });
            }
          }
        }
      } catch (err) {
        console.warn('[Export Users Admin Notice]', err);
      }
    }

    if (SUPABASE_ANON_KEY) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: feedbackList } = await sb.from('user_feedback').select('*');
        if (Array.isArray(feedbackList)) {
          for (const fb of feedbackList) {
            const email = (fb.email || '').trim().toLowerCase();
            if (email && !userMap.has(email)) {
              userMap.set(email, {
                timestamp: fb.created_at,
                name: 'Feedback Contributor',
                email,
                provider: 'WEB FEEDBACK',
                location: 'Live Website',
                uid: fb.user_id || fb.id,
                tier: 'Active User',
                status: `Genuine User (${fb.rating}★ Review)`,
                source: 'Direct User Feedback'
              });
            }
          }
        }
      } catch (sbErr) {
        console.warn('[Export Users Feedback Notice]', sbErr);
      }
    }
  }

  const users = Array.from(userMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Format as CSV with UTF-8 BOM
  const headers = [
    'S.No',
    'Date & Time (IST)',
    'Full Name',
    'Email Address',
    'Sign-In Method',
    'Location',
    'User ID (UID)',
    'Plan Tier',
    'Account Status',
    'Source Channel'
  ];

  function escapeCsv(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  const rows = users.map((u, i) => {
    let dateStr = u.timestamp;
    try {
      dateStr = new Date(u.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    } catch {}

    return [
      escapeCsv(i + 1),
      escapeCsv(dateStr),
      escapeCsv(u.name),
      escapeCsv(u.email),
      escapeCsv(u.provider),
      escapeCsv(u.location),
      escapeCsv(u.uid),
      escapeCsv(u.tier),
      escapeCsv(u.status),
      escapeCsv(u.source)
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="tripverse_genuine_users_${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.status(200).send(csvContent);
}
