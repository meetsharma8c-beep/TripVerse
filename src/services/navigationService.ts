import { Coordinates, NavigationStep, LiveTrackingState, Trip } from '../types/trip';
import { resolvePreciseLocationSync } from './locationService';

// Default turn-by-turn guidance steps for Ahmedabad -> Udaipur via NH-48
export const DEFAULT_AHMEDABAD_UDAIPUR_STEPS: NavigationStep[] = [
  {
    id: 'step-1',
    title: 'Departure: SG Highway, Ahmedabad',
    instruction: 'Head North on Sarkhej - Gandhinagar Highway (NH-147)',
    detail: 'Keep in the middle two lanes towards Gandhinagar / Chiloda circle.',
    distanceKm: 18.5,
    durationMin: 22,
    maneuver: 'straight',
    coordinates: { lat: 23.0525, lng: 72.5312 },
    speedLimitKmh: 70,
    landmark: 'Ahmedabad City Exit'
  },
  {
    id: 'step-2',
    title: 'Chiloda Circle Interchange',
    instruction: 'At Chiloda Circle, take the 2nd exit onto NH-48 toward Himatnagar',
    detail: 'Enter the 6-lane national expressway corridor. Road quality excellent.',
    distanceKm: 28.0,
    durationMin: 28,
    maneuver: 'fork-right',
    coordinates: { lat: 23.2150, lng: 72.7620 },
    speedLimitKmh: 90,
    landmark: 'Chiloda Toll Plaza (FastTag)'
  },
  {
    id: 'step-3',
    title: 'Prantij Bypass',
    instruction: 'Continue straight on NH-48 bypassing Prantij town',
    detail: 'Follow signs for Himatnagar / Udaipur. Smooth resurfaced lanes.',
    distanceKm: 32.5,
    durationMin: 30,
    maneuver: 'straight',
    coordinates: { lat: 23.4410, lng: 72.8625 },
    speedLimitKmh: 90,
    landmark: 'Prantij Flyover'
  },
  {
    id: 'step-4',
    title: 'Himatnagar Flyover Bypass',
    instruction: 'Stay on elevated NH-48 corridor past Himatnagar',
    detail: 'Avoid lower city service lane. Maintain highway speed.',
    distanceKm: 42.0,
    durationMin: 40,
    maneuver: 'straight',
    coordinates: { lat: 23.5980, lng: 72.9680 },
    speedLimitKmh: 90,
    landmark: 'Himatnagar North Junction'
  },
  {
    id: 'step-5',
    title: 'Shamlaji Highway Food Court (Verified Break Stop)',
    instruction: 'Take slight left exit into Shamlaji Highway Food Court (4.8 / 5.0)',
    detail: 'Recommended 35-min pitstop: 100% sanitized restrooms, food court & EV chargers.',
    distanceKm: 4.2,
    durationMin: 35,
    maneuver: 'breakstop',
    coordinates: { lat: 23.6934, lng: 73.3854 },
    speedLimitKmh: 40,
    landmark: 'Shamlaji Temple Arch',
    alert: 'Recommended Pitstop: Clean washrooms, authentic Gujarati snacks, tea & fuel.',
    pitstopId: 'bs-1'
  },
  {
    id: 'step-6',
    title: 'Re-enter NH-48 Northbound',
    instruction: 'Merge back onto NH-48 toward Gujarat - Rajasthan Border',
    detail: 'Scenic Aravalli foothill approach begins here.',
    distanceKm: 18.0,
    durationMin: 16,
    maneuver: 'merge',
    coordinates: { lat: 23.7500, lng: 73.4200 },
    speedLimitKmh: 80,
    landmark: 'Aravalli Foothills Marker'
  },
  {
    id: 'step-7',
    title: 'Ratanpur Interstate Border & Toll Plaza',
    instruction: 'Pass through Ratanpur Border into Rajasthan',
    detail: 'Keep FastTag lane 3 or 4. State tax checkpost clear for private cars.',
    distanceKm: 22.0,
    durationMin: 22,
    maneuver: 'straight',
    coordinates: { lat: 23.8341, lng: 73.4921 },
    speedLimitKmh: 60,
    landmark: 'Rajasthan Welcome Gateway',
    alert: 'Interstate border. Highway patrol helpline: 1033. Fuel prices lower in Rajasthan.'
  },
  {
    id: 'step-8',
    title: 'Kherwara Ghat Section',
    instruction: 'Navigate gentle curve through Kherwara mountain pass',
    detail: 'Scenic valley view on your right. Keep in lower gear on downhill curves.',
    distanceKm: 34.0,
    durationMin: 35,
    maneuver: 'fork-left',
    coordinates: { lat: 23.9912, lng: 73.5980 },
    speedLimitKmh: 70,
    landmark: 'Kherwara Valley Viewpoint'
  },
  {
    id: 'step-9',
    title: 'Prasad & Tidi Forest Corridor',
    instruction: 'Continue through Tidi River corridor towards Udaipur South',
    detail: 'Watch for occasional cattle crossings in rural forest stretch.',
    distanceKm: 36.8,
    durationMin: 35,
    maneuver: 'straight',
    coordinates: { lat: 24.2810, lng: 73.6820 },
    speedLimitKmh: 80,
    landmark: 'Tidi Dam Approach'
  },
  {
    id: 'step-10',
    title: 'Udaipur City Entrance: Sukher / Goverdhan Vilas',
    instruction: 'Take the right fork toward City Center & Lake Pichola',
    detail: 'Enter Udaipur metropolitan area. Switch from highway to city speed.',
    distanceKm: 16.0,
    durationMin: 20,
    maneuver: 'turn-right',
    coordinates: { lat: 24.5420, lng: 73.6980 },
    speedLimitKmh: 50,
    landmark: 'Udaipur Southern Entry Gate'
  },
  {
    id: 'step-11',
    title: 'Arrival: Lake Pichola Waterfront, Udaipur',
    instruction: 'You have arrived at your destination! Hotel check-in ready.',
    detail: 'Park at verified Lake Palace lot. Journey completed within planned ₹8,000 budget.',
    distanceKm: 4.0,
    durationMin: 12,
    maneuver: 'arrive',
    coordinates: { lat: 24.5854, lng: 73.7125 },
    speedLimitKmh: 30,
    landmark: 'City Palace / Lake Pichola'
  }
];

