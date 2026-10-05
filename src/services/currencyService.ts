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
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    rateFromINR: 1.0,
    formatPattern: 'en-IN'
  },
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
  }
};

const STORAGE_KEY_CURRENCY = 'tripverse_active_currency';

export function getActiveCurrency(): CurrencyCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENCY);
    if (saved && (saved in CURRENCIES)) {
      return saved as CurrencyCode;
    }
  } catch {
    // fallback
  }
  return 'INR';
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

/**
 * Converts an amount in INR to the selected currency
 */
export function convertFromINR(amountInINR: number, targetCurrency: CurrencyCode = getActiveCurrency()): number {
  const config = CURRENCIES[targetCurrency] || CURRENCIES.INR;
  return Math.round(amountInINR * config.rateFromINR);
}

/**
 * Formats an amount with the currency symbol and locale separators
 */
export function formatCurrency(
  amountInINR: number, 
  currency: CurrencyCode = getActiveCurrency(),
  showCode: boolean = false
): string {
  const config = CURRENCIES[currency] || CURRENCIES.INR;
  const converted = amountInINR * config.rateFromINR;
  
  const formattedNumber = Math.round(converted).toLocaleString(config.formatPattern);
  
  if (showCode) {
    return `${config.symbol}${formattedNumber} ${config.code}`;
  }
  return `${config.symbol}${formattedNumber}`;
}
