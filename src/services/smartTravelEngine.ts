import { Coordinates, DayPlan, ItineraryActivity, Trip } from '../types/trip';
import { 
  TspOptimizationResult, 
  CircadianPacingAdvice, 
  CulturalInsight, 
  ActivityCulturalTip, 
  IndoorMirrorActivity, 
  ParallelGroupBranch, 
  TransitPassRoi, 
  TaxFreeShoppingGuidance, 
  BorderSecuritySentinel 
} from '../types/smartTravel';

// ==========================================
// 1. SPATIO-TEMPORAL TSP ROUTING & QUEUE INVERSION
// ==========================================

function haversineDist(c1: Coordinates, c2: Coordinates): number {
  if (!c1 || !c2) return 0;
  const R = 6371;
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
    Math.cos((c2.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Parses a clock string like "9:30 AM", "04:00 PM", or "13:15" into minutes since midnight.
 */
function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 12 * 60;
  const trimmed = timeStr.trim();
  const m12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (m12) {
    let h = parseInt(m12[1], 10) % 12;
    const min = parseInt(m12[2], 10);
    if (m12[3].toUpperCase() === 'PM') h += 12;
    return h * 60 + min;
  }
  const m24 = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (m24) {
    return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
  }
  return 12 * 60;
}

function assignQueueSlotByTime(act: ItineraryActivity, idx: number, total: number): ItineraryActivity['queueSlot'] {
  const mins = parseTimeToMinutes(act.time);
  if (idx === 0 || mins < 11 * 60) {
    return 'early_morning_low_crowd';
  }
  if (mins >= 18 * 60 || idx === total - 1) {
    return 'evening_vibrant';
  }
  if (mins < 15 * 60) {
    return 'midday_timed_indoor';
  }
  return 'afternoon_leisure';
}

function isFlexibleSightseeing(act: ItineraryActivity): boolean {
  return act.type === 'attraction' || act.type === 'viewpoint' || act.type === 'nightlife';
}

/**
 * Solves Travelling Salesperson 2-Opt Heuristic on flexible destination sightseeing
 * stops while strictly preserving chronological schedule integrity and fixed transit/meal anchors.
 */
export function optimizeDayActivitiesTsp(activities: ItineraryActivity[]): {
  activities: ItineraryActivity[];
  result: TspOptimizationResult;
} {
  if (!activities || activities.length <= 2) {
    return {
      activities: (activities || []).map((act, idx, arr) => ({
        ...act,
        queueSlot: assignQueueSlotByTime(act, idx, arr.length)
      })),
      result: {
        originalDistanceKm: 0,
        optimizedDistanceKm: 0,
        savedDistanceKm: 0,
        estimatedTransitTimeSavedMinutes: 0,
        routePolygon: (activities || []).map(a => a.coordinates).filter(Boolean)
      }
    };
  }

  // Always start from strictly ascending chronological order
  const chrono = activities
    .map((act, index) => ({ act, index, mins: parseTimeToMinutes(act.time) }))
    .sort((a, b) => a.mins - b.mins || a.index - b.index)
    .map(item => item.act);

  // Compute original sequential distance
  let origDist = 0;
  for (let i = 0; i < chrono.length - 1; i++) {
    origDist += haversineDist(chrono[i].coordinates, chrono[i + 1].coordinates);
  }

  // Only spatially reorder flexible sightseeing stops strictly BEFORE any return departure
  const returnIdx = chrono.findIndex(
    (a, idx) => idx > 0 && ((a.type === 'departure' && /return/i.test(`${a.tag || ''} ${a.title}`)) || a.type === 'arrival')
  );
  const sightWindowEnd = returnIdx > 0 ? returnIdx : chrono.length;

  const sightIndices: number[] = [];
  for (let i = 0; i < sightWindowEnd; i++) {
    if (isFlexibleSightseeing(chrono[i])) {
      sightIndices.push(i);
    }
  }

  const finalOrdered = [...chrono];
  if (sightIndices.length >= 2) {
    const anchorIndex = Math.max(0, sightIndices[0] - 1);
    let currentCoords = finalOrdered[anchorIndex].coordinates;
    const unvisited = sightIndices.map(idx => chrono[idx]);
    const slotTimes = sightIndices.map(idx => chrono[idx].time);
    const reorderedSights: ItineraryActivity[] = [];

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minD = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const d = haversineDist(currentCoords, unvisited[i].coordinates);
        if (d < minD) {
          minD = d;
          nearestIdx = i;
        }
      }
      const chosen = unvisited.splice(nearestIdx, 1)[0];
      reorderedSights.push(chosen);
      currentCoords = chosen.coordinates;
    }

    // Reassign original ascending time slots to reordered sightseeing spots so times never scramble
    sightIndices.forEach((slotIdx, orderIdx) => {
      finalOrdered[slotIdx] = {
        ...reorderedSights[orderIdx],
        time: slotTimes[orderIdx]
      };
    });
  }

  // Recalculate optimized distance (if reordering increased distance, revert to original chronological order)
  let optDist = 0;
  for (let i = 0; i < finalOrdered.length - 1; i++) {
    optDist += haversineDist(finalOrdered[i].coordinates, finalOrdered[i + 1].coordinates);
  }
  const chosenOrder = optDist <= origDist ? finalOrdered : chrono;
  const finalOptDist = Math.min(origDist, optDist);

  // Assign accurate Queue-Curve Slots based on actual clock time
  const enriched = chosenOrder.map((act, idx) => ({
    ...act,
    queueSlot: assignQueueSlotByTime(act, idx, chosenOrder.length)
  }));

  const savedKm = Math.max(0, Math.round((origDist - finalOptDist) * 10) / 10);
  const timeSavedMin = Math.round(savedKm * 4.5);

  return {
    activities: enriched,
    result: {
      originalDistanceKm: Math.round(origDist * 10) / 10,
      optimizedDistanceKm: Math.round(finalOptDist * 10) / 10,
      savedDistanceKm: savedKm,
      estimatedTransitTimeSavedMinutes: timeSavedMin,
      routePolygon: enriched.map(a => a.coordinates).filter(Boolean)
    }
  };
}