// High-fidelity route steps for Ahmedabad -> Poicha (via NE-1 Expressway & SH-63)
export const DEFAULT_AHMEDABAD_POICHA_STEPS: NavigationStep[] = [
  {
    id: 'step-poi-1',
    title: 'Departure: Ahmedabad / CTM Toll Plaza',
    instruction: 'Join the National Expressway 1 (NE-1) toward Vadodara',
    detail: "India's premier access-controlled 4/6-lane expressway. Cruise at standard 100 km/h.",
    distanceKm: 42.0,
    durationMin: 35,
    maneuver: 'straight',
    coordinates: { lat: 22.9868, lng: 72.6394 },
    speedLimitKmh: 100,
    landmark: 'NE-1 CTM Toll Plaza (FastTag Lane 3)'
  },
  {
    id: 'step-poi-2',
    title: 'Anand Midway Food & EV Plaza (Verified Pitstop)',
    instruction: 'Take expressway service exit for Anand Highway Rest Area (4.8/5)',
    detail: 'Sanitized washrooms, Amul Dairy ice cream lounge, fresh Gujarati snacks & EV fast-chargers.',
    distanceKm: 38.0,
    durationMin: 25,
    maneuver: 'breakstop',
    coordinates: { lat: 22.5645, lng: 72.9289 },
    speedLimitKmh: 40,
    landmark: 'Anand Midway Food Oasis',
    alert: 'Recommended Pitstop: Top highway hygiene rating, EV chargers & tea stalls.',
    pitstopId: 'poi-bs-1'
  },
  {
    id: 'step-poi-3',
    title: 'Vadodara South Exit & Dabhoi Corridor',
    instruction: 'Exit NE-1 at Vadodara South, follow signs for SH-63 toward Dabhoi / Rajpipla',
    detail: 'Transition onto smooth state highway. Clear signboards for Poicha & Statue of Unity corridor.',
    distanceKm: 34.0,
    durationMin: 35,
    maneuver: 'fork-right',
    coordinates: { lat: 22.2850, lng: 73.2100 },
    speedLimitKmh: 80,
    landmark: 'Vadodara Golden Chokdi Interchange'
  },
  {
    id: 'step-poi-4',
    title: 'Dabhoi Historic Gate & Tilakwada Highway',
    instruction: 'Bypass Dabhoi fort gate and continue along the Tilakwada-Poicha corridor',
    detail: 'Scenic agricultural basin along the fertile Narmada valley. Smooth two-lane tarmac.',
    distanceKm: 32.0,
    durationMin: 30,
    maneuver: 'straight',
    coordinates: { lat: 22.1800, lng: 73.4300 },
    speedLimitKmh: 70,
    landmark: 'Dabhoi Historic Gateway Junction'
  },
  {
    id: 'step-poi-5',
    title: 'Narmada River Basin Approach',
    instruction: 'Follow signboards toward Nilkanthdham Swaminarayan Temple, Poicha',
    detail: 'River breeze and majestic temple spires visible ahead. Slow down near village approach lane.',
    distanceKm: 18.5,
    durationMin: 20,
    maneuver: 'turn-left',
    coordinates: { lat: 21.9500, lng: 73.5350 },
    speedLimitKmh: 50,
    landmark: 'Poicha Village Welcome Arch'
  },
  {
    id: 'step-poi-6',
    title: 'Arrival: Nilkanthdham Swaminarayan Temple, Poicha',
    instruction: 'Turn right into Nilkanthdham Main Gate and designated visitor parking',
    detail: 'You have arrived at Poicha! Magnificent temple grounds, Narmada Ghats, and Sahajanand Universe await.',
    distanceKm: 2.5,
    durationMin: 8,
    maneuver: 'arrive',
    coordinates: { lat: 21.9348, lng: 73.5521 },
    speedLimitKmh: 20,
    landmark: 'Nilkanthdham Grand Temple Gate'
  }
];

