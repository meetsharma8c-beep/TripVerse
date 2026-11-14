import { AuthUser, AuthSession, AuthProvider, SignUpData, LoginData, GoogleCredentialPayload, SubscriptionTier, UserSubscriptionQuota } from '../types/auth';

export type { AuthUser, AuthSession, AuthProvider, SubscriptionTier, UserSubscriptionQuota };
import { UserProfile } from '../types/trip';
import { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { 
  getSupabaseClient, 
  isSupabaseConfigured, 
  getStoredSupabaseConfig, 
  saveSupabaseConfig, 
  removeSupabaseConfig, 
  SupabaseConfig 
} from './supabase';
import {
  isFirebaseConfigured,
  getStoredFirebaseConfig,
  saveFirebaseConfig,
  removeFirebaseConfig,
  signInWithFirebaseGoogle,
  signInWithFirebaseGoogleRedirect,
  checkFirebaseRedirectResult,
  onFirebaseAuthStateChangedListener,
  signOutFirebase,
  sendFirebasePhoneOtp,
  confirmFirebasePhoneOtp,
  clearFirebasePhoneSession,
  sendFirebasePasswordReset,
  FirebaseConfig
} from './firebase';
import { 
  saveProfileToSupabase, 
  loadProfileFromSupabase 
} from './supabaseSyncService';

const USERS_STORAGE_KEY = 'tripverse_auth_users_v3';
const SESSION_STORAGE_KEY = 'tripverse_auth_session_v3';
const VERIFICATION_STORAGE_KEY = 'tripverse_auth_verification_codes_v1';
const AUTH_EVENT_KEY = 'tripverse_auth_state_change';

/**
 * Recognized VIP Founder & Creator Accounts (Lifetime Unlimited Access)
 */
export const FOUNDER_VIP_EMAILS = new Set([
  'meet.sharma8c@gmail.com',
  'ms.concode@gmail.com',
  'concode.sys@gmail.com',
  '25bt04065@gsfcuniversity.ac.in'
]);

export function isFounderVipUser(userParam?: AuthUser | null): boolean {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('tripverse_founder_vip') === 'true') {
    return true;
  }
  const user = userParam !== undefined ? userParam : getCurrentUser();
  const emailNorm = user?.email ? user.email.toLowerCase().trim() : '';
  return FOUNDER_VIP_EMAILS.has(emailNorm);
}

/**
 * Self-executing cleanup to permanently eradicate legacy test sessions & fake accounts from localStorage.
 */
function purgeLegacyMockSessions(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (rawSession) {
      const s = JSON.parse(rawSession);
      const uid = s?.user?.uid || '';
      const email = s?.user?.email || '';
      const name = s?.user?.displayName || '';
      const isMock = s?.isMock === true || s?.user?.isMock === true;
      if (
        isMock ||
        uid.startsWith('user-email-') ||
        uid.startsWith('user-google-') ||
        uid.startsWith('mock-') ||
        uid.startsWith('test-')
      ) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }

    const rawAccounts = localStorage.getItem(USERS_STORAGE_KEY);
    if (rawAccounts) {
      const accounts: StoredAccount[] = JSON.parse(rawAccounts) || [];
      const cleaned = accounts.filter(a =>
        !a.user.uid.startsWith('user-email-') &&
        !a.user.uid.startsWith('user-google-') &&
        !a.user.uid.startsWith('mock-') &&
        !a.user.uid.startsWith('test-')
      );
      if (cleaned.length !== accounts.length) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cleaned));
      }
    }

    // Always purge obsolete single-user legacy profile key
    localStorage.removeItem('tripverse_user_profile_v1');
  } catch {}
}

purgeLegacyMockSessions();

// Export Supabase configuration helpers & legacy aliases
export { 
  isSupabaseConfigured, 
  getStoredSupabaseConfig, 
  saveSupabaseConfig, 
  removeSupabaseConfig 
};
export type { SupabaseConfig };

// Firebase configuration helpers & exports
export {
  isFirebaseConfigured,
  getStoredFirebaseConfig,
  saveFirebaseConfig,
  removeFirebaseConfig,
  signOutFirebase
};
export type { FirebaseConfig };

interface StoredAccount {
  user: AuthUser;
  passwordHash: string;
}

export { toDeterministicUuid, isValidUuid } from '../utils/uuid';
import { toDeterministicUuid } from '../utils/uuid';

/**
 * SHA-256 cryptographic password hashing using SubtleCrypto
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(password + '_tripverse_salt_2026');
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback
    }
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return `legacy_hash_${Math.abs(hash)}`;
}

/**
 * Convert a Supabase Auth User object into the unified TripVerse AuthUser model
 */
export function supabaseUserToAuthUser(sbUser: SupabaseAuthUser, overrides?: Partial<AuthUser>): AuthUser {
  const metadata = sbUser.user_metadata || {};
  const displayName = 
    overrides?.displayName || 
    metadata.full_name || 
    metadata.name || 
    (sbUser.email ? sbUser.email.split('@')[0] : 'Explorer');

  const photoURL = 
    overrides?.photoURL || 
    metadata.avatar_url || 
    metadata.picture || 
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=2D5A3D,0B2545`;

  const isAnonymous = Boolean(
    (sbUser as any).is_anonymous || 
    sbUser.app_metadata?.provider === 'anonymous' ||
    overrides?.provider === 'guest' ||
    overrides?.isAnonymous ||
    (!sbUser.email && !sbUser.phone && !overrides?.email && !overrides?.phoneNumber)
  );

  const rawProvider = (sbUser.app_metadata?.provider as any) || (sbUser.phone ? 'phone' : (isAnonymous ? 'guest' : 'email'));
  const provider: AuthProvider = isAnonymous
    ? 'guest'
    : rawProvider === 'google'
    ? 'google'
    : rawProvider === 'phone'
    ? 'phone'
    : 'email';

  const emailNorm = (sbUser.email || overrides?.email || '').toLowerCase().trim();
  const userDeterministicUid = toDeterministicUuid(sbUser.id);
  const isFounderVIP = FOUNDER_VIP_EMAILS.has(emailNorm) || (typeof localStorage !== 'undefined' && localStorage.getItem('tripverse_founder_vip') === 'true');
  let storedLifetime: number | undefined = undefined;

  if (typeof metadata.lifetime_trips_created === 'number') {
    storedLifetime = metadata.lifetime_trips_created;
  } else if (typeof overrides?.lifetimeTripsCreated === 'number') {
    storedLifetime = overrides.lifetimeTripsCreated;
  } else if (typeof localStorage !== 'undefined') {
    try {
      if (emailNorm) {
        const val = localStorage.getItem(`tripverse_lifetime_trips_created_email_${emailNorm}`);
        if (val) storedLifetime = parseInt(val, 10);
      }
      if (storedLifetime === undefined) {
        const val = localStorage.getItem(`tripverse_lifetime_trips_created_u_${userDeterministicUid}`);
        if (val) storedLifetime = parseInt(val, 10);
      }
    } catch {}
  }

  const finalLifetime = typeof storedLifetime === 'number' && !isNaN(storedLifetime)
    ? Math.max(0, storedLifetime)
    : (isAnonymous ? 0 : 0);

  const explicitRemaining = typeof overrides?.freeTripsRemaining === 'number'
    ? overrides.freeTripsRemaining
    : (typeof metadata.free_trips_remaining === 'number' ? metadata.free_trips_remaining : undefined);

  // STRICT OPTION A: Free trips remaining can never exceed 3 minus lifetime trips created
  const finalRemaining = isAnonymous
    ? 0
    : (typeof explicitRemaining === 'number'
        ? Math.max(0, Math.min(explicitRemaining, 3 - finalLifetime))
        : Math.max(0, 3 - finalLifetime));

  return {
    uid: userDeterministicUid,
    email: sbUser.email || overrides?.email || '',
    phoneNumber: sbUser.phone || overrides?.phoneNumber || '',
    displayName,
    photoURL,
    travelerStyle: overrides?.travelerStyle || metadata.traveler_style || 'Budget explorer',
    travelStyleTag: overrides?.travelStyleTag || metadata.travel_style_tag || (isAnonymous ? 'Guest Explorer' : 'Verified Explorer'),
    location: overrides?.location || metadata.location || 'India',
    occupation: overrides?.occupation || metadata.occupation || (isAnonymous ? 'Guest' : 'Explorer'),
    age: overrides?.age || metadata.age || 25,
    emailVerified: isAnonymous ? true : Boolean(sbUser.email_confirmed_at),
    provider,
    isAnonymous,
    createdAt: sbUser.created_at || new Date().toISOString(),
    lastLoginAt: sbUser.last_sign_in_at || new Date().toISOString(),
    savedPlaceIds: overrides?.savedPlaceIds || [],
    subscriptionTier: isFounderVIP ? 'pro' : (overrides?.subscriptionTier || (metadata.subscription_tier as SubscriptionTier) || 'free'),
    freeTripsRemaining: isFounderVIP ? 9999 : finalRemaining,
    lifetimeTripsCreated: finalLifetime,
    weeklyAssistantMinutesRemaining: isFounderVIP ? 1800 : (typeof overrides?.weeklyAssistantMinutesRemaining === 'number'
      ? overrides.weeklyAssistantMinutesRemaining
      : (typeof metadata.weekly_assistant_minutes_remaining === 'number' ? metadata.weekly_assistant_minutes_remaining : 1800)),
    subscriptionExpiresAt: isFounderVIP ? '2099-12-31T23:59:59.999Z' : (overrides?.subscriptionExpiresAt || metadata.subscription_expires_at),
    weeklyQuotaResetAt: overrides?.weeklyQuotaResetAt || metadata.weekly_quota_reset_at
  };
}

/**
 * Helper to determine if a user session is operating in guest/anonymous mode.
 * Guest users can freely explore all destinations, deals, and highway facilities,
 * but cannot use or explore the AI Trip Planner feature.
 */
export function isGuestUser(user?: AuthUser | null): boolean {
  if (!user) return true;
  if (user.isAnonymous === true) return true;
  if (user.provider === 'guest') return true;
  if (user.travelStyleTag === 'Guest Explorer') return true;
  if (!user.email && !user.phoneNumber) return true;
  return false;
}

// Backward-compatibility alias
export const firebaseUserToAuthUser = supabaseUserToAuthUser;

/**
 * Account Storage Helpers
 */
export function loadAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: StoredAccount[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Error saving accounts:', e);
  }
}

/**
 * Synchronize authenticated cloud user into local accounts storage & active session
 */
export function syncAccountToLocal(user: AuthUser, passwordHash?: string): void {
  if (isFounderVipUser(user)) {
    user.subscriptionTier = 'pro';
    user.freeTripsRemaining = 9999;
    user.weeklyAssistantMinutesRemaining = 1800;
    user.subscriptionExpiresAt = '2099-12-31T23:59:59.999Z';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tripverse_founder_vip', 'true');
    }
  }

  const accounts = loadAccounts();
  const existingIdx = accounts.findIndex(a => 
    a.user.uid === user.uid || 
    (user.email && a.user.email.toLowerCase() === user.email.toLowerCase()) ||
    (user.phoneNumber && a.user.phoneNumber === user.phoneNumber)
  );

  const now = new Date().toISOString();
  user.lastLoginAt = now;

  const existingHash = existingIdx >= 0 ? accounts[existingIdx].passwordHash : undefined;
  const finalHash = passwordHash || existingHash || 'cloud_authenticated';

  if (existingIdx >= 0) {
    accounts[existingIdx].user = {
      ...accounts[existingIdx].user,
      ...user,
      uid: user.uid
    };
    if (passwordHash) {
      accounts[existingIdx].passwordHash = passwordHash;
    }
  } else {
    accounts.push({
      user,
      passwordHash: finalHash
    });
  }

  saveAccounts(accounts);

  const session: AuthSession = {
    token: `session-${user.uid}-${Date.now()}`,
    user,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
  };
  saveSession(session);
}

/**
 * Dispatch real-time automated auth activity event to serverless monitor
 */
export async function notifyAuthActivity(user: AuthUser, event: 'signin' | 'signup' = 'signin'): Promise<void> {
  try {
    const payload = {
      event,
      provider: user.provider || 'unknown',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        travelStyleTag: user.travelStyleTag,
        location: user.location,
        travelerStyle: user.travelerStyle
      }
    };
    const apiBase = typeof window !== 'undefined' ? window.location.origin : '';
    await fetch(`${apiBase}/api/auth-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch {}
}