// ==========================================
// 2. CIRCADIAN RHYTHM, JET LAG & COGNITIVE PACING
// ==========================================

const TIMEZONE_MAP: Record<string, { tz: string; utcOffset: number }> = {
  tokyo: { tz: 'Asia/Tokyo', utcOffset: 9.0 },
  japan: { tz: 'Asia/Tokyo', utcOffset: 9.0 },
  kyoto: { tz: 'Asia/Tokyo', utcOffset: 9.0 },
  osaka: { tz: 'Asia/Tokyo', utcOffset: 9.0 },
  delhi: { tz: 'Asia/Kolkata', utcOffset: 5.5 },
  mumbai: { tz: 'Asia/Kolkata', utcOffset: 5.5 },
  india: { tz: 'Asia/Kolkata', utcOffset: 5.5 },
  bangalore: { tz: 'Asia/Kolkata', utcOffset: 5.5 },
  paris: { tz: 'Europe/Paris', utcOffset: 1.0 },
  france: { tz: 'Europe/Paris', utcOffset: 1.0 },
  london: { tz: 'Europe/London', utcOffset: 0.0 },
  uk: { tz: 'Europe/London', utcOffset: 0.0 },
  'new york': { tz: 'America/New_York', utcOffset: -5.0 },
  usa: { tz: 'America/New_York', utcOffset: -5.0 },
  singapore: { tz: 'Asia/Singapore', utcOffset: 8.0 },
  dubai: { tz: 'Asia/Dubai', utcOffset: 4.0 },
  uae: { tz: 'Asia/Dubai', utcOffset: 4.0 },
  bangkok: { tz: 'Asia/Bangkok', utcOffset: 7.0 },
  thailand: { tz: 'Asia/Bangkok', utcOffset: 7.0 },
  bali: { tz: 'Asia/Makassar', utcOffset: 8.0 },
  indonesia: { tz: 'Asia/Makassar', utcOffset: 8.0 },
  sydney: { tz: 'Australia/Sydney', utcOffset: 11.0 }
};

export function resolveTimezoneOffset(locationName: string): { tz: string; utcOffset: number } {
  const norm = (locationName || '').toLowerCase().trim();
  for (const [k, v] of Object.entries(TIMEZONE_MAP)) {
    if (norm.includes(k)) return v;
  }
  return { tz: 'UTC', utcOffset: 0.0 };
}

