import { describe, it, expect } from 'vitest';
import { resolveGlobalDestination } from '../src/services/globalLocationResolver';
import { generatePersonalizedTrip } from '../src/services/aiTripPlanner';
import { selectHotelForTrip } from '../src/services/hotelService';
import { generateTransportDeals } from '../src/services/dealService';
import { getLocalGems } from '../src/services/localGemsService';

import { searchLocations } from '../src/services/locationService';

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

  it('guarantees genuine, culturally accurate hotels, deals, and local gems worldwide without domestic templates', () => {
    // 1. Hotel for Reykjavik, Iceland
    const { recommendedHotel } = selectHotelForTrip({
      destination: 'Reykjavik, Iceland',
      accommodationType: 'boutique',
      totalBudget: 4000,
      durationDays: 4,
      travelersCount: 2
    });
    expect(recommendedHotel.name).not.toContain('Zostel');
    expect(recommendedHotel.name).not.toContain('Green Leaf');
    expect(recommendedHotel.name).toContain('Reykjavik');

    // 2. Flight and Rail deals for Tokyo, Japan
    const flightDeals = generateTransportDeals({
      mode: 'flight',
      origin: 'Seoul Incheon',
      destination: 'Tokyo',
      travelersCount: 2
    });
    expect(flightDeals.allDeals.some((d: any) => d.provider.includes('IndiGo'))).toBe(false);
    expect(flightDeals.allDeals.some((d: any) => d.provider.includes('JAL') || d.provider.includes('Peach') || d.provider.includes('ANA'))).toBe(true);

    const railDeals = generateTransportDeals({
      mode: 'train',
      origin: 'Osaka',
      destination: 'Tokyo',
      travelersCount: 2
    });
    expect(railDeals.allDeals.some((d: any) => d.provider.includes('IRCTC'))).toBe(false);
    expect(railDeals.allDeals.some((d: any) => d.provider.includes('Shinkansen'))).toBe(true);

    // 3. Local Gems for Reykjavik, Iceland
    const gems = getLocalGems('Reykjavik');
    expect(gems.foodGems[0].dish).not.toContain("Signature Reykjavik Chef's Local Specialty");
    expect(gems.foodGems[0].dish).toContain('Langoustine');
  });

  it('resolves both major and minor destinations worldwide with clean English names and zero false-positives', async () => {
    // 1. Major metropolises: instant, high-quality, clean names
    const tokyoResults = await searchLocations('Tokyo');
    expect(tokyoResults.length).toBeGreaterThan(0);
    expect(tokyoResults[0].name).toBe('Tokyo');
    expect(tokyoResults[0].country).toBe('Japan');

    const romeResults = await searchLocations('Rome');
    expect(romeResults.length).toBeGreaterThan(0);
    expect(romeResults[0].name).toBe('Rome');
    expect(romeResults[0].country).toBe('Italy');
    // Ensure Burj Khalifa is NOT returned for "Rome" (was caused by loose "promenade" highlight match)
    expect(romeResults.some(r => r.name.toLowerCase().includes('burj'))).toBe(false);

    const parisResults = await searchLocations('Paris');
    expect(parisResults.length).toBeGreaterThan(0);
    expect(parisResults[0].name).toBe('Paris');
    expect(parisResults[0].country).toBe('France');

    // 2. Minor, remote, and regional destinations
    const choptaResults = await searchLocations('Chopta');
    expect(choptaResults.length).toBeGreaterThan(0);
    expect(choptaResults[0].name).toBe('Chopta');

    const hallstattResults = await searchLocations('Hallstatt');
    expect(hallstattResults.length).toBeGreaterThan(0);
    expect(hallstattResults[0].name.toLowerCase()).toContain('hallstatt');
    expect(hallstattResults[0].country.toLowerCase()).toContain('austria');

    const zermattResults = await searchLocations('Zermatt');
    expect(zermattResults.length).toBeGreaterThan(0);
    expect(zermattResults[0].name.toLowerCase()).toContain('zermatt');
    expect(zermattResults[0].country.toLowerCase()).toContain('switzerland');

    // 3. Verify clean names: no artificial "(District)" suffix
    const allNames = [...tokyoResults, ...romeResults, ...parisResults, ...hallstattResults, ...zermattResults].map(r => r.name);
    for (const name of allNames) {
      expect(name).not.toContain('(District)');
    }
  }, 15000);
});
