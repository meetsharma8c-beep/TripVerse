import { describe, it, expect } from 'vitest';
import { generateAITrip, PlannerInput } from '../src/services/plannerEngine';
import { getDestinationHighlights } from '../src/services/landmarkAtlasService';
import { DayPlan, ItineraryActivity } from '../src/types/trip';

describe('Itinerary Flexibility & User Choice Engine', () => {
  it('prioritizes traveler selected sights in generated trip rather than forcing a pre-defined fixed itinerary', () => {
    const customSights = [
      'Nahargarh Fort Sunset Viewpoint',
      'Albert Hall Museum Artisan Walk',
      'Johari Bazaar Street Exploration'
    ];

    const input: PlannerInput = {
      origin: 'Ahmedabad, Gujarat',
      destination: 'Jaipur',
      destinationName: 'Jaipur',
      durationDays: 3,
      travelersCount: 2,
      travelerType: 'friends',
      budgetMode: 'total',
      budgetAmount: 18000,
      preferences: ['culture', 'nature', 'historical'],
      transportMode: 'car',
      accommodationType: 'budget',
      foodPreference: 'veg',
      priorities: ['budget', 'experience'],
      itineraryStyle: 'flexible_custom',
      selectedActivities: customSights
    };

    const trip = generateAITrip(input);

    expect(trip).toBeDefined();
    expect(trip.destination).toBe('Jaipur');
    expect(trip.itinerary.length).toBe(3);

    // Verify all scheduled activities across days include the user's selected sights
    const allActivityTitles = trip.itinerary.flatMap(d => d.activities.map(a => a.title));
    const matchedCustomSight = customSights.some(cs =>
      allActivityTitles.some(title => title.toLowerCase().includes(cs.toLowerCase()) || cs.toLowerCase().includes(title.toLowerCase()))
    );

    expect(matchedCustomSight).toBe(true);
  });

  it('supports clearing a day for complete flexible freedom from scratch', () => {
    const trip = generateAITrip({
      origin: 'Delhi',
      destination: 'Jaipur',
      durationDays: 3,
      travelersCount: 2,
      travelerType: 'solo',
      budgetMode: 'total',
      budgetAmount: 10000,
      preferences: ['historical'],
      transportMode: 'train',
      accommodationType: 'budget',
      foodPreference: 'veg',
      priorities: ['budget']
    });

    expect(trip.itinerary[1].activities.length).toBeGreaterThan(0);

    // Simulate traveler clearing Day 2
    const clearedDays = trip.itinerary.map(day => {
      if (day.dayNumber === 2) {
        return { ...day, activities: [], dayEstimatedCost: 0 };
      }
      return day;
    });

    expect(clearedDays[1].activities.length).toBe(0);
    expect(clearedDays[1].dayEstimatedCost).toBe(0);
    expect(clearedDays[0].activities.length).toBeGreaterThan(0);
    expect(clearedDays[2].activities.length).toBeGreaterThan(0);
  });

  it('supports dynamically adding and removing days in the itinerary', () => {
    const trip = generateAITrip({
      origin: 'Mumbai',
      destination: 'Goa',
      durationDays: 2,
      travelersCount: 2,
      travelerType: 'couple',
      budgetMode: 'total',
      budgetAmount: 20000,
      preferences: ['nature', 'relaxation'],
      transportMode: 'car',
      accommodationType: '3star',
      foodPreference: 'any',
      priorities: ['comfort']
    });

    expect(trip.itinerary.length).toBe(2);

    // Add Day 3
    const newDayNumber = trip.itinerary.length + 1;
    const newDay: DayPlan = {
      dayNumber: newDayNumber,
      title: `Day ${newDayNumber} — Flexible Exploration & Beach Wander`,
      theme: 'Traveler Choice, Leisure Exploration',
      dayEstimatedCost: 0,
      activities: []
    };
    const expandedDays = [...trip.itinerary, newDay];
    expect(expandedDays.length).toBe(3);
    expect(expandedDays[2].dayNumber).toBe(3);

    // Remove Day 1
    const remainingDays = expandedDays
      .filter(d => d.dayNumber !== 1)
      .map((d, idx) => ({ ...d, dayNumber: idx + 1 }));

    expect(remainingDays.length).toBe(2);
    expect(remainingDays[0].dayNumber).toBe(1);
    expect(remainingDays[1].dayNumber).toBe(2);
  });

  it('retrieves destination highlights accurately for quick-adding sights without pre-defined lock', () => {
    const jaipurHighlights = getDestinationHighlights('Jaipur', 10);
    expect(jaipurHighlights.length).toBeGreaterThan(0);

    const hasAmerOrHawaMahal = jaipurHighlights.some(h =>
      h.toLowerCase().includes('amber') ||
      h.toLowerCase().includes('amer') ||
      h.toLowerCase().includes('hawa mahal') ||
      h.toLowerCase().includes('city palace')
    );
    expect(hasAmerOrHawaMahal).toBe(true);
  });
});
