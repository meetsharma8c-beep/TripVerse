import { describe, it, expect } from 'vitest';
import { computeTravelWrapped, generateWrappedSocialText } from '../src/services/travelWrappedService';
import { Trip } from '../src/types/trip';

describe('Travel Wrapped Service (travelWrappedService)', () => {
  const mockTrips: Trip[] = [
    {
      id: 'trip-manali',
      name: 'Manali Snow Expedition',
      destination: 'Manali, Himachal Pradesh, India',
      duration: 5,
      budget: 25000,
      travelers: 2,
      startDate: '2026-10-15',
      endDate: '2026-10-20',
      status: 'completed',
      itinerary: [
        {
          day: 1,
          date: '2026-10-15',
          activities: [
            { id: '1', title: 'Hadimba Pagoda Temple', time: '10:00 AM', cost: 0, category: 'sightseeing', description: 'Cedar forest' }
          ]
        }
      ]
    } as any,
    {
      id: 'trip-paris',
      name: 'Paris Arts & Architecture',
      destination: 'Paris, Île-de-France, France',
      duration: 6,
      budget: 150000,
      travelers: 2,
      startDate: '2026-11-01',
      endDate: '2026-11-07',
      status: 'completed',
      itinerary: [
        {
          day: 1,
          date: '2026-11-01',
          activities: [
            { id: '2', title: 'Eiffel Tower Summit', time: '02:00 PM', cost: 3000, category: 'sightseeing', description: 'Summit lift' }
          ]
        }
      ]
    } as any
  ];

  it('computes accurate travel wrapped stats across completed voyages', () => {
    const stats = computeTravelWrapped(mockTrips, 'traveler@example.com', 2026);
    expect(stats.year).toBe(2026);
    expect(stats.totalTrips).toBe(2);
    expect(stats.totalDaysTraveled).toBe(11);
    expect(stats.totalKmTraveled).toBeGreaterThan(3000);
    expect(stats.citiesExplored).toContain('Manali');
    expect(stats.citiesExplored).toContain('Paris');
    expect(stats.countriesVisited.length).toBeGreaterThanOrEqual(1);
  });

  it('accurately designates VIP Founding Architect archetype for meet.sharma8c@gmail.com', () => {
    const founderStats = computeTravelWrapped(mockTrips, 'meet.sharma8c@gmail.com', 2026);
    expect(founderStats.isFounder).toBe(true);
    expect(founderStats.travelerArchetype.title).toBe('VIP Founding Architect');
    expect(founderStats.travelerArchetype.badge).toBe('👑');
  });

  it('generates rich, viral-ready social card text', () => {
    const stats = computeTravelWrapped(mockTrips, 'traveler@example.com', 2026);
    const text = generateWrappedSocialText(stats);
    expect(text).toContain('TripVerse Wrapped');
    expect(text).toContain('km Traversed');
    expect(text).toContain('#TripVerseWrapped');
    expect(text).toContain('https://trip-verse.com');
  });
});
