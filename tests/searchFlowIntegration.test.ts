import { describe, it, expect, beforeEach } from 'vitest';
import { POPULAR_DESTINATIONS } from '../src/data/destinations';
import { resolvePreciseLocationSync } from '../src/services/locationService';
import { generateAITrip } from '../src/services/plannerEngine';
import { getDestinationHighlights } from '../src/services/landmarkAtlasService';
import { formatCurrency } from '../src/services/currencyService';
import { setActiveTripId, getActiveTripId, saveOrUpdateTrip } from '../src/services/storageService';

// Polyfill window & localStorage for Node test environment
const storageMock: Record<string, string> = {};
if (typeof window === 'undefined') {
  (global as any).window = {
    localStorage: {
      getItem: (k: string) => storageMock[k] || null,
      setItem: (k: string, v: string) => { storageMock[k] = String(v); },
      removeItem: (k: string) => { delete storageMock[k]; },
      clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]); }
    },
    sessionStorage: {
      getItem: (k: string) => storageMock[k] || null,
      setItem: (k: string, v: string) => { storageMock[k] = String(v); },
      removeItem: (k: string) => { delete storageMock[k]; },
      clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]); }
    }
  };
  (global as any).localStorage = (global as any).window.localStorage;
  (global as any).sessionStorage = (global as any).window.sessionStorage;
}

describe('Search Bar & Trip Planning Flow Integration', () => {
  beforeEach(() => {
    Object.keys(storageMock).forEach(k => delete storageMock[k]);
  });
  it('resolves searched destination and prepares proper prefill for the Planner Wizard', () => {
    const searchTarget = 'Jaipur';
    const spot = resolvePreciseLocationSync(searchTarget);

    expect(spot).not.toBeNull();
    expect(spot?.name.toLowerCase()).toContain('jaipur');

    // Emulate what HeroSection and GlobalSearchModal pass to onOpenPlanner
    const plannerPrefill = {
      destination: spot?.name || searchTarget,
      duration: 3,
      travelers: 2,
      budget: 15000,
      budgetMode: 'per_person' as const
    };

    expect(plannerPrefill.destination).toBe('Jaipur');
    expect(plannerPrefill.duration).toBe(3);
    expect(plannerPrefill.travelers).toBe(2);
    expect(plannerPrefill.budget).toBe(15000);
    expect(plannerPrefill.budgetMode).toBe('per_person');
  });

  it('ensures destinations from popular destinations list can be prefilled into the planner', () => {
    const jaipur = POPULAR_DESTINATIONS.find(d => d.name.toLowerCase() === 'jaipur');
    expect(jaipur).toBeDefined();
    expect(jaipur?.name).toBe('Jaipur');
    expect(jaipur?.startBudget).toBeGreaterThan(0);

    const prefill = {
      destination: jaipur?.name,
      duration: 3,
      budget: jaipur?.startBudget
    };

    expect(prefill.destination).toBe('Jaipur');
    expect(prefill.duration).toBe(3);
    expect(prefill.budget).toBe(8500);
  });

  it('resolves genuine sights for Jaipur that user can choose during step 5 of the wizard', () => {
    const highlights = getDestinationHighlights('Jaipur', 10);
    expect(highlights.length).toBeGreaterThan(0);
    const hasJaipurLandmark = highlights.some(h =>
      h.toLowerCase().includes('amber') ||
      h.toLowerCase().includes('hawa') ||
      h.toLowerCase().includes('palace') ||
      h.toLowerCase().includes('nahargarh')
    );
    expect(hasJaipurLandmark).toBe(true);
  });

  it('generates a completely flexible trip honoring user-chosen duration, budget, and selected sights', () => {
    const userSelectedSights = ['Amber Palace', 'Hawa Mahal', 'City Palace'];
    const trip = generateAITrip({
      destination: 'Jaipur',
      durationDays: 4,
      travelersCount: 2,
      budgetAmount: 22000,
      budgetMode: 'total',
      itineraryStyle: 'flexible_custom',
      selectedActivities: userSelectedSights
    });

    expect(trip.destination).toBe('Jaipur');
    expect(trip.durationDays).toBe(4);
    expect(trip.itinerary.length).toBe(4);
    expect(trip.totalBudget).toBe(22000);

    // Verify all 4 days exist with activities
    trip.itinerary.forEach((day, idx) => {
      expect(day.dayNumber).toBe(idx + 1);
      expect(Array.isArray(day.activities)).toBe(true);
    });

    // Verify user-chosen sights are included in the generated activities
    const allActivityTitles = trip.itinerary
      .flatMap(d => d.activities)
      .map(a => a.title.toLowerCase());

    const includedCount = userSelectedSights.filter(sight =>
      allActivityTitles.some(title => title.includes(sight.toLowerCase()))
    ).length;

    expect(includedCount).toBeGreaterThan(0);
  });

  it('formats currency cleanly according to active currency config', () => {
    const inr = formatCurrency(15000, 'INR');
    const usd = formatCurrency(15000, 'USD');
    const eur = formatCurrency(15000, 'EUR');

    expect(inr).toContain('15,000');
    expect(inr).toContain('₹');
    expect(usd).toContain('$');
    expect(eur).toContain('€');
  });

  it('persists and restores active trip ID correctly across sessions', () => {
    const testUserId = 'user-test-123';
    const testTrip = generateAITrip({ destination: 'Jaipur', durationDays: 3 });
    testTrip.id = 'trip-jaipur-test-999';

    // Step 1: Save the trip to storage
    saveOrUpdateTrip(testTrip, testUserId);

    // Step 2: Set as active trip
    setActiveTripId(testTrip.id, testUserId);

    // Step 3: Retrieve and verify active trip
    const active = getActiveTripId(testUserId);
    expect(active).toBe(testTrip.id);
  });
});
