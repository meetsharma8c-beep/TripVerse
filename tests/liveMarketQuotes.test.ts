import { describe, it, expect, afterEach } from 'vitest';
import transitHandler from '../api/transit-schedules.js';
import {
  resolveIataCodeForCity,
  applyLiveMarketQuotesToTrip,
  LiveMarketQuoteResult,
} from '../src/services/liveMarketQuoteService';
import { buildPrompt } from '../src/services/aiTripPlanner';
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
  const prevSerpKey = process.env.SERPAPI_API_KEY;
  const prevClientId = process.env.AMADEUS_CLIENT_ID;
  const prevClientSecret = process.env.AMADEUS_CLIENT_SECRET;

  afterEach(() => {
    if (prevSerpKey === undefined) delete process.env.SERPAPI_API_KEY;
    else process.env.SERPAPI_API_KEY = prevSerpKey;
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

  it('returns honest seasonal_model_fallback when live market credentials are not configured', async () => {
    delete process.env.SERPAPI_API_KEY;
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
        query: { action: 'market_quotes', originCode: 'BOM', destCode: 'GOI', destination: 'Goa', departureDate: '2026-12-20', returnDate: '2026-12-23', adults: '2', mode: 'flight' },
        headers: {},
      },
      res
    );

    expect(statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.isLiveMarket).toBe(false);
    expect(body.provider).toBe('seasonal_model_fallback');
    expect(body.reason).toBe('LIVE_MARKET_CREDENTIALS_NOT_CONFIGURED');
  });

  it('re-calibrates trip flight cost, hotel selection, and total budget from live Google Flights & Hotels quotes', () => {
    const liveQuote: LiveMarketQuoteResult = {
      isLiveMarket: true,
      provider: 'google_live_serpapi',
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
    expect(calibrated.selectedHotel?.name).toBe('Panjim Boutique Heritage Inn');
    expect(calibrated.budgetBreakdown.accommodation).toBe(10800);
    expect(calibrated.estimatedTotal).toBe(14800 + 10800 + 4000 + 2500 + 1500);
    expect(calibrated.aiRationale).toContain('Live Google Flights & Hotels');
    expect(calibrated.aiRationale).toContain('IndiGo');
  });

  it('pivots hotel tier, scales on-ground spend, and injects liveMarketValuation into AI prompt when peak market prices surge', () => {
    const surgeQuote: LiveMarketQuoteResult = {
      isLiveMarket: true,
      provider: 'google_live_serpapi',
      environment: 'production',
      currency: 'INR',
      flights: {
        bestOffer: {
          totalGroupAmount: 24500,
          perPersonAmount: 12250,
          currency: 'INR',
          carrierCode: '6E',
          carrierName: 'IndiGo',
          stops: 0,
          duration: '1h 15m',
        },
        medianGroupAmount: 26000,
        sampleCount: 6,
        offers: [],
      },
      hotels: [
        {
          hotelId: 'HTLGOI_MID',
          name: 'Panjim Boutique Heritage Inn',
          rating: 4.5,
          totalStayAmount: 10800,
          nightlyRatePerRoom: 3600,
          currency: 'INR',
          roomCategory: 'Deluxe Room',
          available: true,
        },
        {
          hotelId: 'HTLGOI_VAL',
          name: 'Moustache Goa Value Stay',
          rating: 4.4,
          totalStayAmount: 5400,
          nightlyRatePerRoom: 1800,
          currency: 'INR',
          roomCategory: 'Standard Room',
          available: true,
        },
      ],
      fetchedAt: '2026-11-25T08:30:00.000Z',
    };

    const calibrated = applyLiveMarketQuotesToTrip(BASE_TRIP, surgeQuote);
    // Automatically picks ₹1,800/night value stay instead of ₹3,600/night because ₹24,500 flight squeezed headroom
    expect(calibrated.selectedHotel?.name).toBe('Moustache Goa Value Stay');
    expect(calibrated.budgetBreakdown.accommodation).toBe(5400);
    // Scales down food + activities + buffer from 8000 -> ~5100 so total stays anchored to ₹35,000 budget
    expect(calibrated.estimatedTotal).toBeLessThanOrEqual(36500);
    expect(calibrated.aiRationale).toContain('live airfare consumes 70% of budget');

    const prompt = buildPrompt(
      {
        origin: 'Mumbai',
        destination: 'Goa',
        durationDays: 4,
        travelersCount: 2,
        travelerType: 'couple',
        budgetMode: 'total',
        budgetAmount: 35000,
        preferences: ['beach', 'food'],
        transportMode: 'flight',
      },
      calibrated,
      surgeQuote
    );
    expect(prompt).toContain('"isLiveMarket": true');
    expect(prompt).toContain('"marketPurchasingPowerTier": "tight_value"');
    expect(prompt).toContain('REAL-TIME MARKET VALUE ALIGNMENT');
  });
});
