import { describe, it, expect } from 'vitest';
import { generateAITrip, PlannerInput } from '../src/services/plannerEngine';
import { buildPrompt, parseItinerary, applyItinerary } from '../src/services/aiTripPlanner';
import { selectHotelForTrip } from '../src/services/hotelService';
import { generateTransportDeals } from '../src/services/dealService';
import { evaluateTransportFeasibility, resolveTransitContext } from '../src/services/transportFeasibilityEngine';

function makeInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    origin: 'Delhi',
    destination: 'Udaipur',
    durationDays: 3,
    budgetAmount: 25000,
    budgetMode: 'total',
    travelersCount: 2,
    travelerType: 'couple',
    transportMode: 'train',
    accommodationType: 'budget',
    foodPreference: 'veg',
    preferences: ['culture', 'historical', 'food'],
    priorities: ['budget', 'experience'],
    startDate: '2026-11-15',
    pacing: 'balanced',
    ...overrides,
  };
}

describe('Tripverse ConCode AI & Trip Planning QA Suite', () => {
  describe('1. Prompt & Input Mapping (buildPrompt)', () => {
    it('passes all user parameters including startDate, pacing, budgetMode, and selectedStay to the prompt', () => {
      const input = makeInput({
        destination: 'Jaipur',
        durationDays: 4,
        budgetAmount: 40000,
        budgetMode: 'per_person',
        travelersCount: 3,
        travelerType: 'family',
        foodPreference: 'jain' as any,
        pacing: 'relaxed',
        startDate: '2026-12-01',
        specialRequests: 'Include wheelchair-friendly heritage stops',
      });
      const baseline = generateAITrip(input);
      const prompt = buildPrompt(input, baseline);
      expect(prompt).toContain('"destination": "Jaipur"');
      expect(prompt).toContain('"startDate": "2026-12-01"');
      expect(prompt).toContain('"durationDays": 4');
      expect(prompt).toContain('"travelersCount": 3');
      expect(prompt).toContain('"travelerType": "family"');
      expect(prompt).toContain('"pacing": "relaxed"');
      expect(prompt).toContain('"budgetMode": "per_person"');
      expect(prompt).toContain('"totalBudget": 120000');
      expect(prompt).toContain('"foodPreference": "jain"');
      expect(prompt).toContain('"selectedStay":');
      expect(prompt).toContain('wheelchair-friendly');
    });
  });

  describe('2. AI Response Parsing & Validation (parseItinerary & applyItinerary)', () => {
    it('parses direct JSON, nested structured_itinerary, and markdown code-fenced JSON', () => {
      const fencedJson = '```json\n{"itinerary":[{"dayNumber":1,"title":"Arrival","activities":[{"title":"City Palace Visit","description":"Royal courtyard tour exploring museum halls.","time":"02:30 PM","estimatedCost":600,"type":"attraction","location":"City Palace"}]}]}\n```';
      const parsed = parseItinerary(fencedJson);
      expect(parsed).not.toBeNull();
      expect(parsed?.length).toBe(1);
      expect(parsed?.[0].activities[0].title).toBe('City Palace Visit');

      const nested = parseItinerary(
        JSON.stringify({
          structured_itinerary: {
            days: [
              {
                dayNumber: 1,
                title: 'Day 1',
                activities: [{ title: 'Lake Pichola Boat Ride', description: 'Sunset cruise', estimatedCost: 500 }],
              },
            ],
          },
        }),
      );
      expect(nested).not.toBeNull();
      expect(nested?.[0].activities[0].title).toBe('Lake Pichola Boat Ride');
    });

    it('handles malformed AI responses gracefully by returning null', () => {
      expect(parseItinerary('')).toBeNull();
      expect(parseItinerary('Sorry, I cannot plan this trip right now.')).toBeNull();
      expect(parseItinerary('{corrupted json: [123')).toBeNull();
    });

    it('enforces Day 1 post-check-in times, deduplicates attractions across days, and offsets coordinates', () => {
      const input = makeInput({ destination: 'Udaipur', durationDays: 2, budgetAmount: 30000 });
      const baseTrip = generateAITrip(input);

      const aiDays = [
        {
          dayNumber: 1,
          title: 'Day 1: Royal Heritage',
          theme: 'Heritage',
          activities: [
            // Intentionally scheduled at 09:00 AM before 1:00 PM check-in to test time normalization
            { title: 'City Palace Museum', description: 'Explore the royal complex and courtyards.', time: '09:00 AM', estimatedCost: 500, type: 'attraction', location: 'City Palace' },
            { title: 'Ambrai Ghat Dinner', description: 'Lakeside Rajasthani vegetarian thali.', time: '07:30 PM', estimatedCost: 800, type: 'food', location: 'Ambrai Ghat' },
          ],
        },
        {
          dayNumber: 2,
          title: 'Day 2: Departure',
          theme: 'Gardens & Lakes',
          activities: [
            // Intentional duplicate of Day 1 attraction
            { title: 'City Palace Museum', description: 'Duplicate visit should be replaced.', time: '09:30 AM', estimatedCost: 500, type: 'attraction', location: 'City Palace' },
            { title: 'Saheliyon Ki Bari', description: 'Morning walk in historic fountains garden.', time: '10:30 AM', estimatedCost: 250, type: 'attraction', location: 'Saheliyon Ki Bari' },
          ],
        },
      ];

      const merged = applyItinerary(aiDays, input, baseTrip);
      expect(merged).not.toBeNull();
      const day1Activities = merged!.itinerary[0].activities;
      const customDay1 = day1Activities.filter((a) => a.title === 'City Palace Museum' || a.title === 'Ambrai Ghat Dinner');
      expect(customDay1.length).toBe(2);
      // 09:00 AM should have been normalized to afternoon (post check-in)
      expect(customDay1[0].time).not.toBe('09:00 AM');
      expect(customDay1[0].time).toMatch(/PM$/);

      // Duplicate 'City Palace Museum' on Day 2 must be replaced with an unvisited highlight
      const day2Titles = merged!.itinerary[1].activities.map((a) => a.title);
      expect(day2Titles).not.toContain('City Palace Museum');
      expect(day2Titles).toContain('Saheliyon Ki Bari');

      // Coordinates should have distinct spatial offsets rather than identical stacked pins
      expect(customDay1[0].coordinates?.lat).not.toBe(customDay1[1].coordinates?.lat);
    });
  });

  describe('3. Destination & Transit Hub Accuracy (DESTINATION ≠ STATION/AIRPORT)', () => {
    it('disallows direct flight and train deals for Spiti Valley and provides road transfers from nearest hubs', () => {
      const spitiDeals = generateTransportDeals({
        mode: 'flight',
        origin: 'Delhi',
        destination: 'Spiti Valley',
        durationDays: 5,
        travelersCount: 2,
        totalBudget: 40000,
      });
      expect(spitiDeals.allDeals.every((d) => d.mode !== 'flight' && d.mode !== 'train')).toBe(true);

      const trainFeasibility = evaluateTransportFeasibility('train', 'Delhi', 'Spiti Valley');
      expect(trainFeasibility.status).toBe('UNAVAILABLE');
      expect(trainFeasibility.isDirectPossible).toBe(false);
    });

    it('correctly maps Manali nearest airport to Kullu-Bhuntar (KUU) and railway to Chandigarh/Kalka', () => {
      const transit = resolveTransitContext('Manali');
      expect(transit.hasDirectAirport).toBe(false);
      expect(transit.primaryAirport?.code).toBe('KUU');
      expect(transit.hasDirectTrain).toBe(false);
      expect(transit.primaryRailwayStation?.name).toContain('Chandigarh');
    });

    it('generates touring bike deals when transportMode is bike and scales SUV capacity for >4 travelers', () => {
      const bikeDeals = generateTransportDeals({
        mode: 'bike',
        origin: 'Delhi',
        destination: 'Manali',
        durationDays: 5,
        travelersCount: 2,
        totalBudget: 35000,
      });
      expect(bikeDeals.allDeals.length).toBeGreaterThan(0);
      expect(bikeDeals.allDeals[0].mode).toBe('bike');

      const familyCarDeals = generateTransportDeals({
        mode: 'car',
        origin: 'Delhi',
        destination: 'Jaipur',
        durationDays: 3,
        travelersCount: 6,
        totalBudget: 45000,
      });
      expect(familyCarDeals.allDeals[0].title).toContain('SUV');
      expect(familyCarDeals.allDeals[0].vehicleDetails?.seats).toBeGreaterThanOrEqual(6);
    });
  });

  describe('4. Budget Accuracy & Hotel Tier Matching', () => {
    it('never assigns a ₹38,500/night luxury palace when user requests a budget stay in Udaipur or Jaipur', () => {
      const udaipurSelection = selectHotelForTrip({
        destination: 'Udaipur',
        accommodationType: 'budget',
        totalBudget: 25000,
        durationDays: 3,
        travelersCount: 2,
        startDate: '2026-11-15',
      });
      expect(udaipurSelection.recommendedHotel.tier).not.toBe('luxury');
      expect(udaipurSelection.recommendedHotel.nightlyRate).toBeLessThanOrEqual(6500);

      const jaipurSelection = selectHotelForTrip({
        destination: 'Jaipur',
        accommodationType: 'budget',
        totalBudget: 25000,
        durationDays: 3,
        travelersCount: 2,
        startDate: '2026-11-15',
      });
      expect(jaipurSelection.recommendedHotel.tier).not.toBe('luxury');
      expect(jaipurSelection.recommendedHotel.nightlyRate).toBeLessThanOrEqual(6500);
    });

    it('keeps estimatedTotal within user budget even on tight low-budget trips', () => {
      const lowBudgetInput = makeInput({
        destination: 'Rishikesh',
        durationDays: 3,
        budgetAmount: 6000,
        budgetMode: 'total',
        travelersCount: 2,
        accommodationType: 'hostel',
        transportMode: 'bus',
      });
      const trip = generateAITrip(lowBudgetInput);
      expect(trip.estimatedTotal).toBeLessThanOrEqual(trip.totalBudget);
    });
  });

  describe('5. Personalization & Dietary Compliance', () => {
    it('never recommends meat or egg dishes for veg, jain, or vegan travelers in Rajasthan, Goa, or Kerala', () => {
      const destinations = ['Udaipur', 'Goa', 'Kerala'];
      for (const destination of destinations) {
        const trip = generateAITrip(
          makeInput({
            destination,
            durationDays: 3,
            foodPreference: 'jain' as any,
          }),
        );
        const allText = JSON.stringify(trip.itinerary);
        expect(allText).not.toContain('Laal Maas');
        expect(allText).not.toContain('Omelette');
        expect(allText).not.toContain('Egg Stew');
      }
    });
  });

  describe('6. Edge Cases: 1-Day Excursion, 10-Day Long Trip, Invalid Dates', () => {
    it('handles a 1-day excursion without overnight hotel check-in and includes same-day return', () => {
      const oneDayTrip = generateAITrip(
        makeInput({
          origin: 'Delhi',
          destination: 'Jaipur',
          durationDays: 1,
          budgetAmount: 8000,
        }),
      );
      expect(oneDayTrip.itinerary.length).toBe(1);
      expect(oneDayTrip.budgetBreakdown.accommodation).toBe(0);
      expect(oneDayTrip.selectedHotel).toBeUndefined();
      const titles = oneDayTrip.itinerary[0].activities.map((a) => a.title.toLowerCase());
      expect(titles.some((t) => t.includes('check-in'))).toBe(false);
      expect(titles.some((t) => t.includes('return'))).toBe(true);
    });

    it('supports a 10-day trip without clamping to 7 days and without repeating highlight attractions', () => {
      const longTrip = generateAITrip(
        makeInput({
          destination: 'Kerala',
          durationDays: 10,
          budgetAmount: 95000,
        }),
      );
      expect(longTrip.itinerary.length).toBe(10);

      const sightseeingTitles = longTrip.itinerary
        .flatMap((d) => d.activities)
        .filter((a) => a.type === 'attraction' || a.type === 'viewpoint')
        .map((a) => a.title);

      const uniqueTitles = new Set(sightseeingTitles);
      expect(uniqueTitles.size).toBe(sightseeingTitles.length);
    });

    it('gracefully handles invalid startDate and negative/NaN numbers without throwing', () => {
      const edgeTrip = generateAITrip(
        makeInput({
          startDate: 'not-a-valid-date',
          durationDays: -5,
          budgetAmount: -1000,
          travelersCount: 0,
        }),
      );
      expect(edgeTrip.itinerary.length).toBeGreaterThanOrEqual(1);
      expect(edgeTrip.travelersCount).toBeGreaterThanOrEqual(1);
      expect(edgeTrip.totalBudget).toBeGreaterThan(0);
      expect(edgeTrip.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
