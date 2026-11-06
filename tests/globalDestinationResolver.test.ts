import { describe, it, expect } from 'vitest';
import { resolveGlobalDestination } from '../src/services/globalLocationResolver';
import { generatePersonalizedTrip } from '../src/services/aiTripPlanner';

describe('Worldwide Dynamic Location & Live Attractions Intelligence', () => {
  it('resolves genuine coordinates and live attractions for arbitrary global destinations without mocks', async () => {
    // 1. Reykjavik, Iceland (Nordic)
    const reykjavik = await resolveGlobalDestination('Reykjavik, Iceland');
    expect(reykjavik.country).toBe('Iceland');
    expect(reykjavik.coordinates.lat).toBeGreaterThan(60);
    expect(reykjavik.coordinates.lng).toBeLessThan(0);
    expect(reykjavik.highlights.length).toBeGreaterThan(0);

    // 2. Cusco, Peru (South America / Andes)
    const cusco = await resolveGlobalDestination('Cusco, Peru');
    expect(cusco.country).toBe('Peru');
    expect(cusco.coordinates.lat).toBeLessThan(0);
    expect(cusco.coordinates.lng).toBeLessThan(-70);
    expect(cusco.highlights.length).toBeGreaterThan(0);

    // 3. Siem Reap, Cambodia (Southeast Asia)
    const siemReap = await resolveGlobalDestination('Siem Reap, Cambodia');
    expect(siemReap.country).toBe('Cambodia');
    expect(siemReap.coordinates.lat).toBeGreaterThan(10);
    expect(siemReap.coordinates.lng).toBeGreaterThan(100);
    expect(siemReap.highlights.length).toBeGreaterThan(0);
  }, 15000);

  it('generates a personalized itinerary populated with live discovered landmarks for Queenstown and Dubrovnik', async () => {
    // Queenstown, New Zealand
    const tripNZ = await generatePersonalizedTrip({
      destination: 'Queenstown, New Zealand',
      origin: 'Auckland',
      durationDays: 3,
      budgetAmount: 3500,
      currency: 'NZD',
      travelersCount: 2,
      travelerType: 'couple',
      foodPreference: 'veg',
      preferences: ['nature', 'adventure'],
      priorities: ['experience']
    });

    expect(tripNZ.destination).toContain('Queenstown');
    expect(tripNZ.destinationDetails?.country).toBe('New Zealand');
    expect(tripNZ.itinerary.length).toBe(3);

    const nzActivities = tripNZ.itinerary.flatMap(d => d.activities).map(a => a.title);
    // Must contain genuine attractions or activities, not generic Indian temple or stepwell
    expect(nzActivities.some(t => t.includes('Temple') || t.includes('Baori') || t.includes('Havelis'))).toBe(false);

    // Dubrovnik, Croatia
    const tripCroatia = await generatePersonalizedTrip({
      destination: 'Dubrovnik, Croatia',
      origin: 'Zagreb',
      durationDays: 3,
      budgetAmount: 2500,
      currency: 'EUR',
      travelersCount: 2,
      travelerType: 'couple',
      foodPreference: 'veg',
      preferences: ['culture', 'historical'],
      priorities: ['experience']
    });

    expect(tripCroatia.destination).toContain('Dubrovnik');
    expect(tripCroatia.destinationDetails?.country).toBe('Croatia');
    expect(tripCroatia.itinerary.length).toBe(3);

    const croatiaActivities = tripCroatia.itinerary.flatMap(d => d.activities).map(a => a.title);
    expect(croatiaActivities.some(t => t.includes('Temple') || t.includes('Baori') || t.includes('Havelis'))).toBe(false);
  }, 20000);
});