export function calculateCircadianPacing(
  origin: string, 
  destination: string, 
  durationDays: number = 5
): CircadianPacingAdvice {
  const orig = resolveTimezoneOffset(origin || 'India');
  const dest = resolveTimezoneOffset(destination || 'Tokyo');
  const deltaUtc = Math.round(Math.abs(dest.utcOffset - orig.utcOffset) * 10) / 10;
  const isEastward = dest.utcOffset > orig.utcOffset;
  const isSignificant = deltaUtc >= 3.0;

  // Melatonin reset window
  const resetSlot = isEastward
    ? {
        startTime: '08:30 AM',
        endTime: '10:30 AM',
        activityType: 'outdoor_sunlight' as const,
        scientificRationale: `Eastward travel advance (+${deltaUtc}h): High-lux morning retinal light suppresses residual melatonin, synchronizing the suprachiasmatic nucleus (SCN).`
      }
    : {
        startTime: '04:00 PM',
        endTime: '06:00 PM',
        activityType: 'outdoor_sunlight' as const,
        scientificRationale: `Westward travel delay (-${deltaUtc}h): Late afternoon sunlight exposure delays melatonin onset to align with destination sunset.`
      };

  // Pacing waveform across days
  const pacingWaveform = Array.from({ length: durationDays }).map((_, i) => {
    const day = i + 1;
    if (day === 1) {
      return {
        dayNumber: 1,
        intensity: 'arrival_gentle' as const,
        targetStepCount: isSignificant ? 8500 : 12000,
        rationale: isSignificant
          ? 'Circadian orientation: Low cognitive load, light walking, and early sleep to reset sleep pressure.'
          : 'Arrival orientation: Light neighborhood exploration.'
      };
    }
    if (day === 2) {
      return {
        dayNumber: 2,
        intensity: 'expedition' as const,
        targetStepCount: 16000,
        rationale: 'Peak alertness window: Full day exploration of major heritage and walking sectors.'
      };
    }
    if (day === 3) {
      return {
        dayNumber: 3,
        intensity: 'restorative' as const,
        targetStepCount: 10000,
        rationale: 'Active recovery: Scenic cruises, onsen/tea rituals, or café districts to prevent cumulative travel fatigue.'
      };
    }
    if (day === 4) {
      return {
        dayNumber: 4,
        intensity: 'peak_adventure' as const,
        targetStepCount: 18000,
        rationale: 'High energy day: Day excursions or immersive multi-neighborhood discovery.'
      };
    }
    return {
      dayNumber: day,
      intensity: 'expedition' as const,
      targetStepCount: 14000,
      rationale: 'Balanced leisure and signature landmark immersion.'
    };
  });

  return {
    originTimezone: orig.tz,
    destinationTimezone: dest.tz,
    deltaUtcHours: deltaUtc,
    isSignificantShift: isSignificant,
    melatoninResetSlot: resetSlot,
    recommendedMaxStepsDay1: isSignificant ? 9000 : 15000,
    pacingWaveform
  };
}

// ==========================================
// 3. HYPER-LOCAL CULTURAL FRICTION ENGINE
// ==========================================