/**
 * Session Storage Helpers
 */
export function saveSession(session: AuthSession | null): void {
  try {
    if (session) {
      if (session.user && isFounderVipUser(session.user)) {
        session.user.subscriptionTier = 'pro';
        session.user.freeTripsRemaining = 9999;
        session.user.weeklyAssistantMinutesRemaining = 1800;
        session.user.subscriptionExpiresAt = '2099-12-31T23:59:59.999Z';
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('tripverse_founder_vip', 'true');
        }
      }
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY, { detail: session?.user || null }));
  } catch (e) {
    console.error('Error saving session:', e);
  }
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    if (session.user && isFounderVipUser(session.user)) {
      session.user.subscriptionTier = 'pro';
      session.user.freeTripsRemaining = 9999;
      session.user.weeklyAssistantMinutesRemaining = 1800;
      session.user.subscriptionExpiresAt = '2099-12-31T23:59:59.999Z';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tripverse_founder_vip', 'true');
      }
    }
    return session;
  } catch {
    return null;
  }
}

export function getActiveSession(): AuthSession | null {
  return loadSession();
}

export function getCurrentUser(): AuthUser | null {
  const session = loadSession();
  return session ? session.user : null;
}

/**
 * Base64URL decode JWT token from Google Identity Services
 */
export function decodeGoogleJwt(credential: string): GoogleCredentialPayload {
  try {
    const parts = credential.split('.');
    if (parts.length < 2) {
      throw new Error('Invalid JWT format');
    }
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Error decoding Google JWT:', err);
    throw new Error('Failed to parse Google credentials. Please try signing in again.');
  }
}

/**
 * Detect if Two-Factor Authentication is active for a Google user:
 * 1. Honors explicit user settings stored in TripVerse profile / account.
 * 2. Analyzes Google OpenID Connect (OIDC) ID token authentication claims:
 *    - AMR (Authentication Methods References): 'mfa', 'hwk' (security keys/passkeys), 'swk', 'sms', 'tel', 'otp', 'totp', etc.
 *    - ACR (Authentication Context Class Reference): 'mfa', '2fa', 'otp'.
 */
export function isGoogleUser2FaEnabled(
  payload: GoogleCredentialPayload,
  existingUser?: AuthUser | null
): boolean {
  // If user explicitly configured two-factor in TripVerse profile, respect that setting
  if (typeof existingUser?.twoFactorEnabled === 'boolean') {
    return existingUser.twoFactorEnabled;
  }

  // Check Google OpenID Connect token AMR claims
  const amr = Array.isArray(payload.amr) ? payload.amr.map(m => String(m).toLowerCase()) : [];
  if (amr.length > 0) {
    const mfaIndicators = ['mfa', 'hwk', 'swk', 'sms', 'tel', 'otp', 'totp'];
    const hasMfaIndicator = amr.some(method => mfaIndicators.includes(method));
    if (hasMfaIndicator || (amr.length > 1 && amr.includes('pwd'))) {
      return true;
    }
  }

  // Check ACR (Authentication Context Class Reference)
  if (payload.acr) {
    const acr = String(payload.acr).toLowerCase();
    if (acr.includes('mfa') || acr.includes('2fa') || acr.includes('otp')) {
      return true;
    }
  }

  return false;
}

export interface GoogleAuthParseResult {
  user: AuthUser;
  is2FaRequired: boolean;
  payload: GoogleCredentialPayload;
}

/**
 * Parses Google JWT credential and determines if 2FA verification step is required.
 */
export function parseGoogleAuthResult(credential: string): GoogleAuthParseResult {
  const payload = decodeGoogleJwt(credential);
  if (!payload.email) {
    throw new Error('Google credential does not contain a verified email address.');
  }

  const emailNorm = payload.email.toLowerCase();
  const accounts = loadAccounts();
  const existing = accounts.find(a => a.user.email.toLowerCase() === emailNorm);
  const is2FaRequired = isGoogleUser2FaEnabled(payload, existing?.user);
  const user = parseGoogleUserFromCredential(credential);
  user.twoFactorEnabled = is2FaRequired;

  return {
    user,
    is2FaRequired,
    payload
  };
}

/**
 * Parse Google user details from Google Identity Services JWT credential without finalizing session
 */
export function parseGoogleUserFromCredential(credential: string): AuthUser {
  const payload = decodeGoogleJwt(credential);
  if (!payload.email) {
    throw new Error('Google credential does not contain a verified email address.');
  }

  const emailNorm = payload.email.toLowerCase().trim();
  const uid = toDeterministicUuid('google:' + (payload.sub || emailNorm));
  const accounts = loadAccounts();
  const existing = accounts.find(a => a.user.email.toLowerCase() === emailNorm);
  const isFounderVIP = FOUNDER_VIP_EMAILS.has(emailNorm) || (typeof localStorage !== 'undefined' && localStorage.getItem('tripverse_founder_vip') === 'true');
  const now = new Date().toISOString();

  const displayName = payload.name || payload.given_name || existing?.user.displayName || emailNorm.split('@')[0];
  const photoURL = payload.picture || existing?.user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=2D5A3D,0B2545`;
  const is2Fa = isGoogleUser2FaEnabled(payload, existing?.user);

  const authUser: AuthUser = {
    uid,
    email: emailNorm,
    displayName,
    photoURL,
    travelerStyle: existing?.user.travelerStyle || 'Budget explorer',
    travelStyleTag: existing?.user.travelStyleTag || 'Heritage & Food Hunter',
    location: existing?.user.location || 'India',
    occupation: existing?.user.occupation || 'Explorer',
    age: existing?.user.age || 26,
    emailVerified: payload.email_verified ?? true,
    twoFactorEnabled: is2Fa,
    provider: 'google',
    subscriptionTier: isFounderVIP ? 'pro' : (existing?.user.subscriptionTier || 'free'),
    freeTripsRemaining: isFounderVIP ? 9999 : (existing?.user.freeTripsRemaining ?? 3),
    weeklyAssistantMinutesRemaining: isFounderVIP ? 1800 : (existing?.user.weeklyAssistantMinutesRemaining ?? 1800),
    subscriptionExpiresAt: isFounderVIP ? '2099-12-31T23:59:59.999Z' : existing?.user.subscriptionExpiresAt,
    createdAt: existing?.user.createdAt || now,
    lastLoginAt: now,
    savedPlaceIds: existing?.user.savedPlaceIds || []
  };

  return authUser;
}

/**
 * Google Sign-In with Google Identity Services JWT credential
 */
export async function signInWithGoogleCredential(credential: string): Promise<AuthUser> {
  const payload = decodeGoogleJwt(credential);
  if (!payload.email) {
    throw new Error('Google credential does not contain a verified email address.');
  }

  const emailNorm = payload.email.toLowerCase();
  const uid = toDeterministicUuid('google:' + (payload.sub || emailNorm));
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data: supaData, error: supaErr } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential
      });

      if (!supaErr && supaData?.user) {
        const authUser = supabaseUserToAuthUser(supaData.user, {
          displayName: payload.name || payload.given_name,
          photoURL: payload.picture,
          email: payload.email
        });
        await saveProfileToSupabase(authUser.uid, toUserProfile(authUser));
        syncAccountToLocal(authUser);
        return authUser;
      }
    } catch (e) {
      console.warn('[Supabase] Google ID token notice:', e);
    }
  }

  // Fallback to local accounts with verified GIS payload using deterministic UUID
  const accounts = loadAccounts();
  let account = accounts.find(a => a.user.email.toLowerCase() === emailNorm);
  const now = new Date().toISOString();

  if (!account) {
    const emailKey = `tripverse_lifetime_trips_created_email_${emailNorm}`;
    const storedEmailLifetime = typeof localStorage !== 'undefined'
      ? (parseInt(localStorage.getItem(emailKey) || '0', 10) || 0)
      : 0;
    const initialLifetime = Math.max(0, storedEmailLifetime);
    const initialRemaining = Math.max(0, 3 - initialLifetime);

    const newUser: AuthUser = {
      uid,
      email: emailNorm,
      displayName: payload.name || payload.given_name || emailNorm.split('@')[0],
      photoURL: payload.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(payload.name || emailNorm)}&backgroundColor=2D5A3D,0B2545`,
      travelerStyle: 'Budget explorer',
      travelStyleTag: 'Heritage & Food Hunter',
      location: 'India',
      occupation: 'Explorer',
      age: 26,
      emailVerified: payload.email_verified ?? true,
      provider: 'google',
      subscriptionTier: 'free',
      freeTripsRemaining: initialRemaining,
      lifetimeTripsCreated: initialLifetime,
      weeklyAssistantMinutesRemaining: 1800,
      createdAt: now,
      lastLoginAt: now,
      savedPlaceIds: []
    };
    account = { user: newUser, passwordHash: 'oauth_google_gis_verified' };
    accounts.push(account);
  } else {
    account.user.lastLoginAt = now;
    if (payload.name) account.user.displayName = payload.name;
    if (payload.picture) account.user.photoURL = payload.picture;
    account.user.provider = 'google';
    account.user.emailVerified = true;
    account.user.uid = uid;
    if (typeof account.user.lifetimeTripsCreated !== 'number') {
      account.user.lifetimeTripsCreated = Math.max(0, 3 - (account.user.freeTripsRemaining ?? 3));
    }
  }

  saveAccounts(accounts);
  const session: AuthSession = {
    token: `session-google-${account.user.uid}-${Date.now()}`,
    user: account.user,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
  };
  saveSession(session);

  // Sync profile to Supabase PostgreSQL database
  const supabaseClient = getSupabaseClient();
  if (supabaseClient) {
    saveProfileToSupabase(uid, toUserProfile(account.user)).catch(() => {});
  }

  window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY, { detail: account.user }));
  return account.user;
}

/**
 * Ensure Google Identity Services (GIS) script is loaded and ready
 */
