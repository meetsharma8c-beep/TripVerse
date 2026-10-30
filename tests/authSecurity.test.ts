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

import { hashPassword, saveAccounts, signInWithEmail, sendPhoneOtp, verifyPhoneOtp, getPhoneAuthErrorMessage } from '../src/services/authService';
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

  it('dispatches and verifies phone OTP for verified phone number', async () => {
    const sendRes = await sendPhoneOtp('+919904717666');
    expect(sendRes.provider).toBe('firebase');

    const verifiedUser = await verifyPhoneOtp(
      '990471',
      'Meet Sharma',
      'Budget explorer',
      'India',
      '+919904717666'
    );
    expect(verifiedUser.phoneNumber).toBe('+919904717666');
    expect(verifiedUser.displayName).toBe('Meet Sharma');
    expect(verifiedUser.provider).toBe('phone');
    expect(verifiedUser.uid).toBeTruthy();
  });

  it('authenticates meet.sharma8c@gmail.com via cloud email authentication', async () => {
    const user = await signInWithEmail({
      email: 'meet.sharma8c@gmail.com',
      password: 'TripVerse@2026'
    });
    expect(user.email).toBe('meet.sharma8c@gmail.com');
    expect(user.displayName).toBe('Meet Sharma');
    expect(user.provider).toBe('email');
    expect(user.uid).toBeTruthy();
  });
});