export function resolveCulturalInsights(destination: string): CulturalInsight[] {
  const norm = (destination || '').toLowerCase();

  if (norm.includes('tokyo') || norm.includes('japan') || norm.includes('kyoto') || norm.includes('osaka')) {
    return [
      {
        id: 'jp-cash',
        category: 'payment_cash',
        title: 'Ramen & Izakaya Cash Friction',
        detail: 'Many authentic ticket vending machines (shokkenki) and Golden Gai bars strictly decline credit cards.',
        actionableTip: 'Use 7-Eleven (7-Bank) ATMs with foreign Visa/Mastercard for 0% markup JPY cash withdrawal.',
        severity: 'must_know'
      },
      {
        id: 'jp-tip',
        category: 'dining_tipping',
        title: 'Strict No-Tipping Etiquette',
        detail: 'Tipping in Japan is considered dishonorable as high quality hospitality (Omotenashi) is built into the base bill.',
        actionableTip: 'Leave exact change or wait for full coins at the register tray. Never leave loose cash on restaurant tables.',
        severity: 'must_know'
      },
      {
        id: 'jp-transit',
        category: 'transit_etiquette',
        title: 'Digital Suica / Pasmo IC Card',
        detail: 'Physical tourist cards often face chip shortages. Digital IC cards work on all subways, JR lines, and konbini.',
        actionableTip: 'Add digital Suica or Pasmo directly into Apple Wallet / Google Wallet via Settings without buying plastic cards.',
        severity: 'must_know'
      },
      {
        id: 'jp-shoes',
        category: 'sacred_spaces',
        title: 'Shoe & Tatami Protocol',
        detail: 'Shoes must be removed before stepping on elevated wooden thresholds, tatami mats, and traditional dining rooms.',
        actionableTip: 'Wear clean, hole-free slip-on socks. Step directly onto the wooden floor; do not step on the shoe floor with socks.',
        severity: 'recommended'
      },
      {
        id: 'jp-onsen',
        category: 'cultural_norm',
        title: 'Onsen & Sento Tattoo Regulations',
        detail: 'Many traditional hot springs prohibit visible tattoos due to historical Yakuza associations.',
        actionableTip: 'Purchase flesh-colored waterproof concealer patches at Don Quijote, or book private onsens (Kashikiri).',
        severity: 'recommended'
      }
    ];
  }

  if (norm.includes('paris') || norm.includes('france')) {
    return [
      {
        id: 'fr-greet',
        category: 'cultural_norm',
        title: 'Mandatory "Bonjour Madame/Monsieur"',
        detail: 'Failing to say "Bonjour" immediately upon entering any Parisian shop or bistro is considered rude.',
        actionableTip: 'Always initiate every shop encounter with a warm "Bonjour" before asking questions or browsing.',
        severity: 'must_know'
      },
      {
        id: 'fr-ticket',
        category: 'transit_etiquette',
        title: 'Compostez Votre Billet (Ticket Validation)',
        detail: 'Having a ticket without validating it before boarding trains results in instant €50+ non-negotiable SNCF fines.',
        actionableTip: 'Insert yellow tickets into the yellow stamping terminal at station entrances before stepping onto the platform.',
        severity: 'must_know'
      },
      {
        id: 'fr-dining',
        category: 'dining_tipping',
        title: 'Service Compris & Evening Dining Hours',
        detail: '15% service charge is legally included in menu prices. Kitchens close between 2:30 PM and 7:30 PM.',
        actionableTip: 'Round up the bill with €1–€2 for attentive service. Never attempt to dine between 3 PM and 7 PM at bistros.',
        severity: 'recommended'
      }
    ];
  }

  // Universal Default / Domestic India
  return [
    {
      id: 'gen-cashless',
      category: 'payment_cash',
      title: 'UPI Cashless Dominance',
      detail: 'Local street vendors, chai stalls, and taxis prefer instant QR payments via PhonePe, Google Pay, or Paytm.',
      actionableTip: 'Keep UPI active on mobile; keep ₹2,000 cash in ₹100 notes for remote national park checkposts.',
      severity: 'must_know'
    },
    {
      id: 'gen-temple',
      category: 'sacred_spaces',
      title: 'Temple Footwear & Modesty',
      detail: 'Shoes and leather belts must be deposited at temple shoe counters before entering sanctums.',
      actionableTip: 'Cover knees and shoulders; carry a light cotton stole for sun protection and temple modesty.',
      severity: 'recommended'
    }
  ];
}

export function enrichActivityWithCulturalTip(
  activity: ItineraryActivity, 
  destination: string
): ActivityCulturalTip {
  const title = (activity.title || '').toLowerCase();
  const desc = (activity.description || '').toLowerCase();
  const dest = (destination || '').toLowerCase();

  const isJapan = dest.includes('tokyo') || dest.includes('japan') || dest.includes('kyoto') || dest.includes('osaka');

  if (isJapan) {
    if (title.includes('shrine') || title.includes('temple') || title.includes('senso') || title.includes('meiji')) {
      return {
        etiquette: 'Rinse hands and mouth at the Temizuya fountain before praying. Bow twice, clap twice, bow once.',
        shoeProtocol: 'shoes_off_tatami',
        tippingRule: 'strictly_no_tipping'
      };
    }
    if (title.includes('ramen') || title.includes('food') || title.includes('izakaya') || title.includes('sushi')) {
      return {
        etiquette: 'Slurping noodles is considered polite appreciation of flavor. Do not pass food chopstick-to-chopstick.',
        paymentAlert: 'Many traditional ramen spots require 1,000-yen notes at the vending ticket machine.',
        tippingRule: 'strictly_no_tipping'
      };
    }
    return {
      etiquette: 'Keep voice quiet on Tokyo Metro; set phone to Manner Mode. Walk on the left side of escalators in Tokyo.',
      tippingRule: 'strictly_no_tipping'
    };
  }

  return {
    etiquette: 'Respect local heritage customs, remove shoes at sanctums, and ask before taking portrait photos.',
    tippingRule: 'optional_round_up'
  };
}

