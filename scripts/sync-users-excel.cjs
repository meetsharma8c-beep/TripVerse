#!/usr/bin/env node
/**
 * TripVerse — Real-Time Genuine Users Excel Database Automation
 * Fetches all genuine users from Supabase and cloud activity logs,
 * formats them with full metadata, and writes directly to TripVerse_Users_Database.xlsx
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^['\"]|['\"]$/g, '');
    }
  });
  return env;
}

const env = loadEnv();
const RESEND_API_KEY = env.RESEND_API_KEY;
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

async function fetchAllGenuineUsers() {
  const userMap = new Map();

  // 1. Fetch from Resend cloud logs
  if (RESEND_API_KEY) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` }
      });
      if (resp.ok) {
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

            const isTest = 
              email.startsWith('ci_') ||
              email.startsWith('test_') ||
              email.startsWith('e2e_') ||
              email.endsWith('@tripverse.app') ||
              email.endsWith('@example.com') ||
              email.endsWith('@test.com') ||
              email.endsWith('@invalid') ||
              email.endsWith('.test');

            if (email && !isTest && !userMap.has(email)) {
              userMap.set(email, {
                timestamp: item.created_at,
                name: name || 'Explorer',
                email,
                provider: provider.toUpperCase(),
                location: location || 'India',
                uid,
                tier: 'Free Explorer',
                status: 'Verified Active User',
                source: 'Google/Email Auth'
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Sync] Resend fetch notice:', err.message);
    }
  }

  // 2. Fetch from Supabase feedback & profiles
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
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
              provider: 'WEB FORM',
              location: 'Live Website',
              uid: fb.user_id || fb.id,
              tier: 'Active User',
              status: `Genuine User (${fb.rating}★ Review)`,
              source: 'Direct User Feedback'
            });
          }
        }
      }
    } catch (err) {
      console.warn('[Sync] Supabase fetch notice:', err.message);
    }
  }

  return Array.from(userMap.values());
}

async function generateExcel() {
  console.log('🔄 Fetching genuine users from TripVerse databases...');
  const users = await fetchAllGenuineUsers();
  console.log(`✅ Found ${users.length} genuine user records.`);

  const excelRows = users.map((u, index) => {
    let istTime = u.timestamp;
    try {
      istTime = new Date(u.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    } catch {}

    return {
      'S.No': index + 1,
      'Last Active (IST)': istTime,
      'Full Name': u.name,
      'Email Address': u.email,
      'Auth Provider': u.provider,
      'Location / City': u.location,
      'User ID (UID)': u.uid,
      'Plan Tier': u.tier,
      'Status': u.status,
      'Registration Channel': u.source
    };
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelRows);

  // Set smart column widths
  ws['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 22 }, // Date
    { wch: 24 }, // Name
    { wch: 30 }, // Email
    { wch: 15 }, // Provider
    { wch: 18 }, // Location
    { wch: 38 }, // UID
    { wch: 16 }, // Plan Tier
    { wch: 22 }, // Status
    { wch: 22 }  // Channel
  ];

  // Enable AutoFilter on header row
  if (excelRows.length > 0) {
    ws['!autofilter'] = { ref: `A1:J${excelRows.length + 1}` };
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Genuine Users');

  // Write to Project Workspace
  const projectExcelPath = path.resolve(__dirname, '..', 'TripVerse_Users_Database.xlsx');
  XLSX.writeFile(wb, projectExcelPath);
  console.log(`📊 Updated project Excel database: ${projectExcelPath}`);

  // Write to User's Desktop for instant one-click access
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (homeDir) {
    const desktopExcelPath = path.join(homeDir, 'Desktop', 'TripVerse_Users_Database.xlsx');
    try {
      XLSX.writeFile(wb, desktopExcelPath);
      console.log(`🚀 Saved directly to your Desktop: ${desktopExcelPath}`);
    } catch {}
  }

  return { count: users.length, path: projectExcelPath };
}

// If executed directly
if (require.main === module) {
  generateExcel()
    .then(res => {
      console.log(`\n🎉 Success! Excel database synced with ${res.count} genuine users.`);
    })
    .catch(err => {
      console.error('❌ Excel sync failed:', err);
      process.exit(1);
    });
}

module.exports = { generateExcel, fetchAllGenuineUsers };