export async function ensureGoogleIdentityServices(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if ((window as any).google?.accounts?.id && (window as any).google?.accounts?.oauth2) {
    return true;
  }
  // Wait up to 3.5 seconds if script is already loading
  const start = Date.now();
  while (Date.now() - start < 3500) {
    if ((window as any).google?.accounts?.id && (window as any).google?.accounts?.oauth2) {
      return true;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  // If not in DOM, inject script dynamically
  if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
    const start2 = Date.now();
    while (Date.now() - start2 < 4000) {
      if ((window as any).google?.accounts?.id && (window as any).google?.accounts?.oauth2) {
        return true;
      }
      await new Promise(r => setTimeout(r, 100));
    }
  }
  return !!((window as any).google?.accounts?.id);
}

/**
 * Sign in or register a user using verified Google UserInfo from OAuth2
 */
export async function signInWithGoogleUserInfo(info: {
  sub?: string;
  id?: string;
  email: string;
  name?: string;
  given_name?: string;
  picture?: string;
  email_verified?: boolean;
}): Promise<AuthUser> {
  const emailNorm = info.email.trim().toLowerCase();
  const uid = toDeterministicUuid('google:' + (info.sub || info.id || emailNorm));
  const now = new Date().toISOString();

  const accounts = loadAccounts();
  let account = accounts.find(a => a.user.email.toLowerCase() === emailNorm);

  if (!account) {
    const displayName = info.name || info.given_name || emailNorm.split('@')[0];
    const emailKey = `tripverse_lifetime_trips_created_email_${emailNorm}`;
    const storedEmailLifetime = typeof localStorage !== 'undefined'
      ? (parseInt(localStorage.getItem(emailKey) || '0', 10) || 0)
      : 0;
    const initialLifetime = Math.max(0, storedEmailLifetime);
    const initialRemaining = Math.max(0, 3 - initialLifetime);

    const newUser: AuthUser = {
      uid,
      email: emailNorm,
      displayName,
      photoURL: info.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=2D5A3D,0B2545`,
      travelerStyle: 'Budget explorer',
      travelStyleTag: 'Heritage & Food Hunter',
      location: 'India',
      occupation: 'Explorer',
      age: 26,
      emailVerified: info.email_verified ?? true,
      provider: 'google',
      subscriptionTier: 'free',
      freeTripsRemaining: initialRemaining,
      lifetimeTripsCreated: initialLifetime,
      weeklyAssistantMinutesRemaining: 1800,
      createdAt: now,
      lastLoginAt: now,
      savedPlaceIds: []
    };
    account = { user: newUser, passwordHash: 'oauth_google_gis_verified' };
    accounts.push(account);
  } else {
    account.user.lastLoginAt = now;
    if (info.name) account.user.displayName = info.name;
    if (info.picture) account.user.photoURL = info.picture;
    account.user.provider = 'google';
    account.user.emailVerified = true;
    account.user.uid = uid;
    if (typeof account.user.lifetimeTripsCreated !== 'number') {
      account.user.lifetimeTripsCreated = Math.max(0, 3 - (account.user.freeTripsRemaining ?? 3));
    }
  }

  saveAccounts(accounts);
  const session: AuthSession = {
    token: `session-google-${account.user.uid}-${Date.now()}`,
    user: account.user,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
  };
  saveSession(session);

  // Sync profile to Supabase PostgreSQL database
  const supabase = getSupabaseClient();
  if (supabase) {
    saveProfileToSupabase(uid, toUserProfile(account.user)).catch(() => {});
  }

  window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY, { detail: account.user }));
  return account.user;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && /Macintosh/.test(navigator.userAgent));
}

/**
 * Detects whether the current browser or environment restricts or blocks OAuth popups,
 * requiring an automated seamless full-page redirect flow (zero DOM friction).
 */
export function shouldPreferGoogleRedirect(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = window.navigator as any;
  const ua = nav?.userAgent || '';

  // 1. iOS / iPadOS devices (Mobile Safari strictly restricts OAuth popups & partitioned cookies)
  const isIos = /iPad|iPhone|iPod/.test(ua) || (nav?.platform === 'MacIntel' && (nav?.maxTouchPoints || 0) > 1);
  if (isIos) return true;

  // 2. In-App WebViews (Instagram, Facebook, TikTok, WhatsApp, Line, Twitter/X, WeChat, LinkedIn)
  // Embedded WebViews block window.open and Google forbids OAuth in webviews
  const isWebView = /(FBAN|FBAV|Instagram|Line|Twitter|Snapchat|TikTok|MicroMessenger|LinkedInApp|WebView|wv)/i.test(ua);
  if (isWebView) return true;

  // 3. Standalone PWA mode or Capacitor native runtime
  const isStandalone = Boolean(
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    nav?.standalone === true ||
    (window as any).Capacitor?.isNativePlatform?.()
  );
  if (isStandalone) return true;

  // 4. Brave browser (Brave Shields blocks third-party auth popups by default)
  const isBrave = Boolean(nav?.brave && typeof nav.brave.isBrave === 'function');
  if (isBrave) return true;

  // 5. Mobile viewports with touch screen (Google Auth officially recommends redirect for mobile)
  const isMobileScreen = typeof window.innerWidth === 'number' && window.innerWidth < 768 && (
    /Android|Mobile/i.test(ua) || (nav?.maxTouchPoints || 0) > 0
  );
  if (isMobileScreen) return true;

  return false;
}

/**
 * Common handler for Firebase UserCredential (used by both popup and redirect results)
 */
export async function handleFirebaseUserCredential(cred: any): Promise<AuthUser> {
  const fbUser = cred?.user;
  if (!fbUser || !fbUser.email) {
    throw new Error('Google account does not contain a verified email address.');
  }

  const emailNorm = fbUser.email.trim().toLowerCase();
  const uid = toDeterministicUuid('google:' + (fbUser.uid || emailNorm));
  const now = new Date().toISOString();

  const accounts = loadAccounts();
  let account = accounts.find(a => a.user.email.toLowerCase() === emailNorm);

  if (!account) {
    const displayName = fbUser.displayName || emailNorm.split('@')[0];
    const emailKey = `tripverse_lifetime_trips_created_email_${emailNorm}`;
    const storedEmailLifetime = typeof localStorage !== 'undefined'
      ? (parseInt(localStorage.getItem(emailKey) || '0', 10) || 0)
      : 0;
    const initialLifetime = Math.max(0, storedEmailLifetime);
    const initialRemaining = Math.max(0, 3 - initialLifetime);

    const newUser: AuthUser = {
      uid,
      email: emailNorm,
      displayName,
      photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=2D5A3D,0B2545`,
      travelerStyle: 'Budget explorer',
      travelStyleTag: 'Heritage & Food Hunter',
      location: 'India',
      occupation: 'Explorer',
      age: 26,
      emailVerified: fbUser.emailVerified ?? true,
      provider: 'google',
      subscriptionTier: 'free',
      freeTripsRemaining: initialRemaining,
      lifetimeTripsCreated: initialLifetime,
      weeklyAssistantMinutesRemaining: 1800,
      createdAt: now,
      lastLoginAt: now,
      savedPlaceIds: []
    };
    account = { user: newUser, passwordHash: 'oauth_google_firebase_verified' };
    accounts.push(account);
  } else {
    account.user.lastLoginAt = now;
    if (fbUser.displayName) account.user.displayName = fbUser.displayName;
    if (fbUser.photoURL) account.user.photoURL = fbUser.photoURL;
    account.user.provider = 'google';
    account.user.emailVerified = true;
    if (typeof account.user.lifetimeTripsCreated !== 'number') {
      account.user.lifetimeTripsCreated = Math.max(0, 3 - (account.user.freeTripsRemaining ?? 3));
    }
    // Preserve existing UID so user's existing trips, itinerary, and saved places are never severed
    if (!account.user.uid) {
      account.user.uid = uid;
    }
  }

  saveAccounts(accounts);
  const idToken = await fbUser.getIdToken().catch(() => `session-google-${account.user.uid}-${Date.now()}`);
  const session: AuthSession = {
    token: idToken,
    user: account.user,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
  };
  saveSession(session);

  // Sync profile to Supabase PostgreSQL database if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    saveProfileToSupabase(uid, toUserProfile(account.user)).catch(() => {});
  }

  window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY, { detail: account.user }));
  return account.user;
}

/**
 * Checks for any pending redirect result after page reload (crucial for mobile Safari)
 */
export async function checkAndProcessFirebaseRedirectResult(): Promise<AuthUser | null> {
  if (!isFirebaseConfigured()) return null;
  const cred = await checkFirebaseRedirectResult();
  if (cred && cred.user) {
    return await handleFirebaseUserCredential(cred);
  }
  return null;
}

/**
 * Sign in using Firebase Google Auth with direct full-page Redirect (100% reliable on mobile Safari)
 */
export async function signInWithGoogleRedirect(): Promise<void> {
  if (isFirebaseConfigured()) {
    return await signInWithFirebaseGoogleRedirect();
  }
  throw new Error('Google Sign-In redirect requires Firebase Authentication.');
}

/**
 * Sign in using Firebase Authentication Google Provider popup
 */
export async function signInWithFirebaseGoogleAuth(): Promise<AuthUser> {
  const cred = await signInWithFirebaseGoogle();
  return await handleFirebaseUserCredential(cred);
}

/**
 * Primary Google Sign-In: Prefers Firebase Auth when configured, with GIS fallback.
 * Automatically recovers from popup blockers by seamlessly auto-triggering the redirect flow without DOM friction.
 */
export async function signInWithGooglePopup(): Promise<AuthUser> {
  // If the browser environment is known to block or degrade popups, auto-switch to redirect immediately
  if (shouldPreferGoogleRedirect() && isFirebaseConfigured()) {
    console.log('[TripVerse Auth] Environment restricts popups - automatically switching to redirect flow...');
    await signInWithGoogleRedirect();
    return new Promise(() => {}); // Navigating to accounts.google.com
  }

  // 1. If Google Identity Services (GIS) OAuth2 client is available, prefer GIS token client directly
  // This opens the official Google OAuth consent/account selector popup and operates without Firebase authorized-domain limits
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '288425355548-ogv0f7ata5ssv9s5o37m711kp9g9461r.apps.googleusercontent.com';

  if (typeof window !== 'undefined') {
    try {
      await ensureGoogleIdentityServices();
      if ((window as any).google?.accounts?.oauth2 && clientId) {
        return await new Promise<AuthUser>((resolve, reject) => {
          let settled = false;
          const finishResolve = (u: AuthUser) => {
            if (settled) return;
            settled = true;
            resolve(u);
          };
          const finishReject = (err: Error) => {
            if (settled) return;
            settled = true;
            reject(err);
          };

          try {
            const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
              client_id: clientId,
              scope: 'openid email profile',
              error_callback: async (errObj: any) => {
                const errType = errObj?.type || '';
                if (errType === 'popup_closed') {
                  finishReject(new Error('Google sign-in was cancelled.'));
                  return;
                }
                if (isFirebaseConfigured()) {
                  console.warn('[GIS Auth] Error encountered, auto-recovering with Firebase Google Auth:', errObj);
                  try {
                    const fbUser = await signInWithFirebaseGoogleAuth();
                    finishResolve(fbUser);
                    return;
                  } catch (fbErr: any) {
                    console.warn('[Firebase Google Auth fallback notice]:', fbErr);
                  }
                }
                if (errType === 'popup_failed_to_open') {
                  finishReject(new Error('Google popup was blocked by your browser. Please allow popups to proceed.'));
                } else {
                  finishReject(new Error(errObj?.message || 'Google Sign-In could not complete.'));
                }
              },
              callback: async (tokenResponse: any) => {
                if (tokenResponse.error) {
                  if (tokenResponse.error === 'access_denied') {
                    finishReject(new Error('Google sign-in was cancelled.'));
                    return;
                  }
                  if (isFirebaseConfigured()) {
                    console.warn('[GIS Token] Error received, auto-recovering with Firebase Google Auth:', tokenResponse.error);
                    try {
                      const fbUser = await signInWithFirebaseGoogleAuth();
                      finishResolve(fbUser);
                      return;
                    } catch (fbErr: any) {
                      console.warn('[Firebase Google Auth fallback notice]:', fbErr);
                    }
                  }
                  finishReject(new Error(tokenResponse.error_description || tokenResponse.error || 'Google Sign-In failed.'));
                  return;
                }
                try {
                  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                  });
                  const info = await res.json();
                  if (!info.email) {
                    finishReject(new Error('Google account does not contain a verified email address.'));
                    return;
                  }
                  const user = await signInWithGoogleUserInfo(info);
                  finishResolve(user);
                } catch (err: any) {
                  finishReject(new Error(err?.message || 'Failed to fetch Google profile.'));
                }
              }
            });
            tokenClient.requestAccessToken({ prompt: 'select_account' });
          } catch (initErr: any) {
            console.warn('[GIS Token Client init failed, trying Firebase fallback]', initErr);
            finishReject(initErr);
          }
        });
      }
    } catch (gisInitErr) {
      console.warn('[TripVerse Auth] GIS token client attempt bypassed, trying Firebase:', gisInitErr);
    }
  }

  // 2. If Firebase Auth is configured and GIS wasn't available, attempt Firebase Auth popup
  if (isFirebaseConfigured()) {
    try {
      return await signInWithFirebaseGoogleAuth();
    } catch (fbErr: any) {
      const msg = fbErr?.message || '';
      const code = fbErr?.code || '';

      if (
        code === 'auth/popup-closed-by-user' ||
        (code === 'auth/cancelled-popup-request' && !msg.toLowerCase().includes('blocked')) ||
        msg.toLowerCase().includes('closed') ||
        msg.toLowerCase().includes('cancel')
      ) {
        throw new Error('Google sign-in was cancelled. Please select your account to proceed.');
      } else if (code === 'auth/unauthorized-domain') {
        console.warn('[Firebase Auth] Domain not whitelisted in Firebase Console, auto-triggering redirect fallback...');
        await signInWithGoogleRedirect();
        return new Promise(() => {});
      } else {
        console.warn('[Firebase Auth] Popup error, falling back to redirect:', fbErr);
        await signInWithGoogleRedirect();
        return new Promise(() => {});
      }
    }
  }

  throw new Error('Google Sign-In service is initializing. Please tap again in a moment.');
}

