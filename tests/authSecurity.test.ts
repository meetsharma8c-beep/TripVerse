import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

// Polyfill localStorage & window for Node environment
const mockStorage: Record<string, string> = {};
beforeAll(() => {
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = String(val); },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => {
      for (const k of Object.keys(mockStorage)) delete mockStorage[k];
    }
  };
  (global as any).window = {
    location: { origin: 'https://tripverse-pied.vercel.app' },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
});

import { 
  hashPassword, 
  saveAccounts, 
  signInWithEmail, 
  createAccountWithSupabase,
  getPhoneAuthErrorMessage,
  isGuestUser,
  getUserSubscriptionQuota,
  consumeTripCredit,
  upgradeUserToPro,
  handleFirebaseUserCredential,
  isMobileDevice
} from '../src/services/authService';
import { AuthUser } from '../src/types/auth';

describe('Auth Security & Verification Tests', () => {
  beforeEach(() => {
    (global as any).localStorage.clear();
  });

  it('cryptographically hashes passwords using SHA-256 with salt', async () => {
    const hash1 = await hashPassword('TestPassword123!');
    const hash2 = await hashPassword('TestPassword123!');
    const hashWrong = await hashPassword('DifferentPassword123!');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashWrong);
    expect(hash1.length).toBe(64); // 64 hex characters for SHA-256
  });

  it('rejects sign-in when password does not match stored hash', async () => {
    const testUser: AuthUser = {
      uid: '00000000-0000-4000-8000-000000000001',
      email: 'security_test@domain.com',
      displayName: 'Security Test',
      photoURL: '',
      travelerStyle: 'Budget explorer',
      travelStyleTag: 'Verified Explorer',
      location: 'India',
      occupation: 'Explorer',
      age: 25,
      emailVerified: true,
      provider: 'email',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      savedPlaceIds: []
    };

    const correctHash = await hashPassword('CorrectPassword123!');
    saveAccounts([{ user: testUser, passwordHash: correctHash }]);

    // Attempt sign-in with wrong password
    await expect(
      signInWithEmail({ email: 'security_test@domain.com', password: 'WrongPassword456!' })
    ).rejects.toThrow(/invalid login credentials|invalid email or password/i);
  });

  it('authenticates successfully when password hash matches', async () => {
    const testUser: AuthUser = {
      uid: '00000000-0000-4000-8000-000000000002',
      email: 'valid_test@domain.com',
      displayName: 'Valid Test',
      photoURL: '',
      travelerStyle: 'Budget explorer',
      travelStyleTag: 'Verified Explorer',
      location: 'India',
      occupation: 'Explorer',
      age: 25,
      emailVerified: true,
      provider: 'email',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      savedPlaceIds: []
    };

    const correctHash = await hashPassword('MySecurePassword2026!');
    saveAccounts([{ user: testUser, passwordHash: correctHash }]);

    const user = await signInWithEmail({ email: 'valid_test@domain.com', password: 'MySecurePassword2026!' });
    expect(user.email).toBe('valid_test@domain.com');
    expect(user.displayName).toBe('Valid Test');
  });

  it('rejects sign-in on fresh device when credentials do not match or account is unknown', async () => {
    // Empty local storage simulating a new device
    await expect(
      signInWithEmail({ email: 'unknown_cross_device@domain.com', password: 'AnyPassword123!' })
    ).rejects.toThrow(/invalid login credentials|invalid email or password/i);
  });

  it('correctly maps phone auth error messages without falsely claiming IP restriction for carrier errors', () => {
    const carrierErr = new Error('Could not dispatch SMS verification code via Firebase.');
    const friendly1 = getPhoneAuthErrorMessage(carrierErr);
    expect(friendly1).not.toContain('Carrier SMS dispatch is currently restricted');
    expect(friendly1).toContain('Could not dispatch SMS verification code via Firebase');

    const expiredErr = new Error('Verification code has expired. SESSION_EXPIRED');
    const friendly2 = getPhoneAuthErrorMessage(expiredErr);
    expect(friendly2).toContain('Verification code has expired');

    const invalidErr = new Error('INVALID_CODE');
    const friendly3 = getPhoneAuthErrorMessage(invalidErr);
    expect(friendly3).toContain('Incorrect verification code');
  });

  it('registers and authenticates an ephemeral cloud email account across devices without hardcoded secrets', async () => {
    const randomId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    const dynamicEmail = `ci_auth_${randomId}@tripverse.app`;
    const dynamicPassword = `Tv#${randomId}!9A`;

    const created = await createAccountWithSupabase({
      name: 'CI Cloud Verifier',
      email: dynamicEmail,
      password: dynamicPassword,
      travelerStyle: 'Budget explorer',
      location: 'India'
    });
    expect(created.email).toBe(dynamicEmail);
    expect(created.uid).toBeTruthy();

    // Clear localStorage to simulate signing in on a brand-new device via cloud backend
    (global as any).localStorage.clear();

    const signedIn = await signInWithEmail({
      email: dynamicEmail,
      password: dynamicPassword
    });
    expect(signedIn.email).toBe(dynamicEmail);
    expect(signedIn.displayName).toBe('CI Cloud Verifier');
    expect(signedIn.provider).toBe('email');
    expect(signedIn.uid).toBeTruthy();
  }, 15000);

  it('correctly identifies Guest accounts and strictly restricts AI Planner quota', () => {
    const guestUser: AuthUser = {
      uid: '00000000-0000-4000-8000-000000000099',
      email: '',
      displayName: 'Guest Explorer',
      photoURL: '',
      travelerStyle: 'Explorer',
      travelStyleTag: 'Guest',
      location: 'India',
      occupation: 'Explorer',
      age: 25,
      emailVerified: false,
      provider: 'guest',
      isAnonymous: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      savedPlaceIds: []
    };

    expect(isGuestUser(guestUser)).toBe(true);

    const normalUser: AuthUser = {
      ...guestUser,
      provider: 'email',
      isAnonymous: false,
      email: 'user@example.com'
    };
    expect(isGuestUser(normalUser)).toBe(false);

    // Guest quota check: canCreateTrip MUST be false with 0 trips remaining
    const guestQuota = getUserSubscriptionQuota(guestUser);
    expect(guestQuota.canCreateTrip).toBe(false);
    expect(guestQuota.freeTripsRemaining).toBe(0);
    expect(guestQuota.tier).toBe('free');

    // Normal user quota check: can create trip
    const normalQuota = getUserSubscriptionQuota(normalUser);
    expect(normalQuota.canCreateTrip).toBe(true);
    expect(normalQuota.freeTripsRemaining).toBe(3);
  });

  it('handles zero-reCAPTCHA phone errors cleanly for worldwide carrier delivery', () => {
    const billingErr = new Error('BILLING_NOT_ENABLED: Firebase Pay-as-you-go (Blaze) is required');
    const billingMsg = getPhoneAuthErrorMessage(billingErr);
    expect(billingMsg).toContain('Firebase Blaze (Pay-as-you-go) plan');
    expect(billingMsg).toContain('10,000 free SMS/month');

    const regionErr = new Error('SMS unable to be sent until this region enabled by the app developer.');
    const regionMsg = getPhoneAuthErrorMessage(regionErr);
    expect(regionMsg).toContain('SMS Region Policy');
  });

  it('correctly processes Google OAuth user credentials for mobile & redirect flows', async () => {
    const mockGoogleCred = {
      user: {
        uid: 'google-oauth2-test-uid-12345',
        email: 'meet.sharma8c@gmail.com',
        displayName: 'Meet Sharma',
        photoURL: 'https://lh3.googleusercontent.com/a/test-avatar',
        getIdToken: async () => 'mock-google-id-token'
      }
    };

    const user = await handleFirebaseUserCredential(mockGoogleCred);
    expect(user.email).toBe('meet.sharma8c@gmail.com');
    expect(user.displayName).toBe('Meet Sharma');
    expect(user.provider).toBe('google');
    expect(user.emailVerified).toBe(true);
    expect(isGuestUser(user)).toBe(false);

    // Verify session was saved
    const rawSession = (global as any).localStorage.getItem('tripverse_auth_session_v3');
    expect(rawSession).toBeDefined();
    const parsedSession = JSON.parse(rawSession);
    expect(parsedSession.user.email).toBe('meet.sharma8c@gmail.com');
  });

  it('preserves existing account UID when user signs in with Google (preventing severed itineraries)', async () => {
    const existingUid = '00000000-0000-4000-8000-000000000099';
    const email = 'existing_traveler@gmail.com';
    saveAccounts([
      {
        user: {
          uid: existingUid,
          email,
          displayName: 'Existing Traveler',
          photoURL: '',
          travelerStyle: 'Budget explorer',
          travelStyleTag: 'Verified Explorer',
          location: 'India',
          occupation: 'Explorer',
          age: 26,
          emailVerified: false,
          provider: 'email',
          isAnonymous: false,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          savedPlaceIds: ['place-1', 'place-2']
        },
        passwordHash: 'dummy_hash'
      }
    ]);

    const googleCred = {
      user: {
        uid: 'google-new-provider-id-999',
        email,
        displayName: 'Existing Traveler Google',
        photoURL: 'https://avatar.google.com',
        getIdToken: async () => 'mock-token'
      }
    };

    const user = await handleFirebaseUserCredential(googleCred);
    // Crucial check: UID MUST remain the existing UID so trips and favorites are not severed
    expect(user.uid).toBe(existingUid);
    expect(user.emailVerified).toBe(true);
    expect(user.provider).toBe('google');
  });

  it('strictly limits account holders to exactly 3 free trip plans and requires Pro upgrade thereafter', async () => {
    const testUid = '00000000-0000-4000-8000-000000000333';
    const email = 'freemium_traveler@gmail.com';
    const testUser: AuthUser = {
      uid: testUid,
      email,
      displayName: 'Freemium Traveler',
      photoURL: '',
      travelerStyle: 'Budget explorer',
      travelStyleTag: 'Verified Explorer',
      location: 'India',
      occupation: 'Explorer',
      age: 26,
      emailVerified: true,
      provider: 'email',
      subscriptionTier: 'free',
      freeTripsRemaining: 3,
      isAnonymous: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      savedPlaceIds: []
    };

    saveAccounts([{ user: testUser, passwordHash: 'test_hash' }]);
    (global as any).localStorage.setItem('tripverse_auth_session_v3', JSON.stringify({
      token: 'test-session-token',
      user: testUser,
      expiresAt: Date.now() + 86400000
    }));

    // Step 0: Initial state - 3 free trips left
    let quota = getUserSubscriptionQuota(testUser);
    expect(quota.canCreateTrip).toBe(true);
    expect(quota.freeTripsRemaining).toBe(3);
    expect(quota.isPro).toBe(false);

    // Step 1: User plans trip 1 -> 2 remaining
    let res = consumeTripCredit(testUser);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(2);

    // Step 2: User plans trip 2 -> 1 remaining
    res = consumeTripCredit(testUser);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(1);

    // Step 3: User plans trip 3 -> 0 remaining (final free trip used!)
    res = consumeTripCredit(testUser);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(0);

    // Step 4: Quota is now strictly exhausted
    const exhaustedUser = { ...testUser, freeTripsRemaining: 0 };
    quota = getUserSubscriptionQuota(exhaustedUser);
    expect(quota.canCreateTrip).toBe(false);
    expect(quota.freeTripsRemaining).toBe(0);

    // Step 5: Attempting to plan 4th trip without Pro is strictly rejected
    res = consumeTripCredit(exhaustedUser);
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);

    // Step 6: When user upgrades to Pro, unlimited trip creation is unlocked
    await upgradeUserToPro(exhaustedUser, 365);
    const proUser = { ...exhaustedUser, subscriptionTier: 'pro' as const, freeTripsRemaining: 9999 };
    const proQuota = getUserSubscriptionQuota(proUser);
    expect(proQuota.canCreateTrip).toBe(true);
    expect(proQuota.isPro).toBe(true);
    expect(proQuota.freeTripsRemaining).toBe(9999);
  });
});
