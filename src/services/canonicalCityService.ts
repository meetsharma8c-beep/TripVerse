/**
 * TRIPVERSE CANONICAL CITY RESOLVER
 * 
 * Normalizes any free-form user query (e.g., "Tokyo, Japan", "to tokyo", "Tokyo City",
 * "Paris, France", "NYC", "Jaipur, Rajasthan") into its canonical destination entity.
 * 
 * Eliminates synthetic template placeholders caused by comma suffixes or prepositional prefixes.
 */

import { POPULAR_DESTINATIONS } from '../data/destinations';
import { Destination } from '../types/trip';

export interface CanonicalResolution {
  canonicalName: string;
  destinationId?: string;
  matchedDestination?: Destination;
  country: string;
  state: string;
  isCurated: boolean;
  cleanQuery: string;
}

const LEADING_PREPOSITIONS_REGEX = /^\s*(?:trip\s+to|travel\s+to|fly\s+to|drive\s+to|visit|vacation\s+in|holiday\s+in|explore|tour\s+of|to|in|near|around)\s+/i;
const TRAILING_NOISE_REGEX = /\s+(?:city|tour|trip|vacation|getaway|district|center|town)$/i;

const COMMON_CITY_ALIASES: Record<string, string> = {
  'nyc': 'new-york',
  'new york': 'new-york',
  'new york city': 'new-york',
  'manhattan': 'new-york',
  'brooklyn': 'new-york',
  'tokyo': 'tokyo',
  'tokio': 'tokyo',
  'edo': 'tokyo',
  'paris': 'paris',
  'rome': 'rome',
  'roma': 'rome',
  'vatican': 'rome',
  'dubai': 'dubai',
  'bcn': 'barcelona',
  'barcelona': 'barcelona',
  'london': 'london',
  'bali': 'bali',
  'ubud': 'bali',
  'seminyak': 'bali',
  'kyoto': 'kyoto',
  'singapore': 'singapore',
  'santorini': 'santorini',
  'sydney': 'sydney',
  'bangkok': 'bangkok',
  'swiss alps': 'swiss-alps',
  'switzerland': 'swiss-alps',
  'interlaken': 'swiss-alps',
  'zermatt': 'swiss-alps',
  'jaipur': 'jaipur',
  'pink city': 'jaipur',
  'udaipur': 'udaipur',
  'lake city': 'udaipur',
  'city of lakes': 'udaipur',
  'goa': 'goa',
  'north goa': 'goa',
  'south goa': 'goa',
  'manali': 'manali',
  'agra': 'agra',
  'taj mahal': 'agra',
  'varanasi': 'varanasi',
  'kashi': 'varanasi',
  'banaras': 'varanasi',
  'kashmir': 'kashmir',
  'srinagar': 'kashmir',
  'gulmarg': 'kashmir',
  'pahalgam': 'kashmir',
  'ladakh': 'ladakh',
  'leh': 'ladakh',
  'leh ladakh': 'ladakh',
  'amritsar': 'amritsar',
  'golden temple': 'amritsar',
  'mumbai': 'mumbai',
  'bombay': 'mumbai',
  'poicha': 'poicha',
  'nilkanth dham': 'poicha',
  'statue of unity': 'statue-of-unity',
  'kevadia': 'statue-of-unity',
  'modhera': 'modhera',
  'sun temple modhera': 'modhera',
  'polo forest': 'polo-forest',
  'dholavira': 'dholavira',
  'mandvi': 'mandvi',
  'saputara': 'saputara',
  'chopta': 'chopta',
  'spiti': 'spiti-valley',
  'spiti valley': 'spiti-valley'
};

/**
 * Strips prepositions, trailing qualifiers, and comma segments to extract the core city name.
 */
export function extractCoreCityToken(query: string): string {
  if (!query || typeof query !== 'string') return '';
  let cleaned = query.trim().replace(LEADING_PREPOSITIONS_REGEX, '').trim();

  // If there's a comma (e.g. "Tokyo, Japan" or "Paris, Île-de-France, France"), take primary segment
  if (cleaned.includes(',')) {
    const primarySegment = cleaned.split(',')[0].trim();
    if (primarySegment.length >= 2) {
      cleaned = primarySegment;
    }
  }

  // Remove trailing generic suffixes like " City"
  cleaned = cleaned.replace(TRAILING_NOISE_REGEX, '').trim();
  return cleaned;
}