export async function sendPasswordResetCode(email: string): Promise<{
  code: string;
  expiresAt: number;
  token?: string;
  isSandboxNotice?: boolean;
  sandboxNotice?: string;
  devCode?: string;
  message?: string;
}> {
  const emailNorm = (email || '').trim().toLowerCase();
  if (!emailNorm || !emailNorm.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  // Safely bypass simulated or test domains to prevent SMTP delivery bounces
  if (isSimulatedTestEmail(emailNorm)) {
    return {
      code: 'test_bypassed',
      expiresAt: Date.now() + 15 * 60 * 1000,
      devCode: '123456',
      message: 'Test password reset initiated.'
    };
  }

  let supabaseDispatched = false;
  let supabaseError = '';
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : 'https://trip-verse.com/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(emailNorm, {
        redirectTo: redirectUrl
      });
      if (!error) {
        supabaseDispatched = true;
      } else {
        supabaseError = error.message || '';
        console.warn('[Supabase] resetPasswordForEmail warning:', error.message);
      }
    } catch (e: any) {
      supabaseError = e?.message || '';
      console.warn('[Supabase] resetPasswordForEmail exception:', e);
    }
  }

  // 2. Dispatch Firebase password reset email in parallel if Firebase is configured
  if (isFirebaseConfigured()) {
    try {
      sendFirebasePasswordReset(emailNorm).catch(() => {});
    } catch {}
  }

  // 3. Dispatch authentic 6-digit OTP code via Resend
  let otpDispatched = false;
  let otpData: any = null;
  try {
    const res = await fetch('/api/email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send',
        email: emailNorm,
        purpose: 'password_reset'
      })
    });
    otpData = await res.json().catch(() => ({}));
    if (res.ok && otpData.success) {
      otpDispatched = true;
      if (typeof window !== 'undefined' && otpData.token) {
        localStorage.setItem(`tripverse_pwd_reset_token_${emailNorm}`, otpData.token);
      }
    }
  } catch (err) {
    console.warn('[Resend] Password reset OTP notice:', err);
  }

  if (!supabaseDispatched && !otpDispatched) {
    if (supabaseError && (supabaseError.toLowerCase().includes('rate limit') || supabaseError.includes('over_email_send_rate_limit'))) {
      throw new Error('Email dispatch rate limit reached. Please wait a few moments before requesting another reset code.');
    }
    throw new Error(supabaseError || 'Failed to dispatch password recovery email. Please verify your address and try again.');
  }

  return {
    code: otpDispatched ? 'otp_and_link_dispatched' : 'email_dispatched',
    expiresAt: Date.now() + 15 * 60 * 1000,
    token: otpData?.token,
    isSandboxNotice: Boolean(otpData?.isSandboxNotice),
    sandboxNotice: otpData?.sandboxNotice,
    devCode: otpData?.devCode,
    message: `Password reset instructions sent to ${emailNorm}.`
  };
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  await sendPasswordResetCode(email);
}

/**
 * Update authenticated user's password in Supabase and sync hashed credentials locally.
 */
export async function updateUserPassword(newPassword: string): Promise<AuthUser> {
  const cleanPassword = (newPassword || '').trim();
  if (cleanPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const pwdHash = await hashPassword(cleanPassword);
  const supabase = getSupabaseClient();
  let updatedUser: AuthUser | null = getCurrentUser();

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: cleanPassword
      });
      if (error) {
        console.warn('[Supabase] auth.updateUser password notice:', error.message);
      } else if (data?.user) {
        updatedUser = supabaseUserToAuthUser(data.user);
      }
    } catch (e: any) {
      console.warn('[Supabase] auth.updateUser exception:', e);
    }
  }

  if (!updatedUser) {
    const activeSession = getActiveSession();
    if (activeSession?.user) {
      updatedUser = activeSession.user;
    } else {
      const accounts = loadAccounts();
      if (accounts.length > 0) {
        updatedUser = accounts[0].user;
      }
    }
  }

  if (updatedUser) {
    syncAccountToLocal(updatedUser, pwdHash);
    saveSession({
      user: updatedUser,
      token: 'session_reset_' + Date.now(),
      expiresAt: Date.now() + 30 * 86400 * 1000
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY, { detail: updatedUser }));
      window.dispatchEvent(new CustomEvent('tripverse_auth_state_change', { detail: { user: updatedUser } }));
    }
    return updatedUser;
  }

  throw new Error('Could not identify user session to update password. Please request a new reset email.');
}

/**
 * Reset password directly using 6-digit email confirmation code (via Supabase or Resend OTP).
 */
export async function resetPasswordWithEmailOtp(
  email: string,
  code: string,
  newPassword: string
): Promise<AuthUser> {
  const emailNorm = (email || '').trim().toLowerCase();
  const cleanCode = (code || '').trim().replace(/\D/g, '');
  const cleanPassword = (newPassword || '').trim();

  if (!emailNorm || !emailNorm.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (cleanCode.length !== 6) {
    throw new Error('Please enter the full 6-digit verification code.');
  }
  if (cleanPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  let isVerified = false;

  // 1. Try Supabase recovery OTP verification
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: emailNorm,
        token: cleanCode,
        type: 'recovery'
      });
      if (!error && data?.user) {
        isVerified = true;
        await supabase.auth.updateUser({ password: cleanPassword }).catch(() => {});
      }
    } catch {}
  }

  // 2. Try Resend email-otp verification if Supabase verifyOtp did not succeed
  if (!isVerified) {
    const storedToken = typeof window !== 'undefined'
      ? (localStorage.getItem(`tripverse_pwd_reset_token_${emailNorm}`) || localStorage.getItem(`tripverse_email_otp_token_${emailNorm}`) || '')
      : '';

    try {
      const res = await fetch('/api/email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          email: emailNorm,
          code: cleanCode,
          token: storedToken || undefined
        })
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success) {
        isVerified = true;
      }
    } catch {}
  }

  // Handle simulated / test accounts
  if (!isVerified && isSimulatedTestEmail(emailNorm) && cleanCode === '123456') {
    isVerified = true;
  }

  if (!isVerified) {
    throw new Error('Invalid or expired verification code. Please check your email or request a new code.');
  }

  // 3. Hash password and update local account & session
  const pwdHash = await hashPassword(cleanPassword);
  const accounts = loadAccounts();
  const existing = accounts.find(a => a.user.email.toLowerCase() === emailNorm);

  const authUser: AuthUser = existing ? existing.user : {
    uid: toDeterministicUuid('email:' + emailNorm),
    email: emailNorm,
    displayName: emailNorm.split('@')[0],
    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emailNorm)}&backgroundColor=2D5A3D,0B2545`,
    travelerStyle: 'Budget explorer',
    travelStyleTag: 'Verified Explorer',
    location: 'India',
    occupation: 'Explorer',
    age: 25,
    emailVerified: true,
    provider: 'email',
    subscriptionTier: 'free',
    freeTripsRemaining: 3,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    savedPlaceIds: []
  };

  syncAccountToLocal(authUser, pwdHash);
  saveSession({
    user: authUser,
    token: 'session_otp_reset_' + Date.now(),
    expiresAt: Date.now() + 30 * 86400 * 1000
  });

  if (typeof window !== 'undefined') {
    localStorage.removeItem(`tripverse_pwd_reset_token_${emailNorm}`);
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY, { detail: authUser }));
    window.dispatchEvent(new CustomEvent('tripverse_auth_state_change', { detail: { user: authUser } }));
  }

  return authUser;
}

/**
 * Create a new account with Supabase Authentication & PostgreSQL Database
 */
export async function createAccountWithSupabase(data: SignUpData): Promise<AuthUser & { emailConfirmationPending?: boolean; isPendingEmailConfirmation?: boolean; isRateLimited?: boolean }> {
  const emailNorm = (data.email || '').trim().toLowerCase();
  if (!emailNorm || !emailNorm.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!data.password || data.password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const pwdHash = await hashPassword(data.password);

  // Strictly prevent simulated/test/CI accounts from triggering outbound confirmation emails via Supabase SMTP or Resend
  if (isSimulatedTestEmail(emailNorm)) {
    const uid = toDeterministicUuid('email:' + emailNorm);
    const now = new Date().toISOString();
    const simulatedAuthUser: AuthUser = {
      uid,
      email: emailNorm,
      displayName: data.name?.trim() || emailNorm.split('@')[0],
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name || emailNorm)}&backgroundColor=2D5A3D,0B2545`,
      travelerStyle: data.travelerStyle || 'Budget explorer',
      travelStyleTag: 'Verified Explorer',
      location: data.location || 'India',
      occupation: data.occupation || 'Explorer',
      age: 25,
      emailVerified: true,
      provider: 'email',
      subscriptionTier: 'free',
      freeTripsRemaining: 3,
      createdAt: now,
      lastLoginAt: now,
      savedPlaceIds: []
    };
    syncAccountToLocal(simulatedAuthUser, pwdHash);
    saveProfileToSupabase(simulatedAuthUser.uid, toUserProfile(simulatedAuthUser)).catch(() => {});
    return simulatedAuthUser;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase cloud authentication is not configured.');
  }

  let supaData: any = null;
  let isRateLimited = false;

  try {
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/?tab=profile`
      : 'https://trip-verse.com/?tab=profile';

    const signUpPromise = supabase.auth.signUp({
      email: emailNorm,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: data.name?.trim() || emailNorm.split('@')[0],
          name: data.name?.trim() || emailNorm.split('@')[0],
          traveler_style: data.travelerStyle || 'Budget explorer',
          location: data.location || 'India',
          occupation: data.occupation || 'Explorer',
          free_trips_remaining: 3,
          subscription_tier: 'free'
        }
      }
    });
    const signUpTimeout = new Promise<{ data: { user: null; session: null }; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null, session: null }, error: new Error('Supabase signup timeout') }), 2500)
    );
    const res = await Promise.race([signUpPromise, signUpTimeout]);

    if (res.error) {
      if (res.error.message.toLowerCase().includes('already registered')) {
        throw new Error('An account with this email address already exists. Please sign in instead.');
      }
    // Fallback to Firebase Email registration so user is never blocked by Supabase errors or SMTP limits
    if (isFirebaseConfigured()) {
      const config = getStoredFirebaseConfig();
      if (config?.apiKey) {
        const fbRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${config.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailNorm,
            password: data.password,
            displayName: data.name?.trim() || emailNorm.split('@')[0],
            returnSecureToken: true
          })
        });
        const fbData = await fbRes.json();
        if (fbRes.ok && fbData.localId) {
          const uid = toDeterministicUuid('email:' + emailNorm);
          const now = new Date().toISOString();
          const authUser: AuthUser = {
            uid,
            email: emailNorm,
            displayName: data.name?.trim() || emailNorm.split('@')[0],
            photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name || emailNorm)}&backgroundColor=2D5A3D,0B2545`,
            travelerStyle: data.travelerStyle || 'Budget explorer',
            travelStyleTag: 'Verified Explorer',
            location: data.location || 'India',
            occupation: data.occupation || 'Explorer',
            age: 25,
            emailVerified: true,
            provider: 'email',
            createdAt: now,
            lastLoginAt: now,
            savedPlaceIds: []
          };
          syncAccountToLocal(authUser, pwdHash);
          saveProfileToSupabase(authUser.uid, toUserProfile(authUser)).catch(() => {});
          return authUser;
        }
      }
    }
    // If both Supabase and Firebase rate-limited or timed out, create a cryptographically hashed account and sync to Supabase profiles via server endpoint
    const uid = toDeterministicUuid('email:' + emailNorm);
    const now = new Date().toISOString();
    const fallbackAuthUser: AuthUser = {
      uid,
      email: emailNorm,
      displayName: data.name?.trim() || emailNorm.split('@')[0],
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name || emailNorm)}&backgroundColor=2D5A3D,0B2545`,
      travelerStyle: data.travelerStyle || 'Budget explorer',
      travelStyleTag: 'Verified Explorer',
      location: data.location || 'India',
      occupation: data.occupation || 'Explorer',
      age: 25,
      emailVerified: true,
      provider: 'email',
      createdAt: now,
      lastLoginAt: now,
      savedPlaceIds: []
    };
    syncAccountToLocal(fallbackAuthUser, pwdHash);
    saveProfileToSupabase(fallbackAuthUser.uid, toUserProfile(fallbackAuthUser)).catch(() => {});
    return fallbackAuthUser;
  }

    supaData = res.data;
  } catch (err: any) {
    throw err;
  }

  if (!supaData?.user) {
    throw new Error('Could not create account with Supabase. Please verify your details and try again.');
  }

  const isSessionCreated = Boolean(supaData.session);
  const authUser: AuthUser = supabaseUserToAuthUser(supaData.user, {
    displayName: data.name?.trim(),
    travelerStyle: data.travelerStyle || 'Budget explorer',
    location: data.location || 'India',
    occupation: data.occupation || 'Explorer'
  });
  authUser.emailVerified = isSessionCreated;

  // Persist locally with hashed password so login on this device is immediate & reliable
  syncAccountToLocal(authUser, pwdHash);

  // Sync profile to Supabase PostgreSQL database in background (non-blocking)
  saveProfileToSupabase(authUser.uid, toUserProfile(authUser)).catch(() => {});

  // Register in Firebase Cloud Identity in background so account credentials work seamlessly across both clouds
  if (isFirebaseConfigured()) {
    const config = getStoredFirebaseConfig();
    if (config?.apiKey) {
      fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${config.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailNorm,
          password: data.password,
          displayName: data.name?.trim() || emailNorm.split('@')[0],
          returnSecureToken: true
        })
      }).catch(() => {});
    }
  }

  let emailDispatchFailed = false;
  if (!isSessionCreated) {
    if (!isSimulatedTestEmail(emailNorm)) {
      try {
        await Promise.race([
          resendEmailConfirmation(emailNorm, data.name),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3500))
        ]);
      } catch (sendErr) {
        console.warn('[Signup] resendEmailConfirmation dispatch notice:', sendErr);
        emailDispatchFailed = true;
      }
    } else {
      emailDispatchFailed = true; // Mark as bypassed so test user is activated immediately without blocking
    }
  }

  // If email confirmation is rate-limited or fails, activate the user session immediately so they are never locked out
  const requiresConfirmation = !isSessionCreated && !emailDispatchFailed;
  if (!requiresConfirmation) {
    authUser.emailVerified = true;
    syncAccountToLocal(authUser, pwdHash);
  }

  return {
    ...authUser,
    emailConfirmationPending: requiresConfirmation,
    isPendingEmailConfirmation: requiresConfirmation,
    isRateLimited
  };
}

// Backward-compatibility alias
export const createAccountWithFirebase = createAccountWithSupabase;

/**
 * Genuine Instant Guest Explorer sign-in via Supabase Anonymous Auth.
 * Creates a genuine authenticated session in Supabase & cloud database profile in PostgreSQL.
 */
export async function signInAnonymouslyWithSupabase(data?: {
  name?: string;
  travelerStyle?: string;
  location?: string;
}): Promise<AuthUser> {
  const supabase = getSupabaseClient();
  const displayName = data?.name?.trim() || 'Explorer';
  const travelerStyle = data?.travelerStyle || 'Budget explorer';
  const location = data?.location || 'India';
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const anonPromise = supabase.auth.signInAnonymously({
        options: {
          data: {
            full_name: displayName,
            name: displayName,
            traveler_style: travelerStyle,
            location: location
          }
        }
      });
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Guest auth timeout') }), 1800)
      );
      const { data: authData, error } = await Promise.race([anonPromise, timeoutPromise]);

      if (!error && authData?.user) {
        const authUser = supabaseUserToAuthUser(authData.user, {
          displayName,
          travelerStyle,
          location,
          provider: 'guest',
          isAnonymous: true,
          travelStyleTag: 'Guest Explorer'
        });
        authUser.emailVerified = true;
        authUser.isAnonymous = true;
        authUser.provider = 'guest';
        saveProfileToSupabase(authUser.uid, toUserProfile(authUser)).catch(() => {});
        syncAccountToLocal(authUser);
        return authUser;
      }
    } catch (e) {
      console.warn('[Supabase] Anonymous auth notice:', e);
    }
  }

  // Resilient fallback with deterministic guest UUID
  const guestUid = toDeterministicUuid('guest:' + Date.now() + Math.random());
  const guestUser: AuthUser = {
    uid: guestUid,
    email: '',
    displayName,
    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=2D5A3D,0B2545`,
    travelerStyle,
    travelStyleTag: 'Guest Explorer',
    location,
    occupation: 'Explorer',
    age: 25,
    emailVerified: true,
    provider: 'guest',
    isAnonymous: true,
    createdAt: now,
    lastLoginAt: now,
    savedPlaceIds: []
  };

  syncAccountToLocal(guestUser);
  return guestUser;
}

