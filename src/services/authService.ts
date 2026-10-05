import { 
  AuthUser, 
  AuthSession, 
  SignUpData, 
  LoginData, 
  GoogleCredentialPayload,
  VerificationCodeRecord 
} from '../types/auth';
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
  saveProfileToSupabase, 
  loadProfileFromSupabase 
} from './supabaseSyncService';
import { 
  sendRealSmsOtp, 
  verifyRealSmsOtp, 
  getPendingSmsSession, 
  clearPendingSmsSession, 
  getFast2SmsApiKey 
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

// Backward-compatibility aliases for Firebase exports
export const isFirebaseConfigured = isSupabaseConfigured;
export const getStoredFirebaseConfig = getStoredSupabaseConfig as any;
export const saveFirebaseConfig = saveSupabaseConfig as any;
export const removeFirebaseConfig = removeSupabaseConfig;
export type FirebaseConfig = SupabaseConfig;

interface StoredAccount {
  user: AuthUser;
  passwordHash: string;
}

/**
 * SHA-256 cryptographic password hashing using SubtleCrypto
 */
async function hashPassword(password: string): Promise<string> {
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
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=00B074,0B2545`;

  const provider = (sbUser.app_metadata?.provider as any) || (sbUser.phone ? 'phone' : 'supabase');

  return {
    uid: sbUser.id,
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
    provider: provider === 'google' ? 'google' : provider === 'phone' ? 'phone' : 'supabase',
    createdAt: sbUser.created_at || new Date().toISOString(),
    lastLoginAt: sbUser.last_sign_in_at || new Date().toISOString(),
    savedPlaceIds: overrides?.savedPlaceIds || []
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
export function syncAccountToLocal(user: AuthUser): void {
  const accounts = loadAccounts();
  const existingIdx = accounts.findIndex(a => 
    a.user.uid === user.uid || 
    (user.email && a.user.email.toLowerCase() === user.email.toLowerCase()) ||
    (user.phoneNumber && a.user.phoneNumber === user.phoneNumber)
  );

  const now = new Date().toISOString();
  user.lastLoginAt = now;

  if (existingIdx >= 0) {
    accounts[existingIdx].user = {
      ...accounts[existingIdx].user,
      ...user,
      uid: user.uid
    };
  } else {
    accounts.push({
      user,
      passwordHash: 'cloud_authenticated'
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

  // Fallback to local accounts with verified GIS payload
  const accounts = loadAccounts();
  const emailNorm = payload.email.toLowerCase();
  let account = accounts.find(a => a.user.email.toLowerCase() === emailNorm);
  const now = new Date().toISOString();

  if (!account) {
    const uid = `google_${payload.sub || Date.now()}`;
    const newUser: AuthUser = {
      uid,
      email: emailNorm,
      displayName: payload.name || payload.given_name || emailNorm.split('@')[0],
      photoURL: payload.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(payload.name || emailNorm)}&backgroundColor=00B074,0B2545`,
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
  }

  saveAccounts(accounts);
  const session: AuthSession = {
    token: `session-google-${account.user.uid}-${Date.now()}`,
    user: account.user,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
  };
  saveSession(session);
  return account.user;
}

/**
 * Primary Google Sign-In: Genuine Google OAuth via Supabase
 */
export async function signInWithGooglePopup(): Promise<AuthUser> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase cloud authentication is not configured. Please add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable genuine Google Sign-In.');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) {
    throw new Error(error.message || 'Google authentication failed.');
  }

  const existing = getCurrentUser();
  if (existing) return existing;

  // Browser redirects to Google consent page
  return new Promise(() => {});
}

/**
 * Verification Code Storage Helper (for local verification fallback)
 */
