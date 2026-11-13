import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCachedApiResponse,
  setCachedApiResponse,
  buildItinerarySignature,
  getCachedAiItinerary,
  setCachedAiItinerary,
  clearMemoryCache
} from '../src/services/edgeCacheService';
import { Trip } from '../src/types/trip';

describe('Edge & Database Caching Engine (edgeCacheService)', () => {
  beforeEach(() => {
    clearMemoryCache();
  });

  describe('API Response Caching', () => {
    it('returns null on cache miss', async () => {
      const result = await getCachedApiResponse('weather:non-existent:key');
      expect(result).toBeNull();
    });

    it('stores and retrieves cached API response instantaneously', async () => {
      const key = 'weather:26.91:75.78:3d';
      const mockPayload = { temp: 28, condition: 'Sunny & Crisp' };

      await setCachedApiResponse(key, mockPayload, 3600);
      const retrieved = await getCachedApiResponse<typeof mockPayload>(key);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.temp).toBe(28);
      expect(retrieved?.condition).toBe('Sunny & Crisp');
    });

    it('normalizes endpoint keys with lowercase and trimmed spaces', async () => {
      const rawKey = '  Wiki:Hawa-Mahal  ';
      const mockPhoto = 'https://images.wikimedia.org/hawa_mahal.jpg';

      await setCachedApiResponse(rawKey, mockPhoto, 3600);
      const retrieved = await getCachedApiResponse<string>('wiki:hawa-mahal');

      expect(retrieved).toBe(mockPhoto);
    });

    it('respects expired entries in memory', async () => {
      const key = 'test:expired:key';
      // Set TTL to -1 second (already expired)
      await setCachedApiResponse(key, { valid: false }, -1);
      const retrieved = await getCachedApiResponse(key);

      expect(retrieved).toBeNull();
    });
  });

  describe('AI Itinerary Caching & Signatures', () => {
    it('generates deterministic signatures matching across casing and spacing', () => {
      const sig1 = buildItinerarySignature('Jaipur', 3, 'couple', 'relaxed', 20000);
      const sig2 = buildItinerarySignature('  jaipur  ', 3, 'COUPLE', 'RELAXED', 20000);

      expect(sig1).toBe(sig2);
      expect(sig1).toBe('itinerary:jaipur:3d:couple:relaxed:b20000');
    });

    it('buckets budgets into standardized tiers to maximize cache hit rate', () => {
      const sigA = buildItinerarySignature('Udaipur', 4, 'solo', 'balanced', 24800);
      const sigB = buildItinerarySignature('Udaipur', 4, 'solo', 'balanced', 25200);

      // Both should round to 25000 bucket
      expect(sigA).toBe(sigB);
      expect(sigA).toContain('b25000');
    });

    it('stores and retrieves full AI Trip itineraries', async () => {
      const sig = buildItinerarySignature('Goa', 3, 'friends', 'vibrant', 30000);
      const mockTrip: Trip = {
        id: 'trip-goa-123',
        name: 'Vibrant Goa Coastal Tour',
        origin: 'Mumbai',
        destination: 'Goa',
        durationDays: 3,
        travelersCount: 4,
        totalBudget: 30000,
        itinerary: [
          {
            dayNumber: 1,
            title: 'North Goa Beaches',
            activities: []
          }
        ],
        status: 'upcoming'
      } as Trip;

      await setCachedAiItinerary(sig, 'Goa', 3, mockTrip);
      const cached = await getCachedAiItinerary(sig);

      expect(cached).not.toBeNull();
      expect(cached?.name).toBe('Vibrant Goa Coastal Tour');
      expect(cached?.destination).toBe('Goa');
      expect(cached?.itinerary.length).toBe(1);
    });

    it('clearMemoryCache wipes in-memory tier', async () => {
      await setCachedApiResponse('temp:key', { test: true }, 60);
      clearMemoryCache();
      const res = await getCachedApiResponse('temp:key');
      expect(res).toBeNull();
    });
  });
});