/**
 * Dynamically generates turn-by-turn navigation steps for any trip destination
 */
export function generateNavigationStepsForTrip(trip: Trip): NavigationStep[] {
  const destLower = trip.destination.toLowerCase();

  // If destination is Poicha / Nilkanthdham, use authentic NE-1 / SH-63 steps
  if (destLower.includes('poicha') || destLower.includes('nilkanthdham')) {
    if (trip.breakStops && trip.breakStops.length > 0) {
      const customSteps = [...DEFAULT_AHMEDABAD_POICHA_STEPS];
      trip.breakStops.forEach((stop, idx) => {
        const insertIdx = Math.min(2 + idx, customSteps.length - 2);
        customSteps.splice(insertIdx, 0, {
          id: `custom-stop-${stop.id}`,
          title: `${stop.name} (Added Pitstop)`,
          instruction: `Take exit towards ${stop.name} (${stop.rating}/5)`,
          detail: stop.recommendationReason || stop.description,
          distanceKm: stop.detourDistanceKm || 3.5,
          durationMin: stop.estimatedStopMinutes || 25,
          maneuver: 'breakstop',
          coordinates: stop.coordinates,
          speedLimitKmh: 40,
          landmark: stop.name,
          alert: stop.foodAvailable ? 'Food, snacks & clean washrooms available.' : 'Verified scenic stop.'
        });
      });
      return customSteps;
    }
    return DEFAULT_AHMEDABAD_POICHA_STEPS;
  }

  // If destination is Udaipur and origin is Ahmedabad, use hand-crafted high-fidelity NH-48 steps
  if (destLower.includes('udaipur')) {
    // If user added custom break stops, integrate them into the steps
    if (trip.breakStops && trip.breakStops.length > 0) {
      const customSteps = [...DEFAULT_AHMEDABAD_UDAIPUR_STEPS];
      trip.breakStops.forEach((stop, idx) => {
        const insertIdx = Math.min(5 + idx, customSteps.length - 2);
        customSteps.splice(insertIdx, 0, {
          id: `custom-stop-${stop.id}`,
          title: `${stop.name} (Added Pitstop)`,
          instruction: `Take exit towards ${stop.name} (${stop.rating}/5)`,
          detail: stop.recommendationReason || stop.description,
          distanceKm: stop.detourDistanceKm || 3.5,
          durationMin: stop.estimatedStopMinutes || 25,
          maneuver: 'breakstop',
          coordinates: stop.coordinates,
          speedLimitKmh: 40,
          landmark: stop.name,
          alert: stop.foodAvailable ? 'Food, snacks & clean washrooms available.' : 'Verified scenic stop.'
        });
      });
      return customSteps;
    }
    return DEFAULT_AHMEDABAD_UDAIPUR_STEPS;
  }

  // Dynamic route generation for any other Indian or global destination
  const originLower = (trip.origin || '').toLowerCase();
  const startCoord: Coordinates = originLower.includes('vadodara')
    ? { lat: 22.3072, lng: 73.1812 }
    : originLower.includes('mumbai')
      ? { lat: 19.0760, lng: 72.8777 }
      : originLower.includes('delhi')
        ? { lat: 28.6139, lng: 77.2090 }
        : { lat: 23.0225, lng: 72.5714 }; // Default Ahmedabad

  const endCoord: Coordinates = trip.destinationDetails?.coordinates ||
    trip.itinerary?.[0]?.activities?.[0]?.coordinates ||
    resolvePreciseLocationSync(trip.destination)?.coordinates ||
    { lat: 26.9124, lng: 75.7873 };

  const totalDistKm = trip.routeDetails?.distanceKm || 320;
  const totalHours = trip.routeDetails?.durationHours || 6.5;
  const avgSpeed = Math.round(totalDistKm / totalHours) || 65;

  const generatedSteps: NavigationStep[] = [
    {
      id: 'step-gen-1',
      title: `Departure: City Center`,
      instruction: `Head towards the National Highway corridor heading to ${trip.destination}`,
      detail: `Check FastTag balance, tire pressure, and ensure emergency kit is onboard.`,
      distanceKm: Math.round(totalDistKm * 0.08 * 10) / 10,
      durationMin: Math.round(15),
      maneuver: 'straight',
      coordinates: startCoord,
      speedLimitKmh: 60,
      landmark: 'City Outer Ring Road'
    },
    {
      id: 'step-gen-2',
      title: `Expressway Corridor Join`,
      instruction: `Merge onto the National Highway toward ${trip.destination}`,
      detail: `Enter 4/6-lane expressway. Cruise control recommended at 90 km/h.`,
      distanceKm: Math.round(totalDistKm * 0.2 * 10) / 10,
      durationMin: Math.round((totalDistKm * 0.2 / avgSpeed) * 60),
      maneuver: 'fork-right',
      coordinates: {
        lat: startCoord.lat + (endCoord.lat - startCoord.lat) * 0.2,
        lng: startCoord.lng + (endCoord.lng - startCoord.lng) * 0.2
      },
      speedLimitKmh: 90,
      landmark: 'Corridor Toll Plaza (Lane 3 FastTag)'
    }
  ];

  // Insert trip's break stops or a midpoint highway plaza
  if (trip.breakStops && trip.breakStops.length > 0) {
    trip.breakStops.forEach((stop, index) => {
      generatedSteps.push({
        id: `step-stop-${stop.id || index}`,
        title: `${stop.name}`,
        instruction: `Take service lane exit for ${stop.name} (${stop.rating}/5)`,
        detail: stop.recommendationReason || stop.description || 'Verified rest stop: food court, fuel and washrooms.',
        distanceKm: Math.round(totalDistKm * 0.25 * 10) / 10,
        durationMin: stop.estimatedStopMinutes || 30,
        maneuver: 'breakstop',
        coordinates: stop.coordinates,
        speedLimitKmh: 40,
        landmark: stop.name,
        alert: `${stop.category.replace('_', ' ').toUpperCase()}: High-rated pitstop.`
      });
    });
  } else {
    generatedSteps.push({
      id: 'step-gen-midpoint',
      title: `Highway Oasis Food & Fuel Plaza`,
      instruction: `Recommended 30-min refreshment break at Highway Plaza`,
      detail: `100% sanitized washrooms, high-speed EV chargers, coffee and family dhabas.`,
      distanceKm: Math.round(totalDistKm * 0.25 * 10) / 10,
      durationMin: 30,
      maneuver: 'breakstop',
      coordinates: {
        lat: startCoord.lat + (endCoord.lat - startCoord.lat) * 0.5,
        lng: startCoord.lng + (endCoord.lng - startCoord.lng) * 0.5
      },
      speedLimitKmh: 50,
      landmark: 'Highway Food Court & Fuel Station',
      alert: 'Highway Patrol Helpline: 1033. Fuel prices lower before state border.'
    });
  }

  // Interstate border / scenic pass
  generatedSteps.push({
    id: 'step-gen-border',
    title: `Regional Border & Mountain Corridor`,
    instruction: `Continue on main expressway bypass corridor towards ${trip.destination}`,
    detail: `Follow overhead green signboards for ${trip.destination}. Road surface in great condition.`,
    distanceKm: Math.round(totalDistKm * 0.28 * 10) / 10,
    durationMin: Math.round((totalDistKm * 0.28 / avgSpeed) * 60),
    maneuver: 'straight',
    coordinates: {
      lat: startCoord.lat + (endCoord.lat - startCoord.lat) * 0.75,
      lng: startCoord.lng + (endCoord.lng - startCoord.lng) * 0.75
    },
    speedLimitKmh: 80,
    landmark: `${trip.destination} Regional Approach Toll`
  });

  // City Entry Gate
  generatedSteps.push({
    id: 'step-gen-gate',
    title: `${trip.destination} City Gateway`,
    instruction: `Take the left exit towards ${trip.destination} Central Hub`,
    detail: `Transitioning from highway speed to urban traffic. Speed limit 50 km/h.`,
    distanceKm: Math.round(totalDistKm * 0.12 * 10) / 10,
    durationMin: 20,
    maneuver: 'turn-left',
    coordinates: {
      lat: startCoord.lat + (endCoord.lat - startCoord.lat) * 0.92,
      lng: startCoord.lng + (endCoord.lng - startCoord.lng) * 0.92
    },
    speedLimitKmh: 50,
    landmark: `${trip.destination} Southern Bypass Arch`
  });

  // Arrival
  generatedSteps.push({
    id: 'step-gen-arrival',
    title: `Destination Arrived: ${trip.destination}`,
    instruction: `Welcome to ${trip.destination}! Check-in ready.`,
    detail: `Journey completed successfully within planned ₹${trip.totalBudget.toLocaleString('en-IN')} budget.`,
    distanceKm: 2.5,
    durationMin: 10,
    maneuver: 'arrive',
    coordinates: endCoord,
    speedLimitKmh: 30,
    landmark: `${trip.destination} Hotel Check-in Point`
  });

  return generatedSteps;
}

