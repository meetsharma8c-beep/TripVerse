import { describe, it, expect } from 'vitest';
import { checkDistributedRateLimit, applyRateLimitHeaders } from '../api/rateLimiter.js';
import {
  saveTripsToOfflineDb,
  loadTripsFromOfflineDb,
  saveOfflineKv,
  loadOfflineKv,
  mergeTripsWithConflictResolution
} from '../src/services/offlineDbService';
import { generateTripIcs, parseActivityTime } from '../src/services/calendarExportService';
import { subscribeToTripPresence } from '../src/services/collaborationService';
import { resolveConcodeSafetyRadar } from '../src/services/concodeSafetyRadarService';
import { resolveEmergencyCountryCode, getEmergencyNumbersForCountry } from '../src/services/emergencySosService';
import { selectHotelForTrip } from '../src/services/hotelService';
import { generateSmartPackingList } from '../src/services/packingService';
import { getTravelReadinessInfo } from '../src/services/travelReadinessService';
import { buildGoogleMapsDayRouteUrl } from '../src/utils/routeResolver';
import type { Trip } from '../src/types/trip';

const sampleTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-cal-1',
  origin: 'Tokyo',
  destination: 'Kyoto, Japan',
  startDate: '2026-11-10',
  endDate: '2026-11-12',
  durationDays: 2,
  travelers: 2,
  travelMode: 'train',
  budgetTier: 'mid-range',
  totalBudget: 60000,
  estimatedTotal: 54000,
  budgetBreakdown: {
    transportation: 15000,
    accommodation: 20000,
    food: 10000,
    activities: 6000,
    miscellaneous: 3000
  },
  itinerary: [
    {
      dayNumber: 1,
      title: 'Temples & Gion',
      dayEstimatedCost: 4000,
      activities: [
        {
          id: 'act-1',
          dayNumber: 1,
          time: '09:30 AM',
          title: 'Fushimi Inari, Shrine & Trail',
          type: 'attraction',
          location: 'Fushimi Ward, Kyoto',
          estimatedCost: 0,
          travelTimeMin: 20,
          distanceKm: 4.5,
          description: 'Walk through the iconic torii gates; arrive early.',
          tag: 'Heritage',
          completed: false
        },
        {
          id: 'act-2',
          dayNumber: 1,
          time: '01:15 PM',
          title: 'Nishiki Market Lunch',
          type: 'food',
          location: 'Nishiki Market, Kyoto',
          estimatedCost: 2500,
          travelTimeMin: 15,
          distanceKm: 3.2,
          description: 'Local matcha & street food tasting',
          tag: 'Food',
          completed: false
        }
      ]
    }
  ],
  breakStops: [],
  createdAt: '2026-11-01T10:00:00.000Z',
  ...overrides
});

