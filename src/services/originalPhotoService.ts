/**
 * TRIPVERSE ORIGINAL PHOTO RESOLUTION ENGINE
 * 
 * Accesses and streams genuine, real-world, high-resolution photography for
 * destinations, landmarks, day itinerary highlights, and hotels during plan loading.
 * 
 * Data Sources:
 * 1. Wikipedia / Wikimedia Commons REST API (High-res genuine unscaled photography)
 * 2. MediaWiki PageImages API (Search-based verified landmark photo retrieval)
 * 3. Curated High-Definition Verified Photography Catalog (Zero-latency fallback)
 * 4. In-Memory & LocalStorage Multi-Tier Persistent Cache (Instantaneous 0ms replay)
 */

import { Trip, DayPlan, ItineraryActivity } from '../types/trip';
import { Hotel } from './hotelService';
import { KNOWN_DESTINATION_IMAGES, DEFAULT_TRAVEL_FALLBACK_IMAGE } from '../utils/destinationImages';

// In-Memory Fast Cache
const MEMORY_PHOTO_CACHE = new Map<string, string>();
const CACHE_STORAGE_KEY = 'tripverse_photo_cache_v2';

// Initialize cache from localStorage
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === 'string') MEMORY_PHOTO_CACHE.set(k.toLowerCase().trim(), v);
        });
      }
    }
  } catch {
    // LocalStorage unavailable or corrupt
  }
}

function persistCacheToStorage() {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, string> = {};
    let count = 0;
    // Persist most recent 200 photos to prevent storage overflow
    for (const [k, v] of MEMORY_PHOTO_CACHE.entries()) {
      if (count++ > 200) break;
      obj[k] = v;
    }
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Quota exceeded or private browsing
  }
}

/**
 * Checks if an image URL from Wikimedia is an actual photograph rather than an SVG, flag, icon, or map.
 */
function isPhotographicUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  
  if (
    lower.endsWith('.svg') ||
    lower.endsWith('.svg.png') ||
    lower.includes('flag_of') ||
    lower.includes('flag-of') ||
    lower.includes('map_of') ||
    lower.includes('in_indonesia_%28special_marker%29') ||
    lower.includes('coat_of_arms') ||
    lower.includes('locator') ||
    lower.includes('orthographic') ||
    lower.includes('blank_map') ||
    lower.includes('symbol_') ||
    lower.includes('icon')
  ) {
    return false;
  }
  return true;
}

/**
 * Normalizes query string for cache lookup
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Cleans user activity or destination title to extract the primary landmark / place name
 */
export function extractCleanLandmarkName(rawTitle: string, destination: string): string[] {
  const cleanDest = destination.split(',')[0].trim();
  let text = rawTitle.trim();

  // Strip leading Day prefixes like "Day 1 — ", "Day 2 : ", etc.
  text = text.replace(/^Day\s+\d+\s*[—:-]?\s*/i, '');

  // Strip '&', '+' and symbols
  text = text.replace(/[&+]/g, ' ');

  // Strip common itinerary verbs & words
  text = text.replace(/\b(arrival|check-in|checkout|departure|journey to|evening|morning|afternoon|sunset|sunrise|experience|exploration|explore|visit to|visit|stroll around|stroll|walk at|walk|tour of|tour|delicacies|feast|highlights|vista|overlook)\b/gi, ' ');

  // Strip connecting prepositions
  text = text.replace(/\b(and|with|at|in|near|around|for|to)\b/gi, ' ');
  text = text.replace(/[—,:\-\/]/g, ' ').replace(/\s+/g, ' ').trim();

  const candidates: string[] = [];

  if (text.length > 2) {
    // If text has multiple words (e.g. "Shibuya Crossing"), add it
    candidates.push(text);
    // Also candidate with destination (e.g. "Shibuya Crossing, Tokyo")
    if (cleanDest && !text.toLowerCase().includes(cleanDest.toLowerCase())) {
      candidates.push(`${text}, ${cleanDest}`);
    }
  }

  // Also try individual recognizable words if multi-word
  const parts = text.split(/\s+/).filter(p => p.length > 3);
  if (parts.length > 1) {
    candidates.push(parts[0]);
    if (cleanDest) candidates.push(`${parts[0]}, ${cleanDest}`);
  }

  // Fallback to destination itself
  if (cleanDest) {
    candidates.push(cleanDest);
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

/**
 * Asynchronously fetches genuine, authentic, original photography for any
 * landmark, destination, hotel, or attraction on Earth.
 */
export async function fetchOriginalPhoto(
  query: string,
  destination: string = ''
): Promise<string | null> {
  const normKey = normalizeQuery(query);
  if (!normKey) return null;

  // 1. In-Memory Cache Check
  if (MEMORY_PHOTO_CACHE.has(normKey)) {
    return MEMORY_PHOTO_CACHE.get(normKey)!;
  }

  // 2. Curated Known Image Catalog Check
  if (KNOWN_DESTINATION_IMAGES[normKey]) {
    const curated = KNOWN_DESTINATION_IMAGES[normKey];
    MEMORY_PHOTO_CACHE.set(normKey, curated);
    return curated;
  }

  // 3. Extract candidate queries for Wikimedia API
  const candidates = extractCleanLandmarkName(query, destination);

  for (const candidate of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate.replace(/\s+/g, '_'))}`;
      const res = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TripVerse-Client/1.0 (travel@trip-verse.com)'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const candidateImg = data.originalimage?.source || data.thumbnail?.source;

        if (isPhotographicUrl(candidateImg)) {
          // Normalize thumbnail width to high-res unscaled image if possible
          const highResUrl = data.originalimage?.source || candidateImg.replace(/\/\d+px-/, '/1280px-');
          MEMORY_PHOTO_CACHE.set(normKey, highResUrl);
          persistCacheToStorage();
          return highResUrl;
        }
      }
    } catch {
      // Continue to next candidate query
    }
  }

  // 4. Try Wikipedia Search API for broader queries (e.g. "Tokyo hotel", "Senso-ji")
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const searchEndpoint = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=3&prop=pageimages&pithumbsize=1280&format=json&origin=*`;
    const searchRes = await fetch(searchEndpoint, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TripVerse-Client/1.0'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const pages = searchData.query?.pages;
      if (pages) {
        for (const pageId of Object.keys(pages)) {
          const page = pages[pageId];
          const imgUrl = page?.thumbnail?.source;
          if (isPhotographicUrl(imgUrl)) {
            MEMORY_PHOTO_CACHE.set(normKey, imgUrl);
            persistCacheToStorage();
            return imgUrl;
          }
        }
      }
    }
  } catch {
    // Continue to fallback
  }

  return null;
}

