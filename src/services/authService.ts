import { 
  AuthUser, 
  AuthSession, 
  SignUpData, 
  LoginData, 
  GoogleCredentialPayload,
  VerificationCodeRecord,
  SubscriptionTier,
  UserSubscriptionQuota 
} from '../types/auth';

export type { AuthUser, AuthSession, SubscriptionTier, UserSubscriptionQuota };
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
  signOutFirebase,
  FirebaseConfig
} from './firebase';
import { 
  saveProfileToSupabase, 
  loadProfileFromSupabase 
} from './supabaseSyncService';
import { 
  sendRealSmsOtp, 
  verifyRealSmsOtp, 
  getPendingSmsSession, 
  clearPendingSmsSession, 
  getFast2SmsApiKey,
  savePendingSmsSession 
} from './smsService';

const USERS_STORAGE_KEY = 'tripverse_auth_users_v3';
const SESSION_STORAGE_KEY = 'tripverse_auth_session_v3';
const VERIFICATION_STORAGE_KEY = 'tripverse_auth_verification_codes_v1';
const AUTH_EVENT_KEY = 'tripverse_auth_state_change';

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
      if (
        name === 'Meet Sharma' ||
        name === 'Rahul Mehta' ||
        email === 'meet.sharma8c@gmail.com' ||
        email === 'rahul.mehta22@gmail.com' ||
        email === 'explorer.google@gmail.com' ||
        uid.startsWith('user-email-') ||
        uid.startsWith('user-google-')
      ) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }

    const rawAccounts = localStorage.getItem(USERS_STORAGE_KEY);
    if (rawAccounts) {
      const accounts: StoredAccount[] = JSON.parse(rawAccounts) || [];
      const cleaned = accounts.filter(a =>
        a.user.displayName !== 'Meet Sharma' &&
        a.user.displayName !== 'Rahul Mehta' &&
        a.user.email !== 'meet.sharma8c@gmail.com' &&
        a.user.email !== 'rahul.mehta22@gmail.com' &&
        a.user.email !== 'explorer.google@gmail.com' &&
        !a.user.uid.startsWith('user-email-') &&
        !a.user.uid.startsWith('user-google-')
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
  removeFirebaseConfig
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

  const rawProvider = (sbUser.app_metadata?.provider as any) || (sbUser.phone ? 'phone' : 'email');
  const provider = rawProvider === 'google' ? 'google' : rawProvider === 'phone' ? 'phone' : 'email';

  return {
    uid: toDeterministicUuid(sbUser.id),
    email: sbUser.email || overrides?.email || '',
    phoneNumber: sbUser.phone || overrides?.phoneNumber || '',
    displayName,
    photoURL,
    travelerStyle: overrides?.travelerStyle || metadata.traveler_style || 'Budget explorer',
    travelStyleTag: overrides?.travelStyleTag || metadata.travel_style_tag || 'Verified Explorer',
    location: overrides?.location || metadata.location || 'India',
    occupation: overrides?.occupation || metadata.occupation || 'Explorer',
    age: overrides?.age || metadata.age || 25,
    emailVerified: Boolean(sbUser.email_confirmed_at),
    provider,
    createdAt: sbUser.created_at || new Date().toISOString(),
    lastLoginAt: sbUser.last_sign_in_at || new Date().toISOString(),
    savedPlaceIds: overrides?.savedPlaceIds || [],
    subscriptionTier: overrides?.subscriptionTier || (metadata.subscription_tier as SubscriptionTier) || 'free',
    freeTripsRemaining: typeof overrides?.freeTripsRemaining === 'number' 
      ? overrides.freeTripsRemaining 
      : (typeof metadata.free_trips_remaining === 'number' ? metadata.free_trips_remaining : 3),
    weeklyAssistantMinutesRemaining: typeof overrides?.weeklyAssistantMinutesRemaining === 'number'
      ? overrides.weeklyAssistantMinutesRemaining
      : (typeof metadata.weekly_assistant_minutes_remaining === 'number' ? metadata.weekly_assistant_minutes_remaining : 1800),
    subscriptionExpiresAt: overrides?.subscriptionExpiresAt || metadata.subscription_expires_at,
    weeklyQuotaResetAt: overrides?.weeklyQuotaResetAt || metadata.weekly_quota_reset_at
  };
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
 * Session Storage Helpers
 */
export function saveSession(session: AuthSession | null): void {
  try {
    if (session) {
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

/**
 * Sign in using Firebase Authentication Google Provider popup
 */
export async function signInWithFirebaseGoogleAuth(): Promise<AuthUser> {
  const cred = await signInWithFirebaseGoogle();
  const fbUser = cred.user;
  if (!fbUser.email) {
    throw new Error('Google account does not contain a verified email address.');
  }

  const emailNorm = fbUser.email.trim().toLowerCase();
  const uid = toDeterministicUuid('google:' + (fbUser.uid || emailNorm));
  const now = new Date().toISOString();

  const accounts = loadAccounts();
  let account = accounts.find(a => a.user.email.toLowerCase() === emailNorm);

  if (!account) {
    const displayName = fbUser.displayName || emailNorm.split('@')[0];
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
    account.user.uid = uid;
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
 * Primary Google Sign-In: Prefers Firebase Auth when configured, with GIS fallback
 */
export async function signInWithGooglePopup(): Promise<AuthUser> {
  // 1. If Firebase Auth is configured, use Firebase Auth popup
  if (isFirebaseConfigured()) {
    try {
      return await signInWithFirebaseGoogleAuth();
    } catch (fbErr: any) {
      const msg = fbErr?.message || '';
      if (
        fbErr?.code === 'auth/popup-closed-by-user' ||
        fbErr?.code === 'auth/cancelled-popup-request' ||
        msg.toLowerCase().includes('closed') ||
        msg.toLowerCase().includes('cancel')
      ) {
        throw new Error('Google sign-in was cancelled. Please select your account to proceed.');
      }
      if (fbErr?.code === 'auth/unauthorized-domain') {
        throw new Error("Firebase Auth Domain Error: This domain is not listed under 'Authorized domains' in your Firebase Console (Authentication -> Settings -> Authorized domains).");
      }
      console.warn('[Firebase Auth] Notice during Google popup, falling back to GIS if available:', fbErr);
    }
  }

  // 2. Fallback to Google Identity Services (GIS)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  await ensureGoogleIdentityServices();

  // GIS OAuth2 Token Client (Official user button click popup flow)
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2 && clientId) {
    return new Promise((resolve, reject) => {
      try {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              if (tokenResponse.error === 'access_denied') {
                reject(new Error('Google sign-in was cancelled. Please select your account to proceed.'));
              } else {
                reject(new Error(tokenResponse.error_description || tokenResponse.error || 'Google Sign-In failed.'));
              }
              return;
            }
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              });
              const info = await res.json();
              if (!info.email) {
                reject(new Error('Google account does not contain a verified email address.'));
                return;
              }
              const user = await signInWithGoogleUserInfo(info);
              resolve(user);
            } catch (err: any) {
              reject(new Error(err?.message || 'Failed to fetch Google profile.'));
            }
          }
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch (err: any) {
        reject(new Error(err?.message || 'Google Sign-In could not open popup.'));
      }
    });
  }

  throw new Error('Google Sign-In service is initializing. Please tap again in a moment.');
}

export async function sendPasswordResetCode(email: string): Promise<{ code: string; expiresAt: number }> {
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm || !emailNorm.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase authentication is not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable genuine password resets.');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(emailNorm, {
    redirectTo: `${window.location.origin}/reset-password`
  });

  if (error) {
    throw new Error(error.message || 'Failed to dispatch password reset email.');
  }

  return { code: 'email_dispatched', expiresAt: Date.now() + 15 * 60 * 1000 };
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  await sendPasswordResetCode(email);
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
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase cloud authentication is not configured.');
  }

  let supaData: any = null;
  let isRateLimited = false;

  try {
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/?tab=profile`
      : 'https://tripverse-pied.vercel.app/?tab=profile';

    const res = await supabase.auth.signUp({
      email: emailNorm,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: data.name?.trim() || emailNorm.split('@')[0],
          name: data.name?.trim() || emailNorm.split('@')[0],
          traveler_style: data.travelerStyle || 'Budget explorer',
          location: data.location || 'India',
          occupation: data.occupation || 'Explorer'
        }
      }
    });

    if (res.error) {
      if (res.error.message.toLowerCase().includes('already registered')) {
        throw new Error('An account with this email address already exists. Please sign in instead.');
      }
      if ((res.error as any).code === 'over_email_send_rate_limit' || res.error.message.toLowerCase().includes('rate limit')) {
        isRateLimited = true;
      } else {
        throw new Error(res.error.message);
      }
    } else {
      supaData = res.data;
    }
  } catch (err: any) {
    if (err.message && err.message.toLowerCase().includes('already exists')) {
      throw err;
    }
    if ((err as any).code === 'over_email_send_rate_limit' || (err.message && err.message.toLowerCase().includes('rate limit'))) {
      isRateLimited = true;
    } else {
      throw err;
    }
  }

  let authUser: AuthUser;
  const isSessionCreated = Boolean(supaData?.session);

  if (supaData?.user) {
    authUser = supabaseUserToAuthUser(supaData.user, {
      displayName: data.name?.trim(),
      travelerStyle: data.travelerStyle || 'Budget explorer',
      location: data.location || 'India',
      occupation: data.occupation || 'Explorer'
    });
    authUser.emailVerified = isSessionCreated;
  } else {
    // Graceful offline/rate-limit fallback with deterministic UUID
    const uid = toDeterministicUuid('email:' + emailNorm);
    const now = new Date().toISOString();
    authUser = {
      uid,
      email: emailNorm,
      displayName: data.name?.trim() || emailNorm.split('@')[0],
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name || emailNorm)}&backgroundColor=2D5A3D,0B2545`,
      travelerStyle: data.travelerStyle || 'Budget explorer',
      travelStyleTag: 'Verified Explorer',
      location: data.location || 'India',
      occupation: data.occupation || 'Explorer',
      age: 25,
      emailVerified: false,
      provider: 'email',
      createdAt: now,
      lastLoginAt: now,
      savedPlaceIds: []
    };
  }

  // Persist locally with hashed password so login on this device is immediate & reliable
  syncAccountToLocal(authUser, pwdHash);

  // Attempt Supabase PostgreSQL profile sync if active session exists
  if (isSessionCreated) {
    saveProfileToSupabase(authUser.uid, toUserProfile(authUser)).catch(() => {});
  }

  return {
    ...authUser,
    emailConfirmationPending: !isSessionCreated,
    isPendingEmailConfirmation: !isSessionCreated,
    isRateLimited
  };
}

