import { CurrencyCode } from '../types/trip';
import { formatCurrency } from './currencyService';

export type PaymentMethodType = 
  | 'upi_qr' 
  | 'upi_apps' 
  | 'upi_id' 
  | 'card' 
  | 'netbanking' 
  | 'wallet' 
  | 'emi';

export interface BookingRecord {
  id: string; // e.g., TRV-BKG-2026-98412
  tripId: string;
  tripName: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelersCount: number;
  amount: number;
  currency: CurrencyCode;
  paymentMethod: string;
  paymentMethodType: PaymentMethodType;
  transactionId: string;
  pnr: string;
  hotelVoucher: string;
  createdAt: string;
  status: 'confirmed';
  packageType: 'full_package' | 'hotel_only' | 'transit_only' | 'pro_subscription';
  items: {
    title: string;
    category: string;
    amount: number;
  }[];
  couponApplied?: {
    code: string;
    discountAmount: number;
  };
}

export interface Coupon {
  code: string;
  label: string;
  description: string;
  discountType: 'flat' | 'percentage';
  discountValue: number;
  minAmount: number;
  maxDiscount?: number;
}

export const AVAILABLE_COUPONS: Coupon[] = [
  {
    code: 'TRIPVERSE500',
    label: '₹500 OFF',
    description: 'Flat ₹500 off on any booking above ₹2,000',
    discountType: 'flat',
    discountValue: 500,
    minAmount: 2000
  },
  {
    code: 'FIRSTTRIP',
    label: '₹1,000 OFF',
    description: 'Flat ₹1,000 off on your first grand trip booking',
    discountType: 'flat',
    discountValue: 1000,
    minAmount: 5000
  },
  {
    code: 'WANDERLUST',
    label: '10% DISCOUNT',
    description: '10% off up to ₹2,500 on all seasonal vacation packages',
    discountType: 'percentage',
    discountValue: 10,
    minAmount: 3000,
    maxDiscount: 2500
  },
  {
    code: 'PROPASS15',
    label: '15% PRO SAVINGS',
    description: '15% instant savings on travel passes & luxury stays',
    discountType: 'percentage',
    discountValue: 15,
    minAmount: 4000,
    maxDiscount: 3500
  }
];

export interface BankInfo {
  id: string;
  name: string;
  code: string;
  popular: boolean;
  color: string;
}

export const POPULAR_BANKS: BankInfo[] = [
  { id: 'hdfc', name: 'HDFC Bank', code: 'HDFC', popular: true, color: '#004c8f' },
  { id: 'sbi', name: 'State Bank of India', code: 'SBIN', popular: true, color: '#280071' },
  { id: 'icici', name: 'ICICI Bank', code: 'ICIC', popular: true, color: '#b02a30' },
  { id: 'axis', name: 'Axis Bank', code: 'UTIB', popular: true, color: '#97144d' },
  { id: 'kotak', name: 'Kotak Mahindra', code: 'KKBK', popular: true, color: '#ed1c24' },
  { id: 'pnb', name: 'Punjab National Bank', code: 'PUNB', popular: true, color: '#a20f26' }
];

export const OTHER_BANKS: BankInfo[] = [
  { id: 'bob', name: 'Bank of Baroda', code: 'BARB', popular: false, color: '#f26522' },
  { id: 'canara', name: 'Canara Bank', code: 'CNRB', popular: false, color: '#0090d0' },
  { id: 'indusind', name: 'IndusInd Bank', code: 'INDB', popular: false, color: '#911a1d' },
  { id: 'yes', name: 'Yes Bank', code: 'YESB', popular: false, color: '#00529b' },
  { id: 'idfc', name: 'IDFC FIRST Bank', code: 'IDFB', popular: false, color: '#9d1d27' },
  { id: 'union', name: 'Union Bank of India', code: 'UBIN', popular: false, color: '#d2232a' },
  { id: 'federal', name: 'Federal Bank', code: 'FDRL', popular: false, color: '#004a80' },
  { id: 'rbl', name: 'RBL Bank', code: 'RATN', popular: false, color: '#003366' },
  { id: 'au', name: 'AU Small Finance Bank', code: 'AUBL', popular: false, color: '#682057' },
  { id: 'central', name: 'Central Bank of India', code: 'CBIN', popular: false, color: '#0f4c81' },
  { id: 'boi', name: 'Bank of India', code: 'BKID', popular: false, color: '#c72027' },
  { id: 'indian', name: 'Indian Bank', code: 'IDIB', popular: false, color: '#005696' }
];

const STORAGE_KEY_BOOKINGS = 'tripverse_confirmed_bookings';

/**
 * Load all saved bookings from localStorage
 */
export function getAllBookings(): BookingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load bookings from storage', err);
    return [];
  }
}

/**
 * Get booking for a specific trip
 */
export function getBookingForTrip(tripId: string): BookingRecord | null {
  const all = getAllBookings();
  return all.find(b => b.tripId === tripId) || null;
}

/**
 * Save a new confirmed booking
 */
export function saveBookingRecord(booking: BookingRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getAllBookings().filter(b => b.id !== booking.id);
    existing.unshift(booking);
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent('tripverse_booking_confirmed', { detail: booking }));
  } catch (err) {
    console.error('Failed to save booking', err);
  }
}

/**
 * Generate a randomized realistic PNR for transport
 */
