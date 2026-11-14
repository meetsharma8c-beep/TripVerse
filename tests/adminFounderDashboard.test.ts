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
  isTestEmail 
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

    // Verify metrics integrity
    expect(metrics.totalRegistered).toBeGreaterThanOrEqual(140);
    expect(metrics.activeSignedUsers).toBeGreaterThanOrEqual(130);
    expect(metrics.genuineTravelers).toBeGreaterThanOrEqual(17);
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
});
