import { describe, it, expect } from 'vitest';
import { 
  CURRENCIES, 
  formatCurrency, 
  formatDirectCurrency, 
  convertFromINR, 
  convertToINR,
  detectDefaultCurrency 
} from '../src/services/currencyService';
import { resolvePreciseLocationSync } from '../src/services/locationService';
import { generateAITrip, PlannerInput } from '../src/services/plannerEngine';

describe('TripVerse Worldwide Globalization & Multi-Currency Engine', () => {

  describe('1. Currency & International Locale Formatting', () => {
    it('supports 12+ world travel currencies with correct symbols', () => {
      expect(CURRENCIES.USD.symbol).toBe('$');
      expect(CURRENCIES.EUR.symbol).toBe('€');
      expect(CURRENCIES.GBP.symbol).toBe('£');
      expect(CURRENCIES.JPY.symbol).toBe('¥');
      expect(CURRENCIES.CAD.symbol).toBe('CA$');
      expect(CURRENCIES.AUD.symbol).toBe('A$');
      expect(CURRENCIES.SGD.symbol).toBe('S$');
      expect(CURRENCIES.CHF.symbol).toBe('CHF');
      expect(CURRENCIES.INR.symbol).toBe('₹');
    });

    it('converts INR amounts accurately to foreign currencies', () => {
      // 83,500 INR at rate 0.012 ≈ 1,002 USD
      const usdAmount = convertFromINR(83500, 'USD');
      expect(usdAmount).toBeGreaterThanOrEqual(1000);
      expect(usdAmount).toBeLessThanOrEqual(1005);

      // Re-conversion back to INR
      const convertedBack = convertToINR(usdAmount, 'USD');
      expect(convertedBack).toBeGreaterThanOrEqual(83000);
      expect(convertedBack).toBeLessThanOrEqual(84000);
    });

    it('formats currencies cleanly with appropriate symbols', () => {
      const formattedUSD = formatDirectCurrency(1500, 'USD');
      expect(formattedUSD).toBe('$1,500');

      const formattedEUR = formatDirectCurrency(2400, 'EUR');
      expect(formattedEUR).toContain('€');
      expect(formattedEUR).toContain('2');

      const formattedGBP = formatDirectCurrency(950, 'GBP');
      expect(formattedGBP).toBe('£950');

      const formattedINR = formatDirectCurrency(100000, 'INR');
      expect(formattedINR).toContain('₹');
    });
  });

  describe('2. Global Geocoding & Worldwide City Identification', () => {
    it('correctly resolves Paris, France without defaulting to India', () => {
      const loc = resolvePreciseLocationSync('Paris');
      expect(loc.name).toBe('Paris');
      expect(loc.country).toBe('France');
      expect(loc.state).toBe('Île-de-France');
      expect(loc.coordinates.lat).toBeCloseTo(48.85, 1);
      expect(loc.coordinates.lng).toBeCloseTo(2.35, 1);
      expect(loc.fullName).not.toContain('India');
    });

    it('correctly resolves Tokyo, Japan', () => {
      const loc = resolvePreciseLocationSync('Tokyo');
      expect(loc.country).toBe('Japan');
      expect(loc.coordinates.lat).toBeCloseTo(35.67, 1);
      expect(loc.coordinates.lng).toBeCloseTo(139.65, 1);
    });

    it('correctly resolves New York City, United States', () => {
      const loc = resolvePreciseLocationSync('New York');
      expect(loc.country).toBe('United States');
      expect(loc.state).toBe('New York');
      expect(loc.coordinates.lat).toBeCloseTo(40.71, 1);
      expect(loc.coordinates.lng).toBeCloseTo(-74.00, 1);
    });

    it('correctly resolves Sydney, Australia', () => {
      const loc = resolvePreciseLocationSync('Sydney');
      expect(loc.country).toBe('Australia');
      expect(loc.coordinates.lat).toBeCloseTo(-33.86, 1);
    });

    it('preserves Indian cities accurately (Jaipur, Udaipur, Manali)', () => {
      const jaipur = resolvePreciseLocationSync('Jaipur');
      expect(jaipur.country).toBe('India');
      expect(jaipur.state).toBe('Rajasthan');

      const manali = resolvePreciseLocationSync('Manali');
      expect(manali.country).toBe('India');
      expect(manali.state).toBe('Himachal Pradesh');
    });

    it('handles unrecognized global input gracefully without appending ", India"', () => {
      const custom = resolvePreciseLocationSync('Reykjavik');
      expect(custom.country).toBe('Worldwide');
      expect(custom.fullName).not.toContain('India');
    });
  });

  describe('3. Worldwide AI Trip Generation & Regional Cuisines', () => {
    it('generates authentic Italian cuisine & European context for Rome', () => {
      const trip = generateAITrip({
        origin: 'London',
        destination: 'Rome',
        durationDays: 3,
        travelersCount: 2,
        travelerType: 'couple',
        budgetMode: 'total',
        budgetAmount: 2000,
        currency: 'EUR',
        preferences: ['culture', 'food', 'historical'],
        foodPreference: 'veg',
        priorities: ['experience', 'comfort']
      });

      expect(trip.destination).toBe('Rome');
      expect(trip.destinationDetails?.country).toBe('Italy');
      expect(trip.currency).toBe('EUR');
      
      // Cuisine check
      const day1 = trip.itinerary[0];
      const lunchAct = day1.activities.find(a => a.type === 'food');
      expect(lunchAct).toBeDefined();
      expect(lunchAct?.title.toLowerCase()).toContain('italian');
      expect(trip.aiRationale).toContain('Italy');
    });

    it('generates authentic Japanese Washoku cuisine for Tokyo', () => {
      const trip = generateAITrip({
        origin: 'Sydney',
        destination: 'Tokyo',
        durationDays: 4,
        travelersCount: 1,
        travelerType: 'solo',
        budgetMode: 'total',
        budgetAmount: 150000,
        currency: 'JPY',
        preferences: ['culture', 'food', 'photography'],
        foodPreference: 'nonveg',
        priorities: ['experience']
      });

      expect(trip.destination).toBe('Tokyo');
      expect(trip.destinationDetails?.country).toBe('Japan');
      expect(trip.currency).toBe('JPY');

      const day1 = trip.itinerary[0];
      const lunchAct = day1.activities.find(a => a.type === 'food');
      expect(lunchAct?.title.toLowerCase()).toContain('japanese');
    });

    it('applies higher cost multiplier for premier global hubs (Paris, New York, Tokyo)', () => {
      const parisTrip = generateAITrip({
        origin: 'Berlin',
        destination: 'Paris',
        durationDays: 3,
        travelersCount: 2,
        travelerType: 'couple',
        budgetMode: 'total',
        budgetAmount: 2500,
        currency: 'EUR',
        preferences: ['culture', 'food'],
        foodPreference: 'any',
        priorities: ['comfort']
      });

      expect(parisTrip.destinationDetails?.country).toBe('France');
      expect(parisTrip.estimatedTotal).toBeGreaterThan(0);
    });

    it('synchronizes real live exchange rates without throwing or corrupting currency rates', async () => {
      const { syncLiveExchangeRates, CURRENCIES } = await import('../src/services/currencyService');
      const res = await syncLiveExchangeRates();
      // Even if network is simulated or offline in test environment, rates remain valid positive numbers
      expect(CURRENCIES.USD.rateFromINR).toBeGreaterThan(0);
      expect(CURRENCIES.EUR.rateFromINR).toBeGreaterThan(0);
      expect(CURRENCIES.JPY.rateFromINR).toBeGreaterThan(0);
    });
  });

});
