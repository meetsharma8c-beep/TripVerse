import { describe, it, expect } from 'vitest';
import {
  generateShareId,
  sanitizeTripForPublicShare,
  cloneSharedTripForUser,
  SharedTripDocument,
} from '../src/services/sharedTripService';
import { initTelemetry, getCapturedWebVitals } from '../src/services/telemetryService';
import transitHandler from '../api/transit-schedules.js';
import { Trip } from '../src/types/trip';

const SAMPLE_TRIP: Trip = {
  id: 'trip-mathura-101',
  userId: 'private-user-uid-999',
  name: 'Vadodara to Mathura Spiritual Train Journey',
  origin: 'Vadodara',
  destination: 'Mathura, Uttar Pradesh',
  startDate: '2026-12-10',
  durationDays: 3,
  travelersCount: 2,
  travelerType: 'couple',
  currency: 'INR',
  totalBudget: 18000,
  budgetPerPerson: 9000,
  estimatedTotal: 15500,
  transportMode: 'train',
  preferences: ['spiritual', 'culture'],
  budgetBreakdown: {
    transportation: 4200,
    accommodation: 6000,
    food: 2500,
    activities: 1800,
    miscellaneous: 1000,
  },
  itinerary: [
    {
      dayNumber: 1,
      title: 'Arrival & Yamuna Aarti',
      theme: 'Arrival & Yamuna Aarti',
      activities: [
        {
          id: 'act-1',
          time: '09:00',
          title: 'Shri Krishna Janmasthan',
          location: 'Mathura',
          description: 'Historic temple complex.',
          type: 'attraction',
          estimatedCost: 0,
          travelTimeMin: 15,
          distanceKm: 2.5,
          completed: true,
        },
      ],
    },
  ],
  expenses: [
    {
      id: 'exp-1',
      title: 'Private hotel advance',
      amount: 3000,
      category: 'accommodation',
      date: '2026-12-10',
      paidBy: 'Meet',
    },
  ],
  status: 'active',
  createdAt: '2026-11-23T08:00:00.000Z',
};

describe('Public Shared Trips, Live Transit Schedules & Telemetry', () => {
  it('generates unguessable URL-safe shareIds compliant with Firestore security rules (12..64 chars)', () => {
    const id = generateShareId();
    expect(id.length).toBeGreaterThanOrEqual(12);
    expect(id.length).toBeLessThanOrEqual(64);
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('strips private userId, personal expenses, photos, and completion flags before publishing', () => {
    const sanitized = sanitizeTripForPublicShare(SAMPLE_TRIP);
    expect(sanitized.userId).toBeUndefined();
    expect(sanitized.expenses).toEqual([]);
    expect(sanitized.photos).toEqual([]);
    expect(sanitized.itinerary[0].activities[0].completed).toBe(false);
    expect(sanitized.name).toBe(SAMPLE_TRIP.name);
  });

  it('clones a shared public trip into a fresh owned trip for the visitor', () => {
    const sharedDoc: SharedTripDocument = {
      shareId: 'tvs_AbCdEfGh123456',
      ownerUid: 'owner-1',
      ownerName: 'Meet',
      tripName: SAMPLE_TRIP.name,
      destination: SAMPLE_TRIP.destination,
      trip: sanitizeTripForPublicShare(SAMPLE_TRIP),
      createdAt: '2026-11-23T08:00:00.000Z',
      updatedAt: '2026-11-23T08:00:00.000Z',
      source: 'firestore',
    };

    const cloned = cloneSharedTripForUser(sharedDoc, 'visitor-uid-42');
    expect(cloned.id).not.toBe(sharedDoc.trip.id);
    expect(cloned.userId).toBe('visitor-uid-42');
    expect(cloned.destination).toBe('Mathura, Uttar Pradesh');
    expect(cloned.aiRationale).toContain('Meet');
  });

  it('returns genuine verified Indian Railways train numbers for Vadodara -> Mathura and Mumbai -> Goa', async () => {
    const invoke = async (query: Record<string, string>) => {
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
      await transitHandler({ method: 'GET', query, headers: {} }, res);
      return { statusCode, body };
    };

    const mathuraRes = await invoke({ origin: 'Vadodara', destination: 'Mathura', mode: 'train' });
    expect(mathuraRes.statusCode).toBe(200);
    expect(mathuraRes.body.originCode).toBe('BRC');
    expect(mathuraRes.body.destCode).toBe('MTJ');
    expect(mathuraRes.body.schedules.some((t: any) => t.number === '12951')).toBe(true);

    const goaRes = await invoke({ origin: 'Mumbai', destination: 'Goa', mode: 'train' });
    expect(goaRes.statusCode).toBe(200);
    expect(goaRes.body.schedules.some((t: any) => t.number === '22229')).toBe(true);
  });

  it('initializes Web Vitals telemetry safely without throwing in non-browser environments', () => {
    expect(() => initTelemetry()).not.toThrow();
    expect(Array.isArray(getCapturedWebVitals())).toBe(true);
  });
});