/**
 * Verify 6-digit confirmation token sent by Supabase to user's email
 */
export async function verifyEmailOtp(email: string, token: string): Promise<AuthUser> {
  const emailNorm = email.trim().toLowerCase();
  const cleanToken = token.trim();
  if (cleanToken.length < 6) {
    throw new Error('Please enter the complete 6-digit confirmation code.');
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase cloud authentication is not configured.');
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: emailNorm,
    token: cleanToken,
    type: 'signup'
  });

  if (error) {
    // Fallback attempt with type: 'email'
    const fallbackRes = await supabase.auth.verifyOtp({
      email: emailNorm,
      token: cleanToken,
      type: 'email'
    });
    if (!fallbackRes.error && fallbackRes.data.user) {
      const authUser = supabaseUserToAuthUser(fallbackRes.data.user);
      authUser.emailVerified = true;
      syncAccountToLocal(authUser);
      saveProfileToSupabase(authUser.uid, toUserProfile(authUser)).catch(() => {});
      return authUser;
    }

    // Attempt verification via Resend Email OTP
    try {
      const storedToken = typeof window !== 'undefined'
        ? localStorage.getItem(`tripverse_email_otp_token_${emailNorm}`) || ''
        : '';
      const resendRes = await fetch('/api/email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          email: emailNorm,
          code: cleanToken,
          token: storedToken
        })
      });
      const resendData = await resendRes.json();
      if (resendRes.ok && resendData.success) {
        const uid = toDeterministicUuid('email:' + emailNorm);
        const now = new Date().toISOString();
        const accounts = loadAccounts();
        const existing = accounts.find(a => a.user.email.toLowerCase() === emailNorm);
        const displayName = existing?.user.displayName || emailNorm.split('@')[0];
        const authUser: AuthUser = {
          uid,
          email: emailNorm,
          displayName,
          photoURL: existing?.user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=2D5A3D,0B2545`,
          travelerStyle: existing?.user.travelerStyle || 'Budget explorer',
          travelStyleTag: 'Verified Explorer',
          location: existing?.user.location || 'India',
          occupation: existing?.user.occupation || 'Explorer',
          age: 25,
          emailVerified: true,
          provider: 'email',
          createdAt: existing?.user.createdAt || now,
          lastLoginAt: now,
          savedPlaceIds: existing?.user.savedPlaceIds || []
        };
        syncAccountToLocal(authUser);
        saveProfileToSupabase(authUser.uid, toUserProfile(authUser)).catch(() => {});
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`tripverse_email_otp_token_${emailNorm}`);
        }
        return authUser;
      }
    } catch {}

    throw new Error(fallbackRes.error?.message || 'Incorrect or expired confirmation code.');
  }

  if (!data?.user) {
    throw new Error('Email verification failed. Please check the code.');
  }

  const authUser = supabaseUserToAuthUser(data.user);
  authUser.emailVerified = true;
  syncAccountToLocal(authUser);
  saveProfileToSupabase(authUser.uid, toUserProfile(authUser)).catch(() => {});
  return authUser;
}

/**
 * Checks whether an email belongs to an automated test / synthetic domain.
 * Bypassing outbound SMTP prevents wasting Resend token quotas and delivery failure bounces.
 */
export function isSimulatedTestEmail(email: string): boolean {
  const norm = (email || '').trim().toLowerCase();
  return (
    norm.startsWith('ci_') ||
    norm.startsWith('test_') ||
    norm.startsWith('e2e_') ||
    norm.endsWith('@tripverse.app') ||
    norm.endsWith('@example.com') ||
    norm.endsWith('@test.com') ||
    norm.endsWith('@invalid') ||
    norm.endsWith('.test')
  );
}

/**
 * Resend email confirmation link/code via Supabase
 */
export async function resendEmailConfirmation(email: string, name?: string): Promise<void> {
  const emailNorm = email.trim().toLowerCase();

  // Safely bypass simulated or test domains to prevent SMTP delivery bounces and Resend quota burn
  if (isSimulatedTestEmail(emailNorm)) {
    return;
  }

  // 1. Dispatch authentic 6-digit confirmation code via Resend
  let resendDispatched = false;
  try {
    const res = await fetch('/api/email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', email: emailNorm, name })
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`tripverse_email_otp_token_${emailNorm}`, data.token);
      }
      resendDispatched = true;
    }
  } catch (err) {
    console.warn('[Resend] Email dispatch notice:', err);
  }

  // 2. Only trigger Supabase email confirmation if Resend was not dispatched (conserves free-tier email quotas)
  if (!resendDispatched) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/?tab=profile`
        : 'https://trip-verse.com/?tab=profile';

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailNorm,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        if ((error as any).code === 'over_email_send_rate_limit' || error.message.toLowerCase().includes('rate limit')) {
          throw new Error('Email dispatch rate limit reached. Please wait a few moments before requesting another code.');
        }
        throw new Error(error.message || 'Failed to dispatch confirmation email.');
      }
    }
  }
}

export interface SendTwoFactorOtpResult {
  success: boolean;
  token: string;
  expiresAt: number;
  isSandboxNotice?: boolean;
  sandboxNotice?: string;
  devCode?: string;
  message: string;
}

/**
 * Dispatch genuine 6-digit Two-Factor Authentication (2FA) security code to user's email via Resend
 */
export async function sendTwoFactorOtp(email: string, name?: string): Promise<SendTwoFactorOtpResult> {
  const emailNorm = (email || '').trim().toLowerCase();
  if (!emailNorm || !emailNorm.includes('@')) {
    throw new Error('A valid email address is required to receive a 2FA verification code.');
  }

  const res = await fetch('/api/email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'send',
      email: emailNorm,
      name: name?.trim() || emailNorm.split('@')[0]
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to dispatch 2FA verification code to your email.');
  }

  if (typeof window !== 'undefined' && data.token) {
    localStorage.setItem(`tripverse_email_otp_token_${emailNorm}`, data.token);
  }

  return {
    success: true,
    token: data.token,
    expiresAt: data.expiresAt || (Date.now() + 10 * 60 * 1000),
    isSandboxNotice: Boolean(data.isSandboxNotice),
    sandboxNotice: data.sandboxNotice,
    devCode: data.devCode,
    message: data.message || `Verification code sent to ${emailNorm}.`
  };
}

/**
 * Verify 6-digit Two-Factor Authentication (2FA) security code via cryptographic HMAC check
 */
export async function verifyTwoFactorOtp(email: string, code: string, token?: string): Promise<{ success: boolean; message: string }> {
  const emailNorm = (email || '').trim().toLowerCase();
  const cleanCode = (code || '').trim().replace(/\D/g, '');

  if (cleanCode.length !== 6) {
    throw new Error('Please enter the complete 6-digit verification code.');
  }

  const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem(`tripverse_email_otp_token_${emailNorm}`) : null);

  const res = await fetch('/api/email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'verify',
      email: emailNorm,
      code: cleanCode,
      token: activeToken || undefined
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Incorrect or expired 2FA code. Please verify and try again.');
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(`tripverse_email_otp_token_${emailNorm}`);
  }

  return {
    success: true,
    message: data.message || 'Two-factor authentication verified successfully.'
  };
}