// Backward-compatibility alias
export const createAccountWithFirebase = createAccountWithSupabase;

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
    if (fallbackRes.error) {
      throw new Error(fallbackRes.error.message || 'Incorrect or expired confirmation code.');
    }
    if (fallbackRes.data.user) {
      const authUser = supabaseUserToAuthUser(fallbackRes.data.user);
      authUser.emailVerified = true;
      syncAccountToLocal(authUser);
      saveProfileToSupabase(authUser.uid, toUserProfile(authUser)).catch(() => {});
      return authUser;
    }
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
 * Resend email confirmation link/code via Supabase
 */
export async function resendEmailConfirmation(email: string): Promise<void> {
  const emailNorm = email.trim().toLowerCase();
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase cloud authentication is not configured.');
  }

  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?tab=profile`
    : 'https://tripverse-pied.vercel.app/?tab=profile';

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

/**
 * Sign in with email and password strictly via Supabase Authentication (with resilient local fallback)
 */
export async function signInWithEmail(data: LoginData): Promise<AuthUser & { emailConfirmationPending?: boolean }> {
  const emailNorm = (data.email || '').trim().toLowerCase();
  if (!emailNorm) {
    throw new Error('Please enter your email address.');
  }
  if (!data.password) {
    throw new Error('Please enter your password.');
  }

  const supabase = getSupabaseClient();
  const pwdHash = await hashPassword(data.password);

  if (supabase) {
    const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
      email: emailNorm,
      password: data.password
    });

    if (!supaErr && supaData?.user) {
      const authUser = supabaseUserToAuthUser(supaData.user);
      try {
        const profile = await loadProfileFromSupabase(authUser.uid);
        if (profile) {
          authUser.displayName = profile.name || authUser.displayName;
          authUser.photoURL = profile.avatar || authUser.photoURL;
          authUser.travelerStyle = profile.travelerStyle || authUser.travelerStyle;
          authUser.location = profile.location || authUser.location;
        }
      } catch (err) {
        console.warn('[Supabase] Profile fetch notice:', err);
      }

      syncAccountToLocal(authUser, pwdHash);
      return authUser;
    }

    // Check for Email not confirmed
    if (supaErr && (supaErr.message.toLowerCase().includes('email not confirmed') || (supaErr as any).code === 'email_not_confirmed')) {
      const accounts = loadAccounts();
      const localAccount = accounts.find(a => a.user.email.toLowerCase() === emailNorm);
      if (localAccount && localAccount.passwordHash === pwdHash) {
        const user = { ...localAccount.user, emailVerified: false };
        syncAccountToLocal(user, pwdHash);
        return { ...user, emailConfirmationPending: true };
      }

      const err = new Error('Email confirmation is pending for this account. Please verify via the link sent to your inbox, or enter the 6-digit verification code below.');
      (err as any).code = 'email_not_confirmed';
      throw err;
    }

    if (supaErr && !supaErr.message.toLowerCase().includes('fetch')) {
      throw new Error(supaErr.message || 'Invalid email or password.');
    }
  }

  // Offline / Network fallback
  const accounts = loadAccounts();
  const localAccount = accounts.find(a => a.user.email.toLowerCase() === emailNorm);
  if (localAccount && localAccount.passwordHash === pwdHash) {
    syncAccountToLocal(localAccount.user, pwdHash);
    return localAccount.user;
  }

  throw new Error('Invalid email or password. Please verify your credentials.');
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
          location: updatedUser.location
        }
      });
    } catch (e) {
      console.warn('[Supabase] Auth update user metadata warning:', e);
    }

    saveProfileToSupabase(updatedUser.uid, toUserProfile(updatedUser)).catch(e => {
      console.warn('[Supabase] Profile update sync warning:', e);
    });
  }

  return updatedUser;
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

/**
 * Subscribe to authentication state changes with Supabase listener
 */
export function onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
  // Attach Supabase auth listener if configured
  if (!isSupabaseListenerAttached) {
    const supabase = getSupabaseClient();
    if (supabase) {
      isSupabaseListenerAttached = true;

      // 1. Check existing Supabase session immediately (e.g. after OAuth redirect or reload)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const authUser = supabaseUserToAuthUser(session.user);
          syncAccountToLocal(authUser);
        }
      }).catch(err => {
        console.warn('[Supabase] Initial session fetch notice:', err);
      });

      // 2. Listen to Supabase auth state transitions
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const authUser = supabaseUserToAuthUser(session.user);
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
export function setupRecaptchaVerifier(_containerId: string = 'tripverse-recaptcha-container'): any {
  return null;
}

let lastSmsDispatchedPhone: string | null = null;
let activePhonePendingPhone: string | null = null;

/**
 * Send real SMS verification code via Fast2SMS Gateway or Supabase Phone Auth.
 * NO MOCK VERIFICATION: Dispatches genuine carrier SMS to the user's mobile device.
 */
export async function sendPhoneOtp(
  rawPhoneNumber: string,
  _containerId: string = 'tripverse-recaptcha-container'
): Promise<{ provider: 'fast2sms' | 'supabase'; message: string }> {
  let clean = rawPhoneNumber.trim().replace(/[\s-()]/g, '');
  if (!clean.startsWith('+')) {
    if (clean.length === 10) {
      clean = `+91${clean}`;
    } else {
      clean = `+${clean}`;
    }
  }

  const isIndianNumber = clean.startsWith('+91') || clean.replace(/\D/g, '').length === 10;
  const fast2SmsKey = getFast2SmsApiKey();
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  let lastFast2SmsError = '';

  // 1. Fast2SMS Gateway for Indian numbers (+91)
  if (isIndianNumber && fast2SmsKey) {
    try {
      const res = await sendRealSmsOtp(clean, code);
      if (res.success) {
        lastSmsDispatchedPhone = clean;
        activePhonePendingPhone = clean;
        console.log(`[Fast2SMS] Real SMS dispatched to ${clean}. Request ID: ${res.requestId}`);
        return {
          provider: 'fast2sms',
          message: res.message || `Real SMS verification code dispatched to ${clean}.`
        };
      }
      lastFast2SmsError = res.message;
      console.warn('[Fast2SMS] Gateway error:', res.message);
    } catch (e: any) {
      lastFast2SmsError = e.message;
      console.warn('[Fast2SMS] Dispatch error:', e.message);
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

  // NO MOCK VERIFICATION: Throw genuine carrier or provider error
  const failureReason = lastFast2SmsError || lastSupabaseError || 'Unable to dispatch SMS to carrier. Please check your mobile number or verify with Email & Password.';
  throw new Error(failureReason);
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

  // 1. Verify genuine Fast2SMS carrier pending session if active
  const pendingSession = getPendingSmsSession();
  if (pendingSession) {
    const verification = verifyRealSmsOtp(targetPhone || pendingSession.phoneNumber, cleanCode);
    if (!verification.success) {
      throw new Error(verification.error || 'Incorrect verification code. Please check your SMS.');
    }

    const cleanPhone = pendingSession.phoneNumber || targetPhone;
    const finalName = (displayName || '').trim() || `Explorer (${cleanPhone.slice(-4)})`;
    const uid = toDeterministicUuid('phone:' + cleanPhone.replace(/\D/g, ''));

    const newUser: AuthUser = {
      uid,
      email: '',
      phoneNumber: cleanPhone,
      displayName: finalName,
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(finalName)}&backgroundColor=2D5A3D,0B2545`,
      travelerStyle: travelerStyle || 'Budget explorer',
      travelStyleTag: 'Phone Verified Explorer',
      location: location || 'India',
      occupation: 'Explorer',
      age: 25,
      emailVerified: false,
      provider: 'phone',
      createdAt: now,
      lastLoginAt: now,
      savedPlaceIds: []
    };

    // Save profile to Supabase PostgreSQL database
    const supabase = getSupabaseClient();
    if (supabase) {
      saveProfileToSupabase(uid, toUserProfile(newUser)).catch(() => {});
    }

    syncAccountToLocal(newUser);
    lastSmsDispatchedPhone = null;
    activePhonePendingPhone = null;
    return newUser;
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
  return activePhonePendingPhone !== null || getPendingSmsSession() !== null;
}

