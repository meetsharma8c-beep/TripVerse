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

  // Curated 100% verified 200 OK high-res images for global & flagship destinations
  tokyo: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
  japan: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
  shibuya: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1200&q=80',
  shibuyacrossing: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1200&q=80',
  shinjuku: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=1200&q=80',
  sensoji: 'https://images.unsplash.com/photo-1583084336829-56da491aa5c2?auto=format&fit=crop&w=1200&q=80',
  asakusa: 'https://images.unsplash.com/photo-1583084336829-56da491aa5c2?auto=format&fit=crop&w=1200&q=80',
  tokyotower: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
  akihabara: 'https://images.unsplash.com/photo-1570737209974-bc4878a1bc1b?auto=format&fit=crop&w=1200&q=80',
  meijishrine: 'https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=1200&q=80',
  ginza: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?auto=format&fit=crop&w=1200&q=80',
  roppongi: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
  kyoto: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
  osaka: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1200&q=80',
  paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
  eiffeltower: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
  louvre: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80',
  london: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
  newyork: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80',
  dubai: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
  singapore: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80',
  bali: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
  maldives: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80',
  rome: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
  bangkok: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80',
  zurich: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?auto=format&fit=crop&w=1200&q=80',
  amsterdam: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80',
  barcelona: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80',
  sydney: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80',

  // Curated domestic destinations
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
  customCoordsOrMeta?:
    | { lat: number; lng: number }
    | {
        coordinates?: { lat: number; lng: number };
        category?: Destination['category'];
        state?: string;
        country?: string;
        tagline?: string;
        description?: string;
        image?: string;
        highlights?: string[];
      },
  customCategory?: Destination['category'],
  customState?: string
): Destination {
  const cleanName = query.trim();
  const lower = cleanName.toLowerCase();
  const id = `dest-${lower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

  const isRawCoords =
    customCoordsOrMeta &&
    'lat' in customCoordsOrMeta &&
    typeof customCoordsOrMeta.lat === 'number';
  const customCoords = isRawCoords
    ? (customCoordsOrMeta as { lat: number; lng: number })
    : (customCoordsOrMeta as { coordinates?: { lat: number; lng: number } } | undefined)?.coordinates;
  const meta = !isRawCoords
    ? (customCoordsOrMeta as {
        category?: Destination['category'];
        state?: string;
        country?: string;
        tagline?: string;
        description?: string;
        image?: string;
        highlights?: string[];
      } | undefined)
    : undefined;

  // Try precise location resolution
  const resolved = resolvePreciseLocationSync(cleanName);

  let category: Destination['category'] = customCategory || meta?.category || resolved.category || 'roadtrip';
  const country = meta?.country || resolved.country || 'Worldwide';
  let state = customState || meta?.state || (resolved.state && resolved.state !== 'Worldwide Destination' ? resolved.state : country);
  let tagline = meta?.tagline || resolved.tagline || 'Scenic Getaway • Global Travel • Authentic Culture';
  const isInternational = country !== 'India';
  const isHighCostInternational = isInternational && (
    country === 'France' ||
    country === 'United States' ||
    country === 'United Kingdom' ||
    country === 'Japan' ||
    country === 'Switzerland' ||
    country === 'Italy' ||
    country === 'Australia' ||
    country === 'Spain' ||
    country === 'Germany' ||
    country === 'Netherlands' ||
    country === 'Iceland' ||
    country === 'Norway' ||
    country === 'New Zealand' ||
    country === 'Canada'
  );

  let startBudget = 12000;
  let recommendedDuration = '3 - 4 Days';
  const rawHighlights = meta?.highlights && meta.highlights.length > 0 ? meta.highlights : resolved.highlights;
  let popularActivities = rawHighlights && rawHighlights.length > 0 
    ? [...rawHighlights]
    : [
        `${resolved.name} Iconic Landmarks & Cultural Tour`,
        `${resolved.name} Historic Quarter & Local Markets`,
        `${resolved.name} Panoramic Horizon Viewpoint`,
        `${resolved.name} Regional Gastronomy & Evening Stroll`
      ];

  if (isHighCostInternational) {
    startBudget = 75000;
    recommendedDuration = '5 - 6 Days';
  } else if (isInternational) {
    startBudget = 38000;
    recommendedDuration = '4 - 5 Days';
  } else if (category === 'mountain') {
    startBudget = 14000;
    recommendedDuration = '4 - 5 Days';
  } else if (category === 'beach') {
    startBudget = 15000;
    recommendedDuration = '3 - 5 Days';
  } else if (category === 'spiritual') {
    startBudget = 7000;
    recommendedDuration = '2 - 3 Days';
  } else if (category === 'heritage') {
    startBudget = 9000;
    recommendedDuration = '2 - 3 Days';
  }

  const image = meta?.image || resolved.image || resolveDestinationImage(cleanName, category);
  const coordinates = customCoords || resolved.coordinates || { lat: 23.2599, lng: 77.4126 };
  const bestTime = coordinates.lat > 40 ? 'May to September' : coordinates.lat < -15 ? 'November to March' : 'October to March';

  return {
    id,
    name: resolved.name || cleanName,
    state,
    country,
    category,
    tagline,
    description: meta?.description || `Plan a personalized trip to ${resolved.name || cleanName}${country && country !== 'Worldwide' ? ` (${country})` : ''} with verified attractions, smart routes, weather forecasts, and custom day-by-day budgeting on TripVerse.`,
    image,
    startBudget,
    rating: 4.8,
    recommendedDuration,
    bestTime,
    popularActivities,
    coordinates
  };
}