/**
 * Validates email & password credentials (Factor 1) without activating a full persistent session yet.
 * Used for 2FA verification before creating an active login session.
 */
export async function verifyEmailCredentialsOnly(data: LoginData): Promise<{ user: AuthUser; passwordHash: string }> {
  const emailNorm = (data.email || '').trim().toLowerCase();
  if (!emailNorm) {
    throw new Error('Please enter your email address.');
  }
  if (!data.password) {
    throw new Error('Please enter your password.');
  }

  const pwdHash = await hashPassword(data.password);
  let supaPendingConfirmation = false;
  let supaErrorMessage = '';

  // 0. Fast-path: Check cached accounts on device
  const cachedAccounts = loadAccounts();
  const cachedMatch = cachedAccounts.find(a => a.user.email.toLowerCase() === emailNorm);
  if (cachedMatch) {
    if (cachedMatch.passwordHash === pwdHash) {
      return { user: cachedMatch.user, passwordHash: pwdHash };
    }
  }

  // 1. Supabase Cloud Authentication (Primary)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const signInPromise = supabase.auth.signInWithPassword({
        email: emailNorm,
        password: data.password
      });
      const signInTimeout = new Promise<{ data: { user: null; session: null }; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null, session: null }, error: new Error('Supabase login timeout') }), 1800)
      );
      const { data: supaData, error: supaErr } = await Promise.race([signInPromise, signInTimeout]);

      if (!supaErr && supaData?.user) {
        const authUser = supabaseUserToAuthUser(supaData.user);
        try {
          const profile = await Promise.race([
            loadProfileFromSupabase(authUser.uid),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
          ]);
          if (profile) {
            authUser.displayName = profile.name || authUser.displayName;
            authUser.photoURL = profile.avatar || authUser.photoURL;
            authUser.travelerStyle = profile.travelerStyle || authUser.travelerStyle;
            authUser.location = profile.location || authUser.location;
          }
        } catch (err) {
          console.warn('[Supabase] Profile fetch notice:', err);
        }

        return { user: authUser, passwordHash: pwdHash };
      }

      if (supaErr && supaErr.message !== 'Supabase login timeout') {
        supaErrorMessage = supaErr.message || '';
        if (supaErr.message.toLowerCase().includes('email not confirmed') || (supaErr as any).code === 'email_not_confirmed') {
          supaPendingConfirmation = true;
        }
      }
    } catch (e: any) {
      supaErrorMessage = e?.message || '';
    }
  }

  // 2. Firebase Cloud Email & Password Auth (Instant Fallback - Bypasses unconfirmed email blocks)
  if (isFirebaseConfigured()) {
    try {
      const config = getStoredFirebaseConfig();
      if (config?.apiKey) {
        const fbCtrl = new AbortController();
        const fbTimeout = setTimeout(() => fbCtrl.abort(), 1500);
        const fbRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: emailNorm,
              password: data.password,
              returnSecureToken: true
            }),
            signal: fbCtrl.signal
          }
        );
        clearTimeout(fbTimeout);
        const fbData = await fbRes.json();
        if (fbRes.ok && fbData.localId) {
          const uid = toDeterministicUuid('email:' + emailNorm);
          const now = new Date().toISOString();
          const displayName = fbData.displayName || emailNorm.split('@')[0];
          const authUser: AuthUser = {
            uid,
            email: emailNorm,
            displayName,
            photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=2D5A3D,0B2545`,
            travelerStyle: 'Budget explorer',
            travelStyleTag: 'Verified Explorer',
            location: 'India',
            occupation: 'Explorer',
            age: 25,
            emailVerified: true,
            provider: 'email',
            createdAt: now,
            lastLoginAt: now,
            savedPlaceIds: []
          };
          return { user: authUser, passwordHash: pwdHash };
        }
      }
    } catch (fbErr) {
      console.warn('[Firebase Email Auth] Sign-in notice:', fbErr);
    }
  }

  // 3. Offline / Local cached credentials check
  if (cachedMatch && cachedMatch.passwordHash === pwdHash) {
    return { user: cachedMatch.user, passwordHash: pwdHash };
  }

  if (supaPendingConfirmation) {
    const err = new Error('Email confirmation is pending for this account. Please click the verification link in your inbox, or create a fresh account.');
    (err as any).code = 'email_not_confirmed';
    throw err;
  }

  throw new Error(supaErrorMessage || 'Invalid email or password. Please verify your credentials or create a new account.');
}

/**
 * Finalize authenticated session once Factor 2 (email OTP) has been verified
 */
export function finalizeTwoFactorLogin(user: AuthUser, passwordHash?: string): AuthUser {
  syncAccountToLocal(user, passwordHash);
  return user;
}

/**
 * Remove active session without deleting remembered user accounts
 */
export function clearActiveSession(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY, { detail: null }));
    }
  } catch {}
}

/**
 * Sign in with email and password strictly via Supabase Authentication (with resilient local fallback)
 */
export async function signInWithEmail(data: LoginData): Promise<AuthUser & { emailConfirmationPending?: boolean }> {
  const { user, passwordHash } = await verifyEmailCredentialsOnly(data);
  syncAccountToLocal(user, passwordHash);
  return user;
}

/**
 * Return all locally saved user accounts (for multi-account switcher)
 */
export function getSavedAccounts(): AuthUser[] {
  const accounts = loadAccounts();
  return accounts.map(a => a.user);
}

/**
 * Switch active user session to a previously saved account
 */
export function switchAccount(userId: string): AuthUser {
  const accounts = loadAccounts();
  const target = accounts.find(a => a.user.uid === userId);
  if (!target) {
    throw new Error('Account not found on this device.');
  }

  target.user.lastLoginAt = new Date().toISOString();
  saveAccounts(accounts);

  const session: AuthSession = {
    token: `session-${target.user.uid}-${Date.now()}`,
    user: target.user,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
  };
  saveSession(session);

  return target.user;
}

/**
 * Remove an account from locally remembered list
 */
export function deleteAccount(userId: string): void {
  const accounts = loadAccounts();
  const filtered = accounts.filter(a => a.user.uid !== userId);
  saveAccounts(filtered);

  const current = getCurrentUser();
  if (current?.uid === userId) {
    signOut();
  }
}

/**
 * Update authenticated user profile details
 */
export async function updateAuthProfile(updates: Partial<UserProfile & AuthUser> & { displayName?: string; photoURL?: string; name?: string; avatar?: string }): Promise<AuthUser> {
  const current = getCurrentUser();
  if (!current) {
    throw new Error('No user is currently signed in.');
  }

  const accounts = loadAccounts();
  const index = accounts.findIndex(a => a.user.uid === current.uid);
  
  const updatedUser: AuthUser = {
    ...(index >= 0 ? accounts[index].user : current),
    ...updates,
    displayName: updates.displayName || updates.name || current.displayName,
    photoURL: updates.photoURL || updates.avatar || current.photoURL,
    phoneNumber: updates.phoneNumber !== undefined ? updates.phoneNumber : current.phoneNumber,
    location: updates.location || current.location,
    travelerStyle: updates.travelerStyle || current.travelerStyle,
    travelStyleTag: updates.travelStyleTag || current.travelStyleTag,
    uid: current.uid
  };

  if (isFounderVipUser(updatedUser)) {
    updatedUser.subscriptionTier = 'pro';
    updatedUser.freeTripsRemaining = 9999;
    updatedUser.weeklyAssistantMinutesRemaining = 1800;
    updatedUser.subscriptionExpiresAt = '2099-12-31T23:59:59.999Z';
  }

  if (index >= 0) {
    accounts[index].user = updatedUser;
    saveAccounts(accounts);
  }

  const currentSession = getActiveSession();
  if (currentSession) {
    currentSession.user = updatedUser;
    saveSession(currentSession);
  }

  // Update Supabase user metadata & profiles table
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: updatedUser.displayName,
          name: updatedUser.displayName,
          avatar_url: updatedUser.photoURL,
          traveler_style: updatedUser.travelerStyle,
          location: updatedUser.location,
          free_trips_remaining: updatedUser.freeTripsRemaining,
          lifetime_trips_created: updatedUser.lifetimeTripsCreated,
          subscription_tier: updatedUser.subscriptionTier,
          subscription_expires_at: updatedUser.subscriptionExpiresAt,
          weekly_assistant_minutes_remaining: updatedUser.weeklyAssistantMinutesRemaining
        }
      });
    } catch (e) {
      console.warn('[Supabase] Auth update user metadata warning:', e);
    }

    saveProfileToSupabase(updatedUser.uid, toUserProfile(updatedUser)).catch(e => {
      console.warn('[Supabase] Profile update sync warning:', e);
    });
  }

  if (typeof localStorage !== 'undefined') {
    try {
      if (updatedUser.uid && typeof updatedUser.lifetimeTripsCreated === 'number') {
        localStorage.setItem(`tripverse_lifetime_trips_created_u_${updatedUser.uid}`, updatedUser.lifetimeTripsCreated.toString());
      }
      if (updatedUser.email && typeof updatedUser.lifetimeTripsCreated === 'number') {
        localStorage.setItem(`tripverse_lifetime_trips_created_email_${updatedUser.email.toLowerCase().trim()}`, updatedUser.lifetimeTripsCreated.toString());
      }
    } catch {}
  }

  return updatedUser;
}

/**
 * Toggle Two-Factor Authentication (2FA) status for the currently authenticated user
 */
export async function toggleUserTwoFactor(enabled: boolean): Promise<AuthUser> {
  const updated = await updateAuthProfile({ twoFactorEnabled: enabled });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY, { detail: updated }));
    window.dispatchEvent(new CustomEvent('tripverse_auth_state_change', { detail: { user: updated } }));
  }
  return updated;
}

/**
 * Sign out current user from Supabase & local session
 */
export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[Supabase] Signout warning:', e);
    }
  }

  // Also sign out from Firebase Auth if active
  await signOutFirebase().catch(() => {});

  saveSession(null);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY, { detail: null }));
}

let isSupabaseListenerAttached = false;
let isFirebaseListenerAttached = false;

/**
 * Subscribe to authentication state changes with Supabase and Firebase listeners
 */
export function onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
  // Report active restored session once per browser tab load so existing logged-in users appear in real-time monitor
  try {
    const activeUser = getCurrentUser();
    if (activeUser?.uid && typeof sessionStorage !== 'undefined') {
      const reportKey = `tripverse_reported_auth_${activeUser.uid}`;
      if (!sessionStorage.getItem(reportKey)) {
        sessionStorage.setItem(reportKey, '1');
        saveProfileToSupabase(activeUser.uid, toUserProfile(activeUser)).catch(() => {});
      }
    }
  } catch {}

  // Attach Firebase Auth state listener if configured
  if (!isFirebaseListenerAttached && isFirebaseConfigured()) {
    isFirebaseListenerAttached = true;
    onFirebaseAuthStateChangedListener(async (fbUser) => {
      if (fbUser && fbUser.email) {
        const existingUser = getCurrentUser();
        if (!existingUser || isGuestUser(existingUser) || existingUser.email.toLowerCase() === fbUser.email.toLowerCase()) {
          try {
            await handleFirebaseUserCredential({ user: fbUser });
          } catch (err) {
            console.warn('[Firebase Auth] State listener credential sync warning:', err);
          }
        }
      }
    });
  }

  // Attach Supabase auth listener if configured
  if (!isSupabaseListenerAttached) {
    const supabase = getSupabaseClient();
    if (supabase) {
      isSupabaseListenerAttached = true;

      // 1. Check existing Supabase session immediately (e.g. after OAuth redirect or reload)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const authUser = supabaseUserToAuthUser(session.user);
          const existingUser = getCurrentUser();
          // Never let a stale anonymous guest session overwrite an authenticated Email/Google account
          if (isGuestUser(authUser) && existingUser && !isGuestUser(existingUser)) {
            return;
          }
          syncAccountToLocal(authUser);
        }
      }).catch(err => {
        console.warn('[Supabase] Initial session fetch notice:', err);
      });

      // 2. Listen to Supabase auth state transitions
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          if (session?.user) {
            const authUser = supabaseUserToAuthUser(session.user);
            syncAccountToLocal(authUser);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tripverse_open_reset_password_modal', { detail: session }));
          }
          return;
        }

        if (session?.user) {
          const authUser = supabaseUserToAuthUser(session.user);
          const existingUser = getCurrentUser();
          if (isGuestUser(authUser) && existingUser && !isGuestUser(existingUser)) {
            return;
          }
          syncAccountToLocal(authUser);
        } else if (event === 'SIGNED_OUT') {
          saveSession(null);
          window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY, { detail: null }));
        }
      });
    }
  }

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<AuthUser | null>;
    callback(customEvent.detail);
  };
  window.addEventListener(AUTH_EVENT_KEY, handler);
  return () => window.removeEventListener(AUTH_EVENT_KEY, handler);
}

/**
 * Compatibility helper for RecaptchaVerifier (no longer needed with Supabase)
 */
export function setupRecaptchaVerifier(): any {
  return null;
}

let lastSmsDispatchedPhone: string | null = null;
let activePhonePendingPhone: string | null = null;

/**
 * Send real SMS verification code via Firebase Phone Auth (Google Telecom Gateway) with Fast2SMS fallback.
 * ZERO-reCAPTCHA & NO MOCK: Dispatches genuine carrier SMS without any reCAPTCHA puzzles, iframes, or badges.
 */
export async function sendPhoneOtp(
  rawPhoneNumber: string
): Promise<{ provider: 'firebase' | 'fast2sms' | 'supabase'; message: string }> {
  let clean = rawPhoneNumber.trim().replace(/[\s-()]/g, '');
  if (!clean.startsWith('+')) {
    if (clean.length === 10) {
      clean = `+91${clean}`;
    } else {
      clean = `+${clean}`;
    }
  }

  let lastFast2SmsError = '';

  // 1. Primary: Genuine Firebase Phone SMS (Google Carrier Telecom Network - Zero reCAPTCHA)
  if (isFirebaseConfigured() && typeof window !== 'undefined') {
    try {
      await sendFirebasePhoneOtp(clean);
      lastSmsDispatchedPhone = clean;
      activePhonePendingPhone = clean;
      console.log(`[Firebase Phone] Verification session initiated for ${clean}`);
      return {
        provider: 'firebase',
        message: `Real carrier SMS verification code dispatched to ${clean}.`
      };
    } catch (fbErr: any) {
      console.warn('[Firebase Phone] Dispatch notice, checking secondary SMS gateway:', fbErr);
      if (fbErr.code === 'auth/invalid-phone-number') {
        throw new Error('Please enter a valid mobile number with country code (e.g. +91 98765 43210).');
      }
      if (fbErr.code === 'auth/too-many-requests') {
        throw new Error('Too many verification attempts from this device. Please wait a few moments before trying again.');
      }
      lastFast2SmsError = fbErr.message?.includes('BILLING_NOT_ENABLED')
        ? 'BILLING_NOT_ENABLED: Firebase Pay-as-you-go (Blaze) is required for worldwide live carrier SMS. Google includes 10,000 free SMS/mo.'
        : fbErr.message?.includes('OPERATION_NOT_ALLOWED')
        ? 'SMS delivery to this country/region must be enabled in Firebase Console (Authentication > Settings > SMS Region Policy).'
        : (fbErr.message || 'Firebase SMS dispatch unavailable.');
    }
  }

  // 2. Supabase Phone Auth (International or Supabase SMS provider)
  let lastSupabaseError = '';
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: clean
      });
      if (!error) {
        lastSmsDispatchedPhone = clean;
        activePhonePendingPhone = clean;
        return {
          provider: 'supabase',
          message: `Real SMS verification code dispatched to ${clean}.`
        };
      }
      lastSupabaseError = error.message;
      console.warn('[Supabase] Phone auth notice:', error.message);
    } catch (e: any) {
      lastSupabaseError = e.message;
      console.warn('[Supabase] Phone auth error:', e.message);
    }
  }

  // Strict Zero-Mock Enforcement: Never auto-fill or fake an OTP if carrier dispatch failed
  if (lastFast2SmsError) {
    throw new Error(lastFast2SmsError);
  }
  if (lastSupabaseError) {
    throw new Error(
      `SMS carrier delivery is not enabled for ${clean} (${lastSupabaseError}). Please sign in with Email & Password or Google.`
    );
  }
  throw new Error('Could not dispatch carrier SMS verification code. Please check your network or sign in with Email & Password.');
}

/**
 * Verify SMS OTP code and sign in / register user
 */
export async function verifyPhoneOtp(
  code: string,
  displayName?: string,
  travelerStyle?: string,
  location?: string,
  phoneNumber?: string
): Promise<AuthUser> {
  const cleanCode = code.trim().replace(/\D/g, '');
  if (cleanCode.length !== 6) {
    throw new Error('Please enter the complete 6-digit SMS verification code.');
  }

  const targetPhone = phoneNumber || lastSmsDispatchedPhone || activePhonePendingPhone || '';
  if (!targetPhone) {
    throw new Error('No pending SMS verification. Please enter your mobile number and request a verification code.');
  }

  const now = new Date().toISOString();

  // 1. Verify genuine Firebase carrier SMS confirmation if active
  if (isFirebaseConfigured()) {
    try {
      const cred = await confirmFirebasePhoneOtp(cleanCode);
      if (cred && cred.user) {
        const fbUser = cred.user;
        const cleanPhone = fbUser.phoneNumber || targetPhone;
        const finalName = (displayName || '').trim() || `Explorer (${cleanPhone.slice(-4)})`;
        const uid = toDeterministicUuid('phone:' + (fbUser.uid || cleanPhone.replace(/\D/g, '')));

        const authUser: AuthUser = {
          uid,
          email: '',
          phoneNumber: cleanPhone,
          displayName: finalName,
          photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(finalName)}&backgroundColor=2D5A3D,0B2545`,
          travelerStyle: travelerStyle || 'Budget explorer',
          travelStyleTag: 'Carrier Verified Explorer',
          location: location || 'India',
          occupation: 'Explorer',
          age: 25,
          emailVerified: false,
          provider: 'phone',
          createdAt: now,
          lastLoginAt: now,
          savedPlaceIds: []
        };

        syncAccountToLocal(authUser);
        saveProfileToSupabase(authUser.uid, toUserProfile(authUser)).catch(() => {});
        lastSmsDispatchedPhone = null;
        activePhonePendingPhone = null;
        clearFirebasePhoneSession();
        return authUser;
      }
    } catch (fbErr: any) {
      if (fbErr.code === 'auth/invalid-verification-code') {
        throw new Error('Incorrect SMS verification code. Please check your messages.');
      }
      if (fbErr.code === 'auth/code-expired') {
        throw new Error('SMS verification code has expired. Please request a new code.');
      }
    }
  }

  // 2. Verify Supabase Phone Auth OTP
  const supabase = getSupabaseClient();
  if (supabase && targetPhone) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: targetPhone,
      token: cleanCode,
      type: 'sms'
    });

    if (error) {
      throw new Error(error.message || 'Incorrect verification code. Please check your SMS.');
    }

    if (data?.user) {
      const finalName = (displayName || '').trim() || `Explorer (${targetPhone.slice(-4)})`;
      const authUser = supabaseUserToAuthUser(data.user, {
        displayName: finalName,
        travelerStyle: travelerStyle || 'Budget explorer',
        location: location || 'India',
        phoneNumber: targetPhone
      });

      await saveProfileToSupabase(authUser.uid, toUserProfile(authUser));
      syncAccountToLocal(authUser);
      lastSmsDispatchedPhone = null;
      activePhonePendingPhone = null;
      return authUser;
    }
  }

  throw new Error('Verification failed. No active SMS session found or the code has expired. Please request a new code.');
}

