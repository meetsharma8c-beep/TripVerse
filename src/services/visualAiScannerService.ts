/**
 * Visual AI Scanner Service (visualAiScannerService.ts)
 * Multimodal image intelligence for TripVerse:
 * - Landmark & Monument identification with historical context and entry fees
 * - Flight & Train Boarding Pass / Hotel voucher OCR parsing
 * - Local culinary dish / menu recognition with dietary tags
 */

import { resolveApiUrl } from './deviceService';

export interface ScannedLandmarkResult {
  type: 'landmark';
  name: string;
  city: string;
  country: string;
  confidence: number;
  description: string;
  architecturalStyle: string;
  suggestedDuration: string;
  entryFee: string;
  bestTimeToVisit: string;
  coordinates?: { lat: number; lng: number };
  imageUrl?: string;
  source?: 'live_vision' | 'prompt_match';
}

export interface ScannedTicketResult {
  type: 'ticket';
  carrier: string;
  ticketType: 'flight' | 'train' | 'hotel' | 'event';
  bookingRef: string;
  origin: string;
  destination: string;
  departureTime: string;
  seatOrRoom: string;
  passengerName?: string;
  totalAmount?: string;
  imageUrl?: string;
  source?: 'live_vision';
}

export interface ScannedFoodResult {
  type: 'food';
  dishName: string;
  cuisine: string;
  region: string;
  description: string;
  dietaryTags: string[];
  averagePrice: string;
  flavorProfile: string;
  imageUrl?: string;
  source?: 'live_vision' | 'prompt_match';
}

export interface ScannedUnverifiedResult {
  type: 'unverified';
  title: string;
  guidance: string;
  reason: 'vision_unavailable' | 'unrecognized_image';
}

export type VisualScanResult =
  | ScannedLandmarkResult
  | ScannedTicketResult
  | ScannedFoodResult
  | ScannedUnverifiedResult;

