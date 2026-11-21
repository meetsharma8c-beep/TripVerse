import { describe, it, expect } from 'vitest';
import {
  isNativeBillingConfigured,
  getNativeOfferings,
  purchaseNativeProPlan,
  restoreNativePurchases,
} from '../src/services/nativeBillingService';

describe('Native Store Billing Service (Apple StoreKit 2 / Google Play Billing)', () => {
  it('returns false for isNativeBillingConfigured on web platform', () => {
    expect(isNativeBillingConfigured()).toBe(false);
  });

  it('returns empty offerings safely on web platform', async () => {
    const offerings = await getNativeOfferings('test-user-1');
    expect(Array.isArray(offerings)).toBe(true);
    expect(offerings.length).toBe(0);
  });

  it('safely blocks native purchase calls on non-native web runtime', async () => {
    const res = await purchaseNativeProPlan('annual', 'test-user-1');
    expect(res.ok).toBe(false);
    expect(res.entitlementsActive).toBe(false);
    expect(res.message).toContain('iOS or Android');
  });

  it('safely handles restore purchases on non-native web runtime', async () => {
    const res = await restoreNativePurchases('test-user-1');
    expect(res.ok).toBe(false);
    expect(res.entitlementsActive).toBe(false);
    expect(res.message).toContain('Restore Purchases');
  });
});
