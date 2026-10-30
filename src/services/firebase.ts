import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut as fbSignOut, 
  Auth, 
  UserCredential,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
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

let activeConfirmationResult: ConfirmationResult | null = null;
let activeRecaptchaVerifier: RecaptchaVerifier | null = null;
let activeRestSessionInfo: string | null = null;
let activeTargetPhone: string | null = null;

export function getRecaptchaVerifier(containerId: string = 'tripverse-recaptcha-container'): RecaptchaVerifier | null {
  if (typeof window === 'undefined') return null;
  const auth = getFirebaseAuth();
  if (!auth) return null;

  try {
    const el = document.getElementById(containerId);
    if (!el) return null;

    if (activeRecaptchaVerifier) {
      try {
        activeRecaptchaVerifier.clear();
      } catch {}
      activeRecaptchaVerifier = null;
    }

    activeRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible'
    });
    return activeRecaptchaVerifier;
  } catch (err) {
    console.warn('[Firebase] RecaptchaVerifier setup notice:', err);
    return null;
  }
}

/**
 * Dispatch Firebase SMS verification code via REST API (bypassing reCAPTCHA stalls) or Client SDK
 */
export async function sendFirebasePhoneOtp(
  phoneNumber: string, 
  containerId: string = 'tripverse-recaptcha-container'
): Promise<ConfirmationResult> {
  const config = getStoredFirebaseConfig();
  if (!config?.apiKey) {
    throw new Error('Firebase Authentication is not configured.');
  }

  activeTargetPhone = phoneNumber;

  // 1. For test phone numbers or when reCAPTCHA challenges may stall, use Google Identity Toolkit REST API
  const cleanDigits = phoneNumber.replace(/\D/g, '');
  const isConfiguredTestNumber = cleanDigits.endsWith('9904717666');

  if (isConfiguredTestNumber) {
    try {
      const restRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber })
        }
      );
      const restData = await restRes.json();
      if (restRes.ok && restData.sessionInfo) {
        activeRestSessionInfo = restData.sessionInfo;
        const confirmationMock: ConfirmationResult = {
          verificationId: restData.sessionInfo,
          confirm: async (code: string) => await confirmFirebasePhoneOtp(code)
        };
        activeConfirmationResult = confirmationMock;
        return confirmationMock;
      }
    } catch (restErr) {
      console.warn('[Firebase Phone] REST dispatch fallback notice:', restErr);
    }
  }

  // 2. Client SDK with invisible RecaptchaVerifier
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Authentication is not configured.');
  }

  const verifier = getRecaptchaVerifier(containerId);
  if (!verifier) {
    // If DOM container is missing, try REST API directly
    const directRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      }
    );
    const directData = await directRes.json();
    if (directRes.ok && directData.sessionInfo) {
      activeRestSessionInfo = directData.sessionInfo;
      const confirmationMock: ConfirmationResult = {
        verificationId: directData.sessionInfo,
        confirm: async (code: string) => await confirmFirebasePhoneOtp(code)
      };
      activeConfirmationResult = confirmationMock;
      return confirmationMock;
    }
    throw new Error('Could not initialize verification for mobile number.');
  }

  try {
    const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    activeConfirmationResult = confirmation;
    return confirmation;
  } catch (err: any) {
    // If Client SDK fails (e.g. reCAPTCHA challenge timeout or domain mismatch), attempt REST endpoint
    try {
      const fallbackRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber })
        }
      );
      const fallbackData = await fallbackRes.json();
      if (fallbackRes.ok && fallbackData.sessionInfo) {
        activeRestSessionInfo = fallbackData.sessionInfo;
        const confirmationMock: ConfirmationResult = {
          verificationId: fallbackData.sessionInfo,
          confirm: async (code: string) => await confirmFirebasePhoneOtp(code)
        };
        activeConfirmationResult = confirmationMock;
        return confirmationMock;
      }
    } catch {}

    throw err;
  }
}

/**
 * Confirm Firebase SMS verification code
 */
export async function confirmFirebasePhoneOtp(code: string): Promise<UserCredential> {
  const config = getStoredFirebaseConfig();

  // If session was initialized via Identity Toolkit REST
  if (activeRestSessionInfo && config?.apiKey) {
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionInfo: activeRestSessionInfo,
          code
        })
      }
    );
    const data = await verifyRes.json();
    if (!verifyRes.ok) {
      const errMsg = data.error?.message || '';
      if (errMsg.includes('INVALID_CODE')) {
        throw new Error('Incorrect verification code. Please check the 6-digit code received on your phone and try again.');
      }
      if (errMsg.includes('SESSION_EXPIRED')) {
        throw new Error('Verification session has expired. Please request a fresh code.');
      }
      throw new Error(data.error?.message || 'Verification failed. Please check your code.');
    }

    return {
      user: {
        uid: data.localId,
        phoneNumber: data.phoneNumber || activeTargetPhone,
        email: data.email || null,
        emailVerified: false,
        displayName: null,
        photoURL: null,
        getIdToken: async () => data.idToken
      },
      providerId: 'phone',
      operationType: 'signIn'
    } as unknown as UserCredential;
  }

  if (!activeConfirmationResult) {
    throw new Error('No pending SMS verification. Please request a new code.');
  }
  return await activeConfirmationResult.confirm(code);
}

export function clearFirebasePhoneSession(): void {
  activeConfirmationResult = null;
  activeRestSessionInfo = null;
  activeTargetPhone = null;
  if (activeRecaptchaVerifier) {
    try {
      activeRecaptchaVerifier.clear();
    } catch {}
    activeRecaptchaVerifier = null;
  }
}

export async function createAccountWithFirebaseEmail(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth not configured.');
  return await createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithFirebaseEmailAuth(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth not configured.');
  return await signInWithEmailAndPassword(auth, email, password);
}
export type { ConfirmationResult };

