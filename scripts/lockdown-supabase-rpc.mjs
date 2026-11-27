#!/usr/bin/env node
/**
 * 1-Command Automated Supabase RPC & Service-Role Hardening
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/lockdown-supabase-rpc.mjs
 *
 * Automates both steps with zero downtime:
 *  1. Retrieves the `service_role` key for project `tnetveqpyddodlczklxn` via Supabase Management API
 *     and stores `SUPABASE_SERVICE_ROLE_KEY` in Vercel (Production + Preview).
 *  2. Executes `supabase/migrations/20261127_lock_founder_rpc.sql` via Supabase Management API
 *     to drop `public.realtime_users` and revoke `anon` execute on `get_all_registered_users()`.
 */

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'tnetveqpyddodlczklxn';
const ACCESS_TOKEN = (process.env.SUPABASE_ACCESS_TOKEN || '').trim();

if (!ACCESS_TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens and run:');
  console.error('  SUPABASE_ACCESS_TOKEN=sbp_... node scripts/lockdown-supabase-rpc.mjs');
  process.exit(1);
}

async function run() {
  console.log(`[1/3] Fetching service_role key for Supabase project ${PROJECT_REF}...`);
  const keysRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
  });
  if (!keysRes.ok) {
    throw new Error(`Supabase API keys fetch failed (${keysRes.status}): ${await keysRes.text()}`);
  }
  const keys = await keysRes.json();
  const serviceRoleObj = Array.isArray(keys) ? keys.find(k => k.name === 'service_role') : null;
  if (!serviceRoleObj?.api_key) {
    throw new Error('Could not locate service_role api_key in response.');
  }

  console.log('[2/3] Adding SUPABASE_SERVICE_ROLE_KEY to Vercel (Production & Preview)...');
  for (const envTarget of ['production', 'preview']) {
    const res = spawnSync('npx', ['-y', 'vercel', 'env', 'add', 'SUPABASE_SERVICE_ROLE_KEY', envTarget, '--force'], {
      input: serviceRoleObj.api_key,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    if (res.status !== 0) {
      throw new Error(`Failed adding SUPABASE_SERVICE_ROLE_KEY to Vercel ${envTarget}`);
    }
  }

  console.log('[3/3] Executing SQL lockdown migration on Supabase...');
  const sql = fs.readFileSync('supabase/migrations/20261127_lock_founder_rpc.sql', 'utf8');
  const sqlRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  if (!sqlRes.ok) {
    throw new Error(`SQL execution failed (${sqlRes.status}): ${await sqlRes.text()}`);
  }

  console.log('✅ Done! Redeploying production with SUPABASE_SERVICE_ROLE_KEY active...');
  spawnSync('npx', ['-y', 'vercel', '--prod', '--yes'], { stdio: 'inherit' });
}

run().catch((err) => {
  console.error('❌ Automation error:', err.message);
  process.exit(1);
});
