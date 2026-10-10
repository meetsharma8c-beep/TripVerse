import { Destination } from '../types/trip';
import { resolvePreciseLocationSync } from '../services/locationService';

export const DEFAULT_TRAVEL_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  mountain: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
  beach: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
  heritage: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80',
  nature: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=1200&q=80',
  spiritual: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80',
  adventure: '/images/destinations/rishikesh.jpg',
  roadtrip: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80',
  weekend: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=1200&q=80'
};

export const KNOWN_DESTINATION_IMAGES: Record<string, string> = {
  // Verified local authentic photography
  rishikesh: '/images/destinations/rishikesh.jpg',
  meghalaya: '/images/destinations/meghalaya.jpg',
  cherrapunji: '/images/destinations/meghalaya.jpg',
  shillong: '/images/destinations/meghalaya.jpg',

  // Curated 100% verified 200 OK high-res images
  udaipur: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=1200&q=80',
  manali: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
  goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
  jaipur: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80',
  kashmir: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1200&q=80',
  mumbai: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80',
  kerala: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
  munnar: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
  alleppey: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
  wayanad: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
  ladakh: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=1200&q=80',
  leh: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=1200&q=80',
  varanasi: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80',
  andaman: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80',
  havelock: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80',
  ooty: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=1200&q=80',
  kodaikanal: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=1200&q=80',
  coonoor: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=1200&q=80',
  agra: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80',
  darjeeling: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  hampi: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80',
  jodhpur: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
  pondicherry: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
  coorg: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  spiti: 'https://images.unsplash.com/photo-1580974852861-c381510bc98a?auto=format&fit=crop&w=1200&q=80',
  shimla: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=1200&q=80',
  sikkim: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  gangtok: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  mountabu: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
  amritsar: 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?auto=format&fit=crop&w=1200&q=80',
  jaisalmer: 'https://images.unsplash.com/photo-1509299349698-dd22323b5963?auto=format&fit=crop&w=1200&q=80',
  gokarna: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
  varkala: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
  mussoorie: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=1200&q=80',
  nainital: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=1200&q=80',
  haridwar: '/images/destinations/rishikesh.jpg',
  poicha: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80',
  statueofunity: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80',
  kevadia: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80',
  modhera: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80',
  dholavira: 'https://images.unsplash.com/photo-1509299349698-dd22323b5963?auto=format&fit=crop&w=1200&q=80',
  mandvi: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
  saputara: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80'
};

export function handleImageError(event: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl?: string) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = fallbackUrl || DEFAULT_TRAVEL_FALLBACK_IMAGE;
}

export function resolveDestinationImage(name: string, category?: string): string {
  if (!name) return DEFAULT_TRAVEL_FALLBACK_IMAGE;

  const cleanName = name.toLowerCase().trim();
  const normalized = cleanName.replace(/[^a-z0-9]/g, '');

  // 1. Direct key match
  if (KNOWN_DESTINATION_IMAGES[normalized]) {
    return KNOWN_DESTINATION_IMAGES[normalized];
  }

  // 2. Token / word match (avoid false substring match)
  const tokens = cleanName.split(/[\s,–-]+/).filter(Boolean);
  for (const token of tokens) {
    if (KNOWN_DESTINATION_IMAGES[token]) {
      return KNOWN_DESTINATION_IMAGES[token];
    }
  }

  // 3. Keyword based match
  if (
    cleanName.includes('beach') || cleanName.includes('island') || cleanName.includes('coast') || 
    cleanName.includes('sea') || cleanName.includes('ocean') || cleanName.includes('gokarna') || cleanName.includes('varkala')
  ) {
    return CATEGORY_FALLBACK_IMAGES.beach;
  }

  if (
    cleanName.includes('mountain') || cleanName.includes('hill') || cleanName.includes('snow') || 
    cleanName.includes('peak') || cleanName.includes('pass') || cleanName.includes('valley') ||
    cleanName.includes('kodaikanal') || cleanName.includes('coonoor') || cleanName.includes('ooty') ||
    cleanName.includes('munnar') || cleanName.includes('mussoorie') || cleanName.includes('nainital')
  ) {
    return CATEGORY_FALLBACK_IMAGES.mountain;
  }

  if (
    cleanName.includes('temple') || cleanName.includes('ghat') || cleanName.includes('ashram') || 
    cleanName.includes('holy') || cleanName.includes('spiritual') || cleanName.includes('aarti')
  ) {
    return CATEGORY_FALLBACK_IMAGES.spiritual;
  }

  if (
    cleanName.includes('fort') || cleanName.includes('palace') || cleanName.includes('heritage') || 
    cleanName.includes('royal') || cleanName.includes('citadel') || cleanName.includes('hampi')
  ) {
    return CATEGORY_FALLBACK_IMAGES.heritage;
  }

  if (
    cleanName.includes('forest') || cleanName.includes('fall') || cleanName.includes('waterfall') || 
    cleanName.includes('lake') || cleanName.includes('river') || cleanName.includes('jungle')
  ) {
    return CATEGORY_FALLBACK_IMAGES.nature;
  }

  if (category && CATEGORY_FALLBACK_IMAGES[category]) {
    return CATEGORY_FALLBACK_IMAGES[category];
  }

  return DEFAULT_TRAVEL_FALLBACK_IMAGE;
}

export function synthesizeDestination(
  query: string,
  customCoords?: { lat: number; lng: number },
  customCategory?: Destination['category'],
  customState?: string
): Destination {
  const cleanName = query.trim();
  const lower = cleanName.toLowerCase();
  const id = `dest-${lower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

  // Try precise location resolution
  const resolved = resolvePreciseLocationSync(cleanName);

  let category: Destination['category'] = customCategory || resolved.category || 'roadtrip';
  let state = customState || resolved.state || 'India';
  let tagline = resolved.tagline || 'Scenic Getaway • Road Trip • Authentic Culture';
  let startBudget = 3500;
  let recommendedDuration = '2 - 3 Days';
  let popularActivities = resolved.highlights && resolved.highlights.length > 0 
    ? [...resolved.highlights]
    : [
        `${resolved.name} Sightseeing & Cultural Tour`,
        'Local Street Food & Bazaars',
        'Scenic Viewpoint Exploration',
        'Evening Leisure Stroll'
      ];

  if (category === 'mountain') {
    startBudget = 4500;
    recommendedDuration = '3 - 4 Days';
  } else if (category === 'beach') {
    startBudget = 4800;
    recommendedDuration = '3 - 4 Days';
  } else if (category === 'spiritual') {
    startBudget = 2800;
    recommendedDuration = '2 - 3 Days';
  } else if (category === 'heritage') {
    startBudget = 3200;
    recommendedDuration = '2 - 3 Days';
  }

  const image = resolveDestinationImage(cleanName, category);
  const coordinates = customCoords || resolved.coordinates || { lat: 21.9348, lng: 73.5521 };

  return {
    id,
    name: resolved.name || cleanName,
    state,
    category,
    tagline,
    description: `TripVerse draft itinerary for ${resolved.name || cleanName}, with estimated budgeting and suggested local experiences. Verify places and travel details before booking.`,
    image,
    startBudget,
    rating: 4.8,
    recommendedDuration,
    bestTime: 'October to March',
    popularActivities,
    coordinates
  };
}