// Global landmark knowledge base for visual AI matching
const KNOWN_LANDMARKS: Array<{
  keywords: string[];
  data: ScannedLandmarkResult;
}> = [
  {
    keywords: ['eiffel', 'paris', 'champ de mars', 'france', 'tour eiffel'],
    data: {
      type: 'landmark',
      name: 'Eiffel Tower',
      city: 'Paris',
      country: 'France',
      confidence: 0.98,
      description: 'Iconic 330-metre wrought-iron lattice tower on the Champ de Mars, constructed in 1889 by Gustave Eiffel.',
      architecturalStyle: 'Late 19th Century Wrought-Iron Lattice',
      suggestedDuration: '2.5 - 3 hours',
      entryFee: '€28.30 (Summit Lift)',
      bestTimeToVisit: 'Sunset to witness the hourly golden sparkles',
      coordinates: { lat: 48.8584, lng: 2.2945 }
    }
  },
  {
    keywords: ['taj', 'mahal', 'agra', 'india', 'yamuna', 'shah jahan'],
    data: {
      type: 'landmark',
      name: 'Taj Mahal',
      city: 'Agra',
      country: 'India',
      confidence: 0.99,
      description: 'UNESCO World Heritage ivory-white marble mausoleum commissioned in 1632 by Mughal Emperor Shah Jahan.',
      architecturalStyle: 'Mughal Architecture with Pietra Dura inlays',
      suggestedDuration: '3 - 4 hours',
      entryFee: '₹50 (Indian) / ₹1,100 (Foreign)',
      bestTimeToVisit: 'Sunrise for ethereal mist and cool marble temperatures',
      coordinates: { lat: 27.1751, lng: 78.0421 }
    }
  },
  {
    keywords: ['burj', 'khalifa', 'dubai', 'uae', 'emirates', 'downtown dubai'],
    data: {
      type: 'landmark',
      name: 'Burj Khalifa',
      city: 'Dubai',
      country: 'United Arab Emirates',
      confidence: 0.97,
      description: 'The world\'s tallest skyscraper at 828 metres (2,717 ft), featuring the high-speed double-deck elevators to Level 148.',
      architecturalStyle: 'Neo-futuristic with Y-shaped tripartite floor geometry',
      suggestedDuration: '2 hours',
      entryFee: 'AED 179 - AED 399',
      bestTimeToVisit: '5:30 PM for sunset over the Arabian Gulf',
      coordinates: { lat: 25.1972, lng: 55.2744 }
    }
  },
  {
    keywords: ['colosseum', 'roma', 'rome', 'italy', 'flavian', 'amphitheatre'],
    data: {
      type: 'landmark',
      name: 'Colosseum (Flavian Amphitheatre)',
      city: 'Rome',
      country: 'Italy',
      confidence: 0.96,
      description: 'Ancient Roman elliptical amphitheatre completed in 80 AD under Emperor Titus, holding up to 80,000 spectators.',
      architecturalStyle: 'Classical Roman Travertine Limestone & Tufo Vaults',
      suggestedDuration: '2.5 hours',
      entryFee: '€18 (Includes Roman Forum)',
      bestTimeToVisit: 'Early morning (8:30 AM) to avoid midday heat and queues',
      coordinates: { lat: 41.8902, lng: 12.4922 }
    }
  },
  {
    keywords: ['fushimi', 'inari', 'kyoto', 'japan', 'torii', 'shinto'],
    data: {
      type: 'landmark',
      name: 'Fushimi Inari-Taisha',
      city: 'Kyoto',
      country: 'Japan',
      confidence: 0.97,
      description: 'Shinto shrine renowned for its mesmerizing Senbon Torii—over 10,000 vermilion gates winding up sacred Mount Inari.',
      architecturalStyle: 'Traditional Japanese Shinto Shrine Architecture',
      suggestedDuration: '2 - 3 hours (Full mountain loop)',
      entryFee: 'Free (24/7 Access)',
      bestTimeToVisit: 'Dawn (6:00 AM) or dusk for lantern-lit solitude',
      coordinates: { lat: 34.9671, lng: 135.7727 }
    }
  },
  {
    keywords: ['hadimba', 'hidimba', 'manali', 'himachal', 'dhungiri'],
    data: {
      type: 'landmark',
      name: 'Hadimba Temple',
      city: 'Manali',
      country: 'India',
      confidence: 0.95,
      description: '1553 AD pagoda-style wooden temple dedicated to Hidimba Devi, surrounded by towering Himalayan cedar (Deodar) forests.',
      architecturalStyle: 'Four-tiered wooden pagoda with intricate mythological carvings',
      suggestedDuration: '1 - 1.5 hours',
      entryFee: 'Free (Donations welcome)',
      bestTimeToVisit: 'Morning when cedar scent fills the crisp alpine air',
      coordinates: { lat: 32.2483, lng: 77.1812 }
    }
  },
  {
    keywords: ['marina bay', 'sands', 'singapore', 'skypark', 'infinity pool'],
    data: {
      type: 'landmark',
      name: 'Marina Bay Sands & SkyPark',
      city: 'Singapore',
      country: 'Singapore',
      confidence: 0.96,
      description: 'Integrated resort featuring three 55-storey towers topped by a 340-metre-long SkyPark cantilever and infinity pool.',
      architecturalStyle: 'Moshe Safdie Futuristic Deconstructivism',
      suggestedDuration: '2 hours',
      entryFee: 'SGD 32 (Observation Deck)',
      bestTimeToVisit: '7:30 PM for Spectra Light & Water show view',
      coordinates: { lat: 1.2838, lng: 103.8591 }
    }
  }
];

/**
 * Extract simple EXIF tags or filename cues
 */