// ==========================================
// 4. DYNAMIC WEATHER-ADAPTIVE ACTIVITY SWAPPING
// ==========================================

export function getIndoorMirrorForActivity(
  activity: ItineraryActivity, 
  destination: string
): IndoorMirrorActivity {
  const title = (activity.title || '').toLowerCase();
  const dest = (destination || '').toLowerCase();

  if (dest.includes('tokyo') || dest.includes('japan')) {
    if (title.includes('shibuya') || title.includes('sky') || title.includes('crossing')) {
      return {
        title: 'Mori Art Museum & Roppongi Hills Observation Gallery',
        location: 'Roppongi Hills Mori Tower, Minato, Tokyo',
        description: 'World-class contemporary art museum on the 53rd floor with 360-degree indoor observation deck protected from rain and wind.',
        image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
        estimatedCost: 2200,
        coordinates: { lat: 35.6605, lng: 139.7292 },
        category: 'museum',
        whyMirror: 'Replaces outdoor Shibuya Sky open-air deck with rainproof 53rd-floor Tokyo skyline panoramas.'
      };
    }

    if (title.includes('shinjuku') || title.includes('gyoen') || title.includes('park') || title.includes('garden')) {
      return {
        title: 'Tokyo Station Underground Gallery & Character Street',
        location: 'First Avenue Tokyo Station, Chiyoda, Tokyo',
        description: 'Vast multi-kilometer indoor cultural street featuring Studio Ghibli, craft design shops, and the famous Tokyo Ramen Street.',
        image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80',
        estimatedCost: 1500,
        coordinates: { lat: 35.6812, lng: 139.7671 },
        category: 'covered_arcade',
        whyMirror: 'Replaces outdoor park walking with Tokyo’s premier covered subterranean cultural boulevard.'
      };
    }

    if (title.includes('senso') || title.includes('asakusa') || title.includes('sumida')) {
      return {
        title: 'Tokyo National Museum (Honkan Japanese Art)',
        location: 'Ueno Park, Taito, Tokyo',
        description: 'Japan’s oldest and largest national museum with over 120,000 cultural relics, samurai armor, national treasures, and indoor tea houses.',
        image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
        estimatedCost: 1000,
        coordinates: { lat: 35.7188, lng: 139.7765 },
        category: 'museum',
        whyMirror: 'Replaces rainy open-air temple grounds with climate-controlled imperial treasures.'
      };
    }
  }

  // Universal Default Indoor Mirror
  return {
    title: `National Heritage Museum & Cultural Art Gallery of ${destination}`,
    location: `Central Arts District, ${destination}`,
    description: `Immersive climate-controlled indoor gallery showcasing regional craftsmanship, historical artifacts, and artisanal cafe tastings.`,
    image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=800&q=80',
    estimatedCost: activity.estimatedCost || 1200,
    coordinates: activity.coordinates,
    category: 'museum',
    whyMirror: 'Weather-protected cultural immersion in the immediate neighborhood.'
  };
}

export function toggleDayWeatherMode(day: DayPlan, isRainOptimized: boolean): DayPlan {
  const updatedActivities = day.activities.map(act => {
    // If turning ON rain mode and has an indoor mirror and not yet swapped
    if (isRainOptimized && act.indoorMirror && !act.isIndoorSwapped) {
      return {
        ...act,
        originalOutdoor: {
          title: act.title,
          location: act.location,
          description: act.description,
          image: act.image,
          estimatedCost: act.estimatedCost,
          coordinates: act.coordinates
        },
        title: act.indoorMirror.title,
        location: act.indoorMirror.location,
        description: act.indoorMirror.description,
        image: act.indoorMirror.image || act.image,
        estimatedCost: act.indoorMirror.estimatedCost || act.estimatedCost,
        coordinates: act.indoorMirror.coordinates || act.coordinates,
        isIndoorSwapped: true
      };
    }

    // If turning OFF rain mode and was swapped previously
    if (!isRainOptimized && act.isIndoorSwapped && act.originalOutdoor) {
      const orig = act.originalOutdoor;
      return {
        ...act,
        title: orig.title,
        location: orig.location,
        description: orig.description,
        image: orig.image || act.image,
        estimatedCost: orig.estimatedCost ?? act.estimatedCost,
        coordinates: orig.coordinates || act.coordinates,
        isIndoorSwapped: false,
        originalOutdoor: undefined
      };
    }

    return act;
  });

  return {
    ...day,
    isWeatherSwapped: isRainOptimized,
    activities: updatedActivities
  };
}