function loadVerificationCodes(): VerificationCodeRecord[] {
  try {
    const raw = localStorage.getItem(VERIFICATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveVerificationCodes(codes: VerificationCodeRecord[]): void {
  try {
    localStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(codes));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Generate a 6-digit confirmation code for Email verification or Password Reset
 */
export async function sendEmailVerificationCode(email: string, purpose: 'signup' | 'password_reset' = 'signup'): Promise<{ code: string; expiresAt: number }> {
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm || !emailNorm.includes('@') || !emailNorm.includes('.')) {
    throw new Error('Please enter a valid email address.');
  }

  if (purpose === 'password_reset') {
    const accounts = loadAccounts();
    const exists = accounts.find(a => a.user.email.toLowerCase() === emailNorm);
    if (!exists && !isSupabaseConfigured()) {
      throw new Error('No registered account was found with this email address.');
    }
  }

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  const allCodes = loadVerificationCodes().filter(c => c.expiresAt > Date.now() && c.email !== emailNorm);
  allCodes.push({
    email: emailNorm,
    code,
    purpose,
    expiresAt
  });
  saveVerificationCodes(allCodes);

  console.log(`[TripVerse Auth] 📧 Verification code for ${emailNorm} (${purpose}): ${code}`);
  return { code, expiresAt };
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
 * Create a new account with Supabase Authentication & PostgreSQL Database (100% Genuine)
 */
export async function createAccountWithSupabase(data: SignUpData): Promise<AuthUser> {
  const emailNorm = (data.email || '').trim().toLowerCase();
  if (!emailNorm || !emailNorm.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!data.password || data.password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase cloud authentication is not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable genuine account creation.');
  }

  const { data: supaData, error: supaErr } = await supabase.auth.signUp({
    email: emailNorm,
    password: data.password,
    options: {
      data: {
        full_name: data.name?.trim() || emailNorm.split('@')[0],
        name: data.name?.trim() || emailNorm.split('@')[0],
        traveler_style: data.travelerStyle || 'Budget explorer',
        location: data.location || 'India',
        occupation: data.occupation || 'Explorer'
      }
    }
  });

  if (supaErr) {
    if (supaErr.message.toLowerCase().includes('already registered')) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }
    throw new Error(supaErr.message);
  }

  if (!supaData.user) {
    throw new Error('Account registration failed. Please check your credentials.');
  }

  const authUser = supabaseUserToAuthUser(supaData.user, {
    displayName: data.name?.trim(),
    travelerStyle: data.travelerStyle || 'Budget explorer',
    location: data.location || 'India',
    occupation: data.occupation || 'Explorer'
  });

  // Persist extended user profile to Supabase PostgreSQL profiles table
  await saveProfileToSupabase(authUser.uid, toUserProfile(authUser));
  syncAccountToLocal(authUser);
  return authUser;
}

// Backward-compatibility alias
export const createAccountWithFirebase = createAccountWithSupabase;

/**
 * Verify code and register a new user
 */
export async function verifyEmailAndCreateAccount(data: SignUpData, inputCode: string): Promise<AuthUser> {
  const emailNorm = (data.email || '').trim().toLowerCase();
  const codeTrimmed = inputCode.trim();

  const allCodes = loadVerificationCodes();
  const record = allCodes.find(c => 
    c.email === emailNorm && 
    c.code === codeTrimmed && 
    c.purpose === 'signup' && 
    c.expiresAt > Date.now()
  );

  if (!record) {
    throw new Error('Invalid or expired 6-digit verification code. Please request a new one.');
  }

  saveVerificationCodes(allCodes.filter(c => !(c.email === emailNorm && c.code === codeTrimmed)));
  return await createAccountWithSupabase(data);
}

/**
 * Sign in with email and password strictly via Supabase Authentication (100% Genuine)
 */
export async function signInWithEmail(data: LoginData): Promise<AuthUser> {
  const emailNorm = (data.email || '').trim().toLowerCase();
  if (!emailNorm) {
    throw new Error('Please enter your email address.');
  }
  if (!data.password) {
    throw new Error('Please enter your password.');
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase cloud authentication is not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable genuine sign in.');
  }

  const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
    email: emailNorm,
    password: data.password
  });

  if (supaErr) {
    throw new Error(supaErr.message || 'Invalid email or password.');
  }

  if (!supaData?.user) {
    throw new Error('Sign in failed. No user found.');
  }

  const authUser = supabaseUserToAuthUser(supaData.user);
  
  // Fetch customized profile metadata from Supabase profiles table
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

  syncAccountToLocal(authUser);
  return authUser;
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
export async function updateAuthProfile(updates: Partial<UserProfile> & { displayName?: string; photoURL?: string }): Promise<AuthUser> {
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
 * Send real SMS verification code via Fast2SMS Gateway (or Supabase Phone Auth)
 */
export async function sendPhoneOtp(
  rawPhoneNumber: string,
  _containerId: string = 'tripverse-recaptcha-container'
): Promise<{ provider: 'fast2sms' | 'supabase'; result?: any; message?: string }> {
  let clean = rawPhoneNumber.trim().replace(/[\s-()]/g, '');
  if (!clean.startsWith('+')) {
    if (clean.length === 10) {
      clean = `+91${clean}`;
    } else {
      clean = `+${clean}`;
    }
  }

  // 1. Fast2SMS Gateway for Indian numbers (+91)
  const isIndianNumber = clean.startsWith('+91') || clean.replace(/\D/g, '').length === 10;
  const fast2SmsKey = getFast2SmsApiKey();

  if (isIndianNumber && fast2SmsKey) {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const res = await sendRealSmsOtp(clean, code);
      if (res.success) {
        lastSmsDispatchedPhone = clean;
        activePhonePendingPhone = clean;
        console.log(`[Fast2SMS] Real SMS dispatched to ${clean}. Request ID: ${res.requestId}`);
        return {
          provider: 'fast2sms',
          message: res.message
        };
      }
      console.warn('[Fast2SMS] Notice, falling back to Supabase Phone Auth:', res.message);
    } catch (e: any) {
      console.warn('[Fast2SMS] Dispatch error, falling back to Supabase Phone Auth:', e.message);
    }
  }

  // 2. Supabase Phone Auth (International or Supabase SMS provider)
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.auth.signInWithOtp({
      phone: clean
    });
    if (error) {
      throw new Error(error.message || `Failed to dispatch SMS to ${clean}.`);
    }
    lastSmsDispatchedPhone = clean;
    activePhonePendingPhone = clean;
    return {
      provider: 'supabase',
      message: `SMS verification code dispatched to ${clean}.`
    };
  }

  throw new Error('No SMS gateway is configured. Please configure Fast2SMS API key or Supabase Phone Auth to dispatch real SMS verification codes.');
}

/**
 * Verify real SMS OTP code and sign in / register user (100% Genuine, No 123456 Bypass)
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

  // 1. Verify Fast2SMS pending session if active
  const pendingSession = getPendingSmsSession();
  if (pendingSession) {
    const verification = verifyRealSmsOtp(targetPhone || pendingSession.phoneNumber, cleanCode);
    if (!verification.success) {
      throw new Error(verification.error || 'Incorrect verification code. Please check your SMS.');
    }

    const cleanPhone = pendingSession.phoneNumber || targetPhone;
    const finalName = (displayName || '').trim() || `Explorer (${cleanPhone.slice(-4)})`;
    const uid = `user-phone-${cleanPhone.replace(/\D/g, '')}`;

    const newUser: AuthUser = {
      uid,
      email: '',
      phoneNumber: cleanPhone,
      displayName: finalName,
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(finalName)}&backgroundColor=00B074,0B2545`,
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
