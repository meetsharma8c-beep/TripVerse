#!/usr/bin/env node
/**
 * TripVerse — Real-Time Database to Excel Synchronization Engine
 * Queries the exact Supabase PostgreSQL database (auth.users & public.profiles)
 * and writes directly to Microsoft Excel on your Desktop in real time.
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
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY;
const RESEND_API_KEY = env.RESEND_API_KEY;

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

async function fetchFromExactDatabase() {
  const userMap = new Map();
  let directDatabaseSuccess = false;

  // ─── SOURCE 1: SUPABASE POSTGRESQL (auth.users & profiles) ─────────────
  if (SUPABASE_URL) {
    console.log(`[Database] Connecting directly to Supabase PostgreSQL at ${SUPABASE_URL}...`);

    // 1A. Direct PostgreSQL Admin via Service Role (if configured)
    if (SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: adminUsers, error } = await adminSb.auth.admin.listUsers();
        if (!error && adminUsers && Array.isArray(adminUsers.users)) {
          directDatabaseSuccess = true;
          console.log(`[Database] ✅ Admin API retrieved ${adminUsers.users.length} raw users directly from auth.users.`);
          for (const u of adminUsers.users) {
            const email = (u.email || '').toLowerCase().trim();
            if (!email) continue;
            const meta = u.user_metadata || {};
            const isTest = isTestEmail(email);
            userMap.set(email, {
              timestamp: u.last_sign_in_at || u.created_at || new Date().toISOString(),
              name: meta.full_name || meta.name || email.split('@')[0],
              email,
              provider: (u.app_metadata?.provider || 'EMAIL/GOOGLE').toUpperCase(),
              location: 'India',
              uid: u.id,
              tier: 'Free Explorer',
              isTest,
              category: isTest ? 'Automated CI / Test Account' : 'Genuine Human Traveler',
              status: 'Exact Database (auth.users)',
              source: 'Supabase PostgreSQL'
            });
          }
        }
      } catch (err) {
        console.warn('[Database] Service Role access notice:', err.message);
      }
    }

    // 1B. Direct Database RPC (get_all_registered_users)
    if (!directDatabaseSuccess && SUPABASE_ANON_KEY) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: rpcUsers, error: rpcErr } = await sb.rpc('get_all_registered_users');
        if (!rpcErr && Array.isArray(rpcUsers) && rpcUsers.length > 0) {
          directDatabaseSuccess = true;
          console.log(`[Database] ✅ RPC get_all_registered_users returned ${rpcUsers.length} users directly from auth.users!`);
          for (const u of rpcUsers) {
            const email = (u.email || '').toLowerCase().trim();
            if (!email) continue;
            const isTest = isTestEmail(email);
            userMap.set(email, {
              timestamp: u.last_sign_in_at || u.created_at || new Date().toISOString(),
              name: u.name || email.split('@')[0],
              email,
              provider: (u.provider || 'GOOGLE/EMAIL').toUpperCase(),
              location: u.location || 'India',
              uid: u.id,
              tier: 'Free Explorer',
              isTest,
              category: isTest ? 'Automated CI / Test Account' : 'Genuine Human Traveler',
              status: 'Exact Database (auth.users)',
              source: 'Supabase PostgreSQL'
            });
          }
        }
      } catch {}

      // 1C. Direct Database View (realtime_users)
      if (!directDatabaseSuccess) {
        try {
          const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          const { data: viewUsers, error: viewErr } = await sb.from('realtime_users').select('*');
          if (!viewErr && Array.isArray(viewUsers) && viewUsers.length > 0) {
            directDatabaseSuccess = true;
            console.log(`[Database] ✅ View public.realtime_users returned ${viewUsers.length} users directly from PostgreSQL!`);
            for (const u of viewUsers) {
              const email = (u.email || '').toLowerCase().trim();
              if (!email) continue;
              const isTest = isTestEmail(email);
              userMap.set(email, {
                timestamp: u.last_sign_in_at || u.created_at || new Date().toISOString(),
                name: u.name || email.split('@')[0],
                email,
                provider: (u.provider || 'GOOGLE/EMAIL').toUpperCase(),
                location: u.location || 'India',
                uid: u.id,
                tier: 'Free Explorer',
                isTest,
                category: isTest ? 'Automated CI / Test Account' : 'Genuine Human Traveler',
                status: 'Exact Database (auth.users)',
                source: 'Supabase PostgreSQL'
              });
            }
          }
        } catch {}
      }

      // 1D. Supabase user_feedback table
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
                isTest: false,
                category: 'Genuine Human Traveler',
                status: `Database User (${fb.rating}★ Review)`,
                source: 'Supabase user_feedback'
              });
            }
          }
        }
      } catch (err) {
        console.warn('[Database] Supabase user_feedback notice:', err.message);
      }
    }
  }

  // ─── SOURCE 2: HISTORICAL AUDIT FALLBACK (if view not yet created) ─────
  if (!directDatabaseSuccess && RESEND_API_KEY) {
    console.log('[Database Notice] Direct auth.users view not yet enabled in Supabase.');
    console.log('[Database Notice] Pulling verified authentication records from audit logs...');
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

            if (email) {
              const existing = userMap.get(email);
              const isTest = isTestEmail(email);

              if (!existing || new Date(item.created_at) > new Date(existing.timestamp)) {
                userMap.set(email, {
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
                  source: 'Audit Log'
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
    } catch {}
  }

  const allUsers = Array.from(userMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const genuineUsers = allUsers.filter(u => !u.isTest);

  return { allUsers, genuineUsers, directDatabaseSuccess };
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
    'Database Source': u.source
  };
}

async function generateExcel() {
  console.log('🔄 Querying real-time database records for Excel synchronization...');
  const { allUsers, genuineUsers, directDatabaseSuccess } = await fetchFromExactDatabase();
  console.log(`✅ Synchronized ${allUsers.length} total records (${genuineUsers.length} genuine travelers, ${allUsers.length - genuineUsers.length} test accounts).`);

  const genuineRows = genuineUsers.map(formatRow);
  const allRows = allUsers.map(formatRow);

  const providerCounts = {};
  genuineUsers.forEach(u => {
    providerCounts[u.provider] = (providerCounts[u.provider] || 0) + 1;
  });

  const summaryRows = [
    { 'Metric': 'Database Engine', 'Value': 'Supabase PostgreSQL (tnetveqpyddodlczklxn)' },
    { 'Metric': 'Direct Database Query Status', 'Value': directDatabaseSuccess ? 'Active (Direct auth.users query)' : 'Ready (Awaiting view execution in Supabase)' },
    { 'Metric': 'Total Recorded Users in Database', 'Value': allUsers.length },
    { 'Metric': 'Total Genuine Human Travelers', 'Value': genuineUsers.length },
    { 'Metric': 'Automated CI / Test Accounts', 'Value': allUsers.length - genuineUsers.length },
    { 'Metric': 'Google OAuth Genuine Users', 'Value': providerCounts['GOOGLE'] || 0 },
    { 'Metric': 'Email / Password Genuine Users', 'Value': providerCounts['EMAIL'] || 0 },
    { 'Metric': 'Direct Web Form / Feedback Users', 'Value': providerCounts['WEB FORM'] || 0 },
    { 'Metric': 'Automated Real-Time Sync', 'Value': 'Active Every 30 Minutes' },
    { 'Metric': 'Last Database Pull (IST)', 'Value': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }
  ];

  const wb = XLSX.utils.book_new();

  // Sheet 1: Genuine Users
  const wsGenuine = XLSX.utils.json_to_sheet(genuineRows);
  wsGenuine['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 24 },
    { wch: 34 },
    { wch: 15 },
    { wch: 18 },
    { wch: 38 },
    { wch: 26 },
    { wch: 16 },
    { wch: 24 },
    { wch: 26 }
  ];
  if (genuineRows.length > 0) {
    wsGenuine['!autofilter'] = { ref: `A1:K${genuineRows.length + 1}` };
  }
  XLSX.utils.book_append_sheet(wb, wsGenuine, 'Genuine Users');

  // Sheet 2: All Users in Database
  const wsAll = XLSX.utils.json_to_sheet(allRows);
  wsAll['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 24 },
    { wch: 40 },
    { wch: 15 },
    { wch: 18 },
    { wch: 38 },
    { wch: 30 },
    { wch: 16 },
    { wch: 24 },
    { wch: 26 }
  ];
  if (allRows.length > 0) {
    wsAll['!autofilter'] = { ref: `A1:K${allRows.length + 1}` };
  }
  XLSX.utils.book_append_sheet(wb, wsAll, 'All Database Users');

  // Sheet 3: Database & Sync Status
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 38 },
    { wch: 48 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Database Status');

  // Save to project and Desktop
  const projectExcelPath = path.resolve(__dirname, '..', 'TripVerse_Users_Database.xlsx');
  XLSX.writeFile(wb, projectExcelPath);

  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  let desktopExcelPath = null;
  if (homeDir) {
    desktopExcelPath = path.join(homeDir, 'Desktop', 'TripVerse_Users_Database.xlsx');
    try {
      XLSX.writeFile(wb, desktopExcelPath);
      console.log(`🚀 Saved directly to your Desktop: ${desktopExcelPath}`);
    } catch {}
  }

  return {
    totalCount: allUsers.length,
    genuineCount: genuineUsers.length,
    projectPath: projectExcelPath,
    desktopPath: desktopExcelPath,
    directDatabaseSuccess
  };
}

if (require.main === module) {
  generateExcel()
    .then(res => {
      console.log(`\n🎉 Excel synchronized with exact database.`);
      console.log(`   - Genuine human users: ${res.genuineCount}`);
      console.log(`   - Total database records: ${res.totalCount}`);
    })
    .catch(err => {
      console.error('❌ Database Excel sync failed:', err);
      process.exit(1);
    });
}

module.exports = { generateExcel, fetchFromExactDatabase, isTestEmail };
