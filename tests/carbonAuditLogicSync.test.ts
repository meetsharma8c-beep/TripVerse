import { describe, it, expect, beforeEach } from 'vitest';
import { parseTripSubTab, isValidPlaceQuery } from '../src/utils/routeResolver';
import {
  getRealTripBookingRefs,
  saveRealTripBookingRefs,
  clearRealTripBookingRefs,
  generatePassWalletSummaryText
} from '../src/services/paymentGatewayService';
import createRazorpayOrderHandler from '../api/create-razorpay-order.js';

describe('Carbon Audit Logic & Route Sync Guards', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('parses valid TripDetail sub-tabs case-insensitively and rejects unknown values', () => {
    expect(parseTripSubTab('budget')).toBe('budget');
    expect(parseTripSubTab('ROUTE')).toBe('route');
    expect(parseTripSubTab(' safety ')).toBe('safety');
    expect(parseTripSubTab('breakstops')).toBe('breakstops');
    expect(parseTripSubTab('nonexistent')).toBeUndefined();
    expect(parseTripSubTab(null)).toBeUndefined();
  });

  it('rejects punctuation, pure digits, and placeholder strings in place queries', () => {
    expect(isValidPlaceQuery('???')).toBe(false);
    expect(isValidPlaceQuery('12345')).toBe(false);
    expect(isValidPlaceQuery('undefined')).toBe(false);
    expect(isValidPlaceQuery('Kyoto')).toBe(true);
    expect(isValidPlaceQuery('Amalfi Coast')).toBe(true);
  });

  it('persists, normalizes, exports, and clears user-entered official carrier PNR & hotel refs', () => {
    expect(getRealTripBookingRefs('trip-udaipur-1')).toBeNull();

    const saved = saveRealTripBookingRefs({
      tripId: 'trip-udaipur-1',
      transitProvider: '  IndiGo ',
      transitPnr: ' ab4k9x ',
      seatOrCoach: ' 14a ',
      hotelName: ' Taj Lake Palace ',
      hotelConfirmationCode: ' BKG-4920183 '
    });

    expect(saved).not.toBeNull();
    expect(saved?.transitPnr).toBe('AB4K9X');
    expect(saved?.seatOrCoach).toBe('14A');
    expect(saved?.hotelConfirmationCode).toBe('BKG-4920183');

    const loaded = getRealTripBookingRefs('trip-udaipur-1');
    expect(loaded?.transitProvider).toBe('IndiGo');
    expect(loaded?.transitPnr).toBe('AB4K9X');

    const summary = generatePassWalletSummaryText(
      { name: 'Udaipur Escape', origin: 'Mumbai', destination: 'Udaipur', durationDays: 3, travelersCount: 2 },
      loaded!
    );
    expect(summary).toContain('AB4K9X (IndiGo)');
    expect(summary).toContain('BKG-4920183 (Taj Lake Palace)');

    clearRealTripBookingRefs('trip-udaipur-1');
    expect(getRealTripBookingRefs('trip-udaipur-1')).toBeNull();
  });

  it('blocks non-Pro travel package orders in create-razorpay-order serverless handler', async () => {
    const prevKeyId = process.env.RAZORPAY_KEY_ID;
    const prevSecret = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy_guard';
    process.env.RAZORPAY_KEY_SECRET = 'dummy_secret_guard';

    try {
      let statusCode = 200;
      let jsonPayload: any = null;
      const req: any = {
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' },
        body: {
          amount: 18500,
          currency: 'INR',
          notes: { packageType: 'full_package', tripId: 'trip-1' }
        }
      };
      const res: any = {
        setHeader: () => {},
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(body: any) {
          jsonPayload = body;
          return this;
        },
        end() {
          return this;
        }
      };

      await createRazorpayOrderHandler(req, res);
      expect(statusCode).toBe(400);
      expect(jsonPayload?.ok).toBe(false);
      expect(jsonPayload?.error).toBe('UNSUPPORTED_PACKAGE_TYPE');
    } finally {
      if (prevKeyId === undefined) delete process.env.RAZORPAY_KEY_ID;
      else process.env.RAZORPAY_KEY_ID = prevKeyId;
      if (prevSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
      else process.env.RAZORPAY_KEY_SECRET = prevSecret;
    }
  });
});