/**
 * Resolves any free-form destination query into a canonical Destination entity or normalized record.
 */
export function resolveCanonicalDestination(rawQuery: string): CanonicalResolution {
  const clean = (rawQuery || '').trim();
  if (!clean) {
    return {
      canonicalName: 'Udaipur',
      destinationId: 'udaipur',
      matchedDestination: POPULAR_DESTINATIONS.find(d => d.id === 'udaipur'),
      country: 'India',
      state: 'Rajasthan',
      isCurated: true,
      cleanQuery: ''
    };
  }

  const coreToken = extractCoreCityToken(clean);
  const coreNorm = coreToken.toLowerCase().replace(/[^a-z0-9]/g, '');
  const fullNorm = clean.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Direct Alias Lookup
  const aliasKey = Object.keys(COMMON_CITY_ALIASES).find(k => {
    const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    return coreNorm === normK || fullNorm === normK || fullNorm.startsWith(normK) || coreNorm.startsWith(normK);
  });

  if (aliasKey) {
    const destId = COMMON_CITY_ALIASES[aliasKey];
    const match = POPULAR_DESTINATIONS.find(d => d.id === destId);
    if (match) {
      return {
        canonicalName: match.name,
        destinationId: match.id,
        matchedDestination: match,
        country: match.country || 'India',
        state: match.state,
        isCurated: true,
        cleanQuery: clean
      };
    }
  }

  // 2. Direct Match in POPULAR_DESTINATIONS by id or name
  for (const dest of POPULAR_DESTINATIONS) {
    const destNorm = dest.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idNorm = dest.id.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (
      coreNorm === destNorm ||
      coreNorm === idNorm ||
      destNorm.includes(coreNorm) ||
      coreNorm.includes(destNorm) ||
      fullNorm.includes(destNorm)
    ) {
      return {
        canonicalName: dest.name,
        destinationId: dest.id,
        matchedDestination: dest,
        country: dest.country || 'India',
        state: dest.state,
        isCurated: true,
        cleanQuery: clean
      };
    }
  }

  // 3. Fallback for unlisted town/city: clean name without comma noise
  const parsedName = coreToken.length >= 2 ? coreToken : clean;
  let detectedCountry = 'Worldwide';
  let detectedState = 'Region';

  if (clean.includes(',')) {
    const parts = clean.split(',').map(s => s.trim()).filter(Boolean);
    const tail = parts[parts.length - 1] || '';
    const normTail = tail.toLowerCase();
    const KNOWN_INDIAN_STATES_OR_REGIONS = new Set([
      'india', 'gujarat', 'rajasthan', 'maharashtra', 'kerala', 'karnataka', 'tamil nadu',
      'himachal pradesh', 'uttarakhand', 'goa', 'punjab', 'haryana', 'delhi', 'delhi ncr',
      'uttar pradesh', 'madhya pradesh', 'west bengal', 'sikkim', 'meghalaya', 'assam',
      'ladakh', 'jammu & kashmir', 'jammu and kashmir', 'odisha', 'bihar', 'jharkhand',
      'andhra pradesh', 'telangana', 'chhattisgarh', 'arunachal pradesh', 'puducherry',
      'pondicherry', 'pavagadh', 'champaner', 'kutch', 'saurashtra'
    ]);
    if (parts.length >= 2) {
      if (normTail === 'india') {
        detectedCountry = 'India';
        if (parts.length >= 3) detectedState = parts[parts.length - 2];
      } else if (KNOWN_INDIAN_STATES_OR_REGIONS.has(normTail)) {
        detectedCountry = 'India';
        detectedState = tail;
      } else if (parts.length >= 3) {
        detectedCountry = tail;
        detectedState = parts[parts.length - 2];
      } else {
        // 2-part query like "Kyoto, Japan" or "Subspot, Region": treat as country only if it's not a local sub-region
        detectedCountry = tail;
      }
    }
  }

  return {
    canonicalName: parsedName,
    destinationId: undefined,
    matchedDestination: undefined,
    country: detectedCountry,
    state: detectedState,
    isCurated: false,
    cleanQuery: clean
  };
}