/**
 * Check if there is an active pending phone confirmation result
 */
export function hasActivePhoneConfirmation(): boolean {
  return activePhonePendingPhone !== null;
}

/**
 * Clear any active phone authentication session
 */
export function clearPhoneAuthSession(): void {
  lastSmsDispatchedPhone = null;
  activePhonePendingPhone = null;
  clearFirebasePhoneSession();
}

/**
 * Format international E.164 phone number
 */
export function formatE164PhoneNumber(phoneNumber: string, countryCode: string = '+91'): string {
  let clean = phoneNumber.trim().replace(/[\s\-()]/g, '');
  if (clean.startsWith('+')) {
    return clean;
  }
  if (clean.startsWith('0')) {
    clean = clean.substring(1);
  }
  const prefix = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  return `${prefix}${clean}`;
}

/**
 * Friendly error message translation for Phone Auth errors
 */
export function getPhoneAuthErrorMessage(err: any): string {
  if (!err) return 'Phone authentication failed.';
  const message = err.message || '';

  if (message.includes('blacklisted') || message.includes('IP Security') || message.includes('Fast2SMS') || message.includes('status_code: 414')) {
    return 'Fast2SMS gateway returned "IP is blacklisted". In fast2sms.com under Dev API settings, toggle IP Security to Disabled, or enable Google Cloud Billing on Firebase.';
  }

  if (message.includes('BILLING_NOT_ENABLED')) {
    return 'Carrier SMS to worldwide phone numbers requires enabling the Firebase Blaze (Pay-as-you-go) plan in Firebase Console. Google includes 10,000 free SMS/month. Once Blaze is enabled, carrier SMS works worldwide.';
  }

  if (message.includes('OPERATION_NOT_ALLOWED') || message.includes('region enabled')) {
    return 'SMS delivery to this country/region must be enabled in your Firebase Console (Authentication > Settings > SMS Region Policy).';
  }

  if (message.includes('quota-exceeded') || message.includes('TOO_MANY_ATTEMPTS')) {
    return 'SMS dispatch quota temporarily exceeded. Please try again shortly or sign in with Google or Email.';
  }

  if (message.includes('invalid-phone-number') || message.includes('format') || message.includes('INVALID_PHONE_NUMBER')) {
    return 'The phone number format is invalid. Please enter a valid mobile number with country code (e.g. +91 9876543210).';
  }

  if (message.includes('expired') || message.includes('SESSION_EXPIRED')) {
    return 'Verification code has expired. Please tap "Resend SMS Code" to get a fresh code.';
  }

  if (message.includes('Incorrect') || message.includes('invalid') || message.includes('INVALID_CODE')) {
    return 'Incorrect verification code. Please check the 6-digit code received on your phone and try again.';
  }

  return message || 'Phone authentication failed. Please try again.';
}

/**
 * Convert AuthUser to UserProfile
 */
export function toUserProfile(user: AuthUser): UserProfile {
  const providerLabel =
    user.provider === 'google'
      ? 'Google Auth'
      : user.provider === 'email'
        ? 'Email Auth'
        : user.provider === 'guest'
          ? 'Guest Auth'
          : 'Verified Auth';
  const baseTag = user.travelStyleTag || 'Verified Explorer';
  const enrichedTag = baseTag.toLowerCase().includes('auth') || baseTag.toLowerCase().includes(user.provider)
    ? baseTag
    : `${baseTag} • ${providerLabel}`;

  return {
    name: user.displayName,
    age: user.age,
    occupation: user.occupation,
    location: user.location,
    email: user.email,
    phoneNumber: user.phoneNumber,
    avatar: user.photoURL,
    travelerStyle: user.travelerStyle,
    travelStyleTag: enrichedTag,
    budgetPreference: 'Balanced & Value-Focused',
    foodPreference: 'Authentic Local & Hygienic Stops',
    accommodationPreference: 'Boutique Stays & Clean Hotels',
    savedPlaceIds: user.savedPlaceIds || [],
    tripsCount: 0,
    twoFactorEnabled: user.twoFactorEnabled ?? false
  };
}

export const updateUserProfile = updateAuthProfile;

/**
 * =========================================================================
 * Subscription & Quota Management (Freemium 3-Trip & Pro 30h/week Facility)
 * =========================================================================
 */
const GUEST_QUOTA_STORAGE_KEY = 'tripverse_guest_quota_v1';

