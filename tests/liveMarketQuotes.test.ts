import { describe, it, expect, afterEach } from 'vitest';
import transitHandler from '../api/transit-schedules.js';
import {
  resolveIataCodeForCity,
  applyLiveMarketQuotesToTrip,
  LiveMarketQuoteResult,
} from '../src/services/liveMarketQuoteService';
import { Trip } from '../src/types/trip';

const BASE_TRIP: Trip = {
  id: 'trip-live-market-1',
  name: 'Mumbai to Goa Flight Trip',
  origin: 'Mumbai',
  destination: 'Goa',
  startDate: '2026-12-20',
  durationDays: 4,
  travelersCount: 2,
  travelerType: 'couple',
  currency: 'INR',
  totalBudget: 35000,
  budgetPerPerson: 17500,
  estimatedTotal: 30000,
  transportMode: 'flight',
  preferences: ['beach', 'food'],
  budgetBreakdown: {
    transportation: 12000,
    accommodation: 10000,
    food: 4000,
    activities: 2500,
    miscellaneous: 1500,
  },
  itinerary: [],
  status: 'draft',
  createdAt: '2026-11-23T08:00:00.000Z',
};

describe('Live Market Pricing Engine (Amadeus Flights & Hotels)', () => {
  const prevClientId = process.env.AMADEUS_CLIENT_ID;
  const prevClientSecret = process.env.AMADEUS_CLIENT_SECRET;

  afterEach(() => {
    if (prevClientId === undefined) delete process.env.AMADEUS_CLIENT_ID;
    else process.env.AMADEUS_CLIENT_ID = prevClientId;
    if (prevClientSecret === undefined) delete process.env.AMADEUS_CLIENT_SECRET;
    else process.env.AMADEUS_CLIENT_SECRET = prevClientSecret;
  });

  it('resolves genuine IATA city/airport codes for Indian and global destinations', () => {
    expect(resolveIataCodeForCity('Vadodara, Gujarat')).toBe('BDQ');
    expect(resolveIataCodeForCity('Mathura')).toBe('AGR');
    expect(resolveIataCodeForCity('New Jersey')).toBe('EWR');
    expect(resolveIataCodeForCity('Paris, France')).toBe('PAR');
  });

  it('returns honest seasonal_model_fallback when Amadeus credentials are not configured', async () => {
    delete process.env.AMADEUS_CLIENT_ID;
    delete process.env.AMADEUS_CLIENT_SECRET;

    let statusCode = 0;
    let body: any = null;
    const res: any = {
      setHeader: () => {},
      status: (code: number) => {
        statusCode = code;
        return {
          json: (payload: any) => {
            body = payload;
            return res;
          },
          end: () => res,
        };
      },
    };

    await transitHandler(
      {
        method: 'GET',
        query: { action: 'market_quotes', originCode: 'BOM', destCode: 'GOI', departureDate: '2026-12-20', returnDate: '2026-12-23', adults: '2', mode: 'flight' },
        headers: {},
      },
      res
    );

    expect(statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.isLiveMarket).toBe(false);
    expect(body.provider).toBe('seasonal_model_fallback');
    expect(body.reason).toBe('AMADEUS_CREDENTIALS_NOT_CONFIGURED');
  });

  it('re-calibrates trip flight cost, hotel selection, and total budget from live Amadeus market quotes', () => {
    const liveQuote: LiveMarketQuoteResult = {
      isLiveMarket: true,
      provider: 'amadeus_live',
      environment: 'production',
      currency: 'INR',
      flights: {
        bestOffer: {
          totalGroupAmount: 14800,
          perPersonAmount: 7400,
          currency: 'INR',
          carrierCode: '6E',
          carrierName: 'IndiGo',
          stops: 0,
          duration: '1h 15m',
        },
        medianGroupAmount: 15600,
        sampleCount: 5,
        offers: [],
      },
      hotels: [
        {
          hotelId: 'HTLGOI01',
          name: 'Taj Fort Aguada Resort & Spa',
          rating: 4.8,
          totalStayAmount: 36000,
          nightlyRatePerRoom: 12000,
          currency: 'INR',
          roomCategory: 'Luxury Cottage',
          available: true,
        },
        {
          hotelId: 'HTLGOI02',
          name: 'Panjim Boutique Heritage Inn',
          rating: 4.5,
          totalStayAmount: 10800,
          nightlyRatePerRoom: 3600,
          currency: 'INR',
          roomCategory: 'Deluxe Room',
          available: true,
        },
      ],
      fetchedAt: '2026-11-23T09:00:00.000Z',
    };

    const calibrated = applyLiveMarketQuotesToTrip(BASE_TRIP, liveQuote);
    expect(calibrated.budgetBreakdown.transportation).toBe(14800);
    // Target nightly rate is ~3333 INR, so it picks Panjim Boutique Heritage Inn (3600/night * 3 nights * 1 room = 10800)
    expect(calibrated.selectedHotel?.name).toBe('Panjim Boutique Heritage Inn');
    expect(calibrated.budgetBreakdown.accommodation).toBe(10800);
    expect(calibrated.estimatedTotal).toBe(14800 + 10800 + 4000 + 2500 + 1500);
    expect(calibrated.aiRationale).toContain('Amadeus');
    expect(calibrated.aiRationale).toContain('IndiGo');
  });
});
