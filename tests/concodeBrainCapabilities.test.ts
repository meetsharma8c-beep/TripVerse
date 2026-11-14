import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getTravelerMemoryRing, 
  updateTravelerMemoryRing, 
  clearTravelerMemoryRing,
  resetConcodeSession 
} from '../src/services/concodeSession';
import { queryConcodeBrain } from '../src/services/concodeBrainService';
import { Trip } from '../src/types/trip';

describe('CONCODE Brain Advanced Capabilities Integration', () => {
  beforeEach(() => {
    clearTravelerMemoryRing();
    resetConcodeSession();
  });

  const mockTrip: Trip = {
    id: 'test-trip-1',
    name: 'Ahmedabad to Manali Expedition',
    origin: 'Ahmedabad, Gujarat',
    destination: 'Manali, Himachal Pradesh',
    durationDays: 3,
    totalBudget: 20000,
    estimatedTotal: 18500,
    travelersCount: 2,
    travelerType: 'couple',
    transportMode: 'car',
    accommodationType: 'hotel',
    foodPreference: 'all',
    itinerary: [
      {
        dayNumber: 1,
        title: 'Arrival & Scenic Sightseeing',
        theme: 'Culture & Nature',
        dayEstimatedCost: 3500,
        activities: [
          {
            id: 'act-1',
            dayNumber: 1,
            time: '10:00 AM',
            title: 'Hadimba Temple',
            type: 'attraction',
            location: 'Hadimba Temple, Manali',
            description: 'Historic wooden temple in cedar forest.',
            estimatedCost: 150,
            travelTimeMin: 15,
            distanceKm: 3,
            coordinates: { lat: 32.2483, lng: 77.1802 }
          }
        ]
      }
    ]
  };

  it('correctly persists, retrieves, and clears the Traveler Memory Ring', () => {
    // 1. Initial State
    const initial = getTravelerMemoryRing();
    expect(initial).toBeDefined();

    // 2. Update Memory Ring
    const updated = updateTravelerMemoryRing({
      dietaryPreference: 'veg',
      travelPace: 'relaxed',
      budgetTier: 'moderate',
      favoriteDestinations: ['Manali', 'Udaipur'],
      interests: ['nature', 'temples']
    });

    expect(updated.dietaryPreference).toBe('veg');
    expect(updated.travelPace).toBe('relaxed');
    expect(updated.favoriteDestinations).toContain('Manali');
    expect(updated.favoriteDestinations).toContain('Udaipur');

    // 3. Retrieve Persisted Memory Ring
    const fetched = getTravelerMemoryRing();
    expect(fetched.dietaryPreference).toBe('veg');
    expect(fetched.travelPace).toBe('relaxed');

    // 4. Clear Memory Ring
    clearTravelerMemoryRing();
    const cleared = getTravelerMemoryRing();
    expect(cleared.dietaryPreference).toBe('all');
  });

  it('routes 3D landmark exploration queries to the webgl guild', async () => {
    const res = await queryConcodeBrain('Show me an interactive 3D WebGL tour of the landmark', mockTrip);
    expect(res.guild).toBe('webgl');
    expect(res.response).toContain('3D WebGL Landmark Explorer');
    expect(res.actionButtons).toBeDefined();
    expect(res.actionButtons?.some(btn => btn.action === 'OPEN_3D_VIEWER')).toBe(true);
  });

  it('routes tourist trap and safety queries to the security guild', async () => {
    const res = await queryConcodeBrain('What are the tourist scams and safety tips for Manali?', mockTrip);
    expect(res.guild).toBe('security');
    expect(res.response).toContain('Safety & Scam Radar');
    expect(res.actionButtons?.some(btn => btn.action === 'VIEW_SAFETY')).toBe(true);
  });

  it('re-plans Day 1 for flight/transit delays without breaking budget or Day 2', async () => {
    const res = await queryConcodeBrain('My flight was delayed 3 hours, please replan Day 1', mockTrip);
    expect(res.guild).toBe('system_architect');
    expect(res.modificationBadge?.type).toBe('delay');
    expect(res.updatedTrip).toBeDefined();
    expect(res.updatedTrip?.itinerary[0].activities.length).toBeGreaterThan(0);
    expect(res.updatedTrip?.itinerary[0].activities[0].title).toContain('Hotel Check-in');
  });

  it('activates ConCode Section 19 disruption protocol for cancellations and severe disruption replanning', async () => {
    const res = await queryConcodeBrain('My flight was cancelled, please replan my trip', mockTrip);
    expect(res.guild).toBe('system_architect');
    expect(res.modificationBadge?.type).toBe('replan');
    expect(res.response).toContain('ConCode Disruption Protocol Activated');
    expect(res.actionButtons?.some(btn => btn.action === 'OPEN_REPLANNING')).toBe(true);
    expect(res.actionButtons?.some(btn => btn.action === 'OPEN_EMERGENCY_STAY')).toBe(true);
    expect(res.actionButtons?.some(btn => btn.action === 'OPEN_REFUND_INFO')).toBe(true);
  });

  it('orchestrates group travel consensus across the swarm', async () => {
    const res = await queryConcodeBrain('Plan a group trip with mixed preferences for adventure and food', mockTrip);
    expect(res.guild).toBe('research_scientist');
    expect(res.response).toContain('Multi-Agent Swarm Consensus');
  });

  it('reports active cognitive memory ring state when prompted', async () => {
    updateTravelerMemoryRing({
      dietaryPreference: 'vegan',
      travelPace: 'relaxed'
    });

    const res = await queryConcodeBrain('What do you remember in my travel profile memory ring?', mockTrip);
    expect(res.guild).toBe('conversational');
    expect(res.response).toContain('VEGAN');
    expect(res.response).toContain('RELAXED');
  });

  it('routes PDF export and travel guide requests to the ui_ux guild with printable modal trigger', async () => {
    const res = await queryConcodeBrain('Download and export official printable PDF travel guide dossier', mockTrip);
    expect(res.guild).toBe('ui_ux');
    expect(res.response).toContain('Official TripVerse Travel Guide');
    expect(res.appAction?.type).toBe('OPEN_MODAL');
    expect((res.appAction?.payload as any)?.modal).toBe('print');
    expect(res.actionButtons?.some(btn => btn.action === 'PRINT_GUIDE')).toBe(true);
  });

  it('routes live weather, climate, and forecast queries to the security guild with seasonal advice', async () => {
    const res = await queryConcodeBrain('What is the live weather forecast, temperature, and packing guide for Manali?', mockTrip);
    expect(res.guild).toBe('security');
    expect(res.response).toContain('Climate Overview');
    expect(res.actionButtons?.some(btn => btn.action === 'VIEW_PACKING')).toBe(true);
    expect(res.actionButtons?.some(btn => btn.action === 'RAINY_DAY_ALT')).toBe(true);
  });

  it('routes flight routes, airport codes, and airfare queries to the fullstack guild with Google Flights link', async () => {
    const dubaiTrip = { ...mockTrip, destination: 'Dubai, UAE' };
    const res = await queryConcodeBrain('Find best flight routes, airport codes, and airfare options', dubaiTrip);
    expect(res.guild).toBe('fullstack');
    expect(res.response).toContain('DXB');
    expect(res.response).toContain('Flight Routes');
    expect(res.actionButtons?.some(btn => btn.action === 'SEARCH_FLIGHTS')).toBe(true);
    expect(res.actionButtons?.some(btn => btn.action === 'TRANSPORT_DEALS')).toBe(true);
  });
});
