import { getSupabaseClient } from './supabase';
import { getActiveSession, getCurrentUser, isFounderVipUser } from './authService';
import { canonicalizeAccountEmail } from './supabaseSyncService';
import { resolveApiUrl } from './deviceService';

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignInAt?: string;
  location?: string;
  provider: string;
  tier: 'vip_founder' | 'pro' | 'free';
  tripsCount?: number;
  isGenuine: boolean;
  isGuest?: boolean;
}

export interface AdminMetrics {
  totalRegistered: number;
  activeSignedUsers: number;
  signedUpOnlyUsers?: number;
  genuineTravelers: number;
  proSubscribers: number;
  vipFounders: number;
  freeAccounts: number;
  googleUsers: number;
  guestSessions: number;
}

export function isTestEmail(email?: string, name?: string): boolean {
  const lowerEmail = (email || '').toLowerCase().trim();
  const lowerName = (name || '').toLowerCase().trim();

  if (lowerName.includes('e2e launch tester') || lowerName.includes('audit test') || lowerName.includes('hdhdhdhd')) {
    return true;
  }

  if (!lowerEmail) {
    return lowerName === 'explorer' || lowerName === '' || lowerName === 'null';
  }

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

function normalizeProviderLabel(rawProvider?: string, hasTopLevelEmail?: boolean): string {
  const p = (rawProvider || '').toLowerCase().trim();
  if (p.includes('google')) return 'google';
  if (p.includes('phone') || p.includes('sms')) return 'phone';
  if (p.includes('guest') || p.includes('anon')) return 'guest';
  if (!hasTopLevelEmail && p === 'email') return 'email';
  return p || 'email';
}

function pickBetterName(existingName: string, candidateName: string, email: string): string {
  const emailPrefix = email.split('@')[0] || 'Explorer';
  const genericNames = new Set(['', 'explorer', 'traveler explorer', 'null', 'undefined', emailPrefix.toLowerCase()]);
  const cleanCandidate = (candidateName || '').trim();
  const cleanExisting = (existingName || '').trim();
  if (!cleanExisting || genericNames.has(cleanExisting.toLowerCase())) {
    return cleanCandidate || cleanExisting || emailPrefix;
  }
  if (cleanCandidate && !genericNames.has(cleanCandidate.toLowerCase()) && cleanCandidate.length > cleanExisting.length) {
    return cleanCandidate;
  }
  return cleanExisting;
}

function hasActiveLocalProOverride(email: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw =
      localStorage.getItem(`tripverse_admin_pro_${email.toLowerCase().trim()}`) ||
      localStorage.getItem(`tripverse_admin_pro_${canonicalizeAccountEmail(email)}`);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed?.tier !== 'pro') return false;
    if (parsed?.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse raw rows from Supabase `get_all_registered_users` RPC into deduplicated
 * registered accounts, cloud Pro overrides, and anonymous Guest Explorer sessions.
 */
export function parseRpcRosterRows(rpcUsers: any[]): {
  registeredByCanon: Map<string, AdminUserRecord>;
  guestList: AdminUserRecord[];
  cloudProOverrides: Map<string, { tier: 'pro' | 'free'; updatedAt: number; expiresAt?: string }>;
} {
  const registeredByCanon = new Map<string, AdminUserRecord>();
  const guestList: AdminUserRecord[] = [];
  const cloudProOverrides = new Map<string, { tier: 'pro' | 'free'; updatedAt: number; expiresAt?: string }>();
  const founderCanon = canonicalizeAccountEmail('meet.sharma8c@gmail.com');

  // Pass 1: Extract latest cloud admin_pro_override records
  for (const u of rpcUsers) {
    const meta = u?.metadata || u?.raw_user_meta_data || {};
    if (meta?.record_type === 'admin_pro_override' && meta?.target_email) {
      const targetCanon = canonicalizeAccountEmail(String(meta.target_email));
      const updatedAt = new Date(meta.updated_at || u.created_at || 0).getTime();
      const prev = cloudProOverrides.get(targetCanon);
      if (!prev || updatedAt >= prev.updatedAt) {
        const expMs = meta.expires_at ? new Date(meta.expires_at).getTime() : Infinity;
        const activeTier: 'pro' | 'free' = meta.subscription_tier === 'pro' && expMs > Date.now() ? 'pro' : 'free';
        cloudProOverrides.set(targetCanon, {
          tier: activeTier,
          updatedAt,
          expiresAt: meta.expires_at
        });
      }
    }
  }

  // Pass 2A: Extract all accounts with a real email (top-level email OR synced external OAuth metadata email)
  const noEmailCandidates: any[] = [];
  for (const u of rpcUsers) {
    const meta = u?.metadata || u?.raw_user_meta_data || {};
    if (meta?.record_type === 'admin_pro_override') continue;

    const rawEmail = String(u?.email || meta?.user_email || meta?.email || '').toLowerCase().trim();
    if (!rawEmail) {
      noEmailCandidates.push(u);
      continue;
    }

    const rawName = String(u?.name || meta?.full_name || meta?.name || '').trim();
    const rawLocation = String(u?.location || meta?.location || 'India').trim();
    const canon = canonicalizeAccountEmail(rawEmail);
    const isFounder = canon === founderCanon || rawEmail === 'meet.sharma8c@gmail.com';
    const provider = normalizeProviderLabel(
      meta?.auth_provider || u?.raw_app_meta_data?.provider || u?.provider,
      Boolean(u?.email)
    );

    const cloudOverride = cloudProOverrides.get(canon);
    const metaPro = Boolean(
      u?.subscription_tier === 'pro' ||
      meta?.subscription_tier === 'pro' ||
      u?.user_metadata?.subscription_tier === 'pro'
    );
    const localPro = hasActiveLocalProOverride(rawEmail);
    const isPro = cloudOverride ? cloudOverride.tier === 'pro' : (metaPro || localPro);
    const tier: 'vip_founder' | 'pro' | 'free' = isFounder ? 'vip_founder' : (isPro ? 'pro' : 'free');

    const createdAt = meta?.original_created_at || u?.created_at || new Date().toISOString();
    const lastSignInAt = u?.last_sign_in_at || meta?.last_sign_in_at || undefined;
    const displayName = rawName || rawEmail.split('@')[0];

    const existing = registeredByCanon.get(canon);
    if (!existing) {
      registeredByCanon.set(canon, {
        id: u?.id || meta?.external_uid || `sb-${rawEmail}`,
        email: isFounder ? 'meet.sharma8c@gmail.com' : rawEmail,
        name: displayName,
        createdAt,
        lastSignInAt,
        location: rawLocation || 'India',
        provider,
        tier,
        tripsCount: Number(meta?.lifetime_trips_created || 0),
        isGenuine: isFounder ? true : !isTestEmail(rawEmail, displayName)
      });
    } else {
      existing.name = pickBetterName(existing.name, displayName, existing.email);
      if (provider === 'google' && existing.provider === 'email') {
        existing.provider = 'google';
      } else if (provider !== 'email' && existing.provider === 'email') {
        existing.provider = provider;
      }
      if (new Date(createdAt).getTime() < new Date(existing.createdAt).getTime()) {
        existing.createdAt = createdAt;
      }
      if (lastSignInAt && (!existing.lastSignInAt || new Date(lastSignInAt).getTime() > new Date(existing.lastSignInAt).getTime())) {
        existing.lastSignInAt = lastSignInAt;
      }
      if (tier === 'vip_founder') existing.tier = 'vip_founder';
      else if (tier === 'pro' && existing.tier !== 'vip_founder') existing.tier = 'pro';
      if (rawLocation && (!existing.location || existing.location === 'India')) {
        existing.location = rawLocation;
      }
      existing.tripsCount = Math.max(existing.tripsCount || 0, Number(meta?.lifetime_trips_created || 0));
      existing.isGenuine = existing.tier === 'vip_founder' ? true : !isTestEmail(existing.email, existing.name);
    }
  }

  // Pass 2B: Classify no-email rows — promote real Google-verified (hidden-email) & custom-named human users
  //          into the main roster; keep pure anonymous "Explorer" sessions in `guestList`.
  const knownGenuineNames = new Set(
    Array.from(registeredByCanon.values())
      .filter(r => r.isGenuine)
      .map(r => r.name.toLowerCase().trim())
  );

  for (const u of noEmailCandidates) {
    const meta = u?.metadata || u?.raw_user_meta_data || {};
    const rawName = String(u?.name || meta?.full_name || meta?.name || '').trim();
    const lowerName = rawName.toLowerCase();
    const rawLocation = String(u?.location || meta?.location || 'India').trim();
    const isGoogleVerifiedNoEmail =
      String(meta?.auth_provider || '').toLowerCase() === 'google' ||
      String(meta?.avatar_url || '').includes('googleusercontent.com');
    const isGenericGuestName =
      !rawName ||
      lowerName === 'explorer' ||
      lowerName === 'guest explorer' ||
      lowerName === 'traveler explorer' ||
      lowerName === 'null';

    if ((isGoogleVerifiedNoEmail || (!isGenericGuestName && !isTestEmail('', rawName))) && !knownGenuineNames.has(lowerName)) {
      const syntheticKey = `uid:${meta?.external_uid || u?.id || lowerName}`;
      const createdAt = meta?.original_created_at || u?.created_at || new Date().toISOString();
      const lastSignInAt = u?.last_sign_in_at || meta?.last_sign_in_at || createdAt;
      registeredByCanon.set(syntheticKey, {
        id: u?.id || meta?.external_uid || syntheticKey,
        email: isGoogleVerifiedNoEmail
          ? 'Google Verified (Email Hidden by OAuth)'
          : 'Profile Session (No Email Linked)',
        name: rawName || 'Google Traveler',
        createdAt,
        lastSignInAt,
        location: rawLocation || 'India',
        provider: isGoogleVerifiedNoEmail ? 'google' : 'guest',
        tier: 'free',
        tripsCount: Number(meta?.lifetime_trips_created || 0),
        isGenuine: true
      });
      if (lowerName) knownGenuineNames.add(lowerName);
    } else {
      guestList.push({
        id: u?.id || `guest-${guestList.length + 1}`,
        email: 'guest@anonymous.local',
        name: rawName || 'Guest Explorer',
        createdAt: u?.created_at || new Date().toISOString(),
        lastSignInAt: u?.last_sign_in_at || u?.created_at,
        location: rawLocation || 'India',
        provider: 'guest',
        tier: 'free',
        tripsCount: Number(meta?.lifetime_trips_created || 0),
        isGenuine: false,
        isGuest: true
      });
    }
  }

  return { registeredByCanon, guestList, cloudProOverrides };
}

/**
 * Fetch all registered users + anonymous guest telemetry for the Founder Command Center.
 * Restricted strictly to authenticated VIP Founder (`meet.sharma8c@gmail.com`).
 */
export async function fetchFounderUserRoster(): Promise<{
  users: AdminUserRecord[];
  guests: AdminUserRecord[];
  metrics: AdminMetrics;
}> {
  const current = getCurrentUser();
  if (!isFounderVipUser(current)) {
    throw new Error('Unauthorized: Access to Founder Command Center is restricted to meet.sharma8c@gmail.com');
  }

  let registeredByCanon = new Map<string, AdminUserRecord>();
  let guestList: AdminUserRecord[] = [];
  const founderEmail = 'meet.sharma8c@gmail.com';
  const founderCanon = canonicalizeAccountEmail(founderEmail);
  const supabase = getSupabaseClient();

  if (supabase) {
    // 1. Fetch unified Supabase RPC (`auth.users` + synced Google/Firebase accounts + cloud Pro overrides)
    try {
      const { data: rpcUsers, error: rpcErr } = await supabase.rpc('get_all_registered_users');
      if (!rpcErr && Array.isArray(rpcUsers)) {
        const parsed = parseRpcRosterRows(rpcUsers);
        registeredByCanon = parsed.registeredByCanon;
        guestList = parsed.guestList;
      }
    } catch (err) {
      console.warn('[AdminService] Supabase RPC notice:', err);
    }

    // 2. Supplement from `profiles` table if accessible
    try {
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
      if (!pErr && Array.isArray(profiles)) {
        profiles.forEach((p: any) => {
          const email = (p.email || '').toLowerCase().trim();
          if (!email) return;
          const canon = canonicalizeAccountEmail(email);
          const isFounder = canon === founderCanon;
          const isPro = Boolean(p.subscription_tier === 'pro' || hasActiveLocalProOverride(email));
          const tier: 'vip_founder' | 'pro' | 'free' = isFounder ? 'vip_founder' : (isPro ? 'pro' : 'free');
          const pName = p.display_name || p.name || email.split('@')[0];

          const existing = registeredByCanon.get(canon);
          if (existing) {
            existing.name = pickBetterName(existing.name, pName, existing.email);
            existing.tier = isFounder ? 'vip_founder' : (isPro ? 'pro' : existing.tier);
            if (p.location && (!existing.location || existing.location === 'India')) {
              existing.location = p.location;
            }
          } else {
            registeredByCanon.set(canon, {
              id: p.id || `p-${email}`,
              email: isFounder ? founderEmail : email,
              name: pName,
              createdAt: p.created_at || new Date().toISOString(),
              lastSignInAt: p.updated_at,
              location: p.location || 'India',
              provider: normalizeProviderLabel(p.provider, true),
              tier,
              tripsCount: 0,
              isGenuine: isFounder ? true : !isTestEmail(email, pName)
            });
          }
        });
      }
    } catch (err) {
      console.warn('[AdminService] Profiles notice:', err);
    }

    // 3. Supplement from `user_feedback` table so feedback contributors with email are always included
    try {
      const { data: feedbackRows, error: fbErr } = await supabase.from('user_feedback').select('*');
      if (!fbErr && Array.isArray(feedbackRows)) {
        feedbackRows.forEach((fb: any) => {
          const email = (fb.email || '').toLowerCase().trim();
          if (!email || !email.includes('@')) return;
          const canon = canonicalizeAccountEmail(email);
          if (!registeredByCanon.has(canon)) {
            const isFounder = canon === founderCanon;
            const isPro = hasActiveLocalProOverride(email);
            registeredByCanon.set(canon, {
              id: fb.user_id || fb.id || `fb-${email}`,
              email: isFounder ? founderEmail : email,
              name: email.split('@')[0],
              createdAt: fb.created_at || new Date().toISOString(),
              lastSignInAt: fb.created_at || new Date().toISOString(),
              location: 'India',
              provider: 'email',
              tier: isFounder ? 'vip_founder' : (isPro ? 'pro' : 'free'),
              tripsCount: 0,
              isGenuine: isFounder ? true : !isTestEmail(email, '')
            });
          }
        });
      }
    } catch {}
  }

  // 3. Ensure VIP Founder identity is always present & elevated
  const existingFounder = registeredByCanon.get(founderCanon);
  if (existingFounder) {
    existingFounder.email = founderEmail;
    existingFounder.tier = 'vip_founder';
    existingFounder.isGenuine = true;
    if (!existingFounder.name || existingFounder.name === 'meet.sharma8c') {
      existingFounder.name = current?.displayName || 'Meet Sharma (VIP Founder)';
    }
  } else {
    registeredByCanon.set(founderCanon, {
      id: current?.uid || 'founder-primary-001',
      email: founderEmail,
      name: current?.displayName || 'Meet Sharma (VIP Founder)',
      createdAt: current?.createdAt || '2026-09-01T00:00:00Z',
      lastSignInAt: new Date().toISOString(),
      location: current?.location || 'India',
      provider: current?.provider || 'google',
      tier: 'vip_founder',
      isGenuine: true
    });
  }

  const users = Array.from(registeredByCanon.values()).sort((a, b) => {
    if (a.tier === 'vip_founder') return -1;
    if (b.tier === 'vip_founder') return 1;
    if (a.isGenuine && !b.isGenuine) return -1;
    if (!a.isGenuine && b.isGenuine) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const guests = guestList.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalRegistered = users.length;
  const activeSignedUsers = users.filter(u => u.lastSignInAt).length;
  const signedUpOnlyUsers = Math.max(0, totalRegistered - activeSignedUsers);
  const genuineTravelers = users.filter(u => u.isGenuine).length;
  const proSubscribers = users.filter(u => u.tier === 'pro').length;
  const vipFounders = users.filter(u => u.tier === 'vip_founder').length;
  const freeAccounts = Math.max(0, totalRegistered - proSubscribers - vipFounders);
  const googleUsers = users.filter(u => u.provider === 'google').length;
  const guestSessions = guests.length;

  return {
    users,
    guests,
    metrics: {
      totalRegistered,
      activeSignedUsers,
      signedUpOnlyUsers,
      genuineTravelers,
      proSubscribers,
      vipFounders,
      freeAccounts,
      googleUsers,
      guestSessions
    }
  };
}

async function resolveFounderBearerToken(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
    }
  } catch {}

  const activeSession = getActiveSession();
  if (activeSession?.token && !activeSession.token.startsWith('session-')) {
    return activeSession.token;
  }
  return null;
}

/**
 * Grant Pro access directly from the Founder Command Center (persists to Cloud + local optimistic store)
 */
export async function adminGrantPro(targetEmail: string, durationDays: number = 365): Promise<boolean> {
  const current = getCurrentUser();
  if (!isFounderVipUser(current)) {
    throw new Error('Unauthorized');
  }

  const cleanEmail = targetEmail.toLowerCase().trim();
  if (canonicalizeAccountEmail(cleanEmail) === canonicalizeAccountEmail('meet.sharma8c@gmail.com')) {
    return true; // Already VIP Founder
  }

  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    if (typeof localStorage !== 'undefined') {
      const proRecord = {
        tier: 'pro',
        grantedAt: new Date().toISOString(),
        expiresAt
      };
      localStorage.setItem(`tripverse_admin_pro_${cleanEmail}`, JSON.stringify(proRecord));
    }

    const procEnv = (globalThis as any).process?.env;
    if (!(procEnv && (procEnv.VITEST || procEnv.NODE_ENV === 'test'))) {
      const founderToken = await resolveFounderBearerToken();
      if (founderToken) {
        await fetch(resolveApiUrl('/api/auth-activity'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${founderToken}`
          },
          body: JSON.stringify({
            event: 'admin_pro_override',
            targetEmail: cleanEmail,
            subscriptionTier: 'pro',
            expiresAt
          })
        }).catch(() => {});
      }
    }
    return true;
  } catch (err) {
    console.error('[AdminService] Failed to grant Pro:', err);
    return false;
  }
}

/**
 * Revoke Pro access back to Free tier (persists to Cloud + clears local optimistic store)
 */
export async function adminRevokePro(targetEmail: string): Promise<boolean> {
  const current = getCurrentUser();
  if (!isFounderVipUser(current)) {
    throw new Error('Unauthorized');
  }

  const cleanEmail = targetEmail.toLowerCase().trim();
  if (canonicalizeAccountEmail(cleanEmail) === canonicalizeAccountEmail('meet.sharma8c@gmail.com')) {
    return false; // Cannot revoke Founder VIP
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`tripverse_admin_pro_${cleanEmail}`);
      localStorage.removeItem(`tripverse_admin_pro_${canonicalizeAccountEmail(cleanEmail)}`);
    }

    const procEnv = (globalThis as any).process?.env;
    if (!(procEnv && (procEnv.VITEST || procEnv.NODE_ENV === 'test'))) {
      const founderToken = await resolveFounderBearerToken();
      if (founderToken) {
        await fetch(resolveApiUrl('/api/auth-activity'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${founderToken}`
          },
          body: JSON.stringify({
            event: 'admin_pro_override',
            targetEmail: cleanEmail,
            subscriptionTier: 'free'
          })
        }).catch(() => {});
      }
    }
    return true;
  } catch (err) {
    console.error('[AdminService] Failed to revoke Pro:', err);
    return false;
  }
}

/**
 * Generate UTF-8 CSV export for Excel / Google Sheets
 */
export function buildFounderRosterCsv(records: AdminUserRecord[]): string {
  const headers = ['Full Name', 'Email Address', 'Tier', 'Auth Provider', 'Genuine Human', 'Location', 'Created Date', 'Last Sign-In'];
  const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = records.map(r => [
    escapeCsv(r.name),
    escapeCsv(r.isGuest ? 'Anonymous Guest' : r.email),
    escapeCsv(r.isGuest ? 'guest' : r.tier),
    escapeCsv(r.provider.toUpperCase()),
    escapeCsv(r.isGenuine ? 'Yes' : 'No'),
    escapeCsv(r.location || 'India'),
    escapeCsv(r.createdAt),
    escapeCsv(r.lastSignInAt || '')
  ].join(','));
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}
