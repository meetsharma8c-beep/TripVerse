import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { getSupabaseClient } from '../src/services/supabase';

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
  downgradeUserToFree,
  handleFirebaseUserCredential,
  isMobileDevice,
  shouldPreferGoogleRedirect,
  verifyEmailCredentialsOnly,
  finalizeTwoFactorLogin,
  clearActiveSession,
  getCurrentUser,
  parseGoogleUserFromCredential,
  isGoogleUser2FaEnabled,
  parseGoogleAuthResult,
  toggleUserTwoFactor,
  sendTwoFactorOtp,
  verifyTwoFactorOtp,
  sendPasswordResetCode,
  updateUserPassword,
  resetPasswordWithEmailOtp
} from '../src/services/authService';
import { resolveRouteFromBrowser } from '../src/utils/routeResolver';
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
    const dynamicEmail = `ci_auth_${randomId}@example.com`;
    const dynamicPassword = `Tv#${randomId}!9A`;

    const supabase = getSupabaseClient();
    const mockUser = {
      id: `00000000-0000-4000-8000-${randomId.padEnd(12, '0').slice(0, 12)}`,
      email: dynamicEmail,
      user_metadata: {
        name: 'CI Cloud Verifier',
        full_name: 'CI Cloud Verifier',
        traveler_style: 'Budget explorer',
        location: 'India'
      },
      created_at: new Date().toISOString()
    };

    let signUpSpy: any;
    let signInSpy: any;
    if (supabase) {
      signUpSpy = vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
        data: { user: mockUser as any, session: { access_token: 'mock-session-token', user: mockUser } as any },
        error: null
      });
      signInSpy = vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
        data: { user: mockUser as any, session: { access_token: 'mock-session-token', user: mockUser } as any },
        error: null
      });
    }

    try {
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
    } finally {
      signUpSpy?.mockRestore();
      signInSpy?.mockRestore();
    }
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

    // Step 5b: Deleting trips from local list cannot bypass 3-trip lifetime allowance
    (global as any).localStorage.setItem(`tripverse_trips_u_${testUser.uid}`, JSON.stringify([]));
    const deleteBypassCheck = getUserSubscriptionQuota(exhaustedUser);
    expect(deleteBypassCheck.canCreateTrip).toBe(false);
    expect(deleteBypassCheck.freeTripsRemaining).toBe(0);

    // Step 6: When user upgrades to Pro, unlimited trip creation is unlocked
    await upgradeUserToPro(exhaustedUser, 365);
    const proUser = { ...exhaustedUser, subscriptionTier: 'pro' as const, freeTripsRemaining: 9999 };
    const proQuota = getUserSubscriptionQuota(proUser);
    expect(proQuota.canCreateTrip).toBe(true);
    expect(proQuota.isPro).toBe(true);
    expect(proQuota.freeTripsRemaining).toBe(9999);

    // Step 7: STRICT OPTION A: Downgrading from Pro keeps quota strictly exhausted (0 remaining, not reset to 3)
    await downgradeUserToFree(proUser);
    const postDowngradeQuota = getUserSubscriptionQuota(proUser);
    expect(postDowngradeQuota.canCreateTrip).toBe(false);
    expect(postDowngradeQuota.freeTripsRemaining).toBe(0);

    // Step 8: STRICT OPTION A: Cross-session check with same email keeps quota exhausted even without local UID state
    const freshSessionUser: AuthUser = {
      ...testUser,
      uid: 'fresh-session-uid-999',
      freeTripsRemaining: 3 // attempting default 3
    };
    const crossSessionQuota = getUserSubscriptionQuota(freshSessionUser);
    expect(crossSessionQuota.canCreateTrip).toBe(false);
    expect(crossSessionQuota.freeTripsRemaining).toBe(0);
  });

  describe('Automated Google Auth Zero-DOM Redirect Detection', () => {
    const originalNavigator = (global as any).window?.navigator;
    const originalInnerWidth = (global as any).window?.innerWidth;

    beforeEach(() => {
      (global as any).window = (global as any).window || {};
    });

    it('automatically prefers redirect for iOS devices (iPhone/iPad) to prevent popup blocking', () => {
      (global as any).window.navigator = {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5
      };
      expect(shouldPreferGoogleRedirect()).toBe(true);
    });

    it('automatically prefers redirect for in-app WebViews (Instagram, Facebook, etc.)', () => {
      (global as any).window.navigator = {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 280.0.0.18.112',
        platform: 'iPhone',
        maxTouchPoints: 5
      };
      expect(shouldPreferGoogleRedirect()).toBe(true);
    });

    it('automatically prefers redirect for Standalone PWA mode', () => {
      (global as any).window.navigator = {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 0,
        standalone: true
      };
      expect(shouldPreferGoogleRedirect()).toBe(true);
    });

    it('allows standard popup on desktop browsers with wide screens', () => {
      (global as any).window.navigator = {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        maxTouchPoints: 0
      };
      (global as any).window.innerWidth = 1440;
      expect(shouldPreferGoogleRedirect()).toBe(false);
    });
  });

  describe('Two-Factor Authentication (2FA) Security Architecture', () => {
    it('verifyEmailCredentialsOnly verifies password without activating session (Factor 1)', async () => {
      const testUser: AuthUser = {
        uid: '00000000-0000-4000-8000-000000000099',
        email: 'twofa_test@domain.com',
        displayName: 'Two Factor Test',
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

      const correctHash = await hashPassword('SecretTwoFaPass2026!');
      saveAccounts([{ user: testUser, passwordHash: correctHash }]);

      // Factor 1 credential verification
      const result = await verifyEmailCredentialsOnly({
        email: 'twofa_test@domain.com',
        password: 'SecretTwoFaPass2026!'
      });

      expect(result.user.email).toBe('twofa_test@domain.com');
      expect(result.passwordHash).toBe(correctHash);

      // Session MUST NOT be stored before Factor 2 is completed
      expect((global as any).localStorage.getItem('tripverse_auth_session_v3')).toBeNull();
    });

    it('verifyEmailCredentialsOnly rejects invalid password during Factor 1', async () => {
      const testUser: AuthUser = {
        uid: '00000000-0000-4000-8000-000000000098',
        email: 'twofa_fail@domain.com',
        displayName: 'Fail Test',
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

      const correctHash = await hashPassword('RealPassword999!');
      saveAccounts([{ user: testUser, passwordHash: correctHash }]);

      await expect(
        verifyEmailCredentialsOnly({ email: 'twofa_fail@domain.com', password: 'IncorrectPassword' })
      ).rejects.toThrow(/invalid login credentials|invalid email or password/i);
    });

    it('finalizeTwoFactorLogin activates authenticated session upon Factor 2 completion', () => {
      const testUser: AuthUser = {
        uid: '00000000-0000-4000-8000-000000000097',
        email: 'finalized_2fa@domain.com',
        displayName: 'Finalized User',
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

      finalizeTwoFactorLogin(testUser, 'oauth_2fa_verified');

      const rawSession = (global as any).localStorage.getItem('tripverse_auth_session_v3');
      expect(rawSession).not.toBeNull();
      const session = JSON.parse(rawSession!);
      expect(session.user.email).toBe('finalized_2fa@domain.com');
    });

    it('parseGoogleUserFromCredential extracts Google user profile without storing session', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        email: 'google_explorer@gmail.com',
        name: 'Google Explorer',
        sub: 'google_sub_123456789',
        picture: 'https://lh3.googleusercontent.com/test',
        email_verified: true
      })).toString('base64url');
      const mockJwt = `${header}.${payload}.mockSignature`;

      const user = parseGoogleUserFromCredential(mockJwt);
      expect(user.email).toBe('google_explorer@gmail.com');
      expect(user.displayName).toBe('Google Explorer');
      expect(user.provider).toBe('google');

      // Session must remain empty until 2FA completes
      expect((global as any).localStorage.getItem('tripverse_auth_session_v3')).toBeNull();
    });

    it('sendTwoFactorOtp dispatches 6-digit OTP code and receives verification token', async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => ({
        ok: true,
        json: async () => ({
          success: true,
          token: '1700000000.signature_hash_test',
          expiresAt: Date.now() + 600000,
          devCode: '852963',
          message: 'Code dispatched.'
        })
      }) as any;

      try {
        const result = await sendTwoFactorOtp('meet.sharma8c@gmail.com', 'Meet');
        expect(result.success).toBe(true);
        expect(result.token).toBe('1700000000.signature_hash_test');
        expect(result.devCode).toBe('852963');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('verifyTwoFactorOtp verifies valid 6-digit OTP and throws on invalid code', async () => {
      const originalFetch = global.fetch;
      global.fetch = async (_url: any, options: any) => {
        const body = JSON.parse(options?.body || '{}');
        if (body.code === '123456') {
          return {
            ok: true,
            json: async () => ({ success: true, verified: true })
          } as any;
        }
        return {
          ok: false,
          json: async () => ({ success: false, message: 'Incorrect 2FA code.' })
        } as any;
      };

      try {
        const successRes = await verifyTwoFactorOtp('test@domain.com', '123456', 'token.sig');
        expect(successRes.success).toBe(true);

        await expect(
          verifyTwoFactorOtp('test@domain.com', '000000', 'token.sig')
        ).rejects.toThrow(/incorrect 2fa code/i);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('finalizeTwoFactorLogin persists authenticated session and user remains logged in', () => {
      const googleUser: AuthUser = {
        uid: 'google-uid-12345',
        email: 'ms.concode@gmail.com',
        displayName: 'Meet Sharma',
        photoURL: 'https://example.com/avatar.jpg',
        travelerStyle: 'Budget explorer',
        travelStyleTag: 'Verified Explorer',
        location: 'India',
        occupation: 'Explorer',
        age: 25,
        emailVerified: true,
        provider: 'google',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        savedPlaceIds: []
      };

      const finalized = finalizeTwoFactorLogin(googleUser, 'oauth_google_gis_verified');
      expect(finalized.email).toBe('ms.concode@gmail.com');

      const activeUser = getCurrentUser();
      expect(activeUser).not.toBeNull();
      expect(activeUser?.email).toBe('ms.concode@gmail.com');
      expect(activeUser?.provider).toBe('google');
    });

    it('detects 2FA enabled based on Google token AMR claims (mfa, hwk, swk, otp)', () => {
      // 1. Google 2-Step Verification with password + MFA
      expect(isGoogleUser2FaEnabled({
        sub: '101',
        email: 'user_mfa@gmail.com',
        name: 'MFA User',
        amr: ['pwd', 'mfa']
      })).toBe(true);

      // 2. Passkey / Hardware key
      expect(isGoogleUser2FaEnabled({
        sub: '102',
        email: 'user_key@gmail.com',
        name: 'Key User',
        amr: ['hwk']
      })).toBe(true);

      // 3. OTP factor
      expect(isGoogleUser2FaEnabled({
        sub: '103',
        email: 'user_otp@gmail.com',
        name: 'OTP User',
        amr: ['otp']
      })).toBe(true);

      // 4. ACR claim
      expect(isGoogleUser2FaEnabled({
        sub: '104',
        email: 'user_acr@gmail.com',
        name: 'ACR User',
        acr: '2fa'
      })).toBe(true);

      // 5. Single factor password only -> false
      expect(isGoogleUser2FaEnabled({
        sub: '105',
        email: 'user_pwd@gmail.com',
        name: 'Standard User',
        amr: ['pwd']
      })).toBe(false);

      // 6. No AMR / standard token -> false
      expect(isGoogleUser2FaEnabled({
        sub: '106',
        email: 'user_standard@gmail.com',
        name: 'Basic User'
      })).toBe(false);
    });

    it('honors user explicit 2FA profile preference regardless of token claims', () => {
      const mockExistingUser: AuthUser = {
        uid: 'user-pref-1',
        email: 'pref@gmail.com',
        displayName: 'Pref User',
        photoURL: '',
        travelerStyle: '',
        travelStyleTag: '',
        location: '',
        occupation: '',
        age: 25,
        emailVerified: true,
        provider: 'google',
        createdAt: '',
        lastLoginAt: '',
        twoFactorEnabled: true
      };

      // Explicitly enabled in profile, even if token is single factor ['pwd']
      expect(isGoogleUser2FaEnabled({
        sub: '107',
        email: 'pref@gmail.com',
        name: 'Pref User',
        amr: ['pwd']
      }, mockExistingUser)).toBe(true);

      // Explicitly disabled in profile, even if token has mfa
      mockExistingUser.twoFactorEnabled = false;
      expect(isGoogleUser2FaEnabled({
        sub: '107',
        email: 'pref@gmail.com',
        name: 'Pref User',
        amr: ['pwd', 'mfa']
      }, mockExistingUser)).toBe(false);
    });

    it('parseGoogleAuthResult returns is2FaRequired appropriately', () => {
      const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      
      // Token with MFA
      const mfaPayload = {
        sub: '201',
        email: 'mfa_test@gmail.com',
        name: 'MFA Tester',
        email_verified: true,
        amr: ['pwd', 'mfa']
      };
      const mfaJwt = `${header}.${btoa(JSON.stringify(mfaPayload))}.signature`;
      const mfaResult = parseGoogleAuthResult(mfaJwt);
      expect(mfaResult.is2FaRequired).toBe(true);
      expect(mfaResult.user.twoFactorEnabled).toBe(true);

      // Token without MFA (single factor)
      const nonMfaPayload = {
        sub: '202',
        email: 'nomfa_test@gmail.com',
        name: 'Standard Tester',
        email_verified: true,
        amr: ['pwd']
      };
      const nonMfaJwt = `${header}.${btoa(JSON.stringify(nonMfaPayload))}.signature`;
      const nonMfaResult = parseGoogleAuthResult(nonMfaJwt);
      expect(nonMfaResult.is2FaRequired).toBe(false);
      expect(nonMfaResult.user.twoFactorEnabled).toBe(false);
    });

    it('toggleUserTwoFactor modifies account and session state', async () => {
      const initialUser: AuthUser = {
        uid: 'toggle-user-uid',
        email: 'toggle_test@gmail.com',
        displayName: 'Toggle User',
        photoURL: '',
        travelerStyle: 'Budget explorer',
        travelStyleTag: 'Verified Explorer',
        location: 'India',
        occupation: 'Explorer',
        age: 26,
        emailVerified: true,
        provider: 'google',
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      finalizeTwoFactorLogin(initialUser);
      expect(getCurrentUser()?.twoFactorEnabled).toBe(false);

      const enabledUser = await toggleUserTwoFactor(true);
      expect(enabledUser.twoFactorEnabled).toBe(true);
      expect(getCurrentUser()?.twoFactorEnabled).toBe(true);

      const disabledUser = await toggleUserTwoFactor(false);
      expect(disabledUser.twoFactorEnabled).toBe(false);
      expect(getCurrentUser()?.twoFactorEnabled).toBe(false);
    });

    it('validates serverless email-otp endpoint directly with HMAC signature verification and rejects tampering', async () => {
      const emailOtpHandler = (await import('../api/email-otp.js')).default;

      // Helper to mock serverless req/res
      const createMockReqRes = (body: any) => {
        let statusCode = 200;
        let responseJson: any = null;
        let headers: Record<string, string> = {};

        const req: any = {
          method: 'POST',
          headers: { 'x-forwarded-for': '127.0.0.1' },
          body
        };

        const res: any = {
          status: (code: number) => {
            statusCode = code;
            return res;
          },
          setHeader: (name: string, val: string) => {
            headers[name] = val;
          },
          json: (data: any) => {
            responseJson = data;
            return res;
          },
          end: () => res
        };

        return { req, res, getResult: () => ({ statusCode, responseJson, headers }) };
      };

      // 1. Send OTP for simulated domain
      const { req: sendReq, res: sendRes, getResult: getSendResult } = createMockReqRes({
        action: 'send',
        email: 'ci_test_user@example.com',
        name: 'CI Tester'
      });
      await emailOtpHandler(sendReq, sendRes);
      const sendResult = getSendResult();
      expect(sendResult.statusCode).toBe(200);
      expect(sendResult.responseJson.success).toBe(true);
      expect(sendResult.responseJson.token).toBeDefined();

      const validToken = sendResult.responseJson.token;
      const [expiresAtStr] = validToken.split('.');

      // 2. Reject tampering of token signature
      const tamperedToken = `${expiresAtStr}.deadbeef1234567890`;
      const { req: failReq, res: failRes, getResult: getFailResult } = createMockReqRes({
        action: 'verify',
        email: 'ci_test_user@example.com',
        code: '123456',
        token: tamperedToken
      });
      await emailOtpHandler(failReq, failRes);
      const failResult = getFailResult();
      expect(failResult.statusCode).toBe(400);
      expect(failResult.responseJson.success).toBe(false);

      // 3. Reject expired token
      const expiredTime = Date.now() - 5000;
      const expiredToken = `${expiredTime}.somesig`;
      const { req: expReq, res: expRes, getResult: getExpResult } = createMockReqRes({
        action: 'verify',
        email: 'ci_test_user@example.com',
        code: '123456',
        token: expiredToken
      });
      await emailOtpHandler(expReq, expRes);
      const expResult = getExpResult();
      expect(expResult.statusCode).toBe(400);
      expect(expResult.responseJson.message).toMatch(/expired/i);
    });
  });

  describe('Password Reset & Recovery Security Architecture', () => {
    it('rejects invalid or blank email address on sendPasswordResetCode', async () => {
      await expect(sendPasswordResetCode('')).rejects.toThrow(/valid email/i);
      await expect(sendPasswordResetCode('not-an-email')).rejects.toThrow(/valid email/i);
    });

    it('safely handles simulated/test domains without throwing network errors', async () => {
      const res = await sendPasswordResetCode('test_reset_user@example.com');
      expect(res.code).toBe('test_bypassed');
      expect(res.expiresAt).toBeGreaterThan(Date.now());
      expect(res.devCode).toBe('123456');
    });

    it('rejects password updates shorter than 6 characters', async () => {
      await expect(updateUserPassword('123')).rejects.toThrow(/at least 6 characters/i);
      await expect(updateUserPassword('')).rejects.toThrow(/at least 6 characters/i);
    });

    it('updateUserPassword updates user password hash and enables login with new password', async () => {
      const email = 'pwd_reset_test@domain.com';
      const oldPwd = 'OldPassword123!';
      const newPwd = 'NewSecurePassword456!';

      // 1. Setup account with old password
      const oldHash = await hashPassword(oldPwd);
      const testUser: AuthUser = {
        uid: 'user_reset_123',
        email,
        displayName: 'Reset Tester',
        photoURL: '',
        travelerStyle: 'Budget explorer',
        travelStyleTag: 'Explorer',
        location: 'India',
        occupation: 'Tester',
        age: 26,
        emailVerified: true,
        provider: 'email',
        subscriptionTier: 'free',
        freeTripsRemaining: 3,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        savedPlaceIds: []
      };

      saveAccounts([{ user: testUser, passwordHash: oldHash }]);

      // Verify sign in with old password succeeds
      const loginOld = await signInWithEmail({ email, password: oldPwd });
      expect(loginOld.email).toBe(email);

      // 2. Perform password update
      const updated = await updateUserPassword(newPwd);
      expect(updated.email).toBe(email);

      // Verify sign in with old password now FAILS
      await expect(signInWithEmail({ email, password: oldPwd })).rejects.toThrow();

      // Verify sign in with new password SUCCEEDS
      const loginNew = await signInWithEmail({ email, password: newPwd });
      expect(loginNew.email).toBe(email);
    });

    it('resetPasswordWithEmailOtp validates 6-digit code and sets new password', async () => {
      const email = 'ci_otp_reset@example.com';
      const newPwd = 'BrandNewPassword789!';

      // Rejects invalid code length
      await expect(resetPasswordWithEmailOtp(email, '123', newPwd)).rejects.toThrow(/6-digit/i);

      // Rejects password < 6 characters
      await expect(resetPasswordWithEmailOtp(email, '123456', '123')).rejects.toThrow(/at least 6 characters/i);

      // Simulated domain with test code '123456' succeeds
      const user = await resetPasswordWithEmailOtp(email, '123456', newPwd);
      expect(user.email).toBe(email);

      // Now verify user can log in with new password
      const login = await signInWithEmail({ email, password: newPwd });
      expect(login.email).toBe(email);
    });

    it('resolveRouteFromBrowser correctly resolves /reset-password, #type=recovery, and ?type=recovery to openResetPassword: true', () => {
      // 1. Direct pathname /reset-password
      (global as any).window.location = {
        origin: 'https://trip-verse.com',
        pathname: '/reset-password',
        search: '',
        hash: ''
      };
      const route1 = resolveRouteFromBrowser([]);
      expect(route1.openResetPassword).toBe(true);

      // 2. Hash containing type=recovery
      (global as any).window.location = {
        origin: 'https://trip-verse.com',
        pathname: '/',
        search: '',
        hash: '#access_token=xyz123&type=recovery'
      };
      const route2 = resolveRouteFromBrowser([]);
      expect(route2.openResetPassword).toBe(true);

      // 3. Search query param ?type=recovery
      (global as any).window.location = {
        origin: 'https://trip-verse.com',
        pathname: '/',
        search: '?type=recovery',
        hash: ''
      };
      const route3 = resolveRouteFromBrowser([]);
      expect(route3.openResetPassword).toBe(true);

      // Clean up window location
      (global as any).window.location = {
        origin: 'https://trip-verse.com',
        pathname: '/',
        search: '',
        hash: ''
      };
    });

    it('api/email-otp generates password reset specific content when purpose is password_reset', async () => {
      const emailOtpHandler = (await import('../api/email-otp.js')).default;
      let statusCode = 200;
      let responseJson: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => { responseJson = data; return res; },
            end: () => res
          };
        },
        setHeader: () => res
      };
      const req: any = {
        method: 'POST',
        headers: {},
        body: {
          action: 'send',
          email: 'ci_pwd_reset_email@example.com',
          name: 'Reset Candidate',
          purpose: 'password_reset'
        }
      };

      await emailOtpHandler(req, res);
      expect(statusCode).toBe(200);
      expect(responseJson.success).toBe(true);
      expect(responseJson.token).toBeDefined();
    });
  });
});
