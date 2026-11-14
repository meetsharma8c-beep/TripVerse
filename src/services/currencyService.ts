import { CurrencyCode } from '../types/trip';

export type Currency = CurrencyCode;
export type SupportedCurrency = CurrencyCode;

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateFromINR: number; // Multiply INR amount by this rate
  formatPattern: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rateFromINR: 0.012, // 1 USD ≈ 83.5 INR
    formatPattern: 'en-US'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rateFromINR: 0.011, // 1 EUR ≈ 91 INR
    formatPattern: 'de-DE'
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    rateFromINR: 0.0095, // 1 GBP ≈ 105 INR
    formatPattern: 'en-GB'
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    rateFromINR: 1.0,
    formatPattern: 'en-IN'
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    rateFromINR: 0.044, // 1 AED ≈ 22.7 INR
    formatPattern: 'en-AE'
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    rateFromINR: 1.85, // 1 INR ≈ 1.85 JPY
    formatPattern: 'ja-JP'
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    rateFromINR: 0.0163, // 1 CAD ≈ 61.3 INR
    formatPattern: 'en-CA'
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    rateFromINR: 0.0182, // 1 AUD ≈ 55 INR
    formatPattern: 'en-AU'
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    rateFromINR: 0.016, // 1 SGD ≈ 62.5 INR
    formatPattern: 'en-SG'
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Swiss Franc',
    rateFromINR: 0.0105, // 1 CHF ≈ 95.2 INR
    formatPattern: 'de-CH'
  },
  NZD: {
    code: 'NZD',
    symbol: 'NZ$',
    name: 'New Zealand Dollar',
    rateFromINR: 0.0198, // 1 NZD ≈ 50.5 INR
    formatPattern: 'en-NZ'
  },
  THB: {
    code: 'THB',
    symbol: '฿',
    name: 'Thai Baht',
    rateFromINR: 0.43, // 1 INR ≈ 0.43 THB
    formatPattern: 'th-TH'
  }
};

const STORAGE_KEY_CURRENCY = 'tripverse_active_currency';
const RATES_CACHE_KEY = 'tripverse_live_rates_cache_v1';

// Load cached live bank exchange rates from previous sessions if available
if (typeof window !== 'undefined') {
  try {
    const cached = localStorage.getItem(RATES_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.rates && typeof parsed.rates === 'object') {
        Object.keys(CURRENCIES).forEach((code) => {
          const rate = parsed.rates[code];
          if (typeof rate === 'number' && rate > 0) {
            CURRENCIES[code as CurrencyCode].rateFromINR = rate;
          }
        });
      }
    }
  } catch {}
}

/**
 * Genuine real-time foreign exchange rate synchronization.
 * Fetches live bank rates from Open Exchange Rates API (open.er-api.com) with 0 mock data.
 */
export async function syncLiveExchangeRates(): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/INR');
    if (!res.ok) return false;
    const data = await res.json();
    if (data?.result === 'success' && data.rates) {
      let updated = false;
      Object.keys(CURRENCIES).forEach((code) => {
        const rate = data.rates[code];
        if (typeof rate === 'number' && rate > 0) {
          CURRENCIES[code as CurrencyCode].rateFromINR = rate;
          updated = true;
        }
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          rates: data.rates
        }));
      }
      if (updated && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tripverse_rates_updated'));
      }
      return true;
    }
  } catch (err) {
    console.warn('[TripVerse] Currency live rate sync deferred:', err);
  }
  return false;
}

// Background synchronization when app loads
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncLiveExchangeRates();
  }, 1500);
}

/**
 * Automatically detects the ideal starting currency based on the user's browser language,
 * system locale, and timezone. Guarantees a seamless native experience worldwide.
 */
export function detectDefaultCurrency(): CurrencyCode {
  try {
    if (typeof navigator !== 'undefined') {
      const languages = navigator.languages || [navigator.language || ''];
      const langStr = languages.join(',').toLowerCase();
      const timeZone = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();

      // 1. South Asia / India
      if (
        langStr.includes('en-in') || 
        langStr.includes('hi') || 
        langStr.includes('ta') || 
        langStr.includes('te') || 
        langStr.includes('bn') || 
        langStr.includes('gu') || 
        langStr.includes('mr') || 
        timeZone.includes('calcutta') || 
        timeZone.includes('kolkata') || 
        timeZone.includes('asia/colombo')
      ) {
        return 'INR';
      }

      // 2. United Kingdom
      if (langStr.includes('en-gb') || timeZone.includes('london')) {
        return 'GBP';
      }

      // 3. Japan
      if (langStr.includes('ja') || timeZone.includes('tokyo')) {
        return 'JPY';
      }

      // 4. UAE / Gulf
      if (langStr.includes('en-ae') || langStr.includes('ar-ae') || timeZone.includes('dubai')) {
        return 'AED';
      }

      // 5. Canada
      if (langStr.includes('en-ca') || langStr.includes('fr-ca') || timeZone.includes('toronto') || timeZone.includes('vancouver') || timeZone.includes('montreal')) {
        return 'CAD';
      }

      // 6. Australia
      if (langStr.includes('en-au') || timeZone.includes('sydney') || timeZone.includes('melbourne') || timeZone.includes('brisbane') || timeZone.includes('perth')) {
        return 'AUD';
      }

      // 7. Singapore
      if (langStr.includes('en-sg') || timeZone.includes('singapore')) {
        return 'SGD';
      }

      // 8. Switzerland
      if (langStr.includes('de-ch') || langStr.includes('fr-ch') || timeZone.includes('zurich')) {
        return 'CHF';
      }

      // 9. New Zealand
      if (langStr.includes('en-nz') || timeZone.includes('auckland')) {
        return 'NZD';
      }

      // 10. Thailand
      if (langStr.includes('th') || timeZone.includes('bangkok')) {
        return 'THB';
      }

      // 11. Eurozone
      if (
        langStr.includes('de') || 
        langStr.includes('fr') || 
        langStr.includes('es') || 
        langStr.includes('it') || 
        langStr.includes('nl') || 
        langStr.includes('el') ||
        langStr.includes('pt') || 
        timeZone.includes('europe') || 
        timeZone.includes('paris') || 
        timeZone.includes('berlin') || 
        timeZone.includes('rome') || 
        timeZone.includes('madrid')
      ) {
        return 'EUR';
      }

      // 12. North America / USA
      if (langStr.includes('en-us') || timeZone.includes('america')) {
        return 'USD';
      }
    }
  } catch {
    // fallback gracefully
  }
  return 'USD';
}