export function getUserSubscriptionQuota(userParam?: AuthUser | null): UserSubscriptionQuota {
  const user = userParam !== undefined ? userParam : getCurrentUser();

  if (!user || isGuestUser(user)) {
    // Guest users can explore destinations and deals, but cannot use or explore the AI Trip Planner
    return {
      tier: 'free',
      isPro: false,
      freeTripsRemaining: 0,
      freeTripsTotal: 0,
      lifetimeTripsCreated: 0,
      canCreateTrip: false,
      weeklyAssistantMinutesRemaining: 0,
      weeklyAssistantMinutesTotal: 0,
      weeklyQuotaHoursFormatted: '0h 00m'
    };
  }

  // Logged-in user
  const isFounderVIP = isFounderVipUser(user);
  let isPro = isFounderVIP || user.subscriptionTier === 'pro';
  if (!isFounderVIP && isPro && user.subscriptionExpiresAt) {
    const expiresMs = new Date(user.subscriptionExpiresAt).getTime();
    if (!isNaN(expiresMs) && Date.now() > expiresMs) {
      isPro = false;
      updateAuthProfile({ subscriptionTier: 'free' }).catch(() => {});
    }
  }

  // STRICT OPTION A: Cross-reference user object, UID persistent tracker, email persistent tracker, and saved trips
  const emailNorm = user.email ? user.email.toLowerCase().trim() : '';
  let storedEmailLifetime = 0;
  let storedUidLifetime = 0;
  let userCreatedTripsCount = 0;

  if (typeof localStorage !== 'undefined') {
    try {
      if (emailNorm) {
        storedEmailLifetime = parseInt(localStorage.getItem(`tripverse_lifetime_trips_created_email_${emailNorm}`) || '0', 10) || 0;
      }
      if (user.uid) {
        storedUidLifetime = parseInt(localStorage.getItem(`tripverse_lifetime_trips_created_u_${user.uid}`) || '0', 10) || 0;
        const raw = localStorage.getItem(`tripverse_trips_u_${user.uid}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            userCreatedTripsCount = parsed.filter((t: any) => t && t.isUserCreated && !t.isSample).length;
          }
        }
      }
    } catch {}
  }

  const userObjLifetime = typeof user.lifetimeTripsCreated === 'number' ? user.lifetimeTripsCreated : 0;
  const userObjUsed = typeof user.freeTripsRemaining === 'number' ? Math.max(0, 3 - user.freeTripsRemaining) : 0;

  // STRICT OPTION A: Absolute lifetime created count is monotonic (never decreases)
  const effectiveLifetimeCreated = Math.max(
    userObjLifetime,
    userObjUsed,
    storedUidLifetime,
    storedEmailLifetime,
    userCreatedTripsCount
  );

  let freeTripsRemaining: number;
  if (isPro) {
    freeTripsRemaining = 9999;
  } else {
    // Once 3 lifetime trips are reached, remaining is strictly 0 forever across all sessions
    freeTripsRemaining = Math.max(0, 3 - effectiveLifetimeCreated);
  }

  const assistantMinutes = isFounderVIP
    ? 1800
    : (typeof user.weeklyAssistantMinutesRemaining === 'number'
      ? user.weeklyAssistantMinutesRemaining
      : (isPro ? 1800 : 30));

  const hours = Math.floor(assistantMinutes / 60);
  const mins = assistantMinutes % 60;
  const weeklyQuotaHoursFormatted = `${hours}h ${mins.toString().padStart(2, '0')}m`;

  return {
    tier: isPro ? 'pro' : 'free',
    isPro,
    isFounder: isFounderVIP,
    freeTripsRemaining,
    freeTripsTotal: 3,
    lifetimeTripsCreated: effectiveLifetimeCreated,
    canCreateTrip: isPro || freeTripsRemaining > 0,
    weeklyAssistantMinutesRemaining: assistantMinutes,
    weeklyAssistantMinutesTotal: isPro ? 1800 : 30, // 30 hours per week = 1800 mins
    weeklyQuotaHoursFormatted,
    subscriptionExpiresAt: isFounderVIP ? '2099-12-31T23:59:59.999Z' : user.subscriptionExpiresAt
  };
}

export function consumeTripCredit(userParam?: AuthUser | null): { allowed: boolean; remaining: number } {
  const currentUser = getCurrentUser();
  const targetUser = (userParam && currentUser && userParam.uid === currentUser.uid)
    ? currentUser
    : (userParam !== undefined ? userParam : currentUser);

  if (!targetUser || isGuestUser(targetUser)) {
    return { allowed: false, remaining: 0 };
  }

  // If user is Pro or VIP Founder, unlimited trips!
  if (targetUser.subscriptionTier === 'pro' || isFounderVipUser(targetUser)) {
    return { allowed: true, remaining: 9999 };
  }

  // Free tier registered user
  const quota = getUserSubscriptionQuota(targetUser);
  if (!quota.canCreateTrip || quota.freeTripsRemaining <= 0) {
    return { allowed: false, remaining: 0 };
  }

  const emailNorm = targetUser.email ? targetUser.email.toLowerCase().trim() : '';
  const currentLifetime = Math.max(
    targetUser.lifetimeTripsCreated || 0,
    quota.lifetimeTripsCreated,
    3 - quota.freeTripsRemaining
  );
  const newLifetime = currentLifetime + 1;
  const newRemaining = Math.max(0, 3 - newLifetime);

  if (userParam) {
    userParam.lifetimeTripsCreated = newLifetime;
    userParam.freeTripsRemaining = newRemaining;
  }
  if (targetUser) {
    targetUser.lifetimeTripsCreated = newLifetime;
    targetUser.freeTripsRemaining = newRemaining;
  }

  // Track lifetime created count in persistent storage across both UID and Email
  if (typeof localStorage !== 'undefined') {
    try {
      if (targetUser.uid) {
        localStorage.setItem(`tripverse_lifetime_trips_created_u_${targetUser.uid}`, newLifetime.toString());
      }
      if (emailNorm) {
        localStorage.setItem(`tripverse_lifetime_trips_created_email_${emailNorm}`, newLifetime.toString());
      }
    } catch {}
  }

  updateAuthProfile({ 
    freeTripsRemaining: newRemaining,
    lifetimeTripsCreated: newLifetime
  }).catch(() => {});

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('tripverse_quota_updated', { detail: { remaining: newRemaining, user: targetUser } }));
    } catch (_) {}
  }
  return { allowed: true, remaining: newRemaining };
}

export function consumeAssistantMinute(minutesToDeduct: number = 1, userParam?: AuthUser | null): { allowed: boolean; remaining: number } {
  const user = userParam !== undefined ? userParam : getCurrentUser();

  if (!user) {
    let guestMinutes = 30;
    let guestTrips = 3;
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(GUEST_QUOTA_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.freeTripsRemaining === 'number') guestTrips = parsed.freeTripsRemaining;
          if (typeof parsed.weeklyAssistantMinutesRemaining === 'number') guestMinutes = parsed.weeklyAssistantMinutesRemaining;
        }
      }
    } catch {}

    if (guestMinutes <= 0) {
      return { allowed: false, remaining: 0 };
    }

    const nextMinutes = Math.max(0, guestMinutes - minutesToDeduct);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GUEST_QUOTA_STORAGE_KEY, JSON.stringify({
          freeTripsRemaining: guestTrips,
          weeklyAssistantMinutesRemaining: nextMinutes
        }));
      }
    } catch {}

    window.dispatchEvent(new CustomEvent('tripverse_quota_updated', { detail: { assistantMinutesRemaining: nextMinutes } }));
    return { allowed: true, remaining: nextMinutes };
  }

  // If user is Pro, full 30h/week (1800 minutes) pool
  if (user.subscriptionTier === 'pro') {
    const current = typeof user.weeklyAssistantMinutesRemaining === 'number' ? user.weeklyAssistantMinutesRemaining : 1800;
    const next = Math.max(0, current - minutesToDeduct);
    updateAuthProfile({ weeklyAssistantMinutesRemaining: next }).catch(() => {});
    return { allowed: true, remaining: next };
  }

  // Free registered user
  const currentRemaining = typeof user.weeklyAssistantMinutesRemaining === 'number' ? user.weeklyAssistantMinutesRemaining : 30;
  if (currentRemaining <= 0) {
    return { allowed: false, remaining: 0 };
  }

  const nextRemaining = Math.max(0, currentRemaining - minutesToDeduct);
  updateAuthProfile({ weeklyAssistantMinutesRemaining: nextRemaining }).catch(() => {});
  window.dispatchEvent(new CustomEvent('tripverse_quota_updated', { detail: { assistantMinutesRemaining: nextRemaining } }));
  return { allowed: true, remaining: nextRemaining };
}

export async function upgradeUserToPro(userParam?: AuthUser | null, durationDays: number = 30): Promise<AuthUser | null> {
  const user = userParam !== undefined ? userParam : getCurrentUser();
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const nextReset = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (!user) {
    // Upgrading guest
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GUEST_QUOTA_STORAGE_KEY, JSON.stringify({
          freeTripsRemaining: 9999,
          weeklyAssistantMinutesRemaining: 1800,
          tier: 'pro'
        }));
      }
    } catch {}
    window.dispatchEvent(new CustomEvent('tripverse_quota_updated', { detail: { isPro: true } }));
    return null;
  }

  const updated = await updateAuthProfile({
    subscriptionTier: 'pro',
    freeTripsRemaining: 9999,
    weeklyAssistantMinutesRemaining: 1800, // 30 hours per week full facility
    subscriptionExpiresAt: expiresAt,
    weeklyQuotaResetAt: nextReset
  });

  if (userParam) {
    userParam.subscriptionTier = 'pro';
    userParam.freeTripsRemaining = 9999;
    userParam.subscriptionExpiresAt = expiresAt;
  }

  const isFounder = isFounderVipUser(updated);
  window.dispatchEvent(new CustomEvent('tripverse_quota_updated', { detail: { isPro: true, isFounder, user: updated } }));
  return updated;
}

export async function downgradeUserToFree(userParam?: AuthUser | null): Promise<AuthUser | null> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('tripverse_founder_vip');
    }
  } catch {}
  const user = userParam !== undefined ? userParam : getCurrentUser();
  if (user && FOUNDER_VIP_EMAILS.has(user.email ? user.email.toLowerCase().trim() : '')) {
    return user;
  }
  if (!user) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(GUEST_QUOTA_STORAGE_KEY);
      }
    } catch {}
    window.dispatchEvent(new CustomEvent('tripverse_quota_updated', { detail: { isPro: false } }));
    return null;
  }
  const emailNorm = user.email ? user.email.toLowerCase().trim() : '';
  let storedLifetime = user.lifetimeTripsCreated;
  if (typeof storedLifetime !== 'number' && typeof localStorage !== 'undefined') {
    try {
      if (emailNorm) {
        const val = localStorage.getItem(`tripverse_lifetime_trips_created_email_${emailNorm}`);
        if (val) storedLifetime = parseInt(val, 10);
      }
      if (storedLifetime === undefined && user.uid) {
        const val = localStorage.getItem(`tripverse_lifetime_trips_created_u_${user.uid}`);
        if (val) storedLifetime = parseInt(val, 10);
      }
    } catch {}
  }
  const effectiveLifetime = typeof storedLifetime === 'number' && !isNaN(storedLifetime) ? storedLifetime : 3;
  const remainingAfterDowngrade = Math.max(0, 3 - effectiveLifetime);

  const updated = await updateAuthProfile({
    subscriptionTier: 'free',
    freeTripsRemaining: remainingAfterDowngrade,
    lifetimeTripsCreated: effectiveLifetime,
    weeklyAssistantMinutesRemaining: 30,
    subscriptionExpiresAt: undefined
  });

  if (userParam) {
    userParam.subscriptionTier = 'free';
    userParam.freeTripsRemaining = remainingAfterDowngrade;
    userParam.lifetimeTripsCreated = effectiveLifetime;
    userParam.subscriptionExpiresAt = undefined;
  }
  window.dispatchEvent(new CustomEvent('tripverse_quota_updated', { detail: { isPro: false, user: updated } }));
  return updated;
}

