import { describe, it, expect } from 'vitest';
import { 
  optimizeDayActivitiesTsp,
  calculateCircadianPacing,
  resolveCulturalInsights,
  enrichActivityWithCulturalTip,
  getIndoorMirrorForActivity,
  toggleDayWeatherMode,
  generateParallelGroupBranches,
  calculateTransitPassRoi,
  getTaxFreeShoppingGuidance,
  evaluateBorderRequirements,
  enrichTripWithSmartIntelligence
} from '../src/services/smartTravelEngine';
import { Trip, DayPlan, ItineraryActivity } from '../src/types/trip';

describe('World-Class Smart Travel Engine (7 Cognitive Intelligence Domains)', () => {

  const sampleActivities: ItineraryActivity[] = [
    {
      id: 'act-1',
      dayNumber: 2,
      time: '08:30 AM',
      title: 'Departure from Shinjuku Hotel',
      type: 'departure',
      location: 'Shinjuku, Tokyo',
      estimatedCost: 0,
      travelTimeMin: 0,
      distanceKm: 0,
      description: 'Morning start',
      coordinates: { lat: 35.6938, lng: 139.7034 } // Shinjuku (West)
    },
    {
      id: 'act-2',
      dayNumber: 2,
      time: '10:00 AM',
      title: 'Shibuya Sky & Scramble Crossing',
      type: 'attraction',
      location: 'Shibuya, Tokyo',
      estimatedCost: 2000,
      travelTimeMin: 20,
      distanceKm: 3.5,
      description: 'Iconic open-air rooftop observation deck',
      coordinates: { lat: 35.6595, lng: 139.7005 } // Shibuya (Southwest)
    },
    {
      id: 'act-3',
      dayNumber: 2,
      time: '01:00 PM',
      title: 'Senso-ji Temple & Nakamise-dori',
      type: 'attraction',
      location: 'Asakusa, Tokyo',
      estimatedCost: 500,
      travelTimeMin: 40,
      distanceKm: 14.0,
      description: 'Historic Buddhist temple',
      coordinates: { lat: 35.7148, lng: 139.7967 } // Asakusa (Northeast)
    },
    {
      id: 'act-4',
      dayNumber: 2,
      time: '04:00 PM',
      title: 'Meiji Jingu Shrine & Yoyogi Park',
      type: 'attraction',
      location: 'Harajuku, Tokyo',
      estimatedCost: 0,
      travelTimeMin: 45,
      distanceKm: 15.0,
      description: 'Serene forested imperial shrine',
      coordinates: { lat: 35.6764, lng: 139.6993 } // Harajuku (Southwest - next to Shibuya!)
    },
    {
      id: 'act-5',
      dayNumber: 2,
      time: '07:30 PM',
      title: 'Return to Shinjuku Omoide Yokocho',
      type: 'food',
      location: 'Shinjuku, Tokyo',
      estimatedCost: 2500,
      travelTimeMin: 15,
      distanceKm: 2.0,
      description: 'Evening dinner in historic memory lane alley',
      coordinates: { lat: 35.6930, lng: 139.6998 } // Shinjuku
    }
  ];

  const mockTrip: Trip = {
    id: 'test-smart-tokyo',
    name: 'Delhi to Tokyo Mega Explorer',
    origin: 'Delhi, India',
    destination: 'Tokyo, Japan',
    durationDays: 5,
    travelersCount: 3,
    travelerType: 'friends',
    totalBudget: 350000,
    budgetPerPerson: 116666,
    preferences: ['culture', 'shopping', 'food'],
    transportMode: 'flight',
    accommodationType: 'budget',
    foodPreference: 'any',
    priorities: ['comfort'],
    status: 'upcoming',
    createdAt: new Date().toISOString(),
    startDate: '2026-12-01',
    estimatedTotal: 310000,
    routeType: 'fastest',
    breakStops: [],
    budgetBreakdown: { transportation: 150000, accommodation: 90000, food: 40000, activities: 20000, miscellaneous: 10000 },
    itinerary: [
      {
        dayNumber: 1,
        title: 'Arrival & Shibuya Orientation',
        theme: 'Airport transfer and easy evening',
        activities: sampleActivities.slice(0, 3),
        dayEstimatedCost: 12000
      },
      {
        dayNumber: 2,
        title: 'Historic Shrines & Vibrant City',
        theme: 'Temple morning and shopping afternoon',
        activities: sampleActivities,
        dayEstimatedCost: 15000
      }
    ]
  };

  // ----------------------------------------------------
  // Domain 1: Spatio-Temporal TSP & Queue Inversion
  // ----------------------------------------------------
  it('optimizes daily attractions with 2-opt TSP to eliminate city zigzagging', () => {
    const { activities, result } = optimizeDayActivitiesTsp(sampleActivities);

    expect(activities.length).toBe(sampleActivities.length);
    // In original list, Asakusa (East) was wedged between Shibuya and Harajuku (both West).
    // The TSP engine should reorder intermediate attractions to reduce total route distance.
    expect(result.optimizedDistanceKm).toBeLessThanOrEqual(result.originalDistanceKm);

    // Queue curve slots must be applied to all activities
    activities.forEach(act => {
      expect(act.queueSlot).toBeDefined();
    });
    expect(activities[0].queueSlot).toBe('early_morning_low_crowd');
    expect(activities[activities.length - 1].queueSlot).toBe('evening_vibrant');
  });

  // ----------------------------------------------------
  // Domain 2: Circadian Rhythm & Jet Lag Pacing
  // ----------------------------------------------------
  it('calibrates circadian jet lag pacing for cross-timezone travel (Delhi to Tokyo)', () => {
    const pacing = calculateCircadianPacing('Delhi, India', 'Tokyo, Japan', 5);

    // Delhi (+5.5) to Tokyo (+9.0) is a +3.5h eastward shift
    expect(pacing.deltaUtcHours).toBe(3.5);
    expect(pacing.isSignificantShift).toBe(true);

    // Eastward travel requires morning outdoor sunlight for phase advance
    expect(pacing.melatoninResetSlot.activityType).toBe('outdoor_sunlight');
    expect(pacing.melatoninResetSlot.startTime).toContain('AM');

    // Day 1 must cap exertion to prevent traveler exhaustion
    expect(pacing.recommendedMaxStepsDay1).toBeLessThanOrEqual(9000);
    expect(pacing.pacingWaveform[0].intensity).toBe('arrival_gentle');
    expect(pacing.pacingWaveform[1].intensity).toBe('expedition');
  });

  it('keeps standard pacing for domestic routes without time zone shifts', () => {
    const pacing = calculateCircadianPacing('Delhi', 'Mumbai', 4);
    expect(pacing.deltaUtcHours).toBe(0);
    expect(pacing.isSignificantShift).toBe(false);
  });

  // ----------------------------------------------------
  // Domain 3: Hyper-Local Cultural Friction Engine
  // ----------------------------------------------------
  it('resolves authentic cultural friction guidelines for Tokyo', () => {
    const insights = resolveCulturalInsights('Tokyo, Japan');
    const categories = insights.map(i => i.category);

    expect(categories).toContain('payment_cash');
    expect(categories).toContain('dining_tipping');
    expect(categories).toContain('transit_etiquette');

    const tipInsight = insights.find(i => i.category === 'dining_tipping');
    expect(tipInsight?.detail.toLowerCase()).toContain('tipping');

    const cashInsight = insights.find(i => i.category === 'payment_cash');
    expect(cashInsight?.actionableTip.toLowerCase()).toContain('7-eleven');
  });

  it('enriches individual activities with specific etiquette and tipping rules', () => {
    const shrineActivity: ItineraryActivity = {
      ...sampleActivities[2],
      title: 'Senso-ji Temple Visit'
    };
    const tip = enrichActivityWithCulturalTip(shrineActivity, 'Tokyo, Japan');

    expect(tip.shoeProtocol).toBe('shoes_off_tatami');
    expect(tip.tippingRule).toBe('strictly_no_tipping');
    expect(tip.etiquette).toContain('Temizuya');
  });

  // ----------------------------------------------------
  // Domain 4: Dynamic Weather-Adaptive Activity Swapping
  // ----------------------------------------------------
  it('provides indoor mirror twin for outdoor landmarks and toggles rain mode', () => {
    const outdoorAct: ItineraryActivity = {
      ...sampleActivities[1],
      title: 'Shibuya Sky Outdoor Observation Deck'
    };
    const mirror = getIndoorMirrorForActivity(outdoorAct, 'Tokyo, Japan');

    expect(mirror.category).toBe('museum');
    expect(mirror.title.toLowerCase()).toContain('mori art museum');

    // Test non-destructive rain mode toggle
    const dayWithMirror: DayPlan = {
      dayNumber: 2,
      title: 'Observation Day',
      theme: 'Views',
      dayEstimatedCost: 5000,
      activities: [{ ...outdoorAct, indoorMirror: mirror }]
    };

    const rainDay = toggleDayWeatherMode(dayWithMirror, true);
    expect(rainDay.isWeatherSwapped).toBe(true);
    expect(rainDay.activities[0].title).toBe(mirror.title);
    expect(rainDay.activities[0].isIndoorSwapped).toBe(true);

    const fairDay = toggleDayWeatherMode(rainDay, false);
    expect(fairDay.isWeatherSwapped).toBe(false);
    expect(fairDay.activities[0].title).toBe(outdoorAct.title);
  });

  // ----------------------------------------------------
  // Domain 5: Multi-Persona Pareto Group Balancing
  // ----------------------------------------------------
  it('generates parallel autonomous explorer sprints with shared convergence anchor', () => {
    const branches = generateParallelGroupBranches(mockTrip.itinerary[1], 'Tokyo, Japan');

    expect(branches.length).toBeGreaterThanOrEqual(2);
    expect(branches.some(b => b.targetPersonas.includes('shopping'))).toBe(true);
    expect(branches.some(b => b.targetPersonas.includes('culture') || b.targetPersonas.includes('historical'))).toBe(true);

    // Both branches must define a convergence dinner anchor
    branches.forEach(b => {
      expect(b.convergenceAnchor).toBeDefined();
      expect(b.convergenceAnchor.venueName).toBeDefined();
      expect(b.distanceToConvergenceMeters).toBeLessThan(600);
    });
  });

  // ----------------------------------------------------
  // Domain 6: Purchasing Power Parity (PPP) & Financial Micro-Forecasting
  // ----------------------------------------------------
  it('calculates transit pass ROI and tax-free shopping guidance for Tokyo', () => {
    const transitRoi = calculateTransitPassRoi('Tokyo, Japan', 5);
    expect(transitRoi.isRecommended).toBe(true);
    expect(transitRoi.passName).toContain('72-Hour');
    expect(transitRoi.netSavings).toBeGreaterThan(0);

    const taxFree = getTaxFreeShoppingGuidance('Tokyo, Japan');
    expect(taxFree.minimumThresholdAmount).toBe(5000);
    expect(taxFree.refundPercentage).toBe(10);
    expect(taxFree.passportRequired).toBe(true);
  });

  // ----------------------------------------------------
  // Domain 7: Border, Visa & Transit Trap Detection (IATA Timatic)
  // ----------------------------------------------------
  it('evaluates international border requirements and digital arrival declarations', () => {
    const sentinel = evaluateBorderRequirements('Delhi, India', 'Tokyo, Japan');

    expect(sentinel.passportValidityRequiredMonths).toBe(6);
    expect(sentinel.mandatoryArrivalDeclarations.length).toBeGreaterThan(0);
    expect(sentinel.mandatoryArrivalDeclarations[0].name).toContain('Visit Japan Web');

    // Self-transfer layover warnings
    expect(sentinel.transitVisaWarning?.appliesToSelfTransfer).toBe(true);

    // Medication restrictions (Sudafed / pseudoephedrine ban)
    const medRestrictions = sentinel.medicationRestrictions.join(' ').toLowerCase();
    expect(medRestrictions).toContain('pseudoephedrine');
  });

  // ----------------------------------------------------
  // Master Integration: enrichTripWithSmartIntelligence
  // ----------------------------------------------------
  it('enriches complete trip with all 7 intelligence domains seamlessly', () => {
    const enrichedTrip = enrichTripWithSmartIntelligence(mockTrip);

    // Circadian pacing
    expect(enrichedTrip.circadianPacing).toBeDefined();
    expect(enrichedTrip.circadianPacing?.deltaUtcHours).toBe(3.5);

    // Transit pass ROI & Tax-free
    expect(enrichedTrip.transitPassRoi).toBeDefined();
    expect(enrichedTrip.taxFreeGuidance).toBeDefined();

    // Border Security Sentinel
    expect(enrichedTrip.borderSecuritySentinel).toBeDefined();

    // Enriched Days
    expect(enrichedTrip.itinerary[0].circadianAdvice).toBeDefined();
    expect(enrichedTrip.itinerary[0].culturalInsights?.length).toBeGreaterThan(0);
    expect(enrichedTrip.itinerary[1].groupBranches?.length).toBeGreaterThan(0);
    expect(enrichedTrip.itinerary[1].activities[0].indoorMirror).toBeDefined();
    expect(enrichedTrip.itinerary[1].activities[0].culturalTip).toBeDefined();
  });
});