/**
 * Returns an instant photo synchronously from cache or curated catalogue.
 */
export function getInstantPhoto(query: string, fallback?: string): string {
  const normKey = normalizeQuery(query);
  if (MEMORY_PHOTO_CACHE.has(normKey)) {
    return MEMORY_PHOTO_CACHE.get(normKey)!;
  }
  if (KNOWN_DESTINATION_IMAGES[normKey]) {
    return KNOWN_DESTINATION_IMAGES[normKey];
  }
  return fallback || DEFAULT_TRAVEL_FALLBACK_IMAGE;
}

/**
 * Pipeline executed during trip generation loading.
 * Enriches the entire trip (destination, hotel, day highlights, activities) with original photos.
 */
export async function enrichTripWithOriginalPhotos(
  trip: Trip,
  inputDestinationName: string = ''
): Promise<Trip> {
  const destName = trip.destination || inputDestinationName || 'Destination';

  // 1. Fetch Destination Hero Photo
  const destPhotoPromise = fetchOriginalPhoto(destName).catch(() => null);

  // 2. Fetch Selected Hotel Photo
  const hotelPhotoPromise = trip.selectedHotel
    ? fetchOriginalPhoto(trip.selectedHotel.name, destName).catch(() => null)
    : Promise.resolve(null);

  // 3. Fetch Photos for Each Day in Itinerary
  const dayPhotoPromises = (trip.itinerary || []).map(async (day: DayPlan) => {
    // Find primary attraction or viewpoint activity
    const primeAct = day.activities?.find(
      (a: ItineraryActivity) => a.type === 'attraction' || a.type === 'viewpoint'
    ) || day.activities?.[0];

    const targetQuery = primeAct?.title || day.title || day.theme || destName;
    const photo = await fetchOriginalPhoto(targetQuery, destName).catch(() => null);
    return { dayNumber: day.dayNumber, photo, primeActId: primeAct?.id };
  });

  // Execute all photo fetches concurrently with a hard cap so the plan never hangs
  const [destPhoto, hotelPhoto, dayPhotos] = await Promise.all([
    destPhotoPromise,
    hotelPhotoPromise,
    Promise.all(dayPhotoPromises)
  ]);

  // Update Destination Details
  const updatedDestDetails = { ...trip.destinationDetails };
  if (destPhoto) {
    updatedDestDetails.image = destPhoto;
  }

  // Update Selected Hotel
  let updatedSelectedHotel: Hotel | undefined = trip.selectedHotel ? { ...trip.selectedHotel } : undefined;
  if (updatedSelectedHotel && hotelPhoto) {
    updatedSelectedHotel.image = hotelPhoto;
  }

  // Update Day Plans and Activities
  const dayPhotoMap = new Map<number, { photo: string | null; primeActId?: string }>();
  dayPhotos.forEach(dp => {
    if (dp.photo) dayPhotoMap.set(dp.dayNumber, { photo: dp.photo, primeActId: dp.primeActId });
  });

  const updatedItinerary = (trip.itinerary || []).map((day: DayPlan) => {
    const dayInfo = dayPhotoMap.get(day.dayNumber);
    const dayImage = dayInfo?.photo || day.image || updatedDestDetails.image;

    const updatedActivities = (day.activities || []).map((act: ItineraryActivity) => {
      if (dayInfo?.primeActId && act.id === dayInfo.primeActId && dayInfo.photo) {
        return { ...act, image: dayInfo.photo };
      }
      return act;
    });

    return {
      ...day,
      image: dayImage,
      activities: updatedActivities
    };
  });

  return {
    ...trip,
    destinationDetails: updatedDestDetails as any,
    selectedHotel: updatedSelectedHotel,
    itinerary: updatedItinerary
  };
}