// Helper: Haversine distance calculation in kilometers
export function calculateDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = (c2.lat - c1.lat) * Math.PI / 180;
  const dLng = (c2.lng - c1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Calculate bearing in degrees
export function calculateBearing(start: Coordinates, end: Coordinates): number {
  const startLat = start.lat * Math.PI / 180;
  const startLng = start.lng * Math.PI / 180;
  const endLat = end.lat * Math.PI / 180;
  const endLng = end.lng * Math.PI / 180;

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

// Voice synthesizer for turn-by-turn guidance
let lastSpokenText = '';
let lastSpokenTime = 0;

export function speakNavigationPrompt(text: string, force = false): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const now = Date.now();
  if (!force && lastSpokenText === text && now - lastSpokenTime < 10000) {
    return; // throttle duplicate sentences
  }

  try {
    window.speechSynthesis.cancel(); // clear previous
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN'; // Indian English cadence for national highways
    window.speechSynthesis.speak(utterance);
    lastSpokenText = text;
    lastSpokenTime = now;
  } catch (e) {
    console.warn('Speech synthesis error:', e);
  }
}

// Real-time GPS Geolocation Watcher
export function startRealGpsTracking(
  onUpdate: (coords: Coordinates, speedKmh: number, heading: number) => void,
  onError: (errorMsg: string) => void
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError('Geolocation is not supported by this browser.');
    return () => { };
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const coords: Coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      // speed in m/s converted to km/h
      const speedKmh = position.coords.speed !== null && position.coords.speed >= 0
        ? Math.round(position.coords.speed * 3.6)
        : 65; // fallback cruise speed if stationary/emulated
      const heading = position.coords.heading !== null && !isNaN(position.coords.heading)
        ? position.coords.heading
        : 35;

      onUpdate(coords, speedKmh, heading);
    },
    (err) => {
      onError(err.message || 'Unable to retrieve location coordinates.');
    },
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 10000
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

// Helper: Format remaining duration
export function formatRemainingDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} mins`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}

// Calculate ETA clock time based on remaining minutes
export function calculateEtaTime(remainingMinutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + remainingMinutes);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}