function extractFilenameCues(filename: string): string[] {
  return filename
    .toLowerCase()
    .replace(/[._-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
}

function readFileAsDataUrl(file: File): Promise<{ base64: string; mimeType: string } | null> {
  if (typeof FileReader === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const match = result.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        resolve({ mimeType: match[1], base64: match[2] });
      } else {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

async function callLiveVisionApi(
  fileOrBase64: File | string,
  optionalPrompt?: string
): Promise<VisualScanResult | null> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return null;

  let base64 = '';
  let mimeType = 'image/jpeg';

  if (typeof fileOrBase64 === 'string') {
    const match = fileOrBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!match || match[2].length < 64) return null;
    mimeType = match[1];
    base64 = match[2];
  } else {
    if (fileOrBase64.size < 64) return null;
    const encoded = await readFileAsDataUrl(fileOrBase64);
    if (!encoded) return null;
    base64 = encoded.base64;
    mimeType = encoded.mimeType;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14_000);
  try {
    const res = await fetch(resolveApiUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'vision',
        query: optionalPrompt?.trim() || 'Identify this travel photo (landmark, dish, or booking document).',
        imageBase64: base64,
        mimeType
      }),
      signal: controller.signal
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (data?.ok && data.scanResult && typeof data.scanResult.type === 'string') {
      const scan = data.scanResult;
      if (scan.type === 'landmark' || scan.type === 'ticket' || scan.type === 'food') {
        return { ...scan, source: 'live_vision' } as VisualScanResult;
      }
      if (scan.type === 'unverified') {
        return {
          type: 'unverified',
          title: scan.title || 'Photo Requires More Context',
          guidance: scan.guidance || 'Add a short note naming the landmark, dish, or city so I can look it up accurately.',
          reason: 'unrecognized_image'
        };
      }
    }
  } catch {
    // Fall through cleanly when offline or server vision is unconfigured
  } finally {
    clearTimeout(timeout);
  }
  return null;
}

/**
 * Analyze an uploaded image using live multimodal Vision AI first.
 * Never fabricates fake PNRs, fake ticket details, or fake landmark identifications when offline.
 */
export async function scanTravelImage(
  fileOrBase64: File | string,
  optionalPrompt?: string
): Promise<VisualScanResult> {
  // 1. Live Multimodal Vision API (Gemini 2.0 Flash / Vision LLM via /api/chat)
  const liveVisionResult = await callLiveVisionApi(fileOrBase64, optionalPrompt);
  if (liveVisionResult) {
    return liveVisionResult;
  }

  // 2. Honest local fallback when offline / vision model unconfigured:
  // Only match explicit landmark or cuisine keywords typed by the user; NEVER fabricate fake ticket PNRs or unknown landmarks!
  const filename = typeof fileOrBase64 !== 'string' ? fileOrBase64.name : '';
  const combinedText = `${filename} ${optionalPrompt || ''}`.toLowerCase();
  const cues = extractFilenameCues(combinedText);

  // Never invent fake boarding pass PNRs, seat numbers, routes, or fares!
  const isTicketPrompt = cues.some(c => ['ticket', 'boarding', 'flight', 'pnr', 'airline', 'booking', 'pass', 'indigo', 'emirates', 'airindia', 'hotel'].includes(c));
  if (isTicketPrompt) {
    return {
      type: 'unverified',
      title: 'Live Boarding Pass OCR Unavailable',
      guidance: 'Live optical ticket scanning requires the Vision AI gateway. TripVerse will never fabricate a fake PNR, seat number, or fare — please paste your booking reference or route details directly in chat.',
      reason: 'vision_unavailable'
    };
  }

  // Explicit landmark match from user prompt / descriptive filename
  for (const item of KNOWN_LANDMARKS) {
    if (item.keywords.some(k => cues.includes(k) || (optionalPrompt && optionalPrompt.toLowerCase().includes(k)))) {
      return {
        ...item.data,
        source: 'prompt_match'
      };
    }
  }

  // Explicit dish match only if a specific dish keyword was actually mentioned
  if (cues.includes('ramen')) {
    return {
      type: 'food',
      dishName: 'Tonkotsu Ramen',
      cuisine: 'Japanese',
      region: 'Fukuoka, Japan',
      description: 'Slow-simmered pork or rich broth noodle bowl traditionally served with wheat noodles, scallions, and toppings.',
      dietaryTags: ['Noodle Soup', 'Regional Classic'],
      averagePrice: '¥900–¥1,300',
      flavorProfile: 'Rich, savory, umami-forward',
      source: 'prompt_match'
    };
  }
  if (cues.includes('biryani')) {
    return {
      type: 'food',
      dishName: 'Hyderabadi / Awadhi Dum Biryani',
      cuisine: 'Indian',
      region: 'Hyderabad & Lucknow, India',
      description: 'Long-grain basmati rice slow-cooked under sealed dum with saffron, caramelized onions, and whole spices.',
      dietaryTags: ['Spiced Rice', 'Regional Classic'],
      averagePrice: '₹280–₹480',
      flavorProfile: 'Aromatic, saffron-infused, layered spice',
      source: 'prompt_match'
    };
  }

  // 3. Honest unverified response (zero fabricated "Discovered Scenic Landmark" with fake 89% confidence)
  return {
    type: 'unverified',
    title: 'Visual Recognition Needs Live Vision AI or a Hint',
    guidance: 'Live visual analysis is unavailable for this image right now. Tell me the landmark, dish, or city name in your message and I will pull genuine historical facts, entry info, and add it to your itinerary.',
    reason: 'vision_unavailable'
  };
}
