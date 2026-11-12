import { describe, it, expect } from 'vitest';
import { generateAITrip, PlannerInput } from '../src/services/plannerEngine';
import { resolveTransitContext, getFeasibleTransportModes } from '../src/services/transportFeasibilityEngine';
import { evaluateLiveMarketPrices } from '../src/services/liveMarketPricingService';
import { applyGeoapifyTravelData } from '../src/services/travelDataService';
import { optimizeDayActivitiesTsp } from '../src/services/smartTravelEngine';
import { resolveLandmarkCoordinates } from '../src/services/landmarkAtlasService';

function parseClockMinutes(timeStr?: string): number {
  if (!timeStr) return -1;
  const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return -1;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3].toUpperCase();
  if (mer === 'PM' && h < 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

describe('Itinerary & Geography Reliability (Pavagadh & Worldwide Regression Suite)', () => {
  it('plans Vadodara -> Manchi Haveli, Pavagadh 1-day ₹5,000 trip accurately without Paris fallback, fake airports, or hospital stops', () => {
    const input: PlannerInput = {
      origin: 'Vadodara',
      destination: 'Manchi Haveli, Pavagadh',
      durationDays: 1,
      travelersCount: 1,
      travelerType: 'solo',
      budgetMode: 'total',
      budgetAmount: 5000,
      preferences: ['heritage', 'nature'],
      transportMode: 'flight',
      accommodationType: 'budget',
      foodPreference: 'veg',
      priorities: ['budget', 'experience'],
      selectedActivities: ['Eiffel Tower', 'Louvre Museum']
    };

    const trip = generateAITrip(input);

    // 1. Destination coordinates must resolve in Gujarat (~22.48, 73.53), never Paris (~48.85, 2.35)
    expect(trip.destinationDetails?.coordinates?.lat).toBeGreaterThan(21);
    expect(trip.destinationDetails?.coordinates?.lat).toBeLessThan(24);
    expect(trip.destinationDetails?.coordinates?.lng).toBeGreaterThan(72);
    expect(trip.destinationDetails?.coordinates?.lng).toBeLessThan(75);
    expect(trip.destinationDetails?.country).toBe('India');

    // 2. Short corridor (< 100 km) must auto-promote away from 'flight' and never fabricate Pavagadh Airport
    expect(trip.transportMode).not.toBe('flight');
    expect(trip.routeDetails?.distanceKm || 0).toBeLessThan(120);

    const serialized = JSON.stringify(trip);
    expect(serialized).not.toMatch(/Eiffel Tower/i);
    expect(serialized).not.toMatch(/Louvre Museum/i);
    expect(serialized).not.toMatch(/Pavagadh[^"]*Airport/i);
    expect(serialized).not.toMatch(/Manchi Haveli[^"]*Airport/i);
    expect(trip.transportDeals?.some(d => d.mode === 'flight')).toBe(false);
    expect(trip.bestTransportDeal?.mode).not.toBe('flight');

    // 3. 1-day excursion: no hotel stay billed and budget stays realistic <= ₹5,000
    expect(trip.selectedHotel).toBeUndefined();
    expect(trip.budgetBreakdown.accommodation).toBe(0);
    expect(trip.estimatedTotal).toBeLessThanOrEqual(5000);

    // 4. Strictly chronological Day 1 schedule & clock-accurate queue slots
    const acts = trip.itinerary[0]?.activities || [];
    expect(acts.length).toBeGreaterThanOrEqual(4);
    const times = acts.map(a => parseClockMinutes(a.time)).filter(t => t >= 0);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    }
    const morningEveningBadSlots = acts.filter(a => {
      const m = parseClockMinutes(a.time);
      return m >= 0 && m < 12 * 60 && a.queueSlot === 'evening_vibrant';
    });
    expect(morningEveningBadSlots.length).toBe(0);
  });

  it('resolves Pavagadh transit hubs to Vadodara BDQ/BRC without fabricating Pavagadh Airport', () => {
    const ctx = resolveTransitContext('Manchi Haveli, Pavagadh');
    expect(ctx.hasDirectAirport).toBe(false);
    expect(ctx.primaryAirport?.code).toBe('BDQ');
    expect(ctx.primaryAirport?.name).not.toMatch(/Pavagadh/i);

    const modes = getFeasibleTransportModes('Vadodara', 'Manchi Haveli, Pavagadh');
    expect(modes.availableModes).not.toContain('flight');
    expect(modes.routeType).toBe('short_commute');
  });

  it('zeroes out flight and hotel line items on 1-day short commutes in liveMarketPricingService', () => {
    const market = evaluateLiveMarketPrices({
      origin: 'Vadodara',
      destination: 'Manchi Haveli, Pavagadh',
      durationDays: 1,
      travelersCount: 1,
      accommodationType: 'budget',
      transportMode: 'flight',
      originCoords: { lat: 22.3072, lng: 73.1812 },
      destCoords: { lat: 22.4842, lng: 73.5350 }
    });

    expect(market.flightTotalGroupINR).toBe(0);
    expect(market.smartHubArbitrage).toBeNull();
    expect(market.hotelTotalGroupINR).toBe(0);
    expect(market.lineItems.some(i => i.id === 'flights')).toBe(false);
    expect(market.lineItems.some(i => i.id === 'hotels')).toBe(false);
    expect(market.lineItems.some(i => i.id === 'smart_hub')).toBe(false);
  });

  it('never injects Geoapify hospitals into break stops and rejects mismatched cross-state Geoapify routes', () => {
    const baseTrip = generateAITrip({
      origin: 'Vadodara',
      destination: 'Manchi Haveli, Pavagadh',
      durationDays: 1,
      travelersCount: 1,
      travelerType: 'solo',
      budgetMode: 'total',
      budgetAmount: 5000,
      preferences: ['heritage'],
      transportMode: 'car',
      accommodationType: 'budget',
      foodPreference: 'veg',
      priorities: ['budget']
    });

    // Case A: Nearby route where the only midpoint POI returned is a hospital
    const withHospitalOnly = applyGeoapifyTravelData(baseTrip, {
      route: {
        distanceKm: 48,
        durationHours: 1.1,
        encodedPolyline: '',
        originCoordinates: { lat: 22.3072, lng: 73.1812 },
        destinationCoordinates: { lat: 22.4842, lng: 73.5350 }
      },
      places: [
        {
          id: 'hosp-1',
          name: 'Noon Hospital and Research Centre',
          address: 'Highway Rd',
          coordinates: { lat: 22.40, lng: 73.35 },
          types: ['healthcare.hospital'],
          distanceFromStartKm: 24,
          offRouteKm: 0.4
        }
      ],
      destinationPlaces: []
    });

    const bsActA = withHospitalOnly.itinerary[0].activities.find(a => a.id === 'act-1-bs');
    expect(bsActA?.title).not.toMatch(/Hospital/i);

    // Case B: Mismatched Rajasthan coordinates (> 150 km away from Gujarat destination)
    const mismatchedState = applyGeoapifyTravelData(baseTrip, {
      route: {
        distanceKm: 425,
        durationHours: 7.5,
        encodedPolyline: '',
        originCoordinates: { lat: 22.3072, lng: 73.1812 },
        destinationCoordinates: { lat: 24.415, lng: 76.625 } // Rajasthan
      },
      places: [
        {
          id: 'rj-stop',
          name: 'Noon Hospital and Research Centre',
          address: 'Jhalawar, Rajasthan',
          coordinates: { lat: 24.41, lng: 76.62 },
          types: ['catering.restaurant'],
          distanceFromStartKm: 210,
          offRouteKm: 0.2
        }
      ],
      destinationPlaces: []
    });

    expect(mismatchedState.travelDataStatus).toBe('estimate');
    expect(JSON.stringify(mismatchedState.itinerary)).not.toMatch(/Rajasthan/i);
  });

  it('rejects foreign global landmark coordinates (> 150 km away) during coordinate resolution', () => {
    const pavagadhCoords = { lat: 22.4842, lng: 73.5350 };
    const resolved = resolveLandmarkCoordinates('Eiffel Tower', pavagadhCoords);
    expect(resolved.lat).toBeGreaterThan(21);
    expect(resolved.lat).toBeLessThan(24);
    expect(resolved.lng).toBeGreaterThan(72);
    expect(resolved.lng).toBeLessThan(75);
  });

  it('preserves chronological time order in optimizeDayActivitiesTsp across departure, meals, sights, and return', () => {
    const { activities: optimized } = optimizeDayActivitiesTsp([
      { id: '1', dayNumber: 1, time: '7:30 AM', title: 'Depart', type: 'departure', location: 'Vadodara', estimatedCost: 200, travelTimeMin: 0, distanceKm: 0, description: 'Depart', coordinates: { lat: 22.3072, lng: 73.1812 } },
      { id: '2', dayNumber: 1, time: '9:30 AM', title: 'Kalika Mata Temple', type: 'attraction', location: 'Pavagadh', estimatedCost: 100, travelTimeMin: 30, distanceKm: 15, description: 'Temple', coordinates: { lat: 22.461, lng: 73.519 } },
      { id: '3', dayNumber: 1, time: '1:00 PM', title: 'Gujarati Thali Lunch', type: 'food', location: 'Pavagadh', estimatedCost: 300, travelTimeMin: 15, distanceKm: 3, description: 'Lunch', coordinates: { lat: 22.484, lng: 73.535 } },
      { id: '4', dayNumber: 1, time: '3:00 PM', title: 'Champaner Jami Masjid', type: 'viewpoint', location: 'Champaner', estimatedCost: 100, travelTimeMin: 10, distanceKm: 2, description: 'Masjid', coordinates: { lat: 22.486, lng: 73.537 } },
      { id: '5', dayNumber: 1, time: '5:45 PM', title: 'Commence Return Journey', type: 'departure', tag: 'Return', location: 'Pavagadh', estimatedCost: 200, travelTimeMin: 15, distanceKm: 5, description: 'Return', coordinates: { lat: 22.4842, lng: 73.5350 } },
      { id: '6', dayNumber: 1, time: '9:30 PM', title: 'Safe Arrival', type: 'arrival', location: 'Vadodara', estimatedCost: 0, travelTimeMin: 60, distanceKm: 48, description: 'Arrive', coordinates: { lat: 22.3072, lng: 73.1812 } }
    ]);

    const mins = optimized.map(a => parseClockMinutes(a.time));
    for (let i = 1; i < mins.length; i++) {
      expect(mins[i]).toBeGreaterThanOrEqual(mins[i - 1]);
    }
    expect(optimized[optimized.length - 1].title).toBe('Safe Arrival');
    expect(optimized[optimized.length - 2].title).toBe('Commence Return Journey');
  });
});
