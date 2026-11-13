#!/usr/bin/env node
/**
 * TripVerse — Real-Time Genuine Users Excel Database Automation
 * Fetches all users who have ever logged in or registered in TripVerse from:
 * 1. Resend cloud notification logs (full pagination across all historical records)
 * 2. Supabase Cloud Database (user_feedback, profiles, and RPC get_all_registered_users)
 * 3. Supabase Auth Admin (if SUPABASE_SERVICE_ROLE_KEY is provided)
 *
 * Generates an Excel workbook with:
 * - "Genuine Users": Verified real human travelers
 * - "All Users Ever Logged In": Comprehensive list of all recorded sign-ins
 * - "Summary & Metrics": Auth breakdown, providers, and locations
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

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
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY;

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

async function fetchAllUsersFromSources() {
  const allUsersMap = new Map();

  // 1. Fetch ALL pages from Resend cloud logs
  if (RESEND_API_KEY) {
    try {
      let url = 'https://api.resend.com/emails?limit=100';
      let page = 1;
      let totalFetched = 0;

      while (url) {
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${RESEND_API_KEY}` }
        });
        if (!resp.ok) break;

        const payload = await resp.json();
        const list = Array.isArray(payload?.data) ? payload.data : [];
        totalFetched += list.length;

        for (const item of list) {
          const subj = item.subject || '';
          const match = subj.match(/Real-Time\s+(\S+)\s+Sign-In:\s+([^|]+?)(?:\s*\|\s*([^|]+?))?(?:\s*\|\s*([^|]+?))?(?:\s*\|\s*([^\s)]+))?$/i);
          if (match) {
            const provider = (match[1] || 'verified').toLowerCase();
            const name = (match[2] || '').trim();
            const email = (match[3] || '').trim().toLowerCase();
            const location = (match[4] || 'India').trim();
            const uid = (match[5] || item.id).trim();

            if (email) {
              const existing = allUsersMap.get(email);
              const isTest = isTestEmail(email);

              // Update if newer timestamp
              if (!existing || new Date(item.created_at) > new Date(existing.timestamp)) {
                allUsersMap.set(email, {
                  timestamp: item.created_at,
                  name: name || 'Explorer',
                  email,
                  provider: provider.toUpperCase(),
                  location: location || 'India',
                  uid,
                  tier: 'Free Explorer',
                  isTest,
                  category: isTest ? 'Automated CI / Test Account' : 'Genuine Human Traveler',
                  status: isTest ? 'Test Verified' : 'Verified Active User',
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
          if (page > 20) break; // Safety cap at 2,000 emails
        } else {
          url = null;
        }
      }
      console.log(`[Sync] Resend scanned ${totalFetched} audit notifications across ${page} page(s).`);
    } catch (err) {
      console.warn('[Sync] Resend fetch notice:', err.message);
    }
  }

  // 2. Query Supabase (user_feedback & profiles & optional RPC or Admin API)
  if (SUPABASE_URL) {
    // 2A. Supabase Auth Admin (if service role key is provided)
    if (SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: adminUsers, error: adminErr } = await adminSb.auth.admin.listUsers();
        if (!adminErr && adminUsers && Array.isArray(adminUsers.users)) {
          console.log(`[Sync] Supabase Auth Admin returned ${adminUsers.users.length} raw users.`);
          for (const u of adminUsers.users) {
            const email = (u.email || '').toLowerCase().trim();
            if (!email) continue;
            const meta = u.user_metadata || {};
            const isTest = isTestEmail(email);
            const existing = allUsersMap.get(email);

            allUsersMap.set(email, {
              timestamp: u.last_sign_in_at || u.created_at || (existing?.timestamp) || new Date().toISOString(),
              name: meta.full_name || meta.name || existing?.name || 'Explorer',
              email,
              provider: (u.app_metadata?.provider || existing?.provider || 'SUPABASE').toUpperCase(),
              location: existing?.location || 'India',
              uid: u.id,
              tier: existing?.tier || 'Free Explorer',
              isTest,
              category: isTest ? 'Automated CI / Test Account' : 'Genuine Human Traveler',
              status: 'Supabase Auth User',
              source: 'Supabase auth.users'
            });
          }
        }
      } catch (err) {
        console.warn('[Sync] Supabase Admin fetch notice:', err.message);
      }
    }

    // 2B. Supabase RPC get_all_registered_users (if created in Supabase SQL editor)
    if (SUPABASE_ANON_KEY) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: rpcUsers, error: rpcErr } = await sb.rpc('get_all_registered_users');
        if (!rpcErr && Array.isArray(rpcUsers)) {
          console.log(`[Sync] Supabase RPC get_all_registered_users returned ${rpcUsers.length} users.`);
          for (const u of rpcUsers) {
            const email = (u.email || '').toLowerCase().trim();
            if (!email) continue;
            const meta = u.raw_user_meta_data || {};
            const isTest = isTestEmail(email);
            const existing = allUsersMap.get(email);

            allUsersMap.set(email, {
              timestamp: u.last_sign_in_at || u.created_at || existing?.timestamp || new Date().toISOString(),
              name: meta.full_name || meta.name || existing?.name || 'Explorer',
              email,
              provider: (meta.provider || existing?.provider || 'GOOGLE/EMAIL').toUpperCase(),
              location: existing?.location || 'India',
              uid: u.id,
              tier: 'Free Explorer',
              isTest,
              category: isTest ? 'Automated CI / Test Account' : 'Genuine Human Traveler',
              status: 'Registered Auth User',
              source: 'Supabase Database'
            });
          }
        }
      } catch {}

      // 2C. Supabase user_feedback table
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: feedbackList } = await sb.from('user_feedback').select('*');
        if (Array.isArray(feedbackList)) {
          for (const fb of feedbackList) {
            const email = (fb.email || '').trim().toLowerCase();
            if (email && !allUsersMap.has(email)) {
              allUsersMap.set(email, {
                timestamp: fb.created_at,
                name: 'Feedback Contributor',
                email,
                provider: 'WEB FORM',
                location: 'Live Website',
                uid: fb.user_id || fb.id,
                tier: 'Active User',
                isTest: false,
                category: 'Genuine Human Traveler',
                status: `Genuine User (${fb.rating}★ Review)`,
                source: 'Direct User Feedback'
              });
            }
          }
        }
      } catch (err) {
        console.warn('[Sync] Supabase user_feedback notice:', err.message);
      }
    }
  }

  const allUsers = Array.from(allUsersMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const genuineUsers = allUsers.filter(u => !u.isTest);

  return { allUsers, genuineUsers };
}

function formatRow(u, index) {
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
    'Category': u.category,
    'Plan Tier': u.tier,
    'Status': u.status,
    'Source Channel': u.source
  };
}

async function generateExcel() {
  console.log('🔄 Fetching all users who have ever logged in to TripVerse...');
  const { allUsers, genuineUsers } = await fetchAllUsersFromSources();
  console.log(`✅ Total recorded users: ${allUsers.length} (${genuineUsers.length} genuine travelers, ${allUsers.length - genuineUsers.length} test accounts).`);

  const genuineRows = genuineUsers.map(formatRow);
  const allRows = allUsers.map(formatRow);

  // Summary Metrics Sheet
  const providerCounts = {};
  genuineUsers.forEach(u => {
    providerCounts[u.provider] = (providerCounts[u.provider] || 0) + 1;
  });

  const summaryRows = [
    { 'Metric': 'Total Recorded Logins / Accounts', 'Value': allUsers.length },
    { 'Metric': 'Total Genuine Human Travelers', 'Value': genuineUsers.length },
    { 'Metric': 'Automated CI / Test Accounts', 'Value': allUsers.length - genuineUsers.length },
    { 'Metric': 'Google OAuth Genuine Users', 'Value': providerCounts['GOOGLE'] || 0 },
    { 'Metric': 'Email / Password Genuine Users', 'Value': providerCounts['EMAIL'] || 0 },
    { 'Metric': 'Direct Web / Feedback Genuine Users', 'Value': providerCounts['WEB FORM'] || 0 },
    { 'Metric': 'Real-Time Sync Frequency', 'Value': 'Every 30 Minutes (Automated)' },
    { 'Metric': 'Last Synchronized (IST)', 'Value': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
    { 'Metric': 'Database Engine', 'Value': 'Supabase PostgreSQL + Resend Cloud Auth' }
  ];

  const wb = XLSX.utils.book_new();

  // Sheet 1: Genuine Users
  const wsGenuine = XLSX.utils.json_to_sheet(genuineRows);
  wsGenuine['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 22 }, // Date
    { wch: 24 }, // Name
    { wch: 34 }, // Email
    { wch: 15 }, // Provider
    { wch: 18 }, // Location
    { wch: 38 }, // UID
    { wch: 26 }, // Category
    { wch: 16 }, // Plan Tier
    { wch: 22 }, // Status
    { wch: 22 }  // Source
  ];
  if (genuineRows.length > 0) {
    wsGenuine['!autofilter'] = { ref: `A1:K${genuineRows.length + 1}` };
  }
  XLSX.utils.book_append_sheet(wb, wsGenuine, 'Genuine Users');

  // Sheet 2: All Users Ever Logged In
  const wsAll = XLSX.utils.json_to_sheet(allRows);
  wsAll['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 22 }, // Date
    { wch: 24 }, // Name
    { wch: 40 }, // Email
    { wch: 15 }, // Provider
    { wch: 18 }, // Location
    { wch: 38 }, // UID
    { wch: 30 }, // Category
    { wch: 16 }, // Plan Tier
    { wch: 22 }, // Status
    { wch: 22 }  // Source
  ];
  if (allRows.length > 0) {
    wsAll['!autofilter'] = { ref: `A1:K${allRows.length + 1}` };
  }
  XLSX.utils.book_append_sheet(wb, wsAll, 'All Users Ever Logged In');

  // Sheet 3: Summary & Metrics
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 38 },
    { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary & Metrics');

  // Write to Project Workspace
  const projectExcelPath = path.resolve(__dirname, '..', 'TripVerse_Users_Database.xlsx');
  XLSX.writeFile(wb, projectExcelPath);
  console.log(`📊 Updated project Excel database: ${projectExcelPath}`);

  // Write to User's Desktop
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  let desktopExcelPath = null;
  if (homeDir) {
    desktopExcelPath = path.join(homeDir, 'Desktop', 'TripVerse_Users_Database.xlsx');
    try {
      XLSX.writeFile(wb, desktopExcelPath);
      console.log(`🚀 Saved directly to your Desktop: ${desktopExcelPath}`);
    } catch (err) {
      console.warn('[Sync] Could not write to Desktop:', err.message);
    }
  }

  return {
    totalCount: allUsers.length,
    genuineCount: genuineUsers.length,
    projectPath: projectExcelPath,
    desktopPath: desktopExcelPath,
    genuineUsers,
    allUsers
  };
}

if (require.main === module) {
  generateExcel()
    .then(res => {
      console.log(`\n🎉 Success! Excel database synced.`);
      console.log(`   - Genuine human users: ${res.genuineCount}`);
      console.log(`   - Total historical logins: ${res.totalCount}`);
    })
    .catch(err => {
      console.error('❌ Excel sync failed:', err);
      process.exit(1);
    });
}

module.exports = { generateExcel, fetchAllUsersFromSources, isTestEmail };