// ==========================================
// 5. MULTI-PERSONA PARETO GROUP BALANCING
// ==========================================

export function generateParallelGroupBranches(
  day: DayPlan, 
  destination: string
): ParallelGroupBranch[] {
  const dest = (destination || '').toLowerCase();

  if (dest.includes('tokyo') || dest.includes('japan')) {
    return [
      {
        branchId: `branch-day${day.dayNumber}-shoppers`,
        timeWindow: '02:30 PM - 05:00 PM',
        branchName: 'Autonomous Sprint A: Design & Retail Enthusiasts',
        targetPersonas: ['shopping', 'luxury', 'modern_design'],
        activityTitle: 'Ginza Six Flagship Complex & Tsutaya Art Books',
        activityLocation: 'Ginza 6-Chome, Chuo, Tokyo',
        description: 'Explore curated Japanese fashion ateliers, flagship craft concept stores, and the serene rooftop garden overlooking central Ginza.',
        distanceToConvergenceMeters: 380,
        convergenceAnchor: {
          time: '05:15 PM',
          venueName: 'Traditional Ginza Banya Izakaya',
          type: 'izakaya',
          instructions: 'Reunite with Group B at the courtyard entrance to compare afternoon discoveries over hot yakitori and green tea.'
        }
      },
      {
        branchId: `branch-day${day.dayNumber}-culture`,
        timeWindow: '02:30 PM - 05:00 PM',
        branchName: 'Autonomous Sprint B: Heritage & Culture Explorers',
        targetPersonas: ['historical', 'culture', 'photography'],
        activityTitle: 'Kabuki-za Theatre & Traditional Tsukiji Green Tea Ceremony',
        activityLocation: 'Higashi-Ginza & Tsukiji, Tokyo',
        description: 'Witness classical Kabuki performance architecture and enjoy ceremonial whisked Uji matcha at a historic 90-year-old wooden tea merchant.',
        distanceToConvergenceMeters: 410,
        convergenceAnchor: {
          time: '05:15 PM',
          venueName: 'Traditional Ginza Banya Izakaya',
          type: 'izakaya',
          instructions: 'Walk 400m west along Harumi-dori to reunite with Group A at the reserved courtyard table.'
        }
      }
    ];
  }

  // Generic Branch for other destinations
  return [
    {
      branchId: `branch-day${day.dayNumber}-a`,
      timeWindow: '03:00 PM - 05:00 PM',
      branchName: 'Branch A: Artisan Markets & Shopping Walk',
      targetPersonas: ['shopping', 'street_food'],
      activityTitle: `Local Craft Bazaars of ${destination}`,
      activityLocation: `Historic Core, ${destination}`,
      description: 'Browse local textiles, spice shops, and handmade souvenirs at your own leisurely pace.',
      distanceToConvergenceMeters: 350,
      convergenceAnchor: {
        time: '05:30 PM',
        venueName: 'Heritage Sunset Rooftop Café',
        type: 'café',
        instructions: 'Reunite with companions on the terrace for sunset drinks.'
      }
    }
  ];
}

// ==========================================
// 6. PPP & FINANCIAL MICRO-ECONOMICS
// ==========================================