describe('TripVerse Platform Improvements', () => {
  describe('Distributed Rate Limiter & Headers', () => {
    it('falls back cleanly to in-memory limiter when Upstash env vars are unset', async () => {
      const key = `dist_rl_${Date.now()}`;
      const r1 = await checkDistributedRateLimit(key, 2, 10_000);
      const r2 = await checkDistributedRateLimit(key, 2, 10_000);
      const r3 = await checkDistributedRateLimit(key, 2, 10_000);

      expect(r1.allowed).toBe(true);
      expect(r1.distributed).toBe(false);
      expect(r2.allowed).toBe(true);
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
    });

    it('sets standard X-RateLimit-* headers', () => {
      const headers: Record<string, string> = {};
      const mockRes = {
        setHeader: (k: string, v: string) => {
          headers[k] = v;
        }
      };
      applyRateLimitHeaders(mockRes, { limit: 30, remaining: 29, resetMs: 60_000 });
      expect(headers['X-RateLimit-Limit']).toBe('30');
      expect(headers['X-RateLimit-Remaining']).toBe('29');
      expect(Number(headers['X-RateLimit-Reset'])).toBeGreaterThan(0);
    });
  });

  describe('Offline IndexedDB Service & Conflict Resolution', () => {
    it('persists and retrieves trips and KV payloads via offline fallback store', async () => {
      const trip = sampleTrip();
      await saveTripsToOfflineDb('user-offline-1', [trip]);
      const loaded = await loadTripsFromOfflineDb('user-offline-1');
      expect(loaded).toHaveLength(1);
      expect(loaded?.[0].id).toBe('trip-cal-1');

      await saveOfflineKv('pass-1', { gate: 'A12', seat: '14F' });
      const pass = await loadOfflineKv<{ gate: string; seat: string }>('pass-1');
      expect(pass).toEqual({ gate: 'A12', seat: '14F' });
    });

    it('merges local and remote trips using Last-Write-Wins without losing unique trips', () => {
      const localOnly = sampleTrip({ id: 'local-1', destination: 'Local Offline Draft', createdAt: '2026-11-05T10:00:00.000Z' });
      const remoteOnly = sampleTrip({ id: 'remote-1', destination: 'Cloud Trip', createdAt: '2026-11-04T10:00:00.000Z' });
      const sharedLocalNewer = sampleTrip({ id: 'shared-1', destination: 'Edited Offline', createdAt: '2026-11-06T12:00:00.000Z' });
      const sharedRemoteOlder = sampleTrip({ id: 'shared-1', destination: 'Stale Cloud', createdAt: '2026-11-06T08:00:00.000Z' });
      const sharedLocalOlder = sampleTrip({ id: 'shared-2', destination: 'Stale Local', createdAt: '2026-11-02T08:00:00.000Z' });
      const sharedRemoteNewer = sampleTrip({ id: 'shared-2', destination: 'Fresh Cloud', createdAt: '2026-11-07T08:00:00.000Z' });

      const result = mergeTripsWithConflictResolution(
        [localOnly, sharedLocalNewer, sharedLocalOlder],
        [remoteOnly, sharedRemoteOlder, sharedRemoteNewer]
      );

      expect(result.merged).toHaveLength(4);
      expect(result.resolvedConflicts).toBe(2);
      expect(result.localWins).toBe(1);
      expect(result.remoteWins).toBe(1);

      const byId = new Map(result.merged.map(t => [t.id, t]));
      expect(byId.get('shared-1')?.destination).toBe('Edited Offline');
      expect(byId.get('shared-2')?.destination).toBe('Fresh Cloud');
      expect(byId.get('local-1')?.destination).toBe('Local Offline Draft');
      expect(byId.get('remote-1')?.destination).toBe('Cloud Trip');
    });
  });

  describe('RFC 5545 Calendar (.ics) Export', () => {
    it('parses 12-hour, 24-hour, and descriptive time strings accurately', () => {
      expect(parseActivityTime('09:30 AM')).toEqual({ hours: 9, minutes: 30 });
      expect(parseActivityTime('01:15 PM')).toEqual({ hours: 13, minutes: 15 });
      expect(parseActivityTime('12:00 AM')).toEqual({ hours: 0, minutes: 0 });
      expect(parseActivityTime('18:45')).toEqual({ hours: 18, minutes: 45 });
      expect(parseActivityTime('Evening')).toEqual({ hours: 18, minutes: 0 });
    });

    it('generates valid VCALENDAR with properly escaped commas/semicolons and VEVENT entries', () => {
      const ics = generateTripIcs(sampleTrip());
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('DTSTART:20261110T093000');
      expect(ics).toContain('DTSTART:20261110T131500');
      expect(ics).toContain('SUMMARY:[Day 1] Fushimi Inari\\, Shrine & Trail');
      expect(ics).toContain('Walk through the iconic torii gates\\; arrive early.');
    });
  });

  describe('Realtime Collaboration Presence', () => {
    it('emits self presence immediately when offline / unconfigured and cleans up cleanly', () => {
      let synced: any[] = [];
      const unsub = subscribeToTripPresence(
        'trip-cal-1',
        { userId: 'u-1', name: 'Aarav', activeTab: 'itinerary' },
        (members) => {
          synced = members;
        }
      );
      expect(synced.length).toBeGreaterThanOrEqual(1);
      expect(synced[0].userId).toBe('u-1');
      expect(typeof unsub).toBe('function');
      unsub();
    });
  });

  describe('Global Safety Radar, Travel Readiness, Packing & Day Google Maps Route', () => {
    it('returns 911 (US/CA) and 000 (AU) emergency numbers and never leaks India 100/108 globally', () => {
      expect(resolveEmergencyCountryCode('New Jersey')).toBe('US');
      expect(getEmergencyNumbersForCountry('US').universalOrPolice).toBe('911');
      expect(resolveEmergencyCountryCode('Toronto, Canada')).toBe('CA');
      expect(getEmergencyNumbersForCountry('CA').universalOrPolice).toBe('911');
      expect(resolveEmergencyCountryCode('Sydney, Australia')).toBe('AU');
      expect(getEmergencyNumbersForCountry('AU').universalOrPolice).toBe('000');

      const njRadar = resolveConcodeSafetyRadar('New Jersey');
      const numbers = njRadar.emergencyNumbers.map(n => n.number);
      expect(numbers).toContain('911');
      expect(numbers.join(' ')).not.toContain('100');
      expect(numbers.join(' ')).not.toContain('108');
    });

    it('uses honest non-fabricated stay tier names for unlisted global cities', () => {
      const result = selectHotelForTrip({
        destination: 'New Jersey',
        durationDays: 5,
        travelersCount: 2,
        totalBudget: 150000,
        accommodationType: 'budget'
      });
      expect(result.recommendedHotel.name).not.toContain('City Center Comfort Hotel');
      expect(result.recommendedHotel.name).toContain('Recommended');
    });

    it('generates international + cold-climate packing items for 1°C New Jersey', () => {
      const njTrip = sampleTrip({
        destination: 'New Jersey',
        destinationDetails: { coordinates: { lat: 40.0583, lng: -74.4057 }, country: 'United States' } as any
      });
      const items = generateSmartPackingList(njTrip, { minTempC: 1, maxTempC: 10, maxRainProb: 60 });
      const names = items.map(i => i.name).join(' | ');
      expect(names).toContain('Passport');
      expect(names).toContain('Insulated Winter Coat');
      expect(names).toContain('Umbrella');
    });

    it('provides Before You Fly travel readiness for overseas destinations and null for domestic India', () => {
      const us = getTravelReadinessInfo('New Jersey');
      expect(us).not.toBeNull();
      expect(us?.countryCode).toBe('US');
      expect(us?.plugTypes).toContain('Type A');
      expect(us?.emergencyDial).toBe('911');

      expect(getTravelReadinessInfo('Vadodara, Gujarat')).toBeNull();
    });

    it('builds a valid multi-waypoint Google Maps directions URL for a full day itinerary', () => {
      const url = buildGoogleMapsDayRouteUrl(
        [
          { title: 'Liberty State Park', coordinates: { lat: 40.7031, lng: -74.0539 } },
          { title: 'Hoboken Waterfront', coordinates: { lat: 40.744, lng: -74.027 } },
          { title: 'Princeton University', coordinates: { lat: 40.3431, lng: -74.6551 } }
        ],
        'New Jersey'
      );
      expect(url).toContain('https://www.google.com/maps/dir/?');
      expect(url).toContain('origin=40.70310%2C-74.05390');
      expect(url).toContain('destination=40.34310%2C-74.65510');
      expect(url).toContain('waypoints=40.74400%2C-74.02700');
    });
  });
});