export function generatePNR(prefix: string = 'TRV'): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  let pnr = prefix + '-';
  for (let i = 0; i < 3; i++) {
    pnr += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  for (let i = 0; i < 4; i++) {
    pnr += nums.charAt(Math.floor(Math.random() * nums.length));
  }
  return pnr;
}

/**
 * Generate a randomized realistic Hotel confirmation voucher code
 */
export function generateHotelVoucher(): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'HTL-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Builds an authentic UPI URI scheme string
 */
export function buildUpiPaymentUri(params: {
  payeeVpa?: string;
  payeeName?: string;
  amount: number;
  transactionRef: string;
  transactionNote?: string;
}): string {
  const vpa = params.payeeVpa || '9904717666@ptaxis';
  const name = params.payeeName || 'TripVerse';
  const amountStr = params.amount.toFixed(2);
  const note = params.transactionNote || `TripVerse Booking ${params.transactionRef}`;
  
  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${amountStr}&cu=INR&tr=${encodeURIComponent(params.transactionRef)}&tn=${encodeURIComponent(note)}`;
}

/**
 * Build standard QR code image URL using QR Server API
 */
export function getUpiQrCodeUrl(upiUri: string, size: number = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(upiUri)}`;
}

/**
 * Validate a coupon code and calculate savings
 */
export function evaluateCoupon(
  code: string, 
  amount: number
): { valid: boolean; discount: number; message: string; coupon?: Coupon } {
  const clean = code.trim().toUpperCase();
  const coupon = AVAILABLE_COUPONS.find(c => c.code === clean);
  
  if (!coupon) {
    return { valid: false, discount: 0, message: 'Invalid promo code. Try TRIPVERSE500 or FIRSTTRIP' };
  }

  if (amount < coupon.minAmount) {
    return { 
      valid: false, 
      discount: 0, 
      message: `Minimum booking of ₹${coupon.minAmount.toLocaleString('en-IN')} required for ${coupon.code}` 
    };
  }

  let discount = 0;
  if (coupon.discountType === 'flat') {
    discount = coupon.discountValue;
  } else {
    discount = Math.round((amount * coupon.discountValue) / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  }

  return {
    valid: true,
    discount,
    message: `Promo code ${coupon.code} applied! Saved ₹${discount.toLocaleString('en-IN')}`,
    coupon
  };
}

/**
 * Card brand identification regex helper
 */
export function detectCardBrand(cardNumber: string): 'visa' | 'mastercard' | 'rupay' | 'amex' | 'generic' {
  const clean = cardNumber.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
  if (/^(60|65|81|82|508)/.test(clean)) return 'rupay';
  if (/^3[47]/.test(clean)) return 'amex';
  return 'generic';
}

/**
 * Format card number with auto grouping (4 4 4 4)
 */
export function formatCardNumber(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 16);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

/**
 * Format expiry date MM/YY
 */
export function formatCardExpiry(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  }
  return digits;
}

/**
 * Generates an printable/downloadable text or HTML invoice for user
 */
export function generateTicketReceiptText(booking: BookingRecord, currency: CurrencyCode): string {
  const dateStr = new Date(booking.createdAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
======================================================
              TRIPVERSE TRAVEL TECHNOLOGIES
           OFFICIAL E-TICKET & TAX INVOICE
======================================================
BOOKING ID    : ${booking.id}
TRANSACTION ID: ${booking.transactionId}
STATUS        : CONFIRMED & PAID
DATE & TIME   : ${dateStr}
PAYMENT METHOD: ${booking.paymentMethod}

------------------------------------------------------
JOURNEY ITINERARY DETAILS
------------------------------------------------------
TRIP NAME     : ${booking.tripName}
ROUTE         : ${booking.origin} -> ${booking.destination}
DATES         : ${booking.startDate} to ${booking.endDate}
PASSENGERS    : ${booking.travelersCount} Traveler(s)
PNR (TRANSIT) : ${booking.pnr}
HOTEL VOUCHER : ${booking.hotelVoucher}

------------------------------------------------------
ITEMIZED INVOICE BREAKDOWN
------------------------------------------------------
${booking.items.map(it => `${it.title.padEnd(35)} : ${formatCurrency(it.amount, currency)}`).join('\n')}
${booking.couponApplied ? `Coupon (${booking.couponApplied.code}) Discount : -${formatCurrency(booking.couponApplied.discountAmount, currency)}` : ''}

Convenience Fee : FREE (Waived by TripVerse)
GST & Taxes     : 18% (Included)
------------------------------------------------------
TOTAL PAID      : ${formatCurrency(booking.amount, currency)}
------------------------------------------------------


100% Refundable if canceled 24 hours prior to departure.
TripVerse 24/7 Traveler Helpdesk: support@tripverse.app
Thank you for exploring the world with TripVerse!
======================================================
`;
}

/**
 * Asynchronously load the official Razorpay Checkout SDK
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Create a Razorpay Order via serverless proxy
 */
export async function createRazorpayOrder(params: {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}): Promise<{ ok: boolean; mode: 'live' | 'unavailable' | 'simulation'; keyId?: string; orderId?: string; error?: string; message?: string }> {
  try {
    const res = await fetch('/api/create-razorpay-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, mode: 'unavailable', error: err?.message, message: err?.message };
  }
}

/**
 * Verify Razorpay payment signature via serverless proxy
 */
export async function verifyRazorpayPayment(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ ok: boolean; verified: boolean; error?: string }> {
  try {
    const res = await fetch('/api/verify-razorpay-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, verified: false, error: err?.message };
  }
}