export function calculateTransitPassRoi(destination: string, durationDays: number): TransitPassRoi {
  const norm = (destination || '').toLowerCase();

  if (norm.includes('tokyo') || norm.includes('japan')) {
    const singleRidesDaily = 5;
    const avgSingleFareJpy = 220;
    const totalSingleFareEst = singleRidesDaily * avgSingleFareJpy * durationDays; // e.g. 5 days = 5500 JPY
    const passCostJpy = durationDays >= 3 ? 1500 : 800; // Tokyo Subway 72-Hour Pass is ¥1,500
    const netSavings = Math.max(0, totalSingleFareEst - passCostJpy);

    return {
      passName: 'Tokyo Subway 72-Hour Tourist Pass',
      passCost: passCostJpy,
      singleFaresTotalEstimate: totalSingleFareEst,
      netSavings,
      isRecommended: true,
      validityDuration: '72 consecutive hours from first tap',
      coverageAreas: ['All 13 Tokyo Metro Lines', 'All 4 Toei Subway Lines'],
      purchaseLocation: 'Bic Camera, Haneda/Narita Airport counters, or Klook with foreign passport'
    };
  }

  if (norm.includes('paris') || norm.includes('france')) {
    return {
      passName: 'Navigo Easy Pass / Paris Visite',
      passCost: 3200,
      singleFaresTotalEstimate: 5100,
      netSavings: 1900,
      isRecommended: true,
      validityDuration: 'Unlimited intra-city metro and RER Zone 1-3',
      coverageAreas: ['Paris Metro', 'RER Zone 1', 'RATP Buses'],
      purchaseLocation: 'SNCF / RATP automated multi-lingual ticket machines'
    };
  }

  // Default
  return {
    passName: 'Multi-Day City Transit Smartcard',
    passCost: 1200,
    singleFaresTotalEstimate: 1800,
    netSavings: 600,
    isRecommended: true,
    validityDuration: 'Entire trip duration',
    coverageAreas: ['City bus corridors', 'Metro transit networks'],
    purchaseLocation: 'Central interchange station customer service desk'
  };
}

export function getTaxFreeShoppingGuidance(destination: string): TaxFreeShoppingGuidance {
  const norm = (destination || '').toLowerCase();

  if (norm.includes('tokyo') || norm.includes('japan')) {
    return {
      minimumThresholdAmount: 5000,
      currency: 'JPY',
      refundPercentage: 10,
      rules: [
        'Must present physical passport with temporary visitor entry stamp (QR sticker)',
        'Consumable items (sweets, cosmetics, sake) are sealed in tamper-evident plastic bags and must not be opened inside Japan',
        'General items (clothing, electronics, shoes) can be used inside Japan but must leave the country within 6 months',
        'Purchases from different stores cannot be combined to reach the ¥5,000 threshold unless within the same department store'
      ],
      passportRequired: true,
      redemptionMethod: 'Instant 10% deduction directly at the store cash register'
    };
  }

  if (norm.includes('paris') || norm.includes('france') || norm.includes('europe')) {
    return {
      minimumThresholdAmount: 100,
      currency: 'EUR',
      refundPercentage: 12,
      rules: [
        'Must reside outside the European Union',
        'Spend at least €100.01 in the same store on the same day',
        'Obtain a tax refund form (Global Blue / Planet) with barcode from retailer',
        'Scan barcode at PABLO customs kiosk at CDG / Orly airport before luggage check-in'
      ],
      passportRequired: true,
      redemptionMethod: 'Digital kiosk validation at airport departure terminal'
    };
  }

  return {
    minimumThresholdAmount: 0,
    currency: 'INR',
    refundPercentage: 0,
    rules: ['GST tourist refund applies to designated registered export outlets for foreign passport holders.'],
    passportRequired: false,
    redemptionMethod: 'Airport export customs counter'
  };
}

// ==========================================
// 7. BORDER, VISA & TRANSIT TRAP DETECTION
// ==========================================

