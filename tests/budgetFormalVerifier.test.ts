import { describe, it, expect } from 'vitest';
import { computeTripBudgetFloors, verifyTripBudgetLocally } from '../src/services/budgetFormalVerifier';
import { Trip } from '../src/types/trip';

describe('CONCODE v4.0 APEX Formal Budget Verifier', () => {
  it('returns PROVEN_SAT when categories sum within total budget and respect floors', () => {
    const res = verifyTripBudgetLocally(
      73500,
      { transportation: 12000, accommodation: 21000, food: 9000, activities: 6000, miscellaneous: 4000 },
      { transport: 8000, accommodation: 12000, food: 5000, activities: 2000, buffer: 2000 }
    );
    expect(res.isSatisfiable).toBe(true);
    expect(res.status).toBe('PROVEN_SAT');
    expect(res.currentSum).toBe(52000);
    expect(res.delta).toBe(21500);
    expect(res.unsatCore).toEqual([]);
  });

  it('computes a mathematically valid rebalance witness when over budget but floors are feasible', () => {
    const res = verifyTripBudgetLocally(
      40000,
      { transportation: 16000, accommodation: 18000, food: 8000, activities: 6000, miscellaneous: 4000 },
      { transport: 10000, accommodation: 10000, food: 4000, activities: 2000, buffer: 2000 }
    );
    expect(res.isSatisfiable).toBe(true);
    expect(res.status).toBe('REBALANCE_AVAILABLE');
    const witnessSum =
      res.witness.transportation +
      res.witness.accommodation +
      res.witness.food +
      res.witness.activities +
      res.witness.miscellaneous;
    expect(witnessSum).toBeLessThanOrEqual(40000);
    expect(res.witness.transportation).toBeGreaterThanOrEqual(10000);
    expect(res.witness.accommodation).toBeGreaterThanOrEqual(10000);
  });

  it('returns UNSAT_CONFLICT with conflict core when mandatory floors exceed ceiling', () => {
    const res = verifyTripBudgetLocally(
      20000,
      { transportation: 18000, accommodation: 12000, food: 4000, activities: 2000, miscellaneous: 1000 },
      { transport: 15000, accommodation: 10000, food: 3000, activities: 1000, buffer: 500 }
    );
    expect(res.isSatisfiable).toBe(false);
    expect(res.status).toBe('UNSAT_CONFLICT');
    expect(res.unsatCore.length).toBeGreaterThan(0);
    expect(res.unsatCore).toContain('ceiling_20000');
  });

  it('grounds floor computation in live market flight and hotel quotes when present', () => {
    const mockTrip = {
      id: 't1',
      name: 'Goa',
      origin: 'Mumbai',
      destination: 'Goa',
      durationDays: 4,
      travelersCount: 2,
      totalBudget: 60000,
      budgetBreakdown: { transportation: 34000, accommodation: 12000, food: 6000, activities: 4000, miscellaneous: 3000 },
      liveMarketPricing: {
        isLiveMarket: true,
        provider: 'google_live_serpapi',
        flights: {
          bestOffer: { totalGroupAmount: 33208, perPersonAmount: 16604, currency: 'INR', carrierCode: '6E', carrierName: 'IndiGo', stops: 0, duration: '1h 15m' },
          sampleCount: 10,
          offers: []
        },
        hotels: [{ hotelId: 'h1', name: 'Moustache Goa', rating: 4.4, totalStayAmount: 6003, nightlyRatePerRoom: 2001, currency: 'INR', available: true }]
      }
    } as unknown as Trip;

    const liveQuotes = {
      ok: true,
      isLiveMarket: true,
      provider: 'google_live_serpapi',
      currency: 'INR',
      flights: {
        bestOffer: { totalGroupAmount: 33208, perPersonAmount: 16604, currency: 'INR', carrierCode: '6E', carrierName: 'IndiGo', stops: 0, duration: '1h 15m' },
        sampleCount: 10,
        offers: []
      },
      hotels: [{ hotelId: 'h1', name: 'Moustache Goa', rating: 4.4, totalStayAmount: 6003, nightlyRatePerRoom: 2001, currency: 'INR', available: true }]
    };

    const floors = computeTripBudgetFloors(mockTrip, liveQuotes as any);
    expect(floors.transport).toBeGreaterThan(30000);
    expect(floors.accommodation).toBeGreaterThan(5000);
  });
});
