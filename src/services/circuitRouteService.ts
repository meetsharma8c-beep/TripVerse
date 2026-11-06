/**
 * TRIPVERSE MULTI-CITY & CIRCUIT ROUTE SERVICE
 * 
 * Detects multi-city itineraries (e.g. "Tokyo to Kyoto", "Delhi, Agra, Jaipur", "Rome & Florence"),
 * divides trip duration across city stops, and injects inter-city high-speed rail / expressway segments.
 */

import { resolveCanonicalDestination } from './canonicalCityService';

export interface MultiCityStop {
  cityName: string;
  allocatedDays: number;
  startDay: number;
  endDay: number;
  transitToNext?: {
    fromCity: string;
    toCity: string;
    mode: 'bullet_train' | 'express_rail' | 'highway_coach' | 'scenic_drive' | 'flight';
    title: string;
    durationHours: number;
    distanceKm: number;
    estimatedCostPerPerson: number;
  };
}

export interface MultiCityCircuit {
  isMultiCity: boolean;
  stops: MultiCityStop[];
  totalDays: number;
  summary: string;
}

const KNOWN_TRANSIT_CORRIDORS: Record<string, {
  mode: 'bullet_train' | 'express_rail' | 'highway_coach' | 'scenic_drive' | 'flight';
  title: string;
  durationHours: number;
  distanceKm: number;
  cost: number;
}> = {
  // Japan
  'tokyo-kyoto': {
    mode: 'bullet_train',
    title: 'Tokaido Shinkansen (Nozomi Bullet Train) to Kyoto',
    durationHours: 2.2,
    distanceKm: 450,
    cost: 8500 // In JPY/INR equivalent
  },
  'kyoto-osaka': {
    mode: 'express_rail',
    title: 'JR Special Rapid Service to Osaka',
    durationHours: 0.5,
    distanceKm: 55,
    cost: 500
  },
  'tokyo-osaka': {
    mode: 'bullet_train',
    title: 'Tokaido Shinkansen (Nozomi Bullet Train) to Shin-Osaka',
    durationHours: 2.5,
    distanceKm: 510,
    cost: 9000
  },

  // Golden Triangle India
  'delhi-agra': {
    mode: 'express_rail',
    title: 'Gatimaan Express / Yamuna Expressway AC Transfer to Agra',
    durationHours: 1.8,
    distanceKm: 210,
    cost: 800
  },
  'agra-jaipur': {
    mode: 'highway_coach',
    title: 'Vande Bharat / Highway Transfer via Fatehpur Sikri to Jaipur',
    durationHours: 4.0,
    distanceKm: 240,
    cost: 950
  },
  'delhi-jaipur': {
    mode: 'express_rail',
    title: 'Delhi-Jaipur Vande Bharat Express',
    durationHours: 3.5,
    distanceKm: 280,
    cost: 1100
  },

  // Italy
  'rome-florence': {
    mode: 'bullet_train',
    title: 'Frecciarossa High-Speed Train to Florence Santa Maria Novella',
    durationHours: 1.5,
    distanceKm: 275,
    cost: 3500
  },
  'florence-venice': {
    mode: 'bullet_train',
    title: 'Frecciarossa High-Speed Rail to Venezia Santa Lucia',
    durationHours: 2.1,
    distanceKm: 260,
    cost: 3200
  },
  'rome-venice': {
    mode: 'bullet_train',
    title: 'Frecciarossa High-Speed Train to Venice',
    durationHours: 3.8,
    distanceKm: 530,
    cost: 5500
  },

  // France
  'paris-nice': {
    mode: 'bullet_train',
    title: 'TGV inOui High-Speed Rail from Paris Gare de Lyon to Nice',
    durationHours: 5.6,
    distanceKm: 930,
    cost: 6500
  },
  'paris-lyon': {
    mode: 'bullet_train',
    title: 'TGV High-Speed Rail to Lyon Part-Dieu',
    durationHours: 1.9,
    distanceKm: 460,
    cost: 4200
  }
};