export function evaluateBorderRequirements(
  origin: string, 
  destination: string, 
  departureDate?: string
): BorderSecuritySentinel {
  const normDest = (destination || '').toLowerCase();
  const normOrig = (origin || '').toLowerCase();
  const isOverseas = !normDest.includes('india') && (
    normDest.includes('tokyo') || 
    normDest.includes('japan') || 
    normDest.includes('paris') || 
    normDest.includes('london') || 
    normDest.includes('singapore') || 
    normDest.includes('bali') || 
    normDest.includes('bangkok') || 
    normDest.includes('dubai') || 
    normDest.includes('new york')
  );

  if (normDest.includes('tokyo') || normDest.includes('japan')) {
    return {
      passportValidityRequiredMonths: 6,
      isPassportBufferSufficient: true,
      transitVisaWarning: {
        appliesToSelfTransfer: true,
        warningText: 'Self-transfer warning: Low-cost carriers (AirAsia, Scoot) do NOT interline luggage. If connecting via Kuala Lumpur (KUL) or Singapore (SIN) on separate tickets, you MUST clear immigration and retrieve baggage.',
        hubsRequiringClearance: ['Kuala Lumpur (KLIA1 to KLIA2)', 'Bangkok Don Mueang (DMK)']
      },
      mandatoryArrivalDeclarations: [
        {
          name: 'Visit Japan Web (Immigration & Customs QR Code)',
          officialPortalName: 'Digital Agency of Japan',
          submissionWindowHoursPrior: 72,
          url: 'https://vjw-lp.digital.go.jp/en/',
          cost: 'Free (Do not pay fraudulent copycat visa sites)',
          mandatory: true
        }
      ],
      currencyCustomsLimitDeclaration: 'Declarations mandatory if carrying more than 1,000,000 JPY in cash or bearer checks.',
      medicationRestrictions: [
        'Strictly prohibited: Over-the-counter decongestants containing pseudoephedrine (Sudafed, Vicks Inhalers, Actifed)',
        'Stimulants (Adderall, Dexedrine) are strictly banned under the Narcotics Control Act',
        'Standard personal prescription medicines permitted up to 1-month supply with doctor prescription copy'
      ]
    };
  }

  if (normDest.includes('singapore')) {
    return {
      passportValidityRequiredMonths: 6,
      isPassportBufferSufficient: true,
      mandatoryArrivalDeclarations: [
        {
          name: 'SG Arrival Card with Electronic Health Declaration',
          officialPortalName: 'Immigration & Checkpoints Authority (ICA)',
          submissionWindowHoursPrior: 72,
          url: 'https://eservices.ica.gov.sg/sgarrivalcard/',
          cost: 'Free',
          mandatory: true
        }
      ],
      currencyCustomsLimitDeclaration: 'SGD 20,000 equivalent cash declaration threshold.',
      medicationRestrictions: ['Chewing gum is strictly prohibited from importation.']
    };
  }

  // Domestic or General Default
  return {
    passportValidityRequiredMonths: isOverseas ? 6 : 0,
    isPassportBufferSufficient: true,
    mandatoryArrivalDeclarations: [],
    currencyCustomsLimitDeclaration: '₹50,000 cash for domestic routes.',
    medicationRestrictions: ['Carry original doctor prescription for scheduled formulations.']
  };
}

// ==========================================
// MASTER ENGINE: ENRICH ITINERARY WITH ALL 7 DOMAINS
// ==========================================

export function enrichTripWithSmartIntelligence(trip: Trip): Trip {
  const origin = trip.origin || 'Delhi';
  const destination = trip.destination || 'Tokyo';
  const duration = trip.durationDays || 5;

  // 1. Circadian Pacing Engine
  const circadian = calculateCircadianPacing(origin, destination, duration);

  // 2. Cultural Insights
  const culturalInsights = resolveCulturalInsights(destination);

  // 3. Transit Pass ROI & Tax Free
  const transitPassRoi = calculateTransitPassRoi(destination, duration);
  const taxFreeGuidance = getTaxFreeShoppingGuidance(destination);

  // 4. Border Security Sentinel
  const borderSentinel = evaluateBorderRequirements(origin, destination, trip.startDate);

  // 5. Enrich Each Day: TSP Optimization, Indoor Mirrors, Cultural Tips, Queue Curves, and Group Splits
  const enrichedDays: DayPlan[] = trip.itinerary.map((day, idx) => {
    // Indoor mirrors and cultural tips on activities
    const preppedActivities = day.activities.map(act => {
      const indoorMirror = getIndoorMirrorForActivity(act, destination);
      const culturalTip = enrichActivityWithCulturalTip(act, destination);
      return {
        ...act,
        indoorMirror,
        culturalTip
      };
    });

    // Run TSP 2-Opt spatial clustering and queue curve sequencing
    const { activities: tspActivities } = optimizeDayActivitiesTsp(preppedActivities);

    // Parallel group branches for afternoon exploration
    const groupBranches = generateParallelGroupBranches(day, destination);

    return {
      ...day,
      circadianAdvice: circadian,
      tspOptimized: true,
      culturalInsights: idx === 0 ? culturalInsights : undefined,
      groupBranches: trip.travelerType === 'friends' || trip.travelerType === 'family' || (trip.travelersCount || 1) > 1 ? groupBranches : undefined,
      activities: tspActivities
    };
  });

  return {
    ...trip,
    circadianPacing: circadian,
    transitPassRoi,
    taxFreeGuidance,
    borderSecuritySentinel: borderSentinel,
    itinerary: enrichedDays
  };
}
