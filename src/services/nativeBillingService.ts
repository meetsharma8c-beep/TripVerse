/**
 * Native App Store (StoreKit 2) & Google Play Billing Service (RevenueCat Bridge)
 *
 * Strictly enforces Apple App Store Guideline 3.1.1 & Google Play Payments Policy:
 * - Zero external payment links or third-party checkouts inside native iOS/Android binaries.
 * - Uses RevenueCat (`@revenuecat/purchases-capacitor`) when configured via
 *   `VITE_REVENUECAT_IOS_KEY` / `VITE_REVENUECAT_ANDROID_KEY`.
 * - Provides Restore Purchases & entitlement verification required by Apple App Review.
 */
import { Capacitor } from '@capacitor/core';

export interface NativeSubscriptionPackage {
  identifier: string;
  cycle: 'monthly' | 'annual';
  productId: string;
  title: string;
  priceString: string;
  rawPackage?: unknown;
}

export interface NativePurchaseResult {
  ok: boolean;
  entitlementsActive: boolean;
  cancelled?: boolean;
  message: string;
}

const PRO_ENTITLEMENT_ID = 'pro';

interface RevenueCatBridge {
  configure: (opts: { apiKey: string; appUserID?: string }) => Promise<void>;
  logIn?: (opts: { appUserID: string }) => Promise<unknown>;
  getOfferings: () => Promise<{
    current?: {
      availablePackages?: Array<{
        identifier: string;
        packageType?: string;
        product?: {
          identifier?: string;
          title?: string;
          priceString?: string;
        };
      }>;
    };
  }>;
  purchasePackage: (opts: { aPackage: unknown }) => Promise<{
    customerInfo?: { entitlements?: { active?: Record<string, unknown> } };
  }>;
  restorePurchases: () => Promise<{
    customerInfo?: { entitlements?: { active?: Record<string, unknown> } };
  }>;
  getCustomerInfo?: () => Promise<{
    customerInfo?: { entitlements?: { active?: Record<string, unknown> } };
  }>;
}

let configuredKey: string | null = null;
let cachedBridge: RevenueCatBridge | null | undefined;

export function getNativeBillingApiKey(): string {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') {
    return (import.meta.env.VITE_REVENUECAT_IOS_KEY || '').trim();
  }
  if (platform === 'android') {
    return (import.meta.env.VITE_REVENUECAT_ANDROID_KEY || '').trim();
  }
  return '';
}

export function isNativeBillingConfigured(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  const key = getNativeBillingApiKey();
  return key.length >= 16 && !key.includes('your_');
}

async function resolveRevenueCatBridge(): Promise<RevenueCatBridge | null> {
  if (!Capacitor.isNativePlatform()) return null;
  if (cachedBridge !== undefined) return cachedBridge;

  // Prefer Capacitor runtime plugin registry so Vite never fails if the optional npm package isn't installed yet
  const win = typeof window !== 'undefined' ? (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }) : null;
  const plugin = win?.Capacitor?.Plugins?.Purchases as RevenueCatBridge | undefined;
  if (plugin && typeof plugin.configure === 'function') {
    cachedBridge = plugin;
    return cachedBridge;
  }

  cachedBridge = null;
  return null;
}

async function ensureConfigured(userId?: string): Promise<RevenueCatBridge | null> {
  if (!isNativeBillingConfigured()) return null;
  const bridge = await resolveRevenueCatBridge();
  if (!bridge) return null;

  const apiKey = getNativeBillingApiKey();
  if (configuredKey !== apiKey) {
    await bridge.configure({
      apiKey,
      ...(userId ? { appUserID: userId } : {}),
    });
    configuredKey = apiKey;
  } else if (userId && typeof bridge.logIn === 'function') {
    await bridge.logIn({ appUserID: userId }).catch(() => {});
  }
  return bridge;
}

