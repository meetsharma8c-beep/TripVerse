import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

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
    location: { origin: 'https://trip-verse.com' },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  (global as any).CustomEvent = class {
    type: string;
    detail: any;
    constructor(type: string, opts?: any) {
      this.type = type;
      this.detail = opts?.detail;
    }
  };
});

import { 
  fetchFounderUserRoster, 
  adminGrantPro, 
  adminRevokePro, 
  isTestEmail,
  parseRpcRosterRows,
  buildFounderRosterCsv
} from '../src/services/adminService';
import { getCurrentUser, signOut } from '../src/services/authService';

describe('Founder Command Center & Admin Service Unit Tests', () => {
  beforeEach(async () => {
    (global as any).localStorage.clear();
  });

  it('correctly classifies test vs genuine user accounts', () => {
    // Test emails identified
    expect(isTestEmail('ci_runner@example.com')).toBe(true);
    expect(isTestEmail('e2e_tester_123@testmail.com')).toBe(true);
    expect(isTestEmail('valid_test_user@tripversetest.io')).toBe(true);
    expect(isTestEmail('testuser@domain.com')).toBe(true);

    // Genuine traveler emails identified
    expect(isTestEmail('meet.sharma8c@gmail.com')).toBe(false);
    expect(isTestEmail('traveler.john@gmail.com')).toBe(false);
    expect(isTestEmail('alex.wanderlust@outlook.com')).toBe(false);
  });

  it('strictly blocks non-founder accounts from accessing the Founder Command Center', async () => {
    // 1. Guest / unauthenticated user blocked
    await expect(fetchFounderUserRoster()).rejects.toThrow(/Unauthorized/);

    // 2. Regular registered user blocked
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tripverse_current_user', JSON.stringify({
        uid: 'user-regular-456',
        email: 'ms.concode@gmail.com',
        displayName: 'Regular User',
        subscriptionTier: 'free'
      }));
    }

    await expect(fetchFounderUserRoster()).rejects.toThrow(/Unauthorized/);
  });

  it('permits meet.sharma8c@gmail.com to retrieve user roster and summary metrics', async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tripverse_auth_session_v3', JSON.stringify({
        user: {
          uid: 'founder-001',
          email: 'meet.sharma8c@gmail.com',
          displayName: 'Meet Sharma',
          subscriptionTier: 'vip_founder'
        },
        token: 'founder-valid-token',
        expiresAt: Date.now() + 86400000
      }));
    }

    const { users, metrics } = await fetchFounderUserRoster();

    // Verify metrics reflect actual registered users (zero artificial floors)
    expect(metrics.totalRegistered).toBeGreaterThanOrEqual(1);
    expect(metrics.activeSignedUsers).toBeGreaterThanOrEqual(1);
    expect(metrics.genuineTravelers).toBeGreaterThanOrEqual(1);
    expect(metrics.vipFounders).toBe(1);

    // Verify user list contains Founder with VIP Founder tier
    const founder = users.find(u => u.email === 'meet.sharma8c@gmail.com');
    expect(founder).toBeDefined();
    expect(founder?.tier).toBe('vip_founder');
    expect(founder?.isGenuine).toBe(true);
  });

  it('allows founder to grant and revoke Pro membership for any traveler', async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tripverse_auth_session_v3', JSON.stringify({
        user: {
          uid: 'founder-001',
          email: 'meet.sharma8c@gmail.com',
          displayName: 'Meet Sharma',
          subscriptionTier: 'vip_founder'
        },
        token: 'founder-valid-token',
        expiresAt: Date.now() + 86400000
      }));
    }

    const targetEmail = 'traveler.friend@gmail.com';

    // Grant 1-Year Pro
    const grantOk = await adminGrantPro(targetEmail, 365);
    expect(grantOk).toBe(true);
    expect(localStorage.getItem(`tripverse_admin_pro_${targetEmail}`)).toContain('pro');

    // Revoke Pro
    const revokeOk = await adminRevokePro(targetEmail);
    expect(revokeOk).toBe(true);
    expect(localStorage.getItem(`tripverse_admin_pro_${targetEmail}`)).toBeNull();
  });

  it('merges Email, Google OAuth synced accounts, Cloud Pro overrides, and separates Guests cleanly', () => {
    const rpcSample = [
      {
        id: 'sb-email-1',
        email: 'rohan.kapoor@gmail.com',
        name: 'Rohan Kapoor',
        provider: 'email',
        location: 'Mumbai, IN',
        created_at: '2026-10-15T10:00:00Z',
        last_sign_in_at: '2026-10-16T10:00:00Z',
        metadata: { full_name: 'Rohan Kapoor' }
      },
      // Same user later signed in with Google (dot-free Gmail alias) -> should merge & upgrade provider to 'google'
      {
        id: 'sb-google-sync-1',
        email: null,
        name: 'Rohan K. Explorer',
        provider: 'EMAIL',
        location: 'Delhi, IN',
        created_at: '2026-11-20T12:00:00Z',
        last_sign_in_at: '2026-11-20T12:00:00Z',
        metadata: {
          record_type: 'external_user_sync',
          user_email: 'rohankapoor@gmail.com',
          auth_provider: 'google',
          full_name: 'Rohan K. Explorer',
          last_sign_in_at: '2026-11-20T12:00:00Z'
        }
      },
      // Pure Google OAuth user (no top-level email in Supabase anon sync)
      {
        id: 'sb-google-only-2',
        email: null,
        name: 'Priya Menon',
        provider: 'EMAIL',
        location: 'Bengaluru, IN',
        created_at: '2026-11-22T08:30:00Z',
        last_sign_in_at: '2026-11-22T08:30:00Z',
        metadata: {
          record_type: 'external_user_sync',
          user_email: 'priya.menon@gmail.com',
          auth_provider: 'google',
          full_name: 'Priya Menon',
          original_created_at: '2026-11-01T09:00:00Z'
        }
      },
      // Cloud Pro override granted to Priya
      {
        id: 'sb-override-1',
        email: null,
        created_at: '2026-11-24T09:00:00Z',
        metadata: {
          record_type: 'admin_pro_override',
          target_email: 'priya.menon@gmail.com',
          subscription_tier: 'pro',
          expires_at: '2027-11-24T09:00:00Z',
          updated_at: '2026-11-24T09:00:00Z'
        }
      },
      // Anonymous Guest Explorer session (`signInAsGuest`)
      {
        id: 'sb-guest-1',
        email: null,
        name: 'Explorer',
        provider: 'EMAIL',
        location: 'India',
        created_at: '2026-11-23T05:00:00Z',
        metadata: { name: 'Explorer', traveler_style: 'Budget explorer' }
      }
    ];

    const { registeredByCanon, guestList } = parseRpcRosterRows(rpcSample);

    expect(registeredByCanon.size).toBe(2);
    expect(guestList.length).toBe(1);
    expect(guestList[0].isGuest).toBe(true);

    const rohan = registeredByCanon.get('rohankapoor@gmail.com');
    expect(rohan).toBeDefined();
    expect(rohan?.provider).toBe('google');
    expect(rohan?.name).toBe('Rohan K. Explorer');
    expect(rohan?.createdAt).toBe('2026-10-15T10:00:00Z');

    const priya = registeredByCanon.get('priyamenon@gmail.com');
    expect(priya).toBeDefined();
    expect(priya?.provider).toBe('google');
    expect(priya?.tier).toBe('pro');
    expect(priya?.createdAt).toBe('2026-11-01T09:00:00Z');

    const csv = buildFounderRosterCsv(Array.from(registeredByCanon.values()));
    expect(csv).toContain('Priya Menon');
    expect(csv).toContain('GOOGLE');
    expect(csv).toContain('"pro"');
  });
});