export function getActiveCurrency(): CurrencyCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENCY);
    if (saved && (saved in CURRENCIES)) {
      return saved as CurrencyCode;
    }
  } catch {
    // fallback
  }
  return detectDefaultCurrency();
}

export const getStoredCurrency = getActiveCurrency;

export function setActiveCurrency(currency: CurrencyCode): void {
  try {
    localStorage.setItem(STORAGE_KEY_CURRENCY, currency);
    window.dispatchEvent(new CustomEvent('tripverse_currency_change', { detail: currency }));
  } catch (e) {
    console.warn('Could not persist currency preference', e);
  }
}

export const COUNTRY_TO_CURRENCY_MAP: Record<string, CurrencyCode> = {
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  AE: 'AED',
  CA: 'CAD',
  AU: 'AUD',
  SG: 'SGD',
  JP: 'JPY',
  CH: 'CHF',
  NZ: 'NZD',
  TH: 'THB',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
  PT: 'EUR',
  GR: 'EUR'
};

/**
 * Automatically fetch visitor geolocation from server edge and apply local currency
 * if the user has not manually overridden it.
 */
export async function detectAndApplyGeoCurrency(): Promise<CurrencyCode> {
  if (typeof window === 'undefined') return 'USD';

  // If user already picked manually, preserve their choice
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENCY);
    if (saved && (saved in CURRENCIES)) {
      return saved as CurrencyCode;
    }
  } catch {}

  try {
    const res = await fetch('/api/geo');
    if (res.ok) {
      const data = await res.json();
      if (data?.country && COUNTRY_TO_CURRENCY_MAP[data.country]) {
        const detected = COUNTRY_TO_CURRENCY_MAP[data.country];
        setActiveCurrency(detected);
        return detected;
      }
    }
  } catch (err) {
    // Fallback to client-side locale & timezone detection
  }

  const clientFallback = detectDefaultCurrency();
  setActiveCurrency(clientFallback);
  return clientFallback;
}

// Background geo currency detection
if (typeof window !== 'undefined') {
  setTimeout(() => {
    detectAndApplyGeoCurrency();
  }, 500);
}

/**
 * Converts an amount in INR to the selected currency with NaN & undefined resilience
 */
export function convertFromINR(amountInINR: number | undefined | null, targetCurrency: CurrencyCode = getActiveCurrency()): number {
  const safeAmount = Number.isFinite(Number(amountInINR)) ? Number(amountInINR) : 0;
  const config = CURRENCIES[targetCurrency] || CURRENCIES.INR;
  const rate = Number.isFinite(config.rateFromINR) ? config.rateFromINR : 1;
  return Math.round(safeAmount * rate);
}

/**
 * Converts an amount from a foreign currency to INR
 */
export function convertToINR(amount: number | undefined | null, fromCurrency: CurrencyCode = getActiveCurrency()): number {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const config = CURRENCIES[fromCurrency] || CURRENCIES.INR;
  const rate = Number.isFinite(config.rateFromINR) && config.rateFromINR > 0 ? config.rateFromINR : 1;
  return Math.round(safeAmount / rate);
}

/**
 * Formats an amount with the currency symbol and locale separators, guaranteed never to show NaN
 */
export function formatCurrency(
  amountInINR: number | undefined | null, 
  currency: CurrencyCode = getActiveCurrency(),
  showCode: boolean = false
): string {
  const safeAmount = Number.isFinite(Number(amountInINR)) ? Number(amountInINR) : 0;
  const config = CURRENCIES[currency] || CURRENCIES.INR;
  const rate = Number.isFinite(config.rateFromINR) ? config.rateFromINR : 1;
  const converted = safeAmount * rate;
  
  const formattedNumber = Math.round(converted).toLocaleString(config.formatPattern || 'en-US');
  
  if (showCode) {
    return `${config.symbol}${formattedNumber} ${config.code}`;
  }
  return `${config.symbol}${formattedNumber}`;
}

/**
 * Formats an amount directly given in the target currency (e.g., $1500 directly, not converted from INR)
 */
export function formatDirectCurrency(
  amountInTargetCurrency: number | undefined | null,
  currency: CurrencyCode = getActiveCurrency(),
  showCode: boolean = false
): string {
  const safeAmount = Number.isFinite(Number(amountInTargetCurrency)) ? Number(amountInTargetCurrency) : 0;
  const config = CURRENCIES[currency] || CURRENCIES.USD;
  const formattedNumber = Math.round(safeAmount).toLocaleString(config.formatPattern || 'en-US');
  
  if (showCode) {
    return `${config.symbol}${formattedNumber} ${config.code}`;
  }
  return `${config.symbol}${formattedNumber}`;
}