/**
 * Detects whether the user is requesting a multi-city route and extracts the stops.
 */
export function analyzeCircuitRoute(query: string, totalDays: number): MultiCityCircuit {
  if (!query || typeof query !== 'string') {
    return { isMultiCity: false, stops: [], totalDays, summary: '' };
  }

  // Handle Golden Triangle explicitly
  if (/golden triangle/i.test(query)) {
    return buildCircuit(['Delhi', 'Agra', 'Jaipur'], totalDays, 'Classic Golden Triangle Circuit');
  }

  // Split by common multi-city delimiters: ' to ', ' and ', ' & ', ' -> ', ' - '
  const rawSegments = query
    .split(/\s+(?:to|and|&|then|->|-)\s+|,\s*/i)
    .map(s => s.trim())
    .filter(Boolean);

  if (rawSegments.length < 2) {
    return { isMultiCity: false, stops: [], totalDays, summary: '' };
  }

  // Resolve canonical city names and deduplicate
  const resolvedCities: string[] = [];
  const seen = new Set<string>();

  for (const seg of rawSegments) {
    const canonical = resolveCanonicalDestination(seg);
    const name = canonical.canonicalName;
    const lower = name.toLowerCase();

    // Check if it's a known city or valid destination string
    if (name && name.length >= 3 && !seen.has(lower) && lower !== 'worldwide' && lower !== 'india') {
      seen.add(lower);
      resolvedCities.push(name);
    }
  }

  if (resolvedCities.length < 2) {
    return { isMultiCity: false, stops: [], totalDays, summary: '' };
  }

  return buildCircuit(resolvedCities, totalDays, `Multi-City Grand Journey: ${resolvedCities.join(' → ')}`);
}

function buildCircuit(cities: string[], totalDays: number, summary: string): MultiCityCircuit {
  const safeTotalDays = Math.max(cities.length, totalDays);
  const cityCount = cities.length;

  // Allocate days evenly, giving remainder to first stops
  const baseDays = Math.floor(safeTotalDays / cityCount);
  let remainder = safeTotalDays % cityCount;

  const stops: MultiCityStop[] = [];
  let currentStartDay = 1;

  for (let i = 0; i < cityCount; i++) {
    const cityName = cities[i];
    const allocated = baseDays + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;

    const startDay = currentStartDay;
    const endDay = startDay + allocated - 1;
    currentStartDay = endDay + 1;

    let transitToNext: MultiCityStop['transitToNext'] = undefined;
    if (i < cityCount - 1) {
      const nextCity = cities[i + 1];
      const corridorKey1 = `${cityName.toLowerCase()}-${nextCity.toLowerCase()}`;
      const corridorKey2 = `${nextCity.toLowerCase()}-${cityName.toLowerCase()}`;
      const corridor = KNOWN_TRANSIT_CORRIDORS[corridorKey1] || KNOWN_TRANSIT_CORRIDORS[corridorKey2];

      if (corridor) {
        transitToNext = {
          fromCity: cityName,
          toCity: nextCity,
          mode: corridor.mode,
          title: corridor.title,
          durationHours: corridor.durationHours,
          distanceKm: corridor.distanceKm,
          estimatedCostPerPerson: corridor.cost
        };
      } else {
        transitToNext = {
          fromCity: cityName,
          toCity: nextCity,
          mode: 'highway_coach',
          title: `Inter-City Express Transfer from ${cityName} to ${nextCity}`,
          durationHours: 3.0,
          distanceKm: 180,
          estimatedCostPerPerson: 1200
        };
      }
    }

    stops.push({
      cityName,
      allocatedDays: allocated,
      startDay,
      endDay,
      transitToNext
    });
  }

  return {
    isMultiCity: true,
    stops,
    totalDays: safeTotalDays,
    summary
  };
}