/**
 * Clear any active phone authentication session
 */
export function clearPhoneAuthSession(): void {
  lastSmsDispatchedPhone = null;
  activePhonePendingPhone = null;
  clearPendingSmsSession();
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

  if (message.includes('invalid-phone-number') || message.includes('format')) {
    return 'The phone number format is invalid. Please enter a valid mobile number with country code (e.g. +91 9876543210).';
  }

  if (message.includes('expired')) {
    return 'Verification code has expired. Please tap "Resend SMS" to get a fresh code.';
  }

  if (message.includes('Incorrect') || message.includes('invalid')) {
    return 'Incorrect verification code. Please check the 6-digit code received on your phone and try again.';
  }

  return message || 'Phone authentication failed. Please try again.';
}

/**
 * Convert AuthUser to UserProfile
 */
export function toUserProfile(user: AuthUser): UserProfile {
  return {
    name: user.displayName,
    age: user.age,
    occupation: user.occupation,
    location: user.location,
    email: user.email,
    phoneNumber: user.phoneNumber,
    avatar: user.photoURL,
    travelerStyle: user.travelerStyle,
    travelStyleTag: user.travelStyleTag,
    budgetPreference: 'Balanced & Value-Focused',
    foodPreference: 'Authentic Local & Hygienic Stops',
    accommodationPreference: 'Boutique Stays & Clean Hotels',
    savedPlaceIds: user.savedPlaceIds || [],
    tripsCount: 0
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

  if (!user) {
    // Guest user quota stored locally
    let guestTrips = 3;
    let guestMinutes = 30;
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

    const hours = Math.floor(guestMinutes / 60);
    const mins = guestMinutes % 60;
    const weeklyQuotaHoursFormatted = `${hours}h ${mins.toString().padStart(2, '0')}m`;

    return {
      tier: 'free',
      isPro: false,
      freeTripsRemaining: Math.max(0, guestTrips),
      freeTripsTotal: 3,
      canCreateTrip: guestTrips > 0,
      weeklyAssistantMinutesRemaining: Math.max(0, guestMinutes),
      weeklyAssistantMinutesTotal: 30,
      weeklyQuotaHoursFormatted
    };
  }

  // Logged-in user
  let isPro = user.subscriptionTier === 'pro';
  if (isPro && user.subscriptionExpiresAt) {
    const expiresMs = new Date(user.subscriptionExpiresAt).getTime();
    if (!isNaN(expiresMs) && Date.now() > expiresMs) {
      isPro = false;
      updateAuthProfile({ subscriptionTier: 'free' }).catch(() => {});
    }
  }

  const freeTripsRemaining = typeof user.freeTripsRemaining === 'number' ? user.freeTripsRemaining : 3;
  const assistantMinutes = typeof user.weeklyAssistantMinutesRemaining === 'number'
    ? user.weeklyAssistantMinutesRemaining
    : (isPro ? 1800 : 30);

  const hours = Math.floor(assistantMinutes / 60);
  const mins = assistantMinutes % 60;
  const weeklyQuotaHoursFormatted = `${hours}h ${mins.toString().padStart(2, '0')}m`;

  return {
    tier: isPro ? 'pro' : 'free',
    isPro,
    freeTripsRemaining: isPro ? 9999 : Math.max(0, freeTripsRemaining),
    freeTripsTotal: 3,
    canCreateTrip: isPro || freeTripsRemaining > 0,
    weeklyAssistantMinutesRemaining: assistantMinutes,
    weeklyAssistantMinutesTotal: isPro ? 1800 : 30, // 30 hours per week = 1800 mins
    weeklyQuotaHoursFormatted,
    subscriptionExpiresAt: user.subscriptionExpiresAt
  };
}

export function consumeTripCredit(userParam?: AuthUser | null): { allowed: boolean; remaining: number } {
  const user = userParam !== undefined ? userParam : getCurrentUser();

  if (!user) {
    // Guest credit consumption
    let guestTrips = 3;
    let guestMinutes = 30;
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

    if (guestTrips <= 0) {
      return { allowed: false, remaining: 0 };
    }

    const nextTrips = Math.max(0, guestTrips - 1);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GUEST_QUOTA_STORAGE_KEY, JSON.stringify({
          freeTripsRemaining: nextTrips,
          weeklyAssistantMinutesRemaining: guestMinutes
        }));
      }
    } catch {}

    window.dispatchEvent(new CustomEvent('tripverse_quota_updated', { detail: { remaining: nextTrips } }));
    return { allowed: true, remaining: nextTrips };
  }

  // If user is Pro, unlimited trips!
  if (user.subscriptionTier === 'pro') {
    return { allowed: true, remaining: 9999 };
  }

  // Free tier registered user
  const currentRemaining = typeof user.freeTripsRemaining === 'number' ? user.freeTripsRemaining : 3;
  if (currentRemaining <= 0) {
    return { allowed: false, remaining: 0 };
  }

  const newRemaining = Math.max(0, currentRemaining - 1);
  updateAuthProfile({ freeTripsRemaining: newRemaining }).catch(() => {});
  window.dispatchEvent(new CustomEvent('tripverse_quota_updated', { detail: { remaining: newRemaining } }));
  return { allowed: true, remaining: newRemaining };
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

  window.dispatchEvent(new CustomEvent('tripverse_quota_updated', { detail: { isPro: true, user: updated } }));
  return updated;
}

export async function downgradeUserToFree(userParam?: AuthUser | null): Promise<AuthUser | null> {
  const user = userParam !== undefined ? userParam : getCurrentUser();
  if (!user) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(GUEST_QUOTA_STORAGE_KEY);
      }
    } catch {}
    window.dispatchEvent(new CustomEvent('tripverse_quota_updated', { detail: { isPro: false } }));
    return null;
  }
  const updated = await updateAuthProfile({
    subscriptionTier: 'free',
    freeTripsRemaining: 3,
    weeklyAssistantMinutesRemaining: 30,
    subscriptionExpiresAt: undefined
  });
  window.dispatchEvent(new CustomEvent('tripverse_quota_updated', { detail: { isPro: false, user: updated } }));
  return updated;
}

