import { describe, it, expect } from 'vitest';
import { resolveCanonicalDestination, extractCoreCityToken } from '../src/services/canonicalCityService';
import { getDestinationHighlights, getDestinationLandmarkSpots } from '../src/services/landmarkAtlasService';
import { generateAITrip } from '../src/services/plannerEngine';

describe('Landmark Atlas & Famous Spots Architecture', () => {
  describe('Canonical City Resolver', () => {
    it('normalizes queries with country/state suffixes to canonical entities', () => {
      const tokyoJapan = resolveCanonicalDestination('Tokyo, Japan');
      expect(tokyoJapan.canonicalName).toBe('Tokyo');
      expect(tokyoJapan.destinationId).toBe('tokyo');
      expect(tokyoJapan.country).toBe('Japan');

      const parisFrance = resolveCanonicalDestination('Paris, France');
      expect(parisFrance.canonicalName).toBe('Paris');
      expect(parisFrance.destinationId).toBe('paris');

      const jaipurRaj = resolveCanonicalDestination('Jaipur, Rajasthan');
      expect(jaipurRaj.canonicalName).toBe('Jaipur');
      expect(jaipurRaj.state).toBe('Rajasthan');
    });

    it('cleans prepositions and natural language noise', () => {
      expect(extractCoreCityToken('to tokyo')).toBe('tokyo');
      expect(extractCoreCityToken('trip to Paris')).toBe('Paris');
      expect(extractCoreCityToken('vacation in Rome')).toBe('Rome');
      expect(extractCoreCityToken('Tokyo City')).toBe('Tokyo');

      const resolved = resolveCanonicalDestination('to tokyo');
      expect(resolved.canonicalName).toBe('Tokyo');
      expect(resolved.destinationId).toBe('tokyo');
    });

    it('resolves famous abbreviations and aliases', () => {
      expect(resolveCanonicalDestination('NYC').canonicalName).toBe('New York City');
      expect(resolveCanonicalDestination('pink city').canonicalName).toBe('Jaipur');
      expect(resolveCanonicalDestination('bcn').canonicalName).toBe('Barcelona');
    });
  });

  describe('Landmark Atlas Service', () => {
    it('returns authentic iconic spots for Tokyo without generic placeholders', () => {
      const spots = getDestinationHighlights('Tokyo', 15);
      expect(spots.length).toBeGreaterThanOrEqual(12);

      const spotNames = spots.join(' ');
      expect(spotNames).toContain('Shibuya Crossing');
      expect(spotNames).toContain('Senso-ji Temple');
      expect(spotNames).toContain('Meiji Jingu Shrine');
      expect(spotNames).toContain('Tokyo Skytree');
      expect(spotNames).toContain('TeamLab Planets');
      expect(spotNames).toContain('Akihabara');

      // Ban generic placeholder tours
      expect(spotNames).not.toContain('Tokyo Historic & Scenic Landmark Tour');
      expect(spotNames).not.toContain('Tokyo Lakeside / Valley Promenade');
    });

    it('returns authentic iconic spots for Paris', () => {
      const spots = getDestinationHighlights('Paris, France', 15);
      expect(spots.length).toBeGreaterThanOrEqual(10);

      const spotNames = spots.join(' ');
      expect(spotNames).toContain('Eiffel Tower');
      expect(spotNames).toContain('Louvre Museum');
      expect(spotNames).toContain("Musée d'Orsay");
      expect(spotNames).toContain('Cathédrale Notre-Dame');
      expect(spotNames).toContain('Sacré-Cœur');
    });

    it('returns structured LandmarkSpots with real neighborhoods and fees', () => {
      const spots = getDestinationLandmarkSpots('Tokyo');
      const teamLab = spots.find(s => s.name.includes('TeamLab'));
      expect(teamLab).toBeDefined();
      expect(teamLab?.neighborhood).toContain('Toyosu');
      expect(teamLab?.estimatedFee).toBeGreaterThan(0);
    });
  });

  describe('Itinerary Generation with Famous Spots', () => {
    it('schedules real Tokyo famous spots even when destination is "Tokyo, Japan"', () => {
      const trip = generateAITrip({
        origin: 'Delhi',
        destination: 'Tokyo, Japan',
        destinationName: 'Tokyo, Japan',
        durationDays: 4,
        travelersCount: 2,
        budgetAmount: 150000,
        budgetMode: 'total',
        pacing: 'balanced'
      });

      expect(trip.destination).toBe('Tokyo');
      const activities = trip.itinerary.flatMap(d => d.activities).map(a => a.title);

      expect(activities.some(t => t.includes('Shibuya Crossing'))).toBe(true);
      expect(activities.some(t => t.includes('Senso-ji'))).toBe(true);
      expect(activities.some(t => t.includes('Meiji Jingu'))).toBe(true);
      expect(activities.some(t => t.includes('Skytree'))).toBe(true);

      // Verify no generic synthetic tour titles exist
      expect(activities.some(t => t.includes('Tokyo, Japan Cultural & Historic Landmark Tour'))).toBe(false);
      expect(activities.some(t => t.includes('Tokyo, Japan Iconic Heritage Architecture & Scenic Spots'))).toBe(false);
      expect(activities.some(t => t.includes('Tokyo, Japan Golden Hour Heritage Ramparts & Folk Lore'))).toBe(false);
    });

    it('schedules real Jaipur famous spots even when destination is "Jaipur, Rajasthan"', () => {
      const trip = generateAITrip({
        origin: 'Mumbai',
        destination: 'Jaipur, Rajasthan',
        destinationName: 'Jaipur, Rajasthan',
        durationDays: 3,
        travelersCount: 2,
        budgetAmount: 30000,
        budgetMode: 'total',
        pacing: 'balanced'
      });

      expect(trip.destination).toBe('Jaipur');
      const activities = trip.itinerary.flatMap(d => d.activities).map(a => a.title);

      expect(activities.some(t => t.includes('Amber Fort'))).toBe(true);
      expect(activities.some(t => t.includes('Hawa Mahal'))).toBe(true);
      expect(activities.some(t => t.includes('Nahargarh Fort'))).toBe(true);
      expect(activities.some(t => t.includes('City Palace'))).toBe(true);

      // Verify no generic synthetic tour titles exist
      expect(activities.some(t => t.includes('Jaipur, Rajasthan Cultural & Historic Landmark Tour'))).toBe(false);
    });
  });
});