export async function getNativeOfferings(userId?: string): Promise<NativeSubscriptionPackage[]> {
  try {
    const bridge = await ensureConfigured(userId);
    if (!bridge) return [];
    const offerings = await bridge.getOfferings();
    const packages = offerings?.current?.availablePackages || [];
    return packages
      .map((pkg): NativeSubscriptionPackage | null => {
        const idLower = `${pkg.identifier || ''} ${pkg.packageType || ''} ${pkg.product?.identifier || ''}`.toLowerCase();
        const isAnnual = idLower.includes('annual') || idLower.includes('year');
        const isMonthly = idLower.includes('month');
        if (!isAnnual && !isMonthly) return null;
        return {
          identifier: pkg.identifier,
          cycle: isAnnual ? 'annual' : 'monthly',
          productId: pkg.product?.identifier || pkg.identifier,
          title: pkg.product?.title || (isAnnual ? 'TripVerse Pro Annual' : 'TripVerse Pro Monthly'),
          priceString: pkg.product?.priceString || '',
          rawPackage: pkg,
        };
      })
      .filter((p): p is NativeSubscriptionPackage => p !== null);
  } catch {
    return [];
  }
}

export async function purchaseNativeProPlan(
  cycle: 'monthly' | 'annual',
  userId?: string
): Promise<NativePurchaseResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      ok: false,
      entitlementsActive: false,
      message: 'Native store purchases are only available in the iOS or Android app.',
    };
  }

  const platformName = Capacitor.getPlatform() === 'ios' ? 'Apple App Store' : 'Google Play';
  const bridge = await ensureConfigured(userId);
  if (!bridge) {
    return {
      ok: false,
      entitlementsActive: false,
      message: `${platformName} in-app subscriptions are pending store product activation.`,
    };
  }

  try {
    const packages = await getNativeOfferings(userId);
    const chosen = packages.find((p) => p.cycle === cycle) || packages[0];
    if (!chosen?.rawPackage) {
      return {
        ok: false,
        entitlementsActive: false,
        message: `No active ${platformName} subscription package is published yet.`,
      };
    }

    const result = await bridge.purchasePackage({ aPackage: chosen.rawPackage });
    const active = result?.customerInfo?.entitlements?.active || {};
    const entitlementsActive = Boolean(active[PRO_ENTITLEMENT_ID] || Object.keys(active).length > 0);
    return {
      ok: entitlementsActive,
      entitlementsActive,
      message: entitlementsActive
        ? `TripVerse Pro activated via ${platformName}.`
        : `Purchase submitted to ${platformName}. Entitlement will sync automatically.`,
    };
  } catch (err: unknown) {
    const errorObj = err as { userCancelled?: boolean; code?: string; message?: string };
    if (errorObj?.userCancelled || errorObj?.code === '1' || errorObj?.code === 'PURCHASE_CANCELLED') {
      return {
        ok: false,
        entitlementsActive: false,
        cancelled: true,
        message: 'Purchase cancelled.',
      };
    }
    return {
      ok: false,
      entitlementsActive: false,
      message: errorObj?.message || `Could not complete ${platformName} purchase. Please try again.`,
    };
  }
}

export async function restoreNativePurchases(userId?: string): Promise<NativePurchaseResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      ok: false,
      entitlementsActive: false,
      message: 'Restore Purchases is available in the iOS and Android apps.',
    };
  }

  const platformName = Capacitor.getPlatform() === 'ios' ? 'Apple App Store' : 'Google Play';
  const bridge = await ensureConfigured(userId);
  if (!bridge) {
    return {
      ok: false,
      entitlementsActive: false,
      message: `No active ${platformName} subscription found for this account yet.`,
    };
  }

  try {
    const result = await bridge.restorePurchases();
    const active = result?.customerInfo?.entitlements?.active || {};
    const entitlementsActive = Boolean(active[PRO_ENTITLEMENT_ID] || Object.keys(active).length > 0);
    return {
      ok: entitlementsActive,
      entitlementsActive,
      message: entitlementsActive
        ? `Your TripVerse Pro subscription has been restored from ${platformName}.`
        : `No previous TripVerse Pro purchases were found on this ${platformName} account.`,
    };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    return {
      ok: false,
      entitlementsActive: false,
      message: errorObj?.message || `Unable to restore ${platformName} purchases right now.`,
    };
  }
}
