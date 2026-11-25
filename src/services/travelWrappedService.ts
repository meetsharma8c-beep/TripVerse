/**
 * Travel Wrapped Service (travelWrappedService.ts)
 * Computes executive annual and all-time travel recap statistics,
 * archetypes, and shareable highlights.
 * 100% professional and zero-emoji compliance.
 */

import { Trip } from '../types/trip';

export interface TravelWrappedStats {
  year: number;
  totalTrips: number;
  totalDaysTraveled: number;
  totalKmTraveled: number;
  countriesVisited: string[];
  citiesExplored: string[];
  topLandmark: string;
  travelerArchetype: {
    title: string;
    badge: string; // Clean typographic badge (e.g. 'FOUNDER ARCHITECT', 'ALPINE MAVERICK')
    iconName: 'crown' | 'mountain' | 'landmark' | 'building' | 'compass';
    description: string;
    themeColor: string;
  };
  highlightMoments: string[];
  isFounder: boolean;
}

import { isFounderEmail } from './authService';

export function computeTravelWrapped(
  trips: Trip[],
  userEmail?: string,
  year = 2026
): TravelWrappedStats {
  const isFounder = isFounderEmail(userEmail);

  // Only compute stats from the user's actual trips (never fabricate a default trip when trips is empty)
  const relevantTrips = Array.isArray(trips) ? trips.filter(Boolean) : [];

  let totalDays = 0;
  let routeKmTotal = 0;
  const countriesSet = new Set<string>();
  const citiesSet = new Set<string>();
  const allActivities: string[] = [];

  relevantTrips.forEach(t => {
    const daysCount = Number(t.durationDays || (t as any).duration || (Array.isArray(t.itinerary) ? t.itinerary.length : 0) || 1);
    totalDays += daysCount;
    const rawDist = Number(t.routeDetails?.distanceKm || 0);
    if (Number.isFinite(rawDist) && rawDist > 0) {
      routeKmTotal += Math.round(rawDist);
    }
    const dest = t.destination || t.name || 'Global Destination';
    const parts = dest.split(',').map((p: string) => p.trim());
    if (parts.length > 1) {
      citiesSet.add(parts[0]);
      countriesSet.add(parts[parts.length - 1]);
    } else {
      citiesSet.add(dest);
      countriesSet.add('India');
    }

    if (Array.isArray(t.itinerary)) {
      t.itinerary.forEach((d: any) => {
        if (Array.isArray(d.activities)) {
          d.activities.forEach((a: any) => {
            if (a.title) allActivities.push(a.title);
          });
        }
      });
    }
  });

  // Calculate kilometers strictly from actual trips (0 km when user has 0 trips)
  const totalKm = relevantTrips.length === 0
    ? 0
    : routeKmTotal > 0
      ? routeKmTotal
      : (citiesSet.size * 950) + (totalDays * 120);

  // Determine Traveler Archetype with zero emojis
  const destString = Array.from(citiesSet).join(' ').toLowerCase();
  let archetype: TravelWrappedStats['travelerArchetype'] = {
    title: 'Continental Voyager',
    badge: 'CONTINENTAL VOYAGER',
    iconName: 'compass',
    description: 'Balanced explorer bridging natural horizons, culture, and coastal wanderlust.',
    themeColor: '#10B981'
  };

  if (destString.includes('manali') || destString.includes('leh') || destString.includes('himalaya') || destString.includes('alps')) {
    archetype = {
      title: 'Alpine Maverick',
      badge: 'ALPINE MAVERICK',
      iconName: 'mountain',
      description: 'High-altitude specialist conquering rigorous passes and alpine ridgelines.',
      themeColor: '#0EA5E9'
    };
  } else if (destString.includes('paris') || destString.includes('rome') || destString.includes('kyoto') || destString.includes('agra')) {
    archetype = {
      title: 'Heritage Connoisseur',
      badge: 'HERITAGE CONNOISSEUR',
      iconName: 'landmark',
      description: 'Devoted to architectural masterworks, historic antiquities, and cultural heritage.',
      themeColor: '#F59E0B'
    };
  } else if (destString.includes('dubai') || destString.includes('singapore') || destString.includes('tokyo')) {
    archetype = {
      title: 'Metropolitan Nomad',
      badge: 'METROPOLITAN NOMAD',
      iconName: 'building',
      description: 'Thriving across futuristic skylines, modern transit nodes, and global megacities.',
      themeColor: '#8B5CF6'
    };
  }

  if (isFounder) {
    archetype = {
      title: 'VIP Founding Architect',
      badge: 'FOUNDER ARCHITECT',
      iconName: 'crown',
      description: 'Chief architect of the TripVerse cosmos with perpetual diplomatic clearance.',
      themeColor: '#D4AF37'
    };
  }

  const topLandmark = allActivities[0] || (citiesSet.has('Paris') ? 'Eiffel Tower' : citiesSet.has('Dubai') ? 'Burj Khalifa' : relevantTrips[0]?.destination || 'None Yet');

  return {
    year,
    totalTrips: relevantTrips.length,
    totalDaysTraveled: totalDays,
    totalKmTraveled: totalKm,
    countriesVisited: Array.from(countriesSet),
    citiesExplored: Array.from(citiesSet),
    topLandmark,
    travelerArchetype: archetype,
    highlightMoments: allActivities.slice(0, 4),
    isFounder
  };
}

export function generateWrappedSocialText(stats: TravelWrappedStats): string {
  return (
    `TRIPVERSE ${stats.year} TRAVEL WRAPPED\n` +
    `Executive Annual Voyage Dossier\n` +
    `----------------------------------------\n` +
    `Designation: [${stats.travelerArchetype.badge}] ${stats.travelerArchetype.title}\n` +
    `Ground Traversed: ~${stats.totalKmTraveled.toLocaleString()} km\n` +
    `Time on Expedition: ${stats.totalDaysTraveled} Days\n` +
    `Cities Explored: ${stats.citiesExplored.length} Metropolises\n` +
    `Territories Visited: ${stats.countriesVisited.length} Sovereign Countries\n` +
    `Signature Landmark: ${stats.topLandmark}\n` +
    `----------------------------------------\n` +
    `Verified via TripVerse: https://trip-verse.com #TripVerseWrapped`
  );
}
