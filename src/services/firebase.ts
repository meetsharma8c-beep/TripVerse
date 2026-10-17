import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut as fbSignOut, 
  Auth, 
  UserCredential 
} from 'firebase/auth';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

const STORAGE_KEY = 'tripverse_firebase_config_v1';

/**
 * Retrieve active Firebase credentials from environment or runtime localStorage
 */
export function getStoredFirebaseConfig(): FirebaseConfig | null {
  // 1. Try Vite environment variables first
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (
    apiKey && 
    projectId && 
    !apiKey.includes('your-api-key') && 
    apiKey.trim().length > 10
  ) {
    return {
      apiKey: apiKey.trim(),
      authDomain: authDomain?.trim() || `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
      appId: appId?.trim() || ''
    };
  }

  // 2. Try localStorage for dynamic credentials entered in client UI
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

export function saveFirebaseConfig(config: FirebaseConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    cachedApp = null;
    cachedAuth = null;
    window.dispatchEvent(new CustomEvent('tripverse_firebase_config_updated'));
  }
}

export function removeFirebaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    cachedApp = null;
    cachedAuth = null;
    window.dispatchEvent(new CustomEvent('tripverse_firebase_config_updated'));
  }
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedGoogleProvider: GoogleAuthProvider | null = null;

/**
 * Initialize or retrieve the active Firebase App singleton
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (cachedApp) return cachedApp;

  const config = getStoredFirebaseConfig();
  if (!config) return null;

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      cachedApp = getApp();
    } else {
      cachedApp = initializeApp(config);
    }
    return cachedApp;
  } catch (err) {
    console.error('[Firebase] Failed to initialize Firebase App:', err);
    return null;
  }
}

/**
 * Initialize or retrieve the active Firebase Auth singleton
 */
export function getFirebaseAuth(): Auth | null {
  if (cachedAuth) return cachedAuth;

  const app = getFirebaseApp();
  if (!app) return null;

  try {
    cachedAuth = getAuth(app);
    return cachedAuth;
  } catch (err) {
    console.error('[Firebase] Failed to initialize Firebase Auth:', err);
    return null;
  }
}

/**
 * Returns a configured GoogleAuthProvider singleton with standard scopes
 */
export function getGoogleAuthProvider(): GoogleAuthProvider {
  if (!cachedGoogleProvider) {
    cachedGoogleProvider = new GoogleAuthProvider();
    cachedGoogleProvider.addScope('email');
    cachedGoogleProvider.addScope('profile');
    cachedGoogleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  }
  return cachedGoogleProvider;
}

export function isFirebaseConfigured(): boolean {
  return getStoredFirebaseConfig() !== null;
}

/**
 * Sign in using Firebase Google Auth with Popup
 */
export async function signInWithFirebaseGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Authentication is not configured yet. Please provide your Firebase API key and Project ID in .env or Settings.');
  }

  const provider = getGoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

/**
 * Sign in using Firebase Google Auth with Redirect (useful for mobile browsers)
 */
export async function signInWithFirebaseGoogleRedirect(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Authentication is not configured.');
  }
  const provider = getGoogleAuthProvider();
  return await signInWithRedirect(auth, provider);
}

/**
 * Checks for any pending redirect result after page reload
 */
export async function checkFirebaseRedirectResult(): Promise<UserCredential | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  try {
    return await getRedirectResult(auth);
  } catch (err) {
    console.warn('[Firebase] Redirect result check error:', err);
    return null;
  }
}

/**
 * Sign out of Firebase Auth
 */
export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth && auth.currentUser) {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn('[Firebase] Sign out notice:', err);
    }
  }
}
