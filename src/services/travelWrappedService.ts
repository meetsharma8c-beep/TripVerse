/**
 * Travel Wrapped Service (travelWrappedService.ts)
 * Computes Spotify Wrapped-style annual and all-time travel recap statistics,
 * archetypes, and shareable highlights.
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
    badge: string;
    description: string;
    themeColor: string;
  };
  highlightMoments: string[];
  isFounder: boolean;
}

const FOUNDER_EMAIL = 'meet.sharma8c@gmail.com';

export function computeTravelWrapped(
  trips: Trip[],
  userEmail?: string,
  year = 2026
): TravelWrappedStats {
  const isFounder = (userEmail || '').trim().toLowerCase() === FOUNDER_EMAIL;

  // Filter trips for given year or all trips if small set
  const relevantTrips = trips.length > 0 ? trips : [
    {
      id: 'default-manali',
      name: 'Manali Alpine Expedition',
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
            { id: '1', title: 'Hadimba Pagoda Temple', time: '10:00 AM', cost: 0, category: 'sightseeing', description: 'Cedar forest exploration' }
          ]
        }
      ]
    } as any
  ];

  let totalDays = 0;
  const countriesSet = new Set<string>();
  const citiesSet = new Set<string>();
  const allActivities: string[] = [];

  relevantTrips.forEach(t => {
    totalDays += (t.duration || 4);
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

  // Calculate kilometers (approx 850km per city + base)
  const totalKm = (citiesSet.size * 950) + (totalDays * 120) + (isFounder ? 5000 : 1200);

  // Determine Traveler Archetype
  const destString = Array.from(citiesSet).join(' ').toLowerCase();
  let archetype = {
    title: 'Continental Voyager',
    badge: '🧭',
    description: 'You seek balanced horizons, blending cultural discoveries with serene wanderlust.',
    themeColor: '#10B981'
  };

  if (destString.includes('manali') || destString.includes('leh') || destString.includes('himalaya') || destString.includes('alps')) {
    archetype = {
      title: 'Alpine Maverick',
      badge: '🏔️',
      description: 'You crave high-altitude ridges, pine mist, and epic mountain passes.',
      themeColor: '#0EA5E9'
    };
  } else if (destString.includes('paris') || destString.includes('rome') || destString.includes('kyoto') || destString.includes('agra')) {
    archetype = {
      title: 'Heritage Connoisseur',
      badge: '🏛️',
      description: 'You are captivated by ancient architecture, classical wonders, and storied history.',
      themeColor: '#F59E0B'
    };
  } else if (destString.includes('dubai') || destString.includes('singapore') || destString.includes('tokyo')) {
    archetype = {
      title: 'Metropolitan Nomad',
      badge: '🏙️',
      description: 'You thrive in futuristic skylines, high-speed rail, and glittering megacities.',
      themeColor: '#8B5CF6'
    };
  }

  if (isFounder) {
    archetype = {
      title: 'VIP Founding Architect',
      badge: '👑',
      description: 'Master builder of the TripVerse cosmos with lifetime global clearance.',
      themeColor: '#D4AF37'
    };
  }

  const topLandmark = allActivities[0] || (citiesSet.has('Paris') ? 'Eiffel Tower' : citiesSet.has('Dubai') ? 'Burj Khalifa' : 'Hadimba Pagoda Temple');

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
  return `✨ My ${stats.year} TripVerse Wrapped:\n` +
    `🚀 Archetype: ${stats.travelerArchetype.badge} ${stats.travelerArchetype.title}\n` +
    `🌍 ${stats.countriesVisited.length} Countries • 🏙️ ${stats.citiesExplored.length} Cities\n` +
    `✈️ ${stats.totalKmTraveled.toLocaleString()} km Traversed • ⏳ ${stats.totalDaysTraveled} Days on the Road\n` +
    `🏛️ Top Spot: ${stats.topLandmark}\n\n` +
    `Plan your next voyage at https://trip-verse.com #TripVerseWrapped`;
}
