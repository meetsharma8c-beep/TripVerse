import { describe, it, expect } from 'vitest';
import { calculateSolarTimes } from '../src/services/solarTimeService';
import { verifyVenueFeasibility } from '../src/services/venueOperatingHoursService';
import { evaluateClimatePacing } from '../src/services/climatePacingService';
import { analyzeCircuitRoute } from '../src/services/circuitRouteService';
import { generateAITrip } from '../src/services/plannerEngine';

describe('Advanced Real-World Logic Capabilities Suite', () => {
  describe('1. Astronomical Solar Positioning Engine', () => {
    it('calculates winter solstice early sunset in Tokyo vs summer late sunset in Paris', () => {
      // Tokyo in December: latitude ~35.68°, sunset should be before 5:00 PM (~4:30 PM)
      const tokyoWinter = calculateSolarTimes(35.6762, 139.6503, '2026-12-15');
      expect(tokyoWinter.sunset).toMatch(/4:\d{2}\s*PM/);
      expect(tokyoWinter.daylightHours).toBeLessThan(10.5);

      // Paris in June: latitude ~48.86°, sunset should be after 7:30 PM (~8:00 PM standard / late)
      const parisSummer = calculateSolarTimes(48.8566, 2.3522, '2026-06-21');
      expect(parisSummer.daylightHours).toBeGreaterThan(15.5);

      // Reykjavik in June: Arctic midnight sun / 21+ hours of daylight
      const reykjavikSummer = calculateSolarTimes(64.1466, -21.9426, '2026-06-21');
      expect(reykjavikSummer.daylightHours).toBeGreaterThan(20);
    });
  });

  describe('2. Venue Operating Hours & Weekly Closure Feasibility', () => {
    it('detects day-of-week closures for world museums (e.g. Louvre closed Tuesdays, Vatican closed Sundays)', () => {
      // 2026-11-17 is a Tuesday
      const louvreTuesday = verifyVenueFeasibility('Musée du Louvre', '2026-11-17', '11:00 AM');
      expect(louvreTuesday.isOpen).toBe(false);
      expect(louvreTuesday.reason).toContain('closed every Tuesday');

      // 2026-11-18 is a Wednesday
      const louvreWednesday = verifyVenueFeasibility('Musée du Louvre', '2026-11-18', '11:00 AM');
      expect(louvreWednesday.isOpen).toBe(true);

      // 2026-11-15 is a Sunday
      const vaticanSunday = verifyVenueFeasibility('Vatican Museums', '2026-11-15', '10:00 AM');
      expect(vaticanSunday.isOpen).toBe(false);
      expect(vaticanSunday.reason).toContain('closed on Sundays');

      // Nighttime museum visit (e.g. 9:30 PM)
      const lateMuseum = verifyVenueFeasibility('Louvre Museum', '2026-11-18', '9:30 PM');
      expect(lateMuseum.isOpen).toBe(false);
    });
  });

  describe('3. Climate & Seasonal Pacing Protocol', () => {
    it('activates extreme heat protocol for Dubai & Rajasthan in summer', () => {
      const dubaiSummer = evaluateClimatePacing('Dubai', 'United Arab Emirates', 'Dubai', '2026-06-15');
      expect(dubaiSummer.protocol).toBe('extreme_heat');
      expect(dubaiSummer.preferIndoorMidday).toBe(true);
      expect(dubaiSummer.recommendedSlotShifts.morningSightseeingTime).toBe('7:30 AM');

      const jaipurSummer = evaluateClimatePacing('Jaipur', 'India', 'Rajasthan', '2026-06-15');
      expect(jaipurSummer.protocol).toBe('extreme_heat');
    });

    it('activates alpine winter short-daylight protocol for Iceland or Swiss Alps in January', () => {
      const icelandWinter = evaluateClimatePacing('Reykjavik', 'Iceland', 'Capital Region', '2026-01-10');
      expect(icelandWinter.protocol).toBe('alpine_winter');
      expect(icelandWinter.recommendedSlotShifts.sunsetTime).toBe('4:15 PM');
    });
  });

  describe('4. Multi-City & Circuit Route Decomposition', () => {
    it('correctly segments Tokyo to Kyoto into multi-city stops with bullet train transit', () => {
      const circuit = analyzeCircuitRoute('Tokyo to Kyoto', 5);
      expect(circuit.isMultiCity).toBe(true);
      expect(circuit.stops.length).toBe(2);
      expect(circuit.stops[0].cityName).toBe('Tokyo');
      expect(circuit.stops[1].cityName).toBe('Kyoto');
      expect(circuit.stops[0].transitToNext?.mode).toBe('bullet_train');
      expect(circuit.stops[0].transitToNext?.title).toContain('Shinkansen');
    });

    it('decomposes the Golden Triangle circuit into Delhi, Agra, and Jaipur', () => {
      const circuit = analyzeCircuitRoute('Golden Triangle', 6);
      expect(circuit.isMultiCity).toBe(true);
      expect(circuit.stops.length).toBe(3);
      expect(circuit.stops.map(s => s.cityName)).toEqual(['Delhi', 'Agra', 'Jaipur']);
    });
  });

  describe('5. High-Precision GPS Binding & Haversine Intra-Day Transit in Trips', () => {
    it('binds exact coordinates to famous sights and calculates realistic transit distances', () => {
      const trip = generateAITrip({
        origin: 'Tokyo Narita Airport',
        destination: 'Tokyo',
        durationDays: 3,
        budgetAmount: 150000,
        currency: 'JPY',
        travelersCount: 2,
        travelerType: 'couple',
        foodPreference: 'veg',
        preferences: ['culture', 'historical'],
        priorities: ['experience'],
        startDate: '2026-12-15'
      });

      expect(trip.itinerary.length).toBe(3);

      // Check that sightseeing activities have realistic coordinates near Tokyo (~35.6°, ~139.7°)
      const day2Sights = trip.itinerary[1].activities.filter(a => a.type === 'attraction' || a.type === 'viewpoint');
      for (const sight of day2Sights) {
        expect(sight.coordinates?.lat).toBeGreaterThan(35.5);
        expect(sight.coordinates?.lat).toBeLessThan(35.8);
        expect(sight.coordinates?.lng).toBeGreaterThan(139.6);
        expect(sight.coordinates?.lng).toBeLessThan(139.9);
      }

      // Day total costs match exact activity sum
      for (const day of trip.itinerary) {
        const sum = day.activities.reduce((s, a) => s + a.estimatedCost, 0);
        expect(day.dayEstimatedCost).toBe(sum);
      }
    });
  });
});
