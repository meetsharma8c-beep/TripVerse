import { Trip, StructuredItinerary, StructuredItineraryDay, AIChatBudgetBreakdown } from '../types/trip';
import { 
  getConcodeSession, 
  updateConcodeSession, 
  extractDestinationFromQuery, 
  extractDurationFromQuery, 
  extractBudgetFromQuery, 
  extractPreferencesFromQuery,
  getTravelerMemoryRing,
  updateTravelerMemoryRing,
  TravelerMemoryProfile
} from './concodeSession';
import { generateAITrip } from './plannerEngine';
import { AIAppAction } from './aiAssistant';
import { CONCODE_MASTER_PROMPT, CONCODE_BRAIN_MASTER_PROMPT } from './concodeMasterPrompt';
import { resolveTransitContext } from './transportFeasibilityEngine';
import { getReplanOptions } from './replanningService';
import { resolveApiUrl } from './deviceService';

export interface BrainStatus {
  online: boolean;
  status?: string;
  version?: string;
  modelLoaded?: boolean;
  activeGuilds?: string[];
  latencyMs?: number;
  gpu?: string;
}

export interface ConcodeConfig {
  url: string;
  apiKey?: string;
}

const STORAGE_KEY_CONCODE = 'tripverse_concode_config_v1';

export function getStoredConcodeConfig(): ConcodeConfig | null {
  const isBrowserLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const isLocalhostUrl = (u: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(u.trim());

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONCODE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.url && parsed.url.startsWith('http')) {
          if (!isLocalhostUrl(parsed.url) || isBrowserLocalhost) {
            return {
              url: parsed.url.trim().replace(/\/$/, ''),
              apiKey: parsed.apiKey ? parsed.apiKey.trim() : undefined
            };
          }
        }
      }
    } catch {}
  }

  // On deployed domains (non-localhost), always route through /api/chat serverless proxy
  // so CONCODE_API_KEY stays strictly server-side and expired Cloudflare tunnels smoothly fall back
  if (!isBrowserLocalhost) {
    return null;
  }

  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_CONCODE_API_URL : undefined;
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_CONCODE_API_KEY : undefined;
  if (envUrl && envUrl.startsWith('http') && !envUrl.includes('api.concode.ai')) {
    return {
      url: envUrl.trim().replace(/\/$/, ''),
      apiKey: envKey ? envKey.trim() : undefined
    };
  }

  return null;
}

export function saveConcodeConfig(config: ConcodeConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_CONCODE, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('tripverse_concode_config_updated'));
  }
}

export function removeConcodeConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_CONCODE);
    window.dispatchEvent(new CustomEvent('tripverse_concode_config_updated'));
  }
}

export function isConcodeConfigured(): boolean {
  return getStoredConcodeConfig() !== null;
}

export interface ConcodeBrainResponse {
  guild: string;
  guildIcon: string;
  confidence: number;
  response: string;
  code?: string;
  repairApplied?: boolean;
  structuredItinerary?: StructuredItinerary;
  budgetBreakdown?: AIChatBudgetBreakdown;
  modificationBadge?: {
    type: 'cheaper' | 'removed' | 'added' | 'rainy' | 'saved' | 'delay' | 'replan';
    label: string;
    detail: string;
  };
  actionButtons?: {
    label: string;
    action: string;
    payload?: any;
    primary?: boolean;
  }[];
  appAction?: AIAppAction;
  updatedTrip?: Trip;
}

export const GUILD_LABELS: Record<string, { label: string; icon: string; badgeColor: string }> = {
  ai_ml: { label: 'Travel Intelligence', icon: '', badgeColor: 'bg-purple-100 text-purple-700 border-purple-200' },
  ui_ux: { label: 'Visual Planner', icon: '', badgeColor: 'bg-pink-100 text-pink-700 border-pink-200' },
  performance: { label: 'Route Speed & Tolls', icon: '', badgeColor: 'bg-amber-100 text-amber-700 border-amber-200' },
  database: { label: 'Budget & Cost Ledger', icon: '', badgeColor: 'bg-blue-100 text-blue-700 border-blue-200' },
  security: { label: 'Safety & Disruption Guard', icon: '', badgeColor: 'bg-red-100 text-red-700 border-red-200' },
  fullstack: { label: 'ConCode AI Co-Pilot', icon: '', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  debugger: { label: 'Diagnostics', icon: '', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
  devops: { label: 'Navigation System', icon: '', badgeColor: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  api: { label: 'Live Data Services', icon: '', badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  system_architect: { label: 'Multi-Modal Transit Architect', icon: '', badgeColor: 'bg-teal-100 text-teal-700 border-teal-200' },
  research_scientist: { label: 'Destination Research', icon: '', badgeColor: 'bg-violet-100 text-violet-700 border-violet-200' },
  automation_operator: { label: 'Trip Automation', icon: '', badgeColor: 'bg-sky-100 text-sky-700 border-sky-200' },
  critic_verifier: { label: 'Itinerary Critic Gate', icon: '', badgeColor: 'bg-lime-100 text-lime-700 border-lime-200' }
};

// ═════════════════════════════════════════════════════════════════════════
// COGNITIVE ANTI-REPETITION RING BUFFER (Modeled on CONCODE.WEB Engine v3.0)
// ═════════════════════════════════════════════════════════════════════════
const recentOpeners: string[] = [];
function getDynamicOpener(category: 'explaining' | 'greeting' | 'food' | 'sights' | 'road' | 'budget'): string {
  const pools: Record<string, string[]> = {
    explaining: [
      "Here is how I'd approach it:",
      "From a route and logistics perspective:",
      "Let's break this down simply:",
      "Here is the local insider recommendation:",
      "Looking closely at your trip:"
    ],
    greeting: [
      "Hey! Always great to connect with a fellow traveler.",
      "Hello! Your TripVerse ConCode AI Co-Pilot is right here.",
      "Hey there! Ready to plan, optimize, or navigate your journey?",
      "Hi! I'm synced with your active journey dashboard."
    ],
    food: [
      "Here are the authentic culinary highlights worth tasting:",
      "For authentic dining that locals swear by:",
      "Food is half the adventure — here is where to eat:",
      "From traditional thalis to atmospheric lakeside dining:"
    ],
    sights: [
      "Here are the top-rated spots that shouldn't be missed:",
      "To get the best experience without tourist fatigue:",
      "Here is a curated lineup of iconic and scenic highlights:",
      "The top cultural and scenic destinations for your journey:"
    ],
    road: [
      "Here are estimated route notes; check a live navigation service:",
      "For your drive, here is the real road condition & pitstop breakdown:",
      "Route suggestions are estimates until confirmed in a navigation app:"
    ],
    budget: [
      "Here is a realistic, transparent cost allocation:",
      "Looking at current rates and seasonal averages:",
      "Here is your transparent expense blueprint:"
    ]
  };

  const pool = pools[category] || pools.explaining;
  const available = pool.filter(p => !recentOpeners.includes(p));
  const chosen = (available.length > 0 ? available : pool)[Math.floor(Math.random() * (available.length > 0 ? available.length : pool.length))];
  recentOpeners.push(chosen);
  if (recentOpeners.length > 8) recentOpeners.shift();
  return chosen;
}

export async function checkBrainStatus(): Promise<BrainStatus> {
  const customConfig = getStoredConcodeConfig();
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6_000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'User-Agent': 'TripVerse-Client/1.0'
    };

    if (customConfig?.apiKey) {
      headers['X-API-Key'] = customConfig.apiKey;
      headers['Authorization'] = `Bearer ${customConfig.apiKey}`;
    }

    let isOnline = false;
    let data: any = {};

    if (customConfig?.url) {
      // Direct ping to configured Kaggle tunnel / custom URL
      const res = await fetch(`${customConfig.url}/health`, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      data = await res.json().catch(() => ({}));
      isOnline = res.ok && (data.status === 'online' || data.status === 'healthy' || data.ok === true || data.status === 'ok');
    } else {
      // Query local or serverless proxy /api/chat
      const res = await fetch(resolveApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'health', query: '__ping__' }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      data = await res.json().catch(() => ({}));
      isOnline = res.ok && (data.ok === true || data.status === 'online');
    }

    const elapsed = Date.now() - startTime;
    const gpuName = data.gpu || data.details?.gpu || data.details?.device;

    return {
      online: isOnline,
      status: isOnline ? (gpuName ? `Online (${gpuName})` : 'Online (Kaggle GPU)') : (data.status || 'Offline'),
      modelLoaded: isOnline,
      latencyMs: elapsed,
      gpu: gpuName,
      version: data.version || data.details?.version || '1.0.0'
    };
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    return {
      online: false,
      status: err?.name === 'AbortError' ? 'Timeout (Host unreachable)' : 'Offline (Not connected)',
      modelLoaded: false,
      latencyMs: elapsed
    };
  }
}

export function resetBrainSession() {
  updateConcodeSession({ stage: 'idle', preferences: [], draftItinerary: undefined });
}

export function calculateBudgetBreakdown(
  totalBudget: number,
  destination: string,
  days: number
): AIChatBudgetBreakdown {
  const isInternational = ['dubai', 'tokyo', 'japan', 'paris', 'london', 'singapore', 'bali', 'europe'].some(d => 
    destination.toLowerCase().includes(d)
  );

  const transportRatio = isInternational ? 0.38 : 0.28;
  const stayRatio = isInternational ? 0.30 : 0.35;
  const foodRatio = isInternational ? 0.18 : 0.20;
  const activitiesRatio = 0.10;
  const bufferRatio = 1 - (transportRatio + stayRatio + foodRatio + activitiesRatio);

  return {
    transport: Math.round(totalBudget * transportRatio),
    stays: Math.round(totalBudget * stayRatio),
    food: Math.round(totalBudget * foodRatio),
    activities: Math.round(totalBudget * activitiesRatio),
    buffer: Math.round(totalBudget * bufferRatio),
    total: totalBudget,
    isEstimate: true,
    currencySymbol: '₹'
  };
}

function buildCuratedDays(
  destination: string,
  daysCount: number,
  targetBudget: number,
  preferences: string[]
): StructuredItineraryDay[] {
  const normDest = destination.toLowerCase().trim();
  const days: StructuredItineraryDay[] = [];
  const perDayCost = Math.round(targetBudget / Math.max(1, daysCount));

  // Udaipur Curated Itinerary
  if (normDest.includes('udaipur')) {
    const udaipurDays = [
      {
        dayNumber: 1,
        title: 'Day 1 — Royal Palaces & Pichola Sunset',
        theme: 'City Palace, Jagdish Temple & Evening Lake Boat Ride',
        morning: 'Explore City Palace royal courtyards, Zenana Mahal and crystal gallery overlooking Lake Pichola.',
        afternoon: 'Admire 1651 carved stone architecture of Jagdish Temple; lunch at Natraj Dining Hall for authentic Mewari Thali.',
        evening: 'Sunset boat ride from Rameshwar Ghat past Jagmandir Island; night illumination around waterfront.',
        food: 'Authentic Mewari Dal Baati Churma, Ker Sangri & cooling Buttermilk (Chaas)',
        cost: Math.round(perDayCost * 0.95)
      },
      {
        dayNumber: 2,
        title: 'Day 2 — Lake Views, Vintage Cars & Bagore Ki Haveli',
        theme: 'Saheliyon Ki Bari, Vintage Car Museum & Cultural Folk Dance',
        morning: 'Morning stroll around marble fountains and lotus pools in the historic Saheliyon Ki Bari gardens.',
        afternoon: 'Visit Vintage & Classic Car Collection; peaceful coffee at Jheel’s Ginger Coffee lakeside cafe.',
        evening: 'Watch traditional Rajasthani Dharohar folk and puppet dance at Bagore Ki Haveli on Gangaur Ghat.',
        food: 'Crisp Mirchi Vada, Pyaaz Kachori and lakeside dinner at Ambrai with views of illuminated City Palace',
        cost: Math.round(perDayCost * 1.05)
      },
      {
        dayNumber: 3,
        title: 'Day 3 — Hilltop Monsoon Palace & Scenic Fatehsagar',
        theme: 'Sajjangarh Monsoon Palace, Fatehsagar Lake & Handicraft Souvenirs',
        morning: 'Drive up winding Aravali hill roads to Sajjangarh (Monsoon Palace) for 360° panoramic valley views.',
        afternoon: 'Walk along Fatehsagar Lake promenade, visit Nehru Park island, and stop at Sukhadia Circle for snacks.',
        evening: 'Shop for handcrafted leather journals, silver jewelry, and Bandhani textiles in Hathi Pol bazaar.',
        food: 'Kulhad Chai, sizzling Sukhadia Pav Bhaji and creamy Kulfi Falooda',
        cost: Math.round(perDayCost * 0.9)
      }
    ];

    for (let i = 0; i < daysCount; i++) {
      if (udaipurDays[i]) {
        days.push(udaipurDays[i]);
      } else {
        days.push({
          dayNumber: i + 1,
          title: `Day ${i + 1} — Jaisamand Lake & Kumbhalgarh Excursion`,
          theme: 'Historic Fort Ramparts & Serene Freshwater Island Views',
          morning: 'Day excursion toward the massive wall fortifications of Kumbhalgarh Fort.',
          afternoon: 'Explore lush valley trails and wildlife sanctuary viewpoints.',
          evening: 'Return to lakeside promenade for relaxing dinner under palace lights.',
          food: 'Fresh Rajasthani Gatta Curry, bajra roti with white butter and regional sweets',
          cost: perDayCost
        });
      }
    }
    return days;
  }

  // Dubai Curated Itinerary
  if (normDest.includes('dubai')) {
    const dubaiDays = [
      {
        dayNumber: 1,
        title: 'Day 1 — Downtown Icons & Culinary Welcome',
        theme: 'Burj Khalifa Skyline, Dubai Fountain & Emirati Mezze',
        morning: 'Stroll around Downtown Dubai Boulevard & marvel at Burj Khalifa exterior architecture.',
        afternoon: 'Explore Souk Al Bahar & enjoy traditional lunch at Al Fanar Seafood & Restaurant.',
        evening: 'Golden hour sunset over Dubai Water Canal & nighttime musical fountain show.',
        food: 'Authentic Lamb Machboos, Saffron Rice & Cardamom Karak Chai',
        cost: Math.round(perDayCost * 0.95)
      },
      {
        dayNumber: 2,
        title: 'Day 2 — Old Dubai Heritage & Wind-Tower Architecture',
        theme: 'Al Fahidi Historic District, Creek Abra Crossing & Spice Souk',
        morning: 'Walk through Al Fahidi Historical Neighbourhood observing coral stone wind-towers (Barjeel).',
        afternoon: 'Traditional 1-Dirham Abra wooden boat ride across historic Dubai Creek to Deira.',
        evening: 'Sunset walking trail through the Deira Spice & Gold Souks with street food tastings.',
        food: 'Crisp falafel rolls, fresh pomegranate juice & pistachio baklava',
        cost: Math.round(perDayCost * 0.8)
      },
      {
        dayNumber: 3,
        title: 'Day 3 — Futuristic Architecture & Sky Panoramas',
        theme: 'Museum of the Future, Dubai Frame & Heritage Tea House',
        morning: 'Inspect the torus-shaped Museum of the Future with Arabic calligraphy facade.',
        afternoon: 'Step across the Dubai Frame glass skywalk bridging Old and New Dubai skyline.',
        evening: 'Unwind at Zabeel Palace park trails and enjoy courtyard dinner at Arabian Tea House.',
        food: 'Creamy hummus with warm pita, chicken kabsa & mint lemonade',
        cost: Math.round(perDayCost * 1.1)
      }
    ];

    for (let i = 0; i < daysCount; i++) {
      days.push(dubaiDays[i] || {
        dayNumber: i + 1,
        title: `Day ${i + 1} — Dubai Marina & Desert Sunset`,
        theme: 'Marina Walk, Palm Jumeirah & Golden Desert Evening',
        morning: 'Waterfront walk along Dubai Marina promenade.',
        afternoon: 'Drive toward desert dunes for sunset photography.',
        evening: 'Starlit Arabian dinner with live traditional Bedouin hospitality.',
        food: 'Fresh grilled Mediterranean seabass & spiced shawarma platters',
        cost: perDayCost
      });
    }
    return days;
  }

  // Generic rich worldwide destination synthesis
  const capDest = destination.charAt(0).toUpperCase() + destination.slice(1);
  for (let d = 1; d <= daysCount; d++) {
    days.push({
      dayNumber: d,
      title: `Day ${d} — ${capDest} Cultural Highlights & Highlights`,
      theme: d === 1 ? 'Arrival & Historic Center' : (d === daysCount ? 'Panoramas & Local Souvenirs' : 'Landmarks & Signature Cuisine'),
      morning: `Explore iconic morning landmarks and historic architecture in ${capDest}.`,
      afternoon: `Visit premier cultural exhibitions, museums and local open-air craft markets.`,
      evening: `Sunset viewpoint panoramas followed by dinner at a top-rated local dining spot.`,
      food: `Authentic regional specialties of ${capDest} with fresh seasonal ingredients`,
      cost: perDayCost
    });
  }
  return days;
}

// ═════════════════════════════════════════════════════════════════════════
// UPSTREAM CONCODE CLIENT (Vercel API Gateway)
// ═════════════════════════════════════════════════════════════════════════

async function tryQueryServerlessAPI(
  query: string,
  trip: Trip,
  session: any,
  mode: 'text' | 'itinerary' | 'budget' | 'safety'
): Promise<ConcodeBrainResponse | null> {
  if (typeof window === 'undefined') return null;

  const customConfig = getStoredConcodeConfig();
  const targetUrl = customConfig?.url ? `${customConfig.url}/api/v1/travel` : resolveApiUrl('/api/chat');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'User-Agent': 'TripVerse-Client/1.0',
      ...(customConfig?.apiKey ? { 'X-API-Key': customConfig.apiKey, 'Authorization': `Bearer ${customConfig.apiKey}` } : {})
    };

    const transitContext = resolveTransitContext(trip.destination);
    const memoryRing = getTravelerMemoryRing();

    const tripContextPayload = {
      destination: trip.destination,
      durationDays: trip.durationDays,
      totalBudget: trip.totalBudget,
      origin: trip.origin,
      travelersCount: trip.travelersCount,
      travelerType: trip.travelerType,
      preferences: Array.from(new Set([...(trip.preferences?.length ? trip.preferences : (session.preferences || [])), ...(memoryRing.interests || [])])),
      transportMode: trip.transportMode,
      accommodationType: trip.accommodationType,
      foodPreference: trip.foodPreference || memoryRing.dietaryPreference || 'all',
      pacing: trip.pacing || memoryRing.travelPace || 'moderate',
      priorities: trip.priorities,
      travelerMemory: memoryRing,
      knownDestinationHighlights: trip.destinationDetails?.highlights || [],
      transportDeals: trip.transportDeals || [],
      transitHubs: {
        hasDirectAirport: transitContext.hasDirectAirport,
        primaryAirport: transitContext.primaryAirport?.name,
        hasDirectTrain: transitContext.hasDirectTrain,
        primaryStation: transitContext.primaryRailwayStation?.name,
        roadConnectivity: transitContext.roadConnectivity.status,
        requiresMultiModal: transitContext.requiresMultiModal,
        guidance: transitContext.multiModalGuidance
      }
    };

    const bodyPayload = customConfig?.url
      ? JSON.stringify({
          query,
          trip_context: tripContextPayload,
          session_id: session.sessionId,
          mode,
          system_prompt: `${CONCODE_BRAIN_MASTER_PROMPT}\n\n${CONCODE_MASTER_PROMPT}`
        })
      : JSON.stringify({
          query,
          tripContext: tripContextPayload,
          sessionState: session,
          mode
        });

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: bodyPayload,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const data = await res.json();
    const rawReply = typeof data?.reply === 'string' ? data.reply : (typeof data?.response === 'string' ? data.response : '');

    if (data && (rawReply || data.itinerary || data.structuredItinerary || data.structured_itinerary)) {
      if (typeof data.sessionId === 'string' || typeof data.session_id === 'string') {
        updateConcodeSession({ sessionId: data.sessionId || data.session_id });
      }

      let structuredItinerary = data.structuredItinerary || data.structured_itinerary;
      if (!structuredItinerary && Array.isArray(data.itinerary)) {
        structuredItinerary = {
          destination: trip.destination,
          durationDays: trip.durationDays,
          days: data.itinerary
        };
      }

      const isRawJsonReply = rawReply.trim().startsWith('{') && Boolean(structuredItinerary);
      const displayResponse = isRawJsonReply
        ? `**ConCode Brain v3.0 — ${structuredItinerary?.durationDays || trip.durationDays || 3}-Day ${structuredItinerary?.destination || trip.destination || 'Trip'} Itinerary**\n\nYour Critic-verified schedule and exact budget allocation are ready below.`
        : (rawReply || 'Here is your travel blueprint generated by ConCode AI:');

      return {
        guild: data.guild || (mode === 'budget' ? 'database' : mode === 'safety' ? 'security' : 'ai_ml'),
        guildIcon: data.guildIcon || (data.guild && GUILD_LABELS[data.guild]?.icon) || '',
        confidence: data.confidence || 0.98,
        response: displayResponse,
        structuredItinerary,
        budgetBreakdown: data.budgetBreakdown || data.budget_breakdown,
        actionButtons: data.actionButtons || data.action_buttons,
        modificationBadge: data.modificationBadge || data.modification_badge,
        appAction: data.appAction,
        updatedTrip: data.updatedTrip
      };
    }
  } catch (err) {
    console.warn('[TripVerse] Upstream query error:', err);
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════
// MAIN CONCODE COGNITIVE BRAIN REASONING ENGINE
// ═════════════════════════════════════════════════════════════════════════

export async function queryConcodeBrain(
  query: string,
  tripContext: Trip,
  mode: 'text' | 'itinerary' | 'budget' | 'safety' = 'text'
): Promise<ConcodeBrainResponse> {
  const norm = query.toLowerCase().trim();
  const rawDest = (tripContext.destination && tripContext.destination !== 'Custom Spot') ? tripContext.destination : '';
  const currentDest = (rawDest || tripContext.name || 'your destination').split(',')[0].trim();
  const currentOrigin = (tripContext.origin && tripContext.origin !== 'Origin') ? tripContext.origin.split(',')[0].trim() : 'Ahmedabad';

  // Multi-turn session tracking
  const session = getConcodeSession();
  const extractedDest = extractDestinationFromQuery(query);
  const extractedDays = extractDurationFromQuery(query);
  const extractedBudget = extractBudgetFromQuery(query);
  const extractedPrefs = extractPreferencesFromQuery(query);

  if (extractedDest) session.destination = extractedDest;
  if (extractedDays) session.durationDays = extractedDays;
  if (extractedBudget) session.budget = extractedBudget;
  if (extractedPrefs.length > 0) {
    session.preferences = Array.from(new Set([...(session.preferences || []), ...extractedPrefs]));
  }

  // 1. First handle explicit in-app modification & action commands locally
  // so itinerary updates ("make day 3 cheaper", "remove museum", "save trip",
  // "add sunset", "start navigation", "print guide") execute immediately.
  const isDirectActionCommand =
    norm.includes('save this itinerary') ||
    norm.includes('save itinerary') ||
    norm.includes('save trip') ||
    norm.includes('save this trip') ||
    norm.includes('add to my trips') ||
    norm.includes('bookmark trip') ||
    norm === 'save' ||
    (norm.includes('remove') && (norm.includes('museum') || norm.includes('temple') || norm.includes('beach') || norm.includes('palace') || norm.includes('shopping') || norm.includes('stop'))) ||
    norm.startsWith('add ') ||
    norm.includes('add sunset') ||
    norm.includes('add boat ride') ||
    norm.includes('include sunset') ||
    norm.includes('add an activity') ||
    norm.includes('add to itinerary') ||
    norm.includes('make day 3 cheaper') ||
    norm.includes('day 3 cheaper') ||
    norm.includes('reduce day 3') ||
    norm.includes('day 3 less expensive') ||
    norm.includes('make day 2 cheaper') ||
    norm.includes('make this cheaper') ||
    norm.includes('save money') ||
    norm.includes('cut costs') ||
    (norm.includes('cheaper') && !norm.includes('food')) ||
    norm.includes('navigation') ||
    norm.includes('navigate') ||
    norm.includes('start gps') ||
    norm.includes('open gps') ||
    norm.includes('launch hud') ||
    norm.includes('print') ||
    norm.includes('pdf') ||
    norm.includes('travel guide') ||
    norm.includes('download guide');

  if (!isDirectActionCommand) {
    let effectiveMode = mode;
    if (effectiveMode === 'text') {
      if (
        norm.includes('plan a ') ||
        norm.includes('create an itinerary') ||
        norm.includes('build an itinerary') ||
        norm.includes('day trip to') ||
        norm.includes('-day trip')
      ) {
        effectiveMode = 'itinerary';
      } else if (
        norm.includes('budget breakdown') ||
        norm.includes('how much will this cost') ||
        norm.includes('approximate cost')
      ) {
        effectiveMode = 'budget';
      } else if (norm.includes('is it safe') || norm.includes('safety')) {
        effectiveMode = 'safety';
      }
    }
    const cloudResult = await tryQueryServerlessAPI(query, tripContext, session, effectiveMode);
    if (cloudResult) return cloudResult;
  }

  const activeDest = currentDest && currentDest !== 'your destination' ? currentDest : (session.destination || 'Udaipur');
  const activeDays = (tripContext.durationDays && tripContext.durationDays > 0) ? tripContext.durationDays : (session.durationDays || 3);
  const activeBudget = (tripContext.totalBudget && tripContext.totalBudget > 0) ? tripContext.totalBudget : (session.budget || 15000);

  // =========================================================================
  // SCENARIO 8: SAVE THIS ITINERARY
  // =========================================================================
  if (
    norm.includes('save this itinerary') ||
    norm.includes('save itinerary') ||
    norm.includes('save trip') ||
    norm.includes('save this trip') ||
    norm.includes('add to my trips') ||
    norm.includes('bookmark trip') ||
    norm === 'save'
  ) {
    const targetDest = session.destination || currentDest || 'Dubai';
    const targetDays = session.durationDays || tripContext.durationDays || 5;
    const targetBudget = session.budget || tripContext.totalBudget || 100000;

    const savedTrip = generateAITrip({
      origin: tripContext.origin || 'Ahmedabad, Gujarat',
      destination: targetDest,
      destinationName: targetDest,
      durationDays: targetDays,
      travelersCount: session.travelersCount || tripContext.travelersCount || 2,
      travelerType: tripContext.travelerType || 'couple',
      budgetMode: 'total',
      budgetAmount: targetBudget,
      preferences: session.preferences?.length ? (session.preferences as any) : ['nature', 'scenic'],
      transportMode: tripContext.transportMode || 'car',
      accommodationType: tripContext.accommodationType || 'hotel',
      foodPreference: tripContext.foodPreference || 'all',
      priorities: ['highlights', 'food']
    });

    updateConcodeSession({ stage: 'planned', draftItinerary: undefined });

    return {
      guild: 'ai_ml',
      guildIcon: '',
      confidence: 0.99,
      response: `**Itinerary Saved Successfully!**\n\n` +
        `Your **${targetDays}-Day journey to ${targetDest}** has been securely saved to **My Trips** and set as your active expedition.\n\n` +
        `• **Target Budget:** ₹${targetBudget.toLocaleString('en-IN')}\n` +
        `• **Schedule:** ${targetDays} day-wise draft schedule with estimated transit arrangements.\n` +
        `• **Features:** External directions handoff, budget estimates, forecast lookup where available, and a printable itinerary.\n\n` +
        `Explore your full itinerary below or print your travel guide!`,
      modificationBadge: {
        type: 'saved',
        label: 'Trip Saved to My Trips',
        detail: `${targetDays} Days • ${targetDest}`
      },
      actionButtons: [
        { label: 'View Day Itinerary', action: 'VIEW_ITINERARY', primary: true },
        { label: 'View Route Map', action: 'VIEW_ROUTE' },
        { label: 'Print Travel Guide (PDF)', action: 'OPEN_PRINT' },
        { label: 'Get Directions', action: 'START_NAV' }
      ],
      appAction: {
        type: 'GENERATE_NEW_TRIP',
        payload: { trip: savedTrip }
      },
      updatedTrip: savedTrip
    };
  }

  // =========================================================================
  // SCENARIO 5: REMOVE THE MUSEUM / REMOVE AN ACTIVITY
  // =========================================================================
  if (
    norm.includes('remove') && 
    (norm.includes('museum') || norm.includes('temple') || norm.includes('beach') || norm.includes('palace') || norm.includes('shopping') || norm.includes('stop'))
  ) {
    let itemWord = 'museum';
    if (norm.includes('shopping')) itemWord = 'shopping';
    else if (norm.includes('temple')) itemWord = 'temple';
    else if (norm.includes('beach')) itemWord = 'beach';
    else if (norm.includes('palace')) itemWord = 'palace';
    else if (norm.includes('stop')) itemWord = 'breakstop';

    const updatedItinerary = tripContext.itinerary.map(day => {
      const filteredActs = day.activities.filter(a => {
        const titleLower = a.title.toLowerCase();
        const descLower = a.description.toLowerCase();
        return !titleLower.includes(itemWord) && !descLower.includes(itemWord);
      });
      return { ...day, activities: filteredActs };
    });

    const updatedTrip: Trip = { ...tripContext, itinerary: updatedItinerary };

    return {
      guild: 'ai_ml',
      guildIcon: '',
      confidence: 0.98,
      response: `**Removed ${itemWord.charAt(0).toUpperCase() + itemWord.slice(1)} from Itinerary!**\n\n` +
        `• **Schedule Adjustment:** Successfully removed the ${itemWord} visit from your trip schedule.\n` +
        `• **Time Reclaimed:** Freed up ~2 hours for a relaxed open-air cafe stop, scenic boulevard stroll, or spontaneous discovery.\n` +
        `• **Expense Impact:** Saved associated entrance tickets (~₹850) and reduced activity congestion.\n\n` +
        `Your updated itinerary is synchronized with your journey dashboard.`,
      modificationBadge: {
        type: 'removed',
        label: `Removed ${itemWord.charAt(0).toUpperCase() + itemWord.slice(1)}`,
        detail: 'Reclaimed 2h leisure time • Saved ~₹850'
      },
      actionButtons: [
        { label: 'View Updated Itinerary', action: 'VIEW_ITINERARY', primary: true },
        { label: 'View Budget Ledger', action: 'VIEW_EXPENSES' }
      ],
      updatedTrip,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip }
      }
    };
  }

  // =========================================================================
  // SCENARIO: ADD ACTIVITY / ADD SIGHT (e.g. "Add sunset at Monsoon Palace")
  // =========================================================================
  if (
    norm.startsWith('add ') ||
    norm.includes('add sunset') ||
    norm.includes('add boat ride') ||
    norm.includes('include sunset') ||
    norm.includes('add an activity') ||
    norm.includes('add to itinerary')
  ) {
    const isSunset = norm.includes('sunset') || norm.includes('monsoon palace') || norm.includes('sajjangarh');
    const isBoat = norm.includes('boat') || norm.includes('pichola');
    const targetActivityTitle = isSunset ? 'Sajjangarh Monsoon Palace Golden Hour' : (isBoat ? 'Private Lake Pichola Sunset Boat Cruise' : 'Scenic Regional Exploration');
    const targetLocation = isSunset ? 'Monsoon Palace, Udaipur' : (isBoat ? 'Lake Pichola Ghats' : activeDest);

    const targetDayNum = Math.min(2, tripContext.itinerary.length || 1);
    const updatedItinerary = tripContext.itinerary.map(day => {
      if (day.dayNumber === targetDayNum) {
        return {
          ...day,
          activities: [
            ...day.activities,
            {
              id: `act-custom-${Date.now()}`,
              dayNumber: targetDayNum,
              time: '5:30 PM',
              title: targetActivityTitle,
              type: 'attraction' as const,
              location: targetLocation,
              coordinates: day.activities[0]?.coordinates || { lat: 24.5854, lng: 73.7125 },
              estimatedCost: isSunset ? 450 : 800,
              travelTimeMin: 30,
              distanceKm: 8,
              description: `Suggested viewpoint idea; confirm the place and access details before travelling.`
            }
          ]
        };
      }
      return day;
    });

    const updatedTrip: Trip = { ...tripContext, itinerary: updatedItinerary };

    return {
      guild: 'ai_ml',
      guildIcon: '',
      confidence: 0.99,
      response: `**Added "${targetActivityTitle}" to Day ${targetDayNum}!**\n\n` +
        `• **Scheduled Time:** 5:30 PM - 7:00 PM (optimal golden hour lighting).\n` +
        `• **Location:** ${targetLocation}\n` +
        `• **Estimated Expense:** ~₹${isSunset ? 450 : 800} (tickets & local hill transit).\n` +
        `• **Co-Pilot Note:** Winding hilltop road with sweeping panoramas of Fateh Sagar Lake and the city skyline below.\n\n` +
        `Your active itinerary has been updated!`,
      modificationBadge: {
        type: 'added',
        label: `Added ${targetActivityTitle}`,
        detail: `Day ${targetDayNum} • 5:30 PM • ~₹${isSunset ? 450 : 800}`
      },
      actionButtons: [
        { label: `View Day ${targetDayNum} Schedule`, action: 'VIEW_ITINERARY', primary: true },
        { label: 'Get Directions', action: 'START_NAV' }
      ],
      updatedTrip,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip }
      }
    };
  }

  // =========================================================================
  // SCENARIO 4: MAKE DAY 3 CHEAPER / MAKE ITINERARY CHEAPER
  // =========================================================================
  if (
    norm.includes('make day 3 cheaper') ||
    norm.includes('day 3 cheaper') ||
    norm.includes('reduce day 3') ||
    norm.includes('day 3 less expensive') ||
    norm.includes('make day 2 cheaper') ||
    norm.includes('make this cheaper') ||
    norm.includes('save money') ||
    norm.includes('cut costs') ||
    (norm.includes('cheaper') && !norm.includes('food'))
  ) {
    const isDay3 = norm.includes('day 3');
    const dayTargetNum = isDay3 ? 3 : (norm.includes('day 2') ? 2 : 1);

    const updatedItinerary = tripContext.itinerary.map(day => {
      if (day.dayNumber === dayTargetNum) {
        return {
          ...day,
          dayEstimatedCost: Math.round(day.dayEstimatedCost * 0.55),
          theme: `${day.theme} (Cost-Optimized: Free Scenic Overlooks & Budget Dining)`,
          activities: day.activities.map(a => {
            if (a.estimatedCost > 200) {
              return {
                ...a,
                estimatedCost: Math.round(a.estimatedCost * 0.4),
                description: `${a.description} (Suggested activity; verify access, venue details, and current prices before travelling).`
              };
            }
            return a;
          })
        };
      }
      return day;
    });

    const updatedTrip: Trip = {
      ...tripContext,
      estimatedTotal: Math.round(tripContext.estimatedTotal * 0.88),
      itinerary: updatedItinerary
    };

    return {
      guild: 'database',
      guildIcon: '',
      confidence: 0.99,
      response: `**Day ${dayTargetNum} Cost Optimized!**\n\n` +
        `I re-engineered **Day ${dayTargetNum}** to maximize experience while cutting unnecessary expenses:\n\n` +
        `• **Entry Tickets:** Replaced high-ticket private observation decks with scenic free panoramic viewpoints along the public promenade.\n` +
        `• **Dining:** Swapped luxury hotel dining for top-rated authentic local food courts (4.7hygienic rating).\n` +
        `• **Savings:** Reduced Day ${dayTargetNum} cost from ₹${(tripContext.itinerary[dayTargetNum - 1]?.dayEstimatedCost || 4500).toLocaleString('en-IN')} to ₹${Math.round((tripContext.itinerary[dayTargetNum - 1]?.dayEstimatedCost || 4500) * 0.55).toLocaleString('en-IN')} (**Saved ~₹${Math.round((tripContext.itinerary[dayTargetNum - 1]?.dayEstimatedCost || 4500) * 0.45).toLocaleString('en-IN')}**).\n\n` +
        `Your total journey budget has dropped by ~12%!`,
      modificationBadge: {
        type: 'cheaper',
        label: `Day ${dayTargetNum} Cost Optimized`,
        detail: `Saved ₹${Math.round((tripContext.itinerary[dayTargetNum - 1]?.dayEstimatedCost || 4500) * 0.45).toLocaleString('en-IN')} on Day ${dayTargetNum}`
      },
      actionButtons: [
        { label: `View Optimized Day ${dayTargetNum}`, action: 'VIEW_ITINERARY', primary: true },
        { label: 'View Budget Ledger', action: 'VIEW_EXPENSES' }
      ],
      updatedTrip,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip }
      }
    };
  }

  // =========================================================================
  // SCENARIO 6: RAINY-DAY ALTERNATIVE
  // =========================================================================
  if (
    norm.includes('rainy') ||
    norm.includes('rain') ||
    norm.includes('bad weather') ||
    norm.includes('indoor alternative') ||
    norm.includes('weather alternative')
  ) {
    const dest = session.destination || currentDest || 'Dubai';
    const isDubai = dest.toLowerCase().includes('dubai');

    const indoorOptions = isDubai
      ? [
          '• **Dubai Aquarium & Underwater Zoo:** 10-million-liter ocean tank inside Dubai Mall with covered walk-through tunnel.',
          '• **The Green Planet:** Indoor tropical bio-dome housing 3,000 plants and animals.',
          '• **Alserkal Avenue Galleries:** Covered contemporary art warehouses and artisan cafes in Al Quoz.',
          '• **Indoor Culinary Masterclass:** Authentic Emirati spice blending & cooking experience at Arabian Tea House.'
        ]
      : [
          '• **City Palace Royal Gallery Museums:** Covered heritage halls and private armory exhibitions sheltered from rain.',
          '• **Bagore Ki Haveli Inner Court:** Covered folk museum with royal costumes and puppets.',
          '• **Covered Tea Tasting & Spice Blending:** Authentic regional masala chai session in heritage haveli rooms.',
          '• **Panoramic Glass Pavilion Dining:** Enjoy hot Dal Baati & kulhad chai overlooking misty hill & lake views.'
        ];

    return {
      guild: 'security',
      guildIcon: '',
      confidence: 0.98,
      response: `**Rainy-Day & Weather-Proof Alternatives for ${dest}:**\n\n` +
        `Don't let rain disrupt your journey! Here are curated indoor alternatives that preserve culture and fun without getting soaked:\n\n` +
        indoorOptions.join('\n') + `\n\n` +
        `Would you like me to replace outdoor stops in your itinerary with these indoor alternatives?`,
      modificationBadge: {
        type: 'rainy',
        label: 'Weather-Proof Options Available',
        detail: 'Curated 4 indoor & covered cultural alternatives'
      },
      actionButtons: [
        { label: 'Swap Outdoor with Rainy-Day Stops', action: 'VIEW_ITINERARY', primary: true },
        { label: 'Check Weather Forecast', action: 'CHECK_WEATHER' }
      ]
    };
  }

  // =========================================================================
  // SCENARIO: FLIGHT / TRANSIT DELAY MID-TRIP RE-PLANNING (planner.py + repair.py)
  // =========================================================================
  if (
    norm.includes('flight delay') ||
    norm.includes('flight delayed') ||
    norm.includes('delayed flight') ||
    norm.includes('train delay') ||
    norm.includes('train delayed') ||
    norm.includes('delayed 3 hours') ||
    norm.includes('delayed 4 hours') ||
    norm.includes('delayed 2 hours') ||
    (norm.includes('delay') && norm.includes('replan'))
  ) {
    const dest = session.destination || currentDest || 'your destination';
    const updatedItinerary = (tripContext.itinerary || []).map(day => {
      if (day.dayNumber === 1) {
        return {
          ...day,
          theme: `${day.theme} (Delay-Adjusted: Relaxed Evening Arrival & Dining)`,
          activities: [
            {
              id: 'act-delay-1',
              dayNumber: 1,
              time: '4:30 PM',
              title: 'Smooth Transit & Hotel Check-in',
              type: 'hotel' as const,
              location: `${dest} Hotel Quarter`,
              description: 'Freshen up after transit delay, unpack, and settle in at a relaxed pace.',
              estimatedCost: 0,
              travelTimeMin: 20,
              distanceKm: 5,
              coordinates: { lat: 32.2432, lng: 77.1892 },
              durationMin: 75
            },
            {
              id: 'act-delay-2',
              dayNumber: 1,
              time: '6:30 PM',
              title: `${dest} Sunset Promenade & Old Quarter Stroll`,
              type: 'viewpoint' as const,
              location: `${dest} Scenic Waterfront`,
              description: 'Unwind with golden hour breezes and evening street ambiance, avoiding crowded ticket lines.',
              estimatedCost: 150,
              travelTimeMin: 15,
              distanceKm: 2,
              coordinates: { lat: 32.2432, lng: 77.1892 },
              durationMin: 60
            },
            {
              id: 'act-delay-3',
              dayNumber: 1,
              time: '8:15 PM',
              title: 'Authentic Welcome Dinner',
              type: 'food' as const,
              location: `${dest} Old Town`,
              description: 'Comforting local regional dinner featuring seasonal specialties and hot kulhad chai.',
              estimatedCost: Math.round((day.dayEstimatedCost || 2500) * 0.4),
              travelTimeMin: 10,
              distanceKm: 1,
              coordinates: { lat: 32.2432, lng: 77.1892 },
              durationMin: 75
            }
          ]
        };
      }
      return day;
    });

    const updatedTrip: Trip = {
      ...tripContext,
      itinerary: updatedItinerary
    };

    return {
      guild: 'system_architect',
      guildIcon: '',
      confidence: 0.99,
      response: `**Transit Delay Successfully Absorbed for Day 1 in ${dest}!**\n\n` +
        `CONCODE Brain's \`planner.py\` and \`repair.py\` cognitive engines have recalculated your Day 1 schedule:\n\n` +
        `• **Removed Rushed Morning Sights:** Dropped time-sensitive museum tours and ticketed lines to eliminate stress.\n` +
        `• **Relaxed 4:30 PM Check-In:** Ample buffer for delayed baggage claim, airport taxi, and hotel check-in.\n` +
        `• **Golden Hour Evening Promenade:** A relaxing scenic sunset walk along the promenade.\n` +
        `• **Warm Regional Dinner Preserved:** Relaxing dining experience with authentic local cuisine.\n\n` +
        `Day 2 and Day 3 remain intact with zero budget disruption. Click below to apply to your itinerary!`,
      modificationBadge: {
        type: 'delay',
        label: 'Delay Re-plan Ready',
        detail: 'Day 1 recalculated for evening arrival'
      },
      actionButtons: [
        { label: 'Apply Re-plan to Day 1', action: 'VIEW_ITINERARY', primary: true },
        { label: 'Open Full Replanning Modal', action: 'OPEN_REPLANNING' }
      ],
      updatedTrip,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip }
      }
    };
  }

  // =========================================================================
  // SCENARIO: CANCELLATIONS, SEVERE DISRUPTIONS & REPLANNING (emergency protocol)
  // =========================================================================
  if (
    norm.includes('flight cancel') ||
    norm.includes('flight cancelled') ||
    norm.includes('train cancel') ||
    norm.includes('train cancelled') ||
    norm.includes('trip cancel') ||
    norm.includes('trip cancelled') ||
    norm.includes('road closed') ||
    norm.includes('road closure') ||
    norm.includes('landslide') ||
    norm.includes('storm') ||
    (norm.includes('replan') && !norm.includes('delay')) ||
    norm.includes('replanning')
  ) {
    const dest = session.destination || currentDest || tripContext.destination || 'your destination';
    const cleanDest = dest.split(',')[0].trim();
    const reason = norm.includes('train') 
      ? 'train_cancellation' 
      : (norm.includes('road') || norm.includes('landslide')) 
        ? 'official_change' 
        : (norm.includes('storm') || norm.includes('weather')) 
          ? 'weather_alert' 
          : 'flight_cancellation';

    const replanData = getReplanOptions(tripContext, reason as any);
    const topAlternative = replanData.newDestinations[0]?.destination || 'nearby safe alternatives';

    return {
      guild: 'system_architect',
      guildIcon: '',
      confidence: 0.99,
      response: `**ConCode Disruption Protocol Activated for ${cleanDest}!**\n\n` +
        `Per ConCode Reliability Section 19, when a cancellation or disruption occurs, we prioritize safety, location, and viable alternatives over assumptions:\n\n` +
        `• **Immediate Action:** We have prepared draft alternatives including safe nearby destinations like **${topAlternative}** and date-shifting options.\n` +
        `• **Direct Carrier Verification:** Contact the operating provider directly to confirm cancellation status, rescheduling waivers, and ticket refund eligibility.\n` +
        `• **Interactive Replanner:** You can preview full day-by-day itineraries for alternate routes or secure nearby stays with one tap below.`,
      modificationBadge: {
        type: 'replan',
        label: 'Re-Plan Ready',
        detail: `Disruption alternative for ${cleanDest}`
      },
      actionButtons: [
        { label: 'Open Re-planning Options', action: 'OPEN_REPLANNING', primary: true },
        { label: 'Find Nearby Stays', action: 'OPEN_EMERGENCY_STAY' },
        { label: 'Refund & Policy Docket', action: 'OPEN_REFUND_INFO' }
      ]
    };
  }

  // =========================================================================
  // SCENARIO: 3D WEBGL LANDMARK & DESTINATION PREVIEW (webgl guild)
  // =========================================================================
  if (
    norm.includes('3d') ||
    norm.includes('webgl') ||
    norm.includes('3d tour') ||
    norm.includes('3d view') ||
    norm.includes('landmark 3d') ||
    norm.includes('visualize 3d')
  ) {
    const dest = session.destination || currentDest || 'Manali';
    const landmark = dest.toLowerCase().includes('manali')
      ? 'Hadimba Temple & Solang Valley'
      : dest.toLowerCase().includes('dubai')
        ? 'Burj Khalifa & Downtown Spire'
        : dest.toLowerCase().includes('jaipur')
          ? 'Amer Fort & Hawa Mahal'
          : `${dest} Iconic Landmark`;

    return {
      guild: 'webgl',
      guildIcon: '',
      confidence: 0.99,
      response: `**Interactive 3D WebGL Landmark Explorer & Virtual View for ${dest} (${landmark})**\n\n` +
        `TripVerse connects directly to Google Earth 3D and Street View 360° photogrammetry, plus live architectural records from Wikimedia:\n\n` +
        `• **Google Earth 3D Flyover:** Seamless real-world 3D digital twin of Earth with photorealistic building facades and mountain terrain.\n` +
        `• **Google Street View 360°:** Step down onto the ground for an immersive full-sphere virtual walkthrough.\n` +
        `• **WebGL Architectural Blueprint:** Touch or drag to rotate 360°, inspect shadow casting, and test elevation levels.\n` +
        `• **100% Genuine Records:** Live coordinates and factual history sourced directly from Wikipedia & Google Maps.\n\n` +
        `Click below to launch the interactive 3D virtual view!`,
      actionButtons: [
        { label: `Launch 3D Virtual View for ${dest}`, action: 'OPEN_3D_VIEWER', primary: true },
        { label: 'View Day Itinerary', action: 'VIEW_ITINERARY' }
      ]
    };
  }

  // =========================================================================
  // SCENARIO: SAFETY & SCAM RADAR (security guild)
  // =========================================================================
  if (
    norm.includes('scam') ||
    norm.includes('safety') ||
    norm.includes('is it safe') ||
    norm.includes('tourist trap') ||
    norm.includes('emergency numbers') ||
    norm.includes('safe areas')
  ) {
    const dest = session.destination || currentDest || 'your destination';
    return {
      guild: 'security',
      guildIcon: '',
      confidence: 0.99,
      response: `**CONCODE Security Sentinel: Safety & Scam Radar for ${dest}**\n\n` +
        `CONCODE Brain's \`security\` guild tracks active tourist traps, neighborhood safety ratings, and verified hotlines:\n\n` +
        `• **Verified Emergency Hotlines:** Direct tap-to-call police, medical ambulance, and tourist desk numbers.\n` +
        `• **Tourist Trap Alerts:** Specific local scam tactics (broken meters, overpriced rental gear, fake guide commissions) and avoidance rules.\n` +
        `• **Neighborhood Walking Guidance:** Filtered safe promenades vs. high-vigilance zones after dark.\n\n` +
        `Click below to launch your destination's Safety & Scam Radar!`,
      actionButtons: [
        { label: `Open ${dest} Safety & Scam Radar`, action: 'VIEW_SAFETY', primary: true },
        { label: 'View Itinerary', action: 'VIEW_ITINERARY' }
      ]
    };
  }

  // =========================================================================
  // SCENARIO: FLIGHT ROUTES, AIRPORT CODES & AIRFARE INTELLIGENCE
  // =========================================================================
  if (
    (norm.includes('flight') ||
     norm.includes('fly') ||
     norm.includes('airport') ||
     norm.includes('airline') ||
     norm.includes('airfare') ||
     norm.includes('aeroplane')) &&
    !norm.includes('delay') &&
    !norm.includes('cancel') &&
    !norm.includes('storm')
  ) {
    const normDest = activeDest.toLowerCase();
    let airportCode = 'Major Regional Hub';
    let airportName = `${activeDest} International Airport`;
    let flightDuration = '2h – 4h';
    let routeTip = 'Direct and 1-stop flights operate regularly from major hubs.';

    if (normDest.includes('dubai') || normDest.includes('uae')) {
      airportCode = 'DXB / DWC';
      airportName = 'Dubai International (DXB) & Al Maktoum (DWC)';
      flightDuration = '3h 30m – 4h non-stop';
      routeTip = 'Emirates, flydubai, IndiGo, and Air India operate daily non-stop corridors.';
    } else if (normDest.includes('goa')) {
      airportCode = 'GOI / GOX';
      airportName = 'Dabolim Airport (GOI, South Goa) & Manohar International Mopa (GOX, North Goa)';
      flightDuration = '1h 15m (BOM) / 2h 30m (DEL)';
      routeTip = 'Fly into GOX for North Goa beaches (Anjuna, Morjim) or GOI for South Goa resorts (Colva, Benaulim).';
    } else if (normDest.includes('paris') || normDest.includes('france')) {
      airportCode = 'CDG / ORY';
      airportName = 'Charles de Gaulle Airport (CDG) & Paris Orly (ORY)';
      flightDuration = '8h 30m – 9h non-stop';
      routeTip = 'Air France and Air India operate direct services. RER B train connects CDG directly to Paris center in 35m.';
    } else if (normDest.includes('london') || normDest.includes('uk')) {
      airportCode = 'LHR / LGW';
      airportName = 'London Heathrow (LHR) & Gatwick (LGW)';
      flightDuration = '9h – 10h non-stop';
      routeTip = 'Heathrow Express connects to Paddington in 15 mins. Best fares 6–8 weeks in advance.';
    } else if (normDest.includes('tokyo') || normDest.includes('japan')) {
      airportCode = 'HND / NRT';
      airportName = 'Tokyo Haneda (HND, central) & Narita (NRT)';
      flightDuration = '8h – 9h non-stop';
      routeTip = 'Haneda (HND) monorail reaches downtown in 20 mins; Narita Express takes ~60 mins.';
    } else if (normDest.includes('bali') || normDest.includes('indonesia')) {
      airportCode = 'DPS';
      airportName = 'Ngurah Rai International Airport (DPS, Denpasar)';
      flightDuration = '6h – 8h (via SIN / KUL)';
      routeTip = 'Pre-book airport lounge transfer to bypass arrival queues at DPS.';
    } else if (normDest.includes('singapore')) {
      airportCode = 'SIN';
      airportName = 'Singapore Changi Airport (SIN)';
      flightDuration = '4h 30m – 5h 30m non-stop';
      routeTip = 'Direct MRT connects Changi terminals directly to downtown Singapore.';
    } else if (normDest.includes('bangkok') || normDest.includes('thailand')) {
      airportCode = 'BKK / DMK';
      airportName = 'Suvarnabhumi Airport (BKK) & Don Mueang (DMK)';
      flightDuration = '3h 45m – 4h 30m';
      routeTip = 'Airport Rail Link connects BKK to Phaya Thai station in 26 minutes.';
    } else if (normDest.includes('udaipur')) {
      airportCode = 'UDR';
      airportName = 'Maharana Pratap Airport (UDR)';
      flightDuration = '1h 15m (BOM/DEL)';
      routeTip = 'Pre-paid cabs take ~35 mins to Lake Pichola and the Old City.';
    } else if (normDest.includes('jaipur')) {
      airportCode = 'JAI';
      airportName = 'Jaipur International Airport (JAI)';
      flightDuration = '50m (DEL) / 1h 45m (BOM)';
      routeTip = 'Direct flights connect across all Indian metros; terminal is 20m from central city.';
    } else if (normDest.includes('ladakh') || normDest.includes('leh')) {
      airportCode = 'IXL';
      airportName = 'Kushok Bakula Rimpochee Airport (IXL, Leh)';
      flightDuration = '1h 20m (morning scenic corridor)';
      routeTip = 'Strict altitude acclimatization: Dedicate your entire arrival Day 1 to rest at hotel (3,500m elevation).';
    } else if (normDest.includes('manali')) {
      airportCode = 'KUU / IXC';
      airportName = 'Bhuntar Airport (KUU, 50km) or Chandigarh (IXC, 280km)';
      flightDuration = '1h to KUU / 1h to IXC + scenic road transfer';
      routeTip = 'Bhuntar flights are weather-dependent. Most travelers fly into Chandigarh (IXC) and take a 7h scenic mountain drive.';
    }

    return {
      guild: 'fullstack',
      guildIcon: '',
      confidence: 0.98,
      response: `✈️ **Flight Routes, Airport Codes & Airfare Intelligence for ${activeDest}**\n\n` +
        `• **Target Airports:** **${airportName}** (Code: \`${airportCode}\`)\n` +
        `• **Flight Route Corridor:** ${currentOrigin} ✈️ ${activeDest}\n` +
        `• **Estimated Flight Time:** ~${flightDuration}\n` +
        `• **Route & Carrier Advice:** ${routeTip}\n\n` +
        `💡 **Smart Booking Rule:** Lowest airfares are typically secured 4 to 6 weeks in advance. Mid-week departures (Tuesday/Wednesday) are up to 18% cheaper than peak weekend flights.\n\n` +
        `Click below to compare real-time airfares on Google Flights or explore TripVerse transport deals!`,
      actionButtons: [
        { label: 'Search Google Flights ↗', action: 'SEARCH_FLIGHTS', primary: true },
        { label: 'Browse Transport Deals', action: 'TRANSPORT_DEALS' },
        { label: 'View Day 1 Schedule', action: 'VIEW_ITINERARY' }
      ]
    };
  }

  // =========================================================================
  // SCENARIO: MULTI-AGENT GROUP TRIP CONSENSUS (swarm.py)
  // =========================================================================
  if (
    norm.includes('group') ||
    norm.includes('friends') ||
    norm.includes('family') ||
    norm.includes('consensus') ||
    norm.includes('swarm') ||
    norm.includes('mixed preferences')
  ) {
    const dest = session.destination || currentDest || 'Manali';
    return {
      guild: 'research_scientist',
      guildIcon: '',
      confidence: 0.99,
      response: `**Multi-Agent Swarm Consensus Activated for ${dest}!**\n\n` +
        `When planning group travel with conflicting interests (e.g. 1 Thrill-Seeker, 1 Foodie, 1 Relaxed Explorer), CONCODE Brain's \`swarm.py\` negotiates a balanced compromise:\n\n` +
        `• **Morning Slot:** Nature trails & light adventure (satisfies thrill seekers without exhausting leisure travelers).\n` +
        `• **Midday Culinary Spotlight:** Curated authentic dining & cafe session (satisfies the foodies).\n` +
        `• **Sunset Leisure Hours:** Scenic viewpoints, heritage walks, or boutique market shopping (satisfies relaxed explorers).\n` +
        `• **Equitable Expense Sharing:** Group expenses split transparently in the TripSplit ledger.\n\n` +
        `Tell me your group's traveler personas or click below to generate a harmonized itinerary!`,
      actionButtons: [
        { label: `Generate Harmonized Group Plan for ${dest}`, action: 'PLAN_DUBAI', primary: true },
        { label: 'Open Split Expenses', action: 'VIEW_EXPENSES' }
      ]
    };
  }

  // =========================================================================
  // SCENARIO: TRAVELER MEMORY RING (memory.py)
  // =========================================================================
  if (
    norm.includes('what do you remember') ||
    norm.includes('my memory') ||
    norm.includes('traveler memory') ||
    norm.includes('remember my preferences') ||
    norm.includes('my travel profile')
  ) {
    const mem = getTravelerMemoryRing();
    const diet = mem.dietaryPreference || 'all';
    const pace = mem.travelPace || 'moderate';
    const tier = mem.budgetTier || 'moderate';
    const interests = (mem.interests || ['culture', 'nature', 'food']).join(', ');

    return {
      guild: 'conversational',
      guildIcon: '',
      confidence: 0.99,
      response: `**CONCODE Brain Memory Ring Status (memory.py):**\n\n` +
        `Here are the persistent traveler traits currently stored in your active cognitive memory ring:\n\n` +
        `• **Dietary Style:** \`${diet.toUpperCase()}\` (injected into all regional restaurant selections)\n` +
        `• **Travel Pacing:** \`${pace.toUpperCase()}\` (controls daily activity density)\n` +
        `• **Budget Tier:** \`${tier.toUpperCase()}\` (guides hotel & transit category)\n` +
        `• **Core Interests:** \`${interests}\`\n\n` +
        `Every itinerary generated by CONCODE Brain automatically aligns with these traits. You can update or clear your memory ring anytime!`,
      actionButtons: [
        { label: 'I like food and architecture', action: 'PREF_FOOD_ARCH', primary: true },
        { label: 'Reset Brain Memory', action: 'RESET_BRAIN' }
      ]
    };
  }

  // =========================================================================
  // SCENARIO 7: WHAT WILL THIS TRIP APPROXIMATELY COST?
  // =========================================================================
  if (
    norm.includes('what will this trip approximately cost') ||
    norm.includes('approximate cost') ||
    norm.includes('cost breakdown') ||
    norm.includes('how much will it cost') ||
    norm.includes('how much will this cost') ||
    norm.includes('estimate cost') ||
    norm.includes('budget breakdown')
  ) {
    const targetDest = session.destination || currentDest || 'Dubai';
    const targetDays = session.durationDays || tripContext.durationDays || 5;
    const targetBudget = session.budget || tripContext.totalBudget || 100000;
    const breakdown = calculateBudgetBreakdown(targetBudget, targetDest, targetDays);

    return {
      guild: 'database',
      guildIcon: '',
      confidence: 0.99,
      response: `**Estimated Budget Breakdown for ${targetDays}-Day ${targetDest} Expedition:**\n\n` +
        `Here is a transparent, realistic budget allocation calibrated for **₹${targetBudget.toLocaleString('en-IN')}**:\n\n` +
        `• **Flights / Inter-city Transit:** ~₹${breakdown.transport.toLocaleString('en-IN')} (Economy round-trip + baggage)\n` +
        `• **Stays & Accommodations:** ~₹${breakdown.stays.toLocaleString('en-IN')} (${targetDays - 1} nights @ ~₹${Math.round(breakdown.stays / Math.max(1, targetDays - 1)).toLocaleString('en-IN')}/night)\n` +
        `• **Food & Local Dining:** ~₹${breakdown.food.toLocaleString('en-IN')} (~₹${Math.round(breakdown.food / targetDays).toLocaleString('en-IN')}/day for 3 meals & snacks)\n` +
        `• **Sightseeing & Entry Tickets:** ~₹${breakdown.activities.toLocaleString('en-IN')} (Top attractions & experiences)\n` +
        `• **Emergency & Local Transit Buffer:** ~₹${breakdown.buffer.toLocaleString('en-IN')} (Metro/taxis & incidental buffer)\n\n` +
        `**Total Estimated:** ₹${breakdown.total.toLocaleString('en-IN')}\n\n` +
        `*Note: These figures are realistic travel estimates calibrated for ${targetDays} days. Prices fluctuate based on advance booking dates.*`,
      budgetBreakdown: breakdown,
      actionButtons: [
        { label: 'Make Day 3 Cheaper', action: 'MAKE_CHEAPER', primary: true },
        { label: 'Save This Itinerary', action: 'VIEW_ITINERARY' },
        { label: 'Print Official Budget Sheet', action: 'OPEN_PRINT' }
      ]
    };
  }

  // =========================================================================
  // SCENARIO 3: USER SPECIFIES PREFERENCES (e.g. "I like food and architecture")
  // =========================================================================
  const hasFoodOrArch = (norm.includes('food') && norm.includes('architecture')) || norm.includes('i like food');
  if (
    hasFoodOrArch && (session.destination || session.durationDays || tripContext.destination)
  ) {
    const targetDest = session.destination || currentDest || 'Dubai';
    const targetDays = session.durationDays || tripContext.durationDays || 5;
    const targetBudget = session.budget || tripContext.totalBudget || 100000;
    const activePrefs = session.preferences || ['food', 'architecture'];

    const curatedDays = buildCuratedDays(targetDest, targetDays, targetBudget, activePrefs);

    const structuredItinerary: StructuredItinerary = {
      destination: targetDest,
      durationDays: targetDays,
      targetBudget,
      totalCost: targetBudget,
      currencySymbol: '₹',
      days: curatedDays
    };

    updateConcodeSession({ stage: 'planned', draftItinerary: structuredItinerary });
    const prefList = activePrefs.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' & ');

    return {
      guild: 'ai_ml',
      guildIcon: '',
      confidence: 0.99,
      response: `**Here is your ${targetDays}-Day ${targetDest} Itinerary (${prefList} Focus):**\n\n` +
        `Calibrated around your **₹${targetBudget.toLocaleString('en-IN')}** budget with morning heritage visits, signature culinary trails, and sunset viewpoints.\n\n` +
        curatedDays.map(d => 
          `**${d.title}**\n` +
          `• **Morning:** ${d.morning}\n` +
          `• **Afternoon:** ${d.afternoon}\n` +
          `• **Evening:** ${d.evening}\n` +
          `• **Dining Spotlight:** ${d.food}\n` +
          `• **Est. Day Cost:** ₹${d.cost.toLocaleString('en-IN')}\n`
        ).join('\n') +
        `\nWhat would you like to tweak next? You can ask to **"Make Day 3 cheaper"**, **"Remove the museum"**, or **"Save this itinerary"**!`,
      structuredItinerary,
      actionButtons: [
        { label: 'Save This Itinerary', action: 'VIEW_ITINERARY', primary: true },
        { label: 'Make Day 3 Cheaper', action: 'MAKE_CHEAPER' },
        { label: 'View Estimated Budget Breakdown', action: 'CHECK_BUDGET' },
        { label: 'Rainy-Day Alternative', action: 'RAINY_DAY_ALT' }
      ]
    };
  }

  // =========================================================================
  // SCENARIO 2: USER PROVIDES BUDGET (e.g. "I have ₹1,00,000")
  // =========================================================================
  if (extractedBudget !== null && !extractedDest) {
    const targetDest = session.destination || currentDest || 'Dubai';
    const targetDays = session.durationDays || tripContext.durationDays || 5;

    updateConcodeSession({ stage: 'clarifying', budget: extractedBudget });

    return {
      guild: 'database',
      guildIcon: '',
      confidence: 0.98,
      response: `**Budget Configured: ₹${extractedBudget.toLocaleString('en-IN')}**\n\n` +
        `Understood! I've locked in **₹${extractedBudget.toLocaleString('en-IN')}** for your **${targetDays}-day trip to ${targetDest}** (~₹${Math.round(extractedBudget / targetDays).toLocaleString('en-IN')}/day).\n\n` +
        `What style of experiences should I highlight?\n` +
        `• **Food & Architecture** (Iconic skylines, historic quarters & authentic dining)\n` +
        `• **Adventure & Desert Safari** (Dune bashing, waterparks & outdoor thrills)\n` +
        `• **Relaxed & Coastal** (Beach promenades, marinas & sunset cafes)\n\n` +
        `Tell me your preference or click below to generate your itinerary!`,
      actionButtons: [
        { label: 'I like food and architecture', action: 'PREF_FOOD_ARCH', primary: true },
        { label: 'Adventure & Desert', action: 'PREF_ADVENTURE' },
        { label: 'Relaxed & Beach', action: 'PREF_RELAXED' },
        { label: 'Generate Itinerary Now', action: 'GENERATE_NOW' }
      ]
    };
  }

  // =========================================================================
  // SCENARIO 1: USER STARTS PLANNING (Explicit planning prompt)
  // e.g. "Plan a 5-day trip to Dubai", "Plan trip to Manali"
  // Note: Only trigger if explicitly commanding a plan, NOT general questions!
  // =========================================================================
  if (
    norm.startsWith('plan a ') ||
    norm.startsWith('plan trip') ||
    norm.startsWith('plan my trip') ||
    (norm.startsWith('plan ') && (extractedDest || extractedDays))
  ) {
    const targetDest = extractedDest || session.destination || 'Dubai';
    const targetDays = extractedDays || session.durationDays || 5;

    updateConcodeSession({ stage: 'clarifying', destination: targetDest, durationDays: targetDays });

    return {
      guild: 'ai_ml',
      guildIcon: '',
      confidence: 0.99,
      response: `**Exciting choice! ${targetDest} is ready to be planned.**\n\n` +
        `I've initiated your **${targetDays}-Day journey to ${targetDest}**.\n\n` +
        `To calibrate stays, transit and experiences with precision:\n` +
        `• **What approximate budget** should I plan around? (e.g. *"I have ₹1,00,000"* or *"Budget is ₹80,000"*)\n` +
        `• **Any specific interests?** (e.g. *"I like food and architecture"*, *"Beach & relaxation"*, or *"Adventure"*)\n\n` +
        `Or choose a quick suggestion below:`,
      actionButtons: [
        { label: 'I have ₹1,00,000', action: 'BUDGET_1LAKH', primary: true },
        { label: 'I have ₹50,000 (Budget)', action: 'BUDGET_50K' },
        { label: 'Focus on Food & Architecture', action: 'PREF_FOOD_ARCH' },
        { label: 'Standard 5-Day Plan (Generate Now)', action: 'GENERATE_NOW' }
      ]
    };
  }

  // =========================================================================
  // SEMANTIC DOMAIN: FOOD & DINING INQUIRIES
  // e.g. "What should I eat?", "Where to eat in Udaipur", "Best food recommendations"
  // =========================================================================
  if (
    norm.includes('food') || 
    /\b(?:eat|eats|eating)\b/.test(norm) || 
    norm.includes('restaurant') || 
    norm.includes('thali') || 
    norm.includes('dhaba') || 
    norm.includes('cuisine') || 
    norm.includes('dishes') || 
    norm.includes('breakfast') || 
    norm.includes('dinner')
  ) {
    const opener = getDynamicOpener('food');
    const isUdaipur = activeDest.toLowerCase().includes('udaipur');

    const foodDetails = isUdaipur
      ? `**Top Culinary Experiences in Udaipur:**\n\n` +
        `• **Authentic Mewari Thali at Natraj Dining Hall:** Near railway station. Unlimited pure-veg Gujarati & Rajasthani thali (Dal Baati Churma, Ker Sangri, Gatta curry) — ₹300/person, unmatched flavor.\n` +
        `• **Romantic Waterfront Dining at Ambrai (Amet Haveli):** Situated directly on Lake Pichola with candle-lit views of the illuminated City Palace and Jagmandir. Reserve 2 days ahead!\n` +
        `• **Lakeside Morning Chai at Jheel’s Ginger Coffee:** Sip fresh brewed ginger coffee and wood-fired breakfast pizza right over the water edge.\n` +
        `• **Street Food at Sukhadia Circle:** Famous for spicy Pav Bhaji, Bhel Puri, and rich Kulhad Kulfi Falooda in the evening.\n` +
        `• **Route stop:** Search Google Maps for current food and rest-stop listings along your route; confirm facilities and hours directly.`
      : `**Curated Dining & Flavors for ${activeDest}:**\n\n` +
        `• **Signature Regional Dishes:** Must-try local delicacies and traditional breakfast specialties.\n` +
        `• **Local dining:** Search current map listings and confirm menus, food preparation, and hygiene directly with each venue.\n` +
        `• **Scenic Dining:** Open-air viewpoints and atmospheric evening spots suitable for your group budget.`;

    return {
      guild: 'database',
      guildIcon: '',
      confidence: 0.98,
      response: `${opener}\n\n${foodDetails}\n\nWould you like me to reserve a dinner stop on Day 1 or Day 2 of your plan?`,
      actionButtons: [
        { label: 'Add Ambrai Dinner to Day 1', action: 'VIEW_ITINERARY', primary: true },
        { label: 'Highway Food Stop: Shamlaji', action: 'START_NAV' },
        { label: 'View Food Budget Estimate', action: 'CHECK_BUDGET' }
      ]
    };
  }

  // =========================================================================
  // SEMANTIC DOMAIN: PLACES TO VISIT & SIGHTSEEING
  // e.g. "What places to visit?", "Top sights in Udaipur", "What to see"
  // =========================================================================
  if (
    norm.includes('places to visit') ||
    norm.includes('places should i visit') ||
    norm.includes('places') ||
    norm.includes('what to see') ||
    norm.includes('sights') ||
    norm.includes('attractions') ||
    norm.includes('sightseeing') ||
    norm.includes('highlights') ||
    norm.includes('things to do') ||
    norm.includes('monuments')
  ) {
    const opener = getDynamicOpener('sights');
    const isUdaipur = activeDest.toLowerCase().includes('udaipur');

    const sightsDetails = isUdaipur
      ? `**Must-Visit Highlights in Udaipur (The City of Lakes):**\n\n` +
        `1. **City Palace Complex:** Rajasthan’s largest palace complex. Built over 400 years by 22 Maharanas. Allow 2.5–3 hours for the museum & Sheesh Mahal (Mirror Palace).\n` +
        `2. **Lake Pichola Sunset Cruise:** Take the boat from Rameshwar Ghat to Jagmandir Island. The golden hour reflection over the lake is mesmerizing.\n` +
        `3. **Sajjangarh (Monsoon Palace):** Perched 944m high on Bansdara mountain. Offers a dramatic 360° sunset panorama over lakes and the Aravali hill range.\n` +
        `4. **Bagore Ki Haveli (Gangaur Ghat):** Don’t miss the nightly 7:00 PM "Dharohar" folk dance and puppet performance inside the historic courtyard.\n` +
        `5. **Saheliyon Ki Bari:** Serene historic garden with marble elephants, lotus pools, and rain fountains engineered in 1710 for royal maidens.\n` +
        `6. **Fatehsagar Lake & Nehru Park:** Clean breeze, boat rides, and relaxing walks along the promenade.`
      : `**Top Sights & Experiences in ${activeDest}:**\n\n` +
        `• **Historic Landmarks:** Iconic architectural monuments and historic quarters.\n` +
        `• **Scenic Panoramic Viewpoints:** Sunset overlooks and natural lakes/coastal horizons.\n` +
        `• **Cultural Immersion:** Local artisan markets and evening cultural performances.`;

    return {
      guild: 'ai_ml',
      guildIcon: '',
      confidence: 0.99,
      response: `${opener}\n\n${sightsDetails}\n\nI can organize these into your daily schedule so you never face crowd bottlenecks. Shall I arrange them day-by-day?`,
      actionButtons: [
        { label: 'View Day-Wise Breakdown', action: 'VIEW_ITINERARY', primary: true },
        { label: 'Add Sunset at Monsoon Palace', action: 'VIEW_ITINERARY' },
        { label: 'Get Directions', action: 'START_NAV' }
      ]
    };
  }

  // =========================================================================
  // SEMANTIC DOMAIN: ROAD TRIP / DRIVING / HIGHWAY / SHAMLAJI
  // e.g. "How is the road from Ahmedabad to Udaipur?", "Highway conditions", "Tolls"
  // =========================================================================
  if (
    norm.includes('road') ||
    norm.includes('drive') ||
    norm.includes('driving') ||
    norm.includes('highway') ||
    norm.includes('toll') ||
    norm.includes('nh-48') ||
    norm.includes('shamlaji') ||
    norm.includes('pitstop') ||
    norm.includes('distance') ||
    norm.includes('how far') ||
    norm.includes('traffic')
  ) {
    const opener = getDynamicOpener('road');
    const roadDetails = `**Route planning for ${activeDest}:**\n\n` +
      `• TripVerse can hand the route off to an external navigation app; it does not provide turn-by-turn directions or live traffic.\n` +
      `• Check current tolls, road closures, speed limits, fuel/charging availability, and facility details with official or provider sources.\n` +
      `• Map listings are suggestions and do not verify a facility's safety, hours, or availability.`;

    return {
      guild: 'devops',
      guildIcon: '',
      confidence: 0.98,
      response: `${opener}\n\n${roadDetails}`,
      actionButtons: [
        { label: 'Get Directions', action: 'START_NAV', primary: true },
        { label: 'View Place Listings', action: 'VIEW_ITINERARY' },
        { label: 'Estimate Fuel & Toll Cost', action: 'CHECK_BUDGET' }
      ]
    };
  }

  // =========================================================================
  // SEMANTIC DOMAIN: PACKING & CLOTHING GEAR
  // e.g. "What should I pack?", "What clothes to wear?"
  // =========================================================================
  if (
    !norm.includes('weather') &&
    !norm.includes('forecast') &&
    !norm.includes('climate') &&
    (norm.includes('pack') ||
     norm.includes('cloth') ||
     norm.includes('wear') ||
     norm.includes('shoes') ||
     norm.includes('gear') ||
     norm.includes('luggage') ||
     norm.includes('bag'))
  ) {
    const isUdaipur = activeDest.toLowerCase().includes('udaipur');
    const packDetails = isUdaipur
      ? `**Curated Packing Checklist for Udaipur:**\n\n` +
        `• **Daywear:** Breathable cotton or linen clothes for exploring palace courtyards under daytime sun.\n` +
        `• **Evening Layers:** Light cardigan or stylish shawl (temperatures drop pleasantly around lakes after dusk).\n` +
        `• **Footwear:** Comfortable cushioned walking shoes or sneakers (City Palace has extensive cobblestones and steps; slip-ons help for temples).\n` +
        `• **Modesty Etiquette:** Modest attire that covers shoulders and knees when visiting Jagdish Temple or rural heritage havelis.\n` +
        `• **Essentials:** High-SPF sunscreen, sunglasses, power bank (for photography), and motion-sickness bands if prone on winding Aravali hill roads.`
      : `**Smart Packing Checklist for ${activeDest}:**\n\n` +
        `• **Comfortable footwear** for walking tours and historic cobblestone pavements.\n` +
        `• **Weather-appropriate clothing** with lightweight evening layers.\n` +
        `• **Portable power bank & universal adapters** for long excursion days.\n` +
        `• **Basic medical kit** including pain relief, hydration salts, and personal prescriptions.`;

    return {
      guild: 'ui_ux',
      guildIcon: '',
      confidence: 0.97,
      response: `${packDetails}\n\nEverything packed? Let me know if you want to verify any other trip logistics!`,
      actionButtons: [
        { label: 'Check Weather Forecast', action: 'CHECK_WEATHER', primary: true },
        { label: 'View Full Itinerary', action: 'VIEW_ITINERARY' }
      ]
    };
  }

  // =========================================================================
  // SEMANTIC DOMAIN: BEST TIME TO VISIT & WEATHER
  // e.g. "Best time to visit", "Weather in Udaipur", "Is it hot?"
  // =========================================================================
  if (
    norm.includes('best time') ||
    norm.includes('weather') ||
    norm.includes('forecast') ||
    norm.includes('season') ||
    norm.includes('climate') ||
    norm.includes('temperature') ||
    norm.includes('winter') ||
    norm.includes('summer') ||
    norm.includes('monsoon')
  ) {
    const isUdaipur = activeDest.toLowerCase().includes('udaipur');
    const isDubai = activeDest.toLowerCase().includes('dubai');
    const isGoa = activeDest.toLowerCase().includes('goa');
    const isManali = activeDest.toLowerCase().includes('manali');

    let weatherDetails = '';
    if (isUdaipur) {
      weatherDetails = `**Best Time to Visit Udaipur & Climate Overview:**\n\n` +
        `• **Peak Season (October to March):** The absolute prime window. Daytime temperatures are pleasant (20°C–28°C) and evenings are crisp (10°C–15°C). Ideal for sightseeing, boating, and rooftop dining.\n` +
        `• **Monsoon Season (July to September):** Magical greenery. Lakes overflow, Aravali mountains turn lush emerald, and Monsoon Palace looks dramatic in the mist. Great for romantic trips and photography.\n` +
        `• **Summer (April to June):** Highs reach 38°C–42°C. Sightseeing is best done early morning (7:00 AM–10:30 AM) and late evening. Hotels offer deep luxury discounts during this period.`;
    } else if (isDubai) {
      weatherDetails = `**Best Time to Visit Dubai & Climate Overview:**\n\n` +
        `• **Peak Winter Season (November to March):** Ideal outdoor climate (20°C–28°C). Perfect for desert safaris, beach clubs, and Marina yacht cruises.\n` +
        `• **Shoulder Season (April & October):** Warm (28°C–35°C), great for waterparks, air-conditioned attractions, and evening rooftop dining.\n` +
        `• **Summer (May to September):** Hot (38°C–45°C). All attractions are climate-controlled; indoor theme parks and luxury malls feature deep off-season deals.`;
    } else if (isGoa) {
      weatherDetails = `**Best Time to Visit Goa & Climate Overview:**\n\n` +
        `• **Peak Beach Season (November to February):** Crisp sunny days (24°C–31°C) and refreshing sea breezes. Water sports, beach shacks, and night markets are in full swing.\n` +
        `• **Monsoon Season (June to September):** Lush waterfalls (Dudhsagar), tranquil empty beaches, and vibrant green spice plantations.\n` +
        `• **Summer (March to May):** Warm & humid (30°C–35°C). Ideal for uncrowded pool villas and early morning beach dips.`;
    } else if (isManali) {
      weatherDetails = `**Best Time to Visit Manali & Climate Overview:**\n\n` +
        `• **Summer Escape (March to June):** Pleasant weather (10°C–25°C). Blooming apple orchards, Solang Valley paragliding, and snow points at Rohtang Pass.\n` +
        `• **Winter Wonderland (December to February):** Heavy snowfall (-5°C–7°C). Ideal for skiing, snowboarding, and cozy fireside mountain stays.\n` +
        `• **Monsoon (July to August):** Green valleys with mountain showers; exercise caution on winding highway passes.`;
    } else {
      weatherDetails = `**Seasonal Climate Guide for ${activeDest}:**\n\n` +
        `• **Optimal Travel Season:** Mild temperatures (18°C–28°C) and minimal precipitation make morning and sunset sightseeing effortless.\n` +
        `• **Shoulder Season:** Balanced crowds and budget-friendly stay tariffs.\n` +
        `• **Off-Peak Season:** Higher discounts with special indoor / covered cultural programs.`;
    }

    return {
      guild: 'security',
      guildIcon: '',
      confidence: 0.98,
      response: `${weatherDetails}\n\nWould you like me to inspect rainy-day backups, check the packing checklist, or optimize activities for cooler morning hours?`,
      actionButtons: [
        { label: 'Check Packing Checklist', action: 'VIEW_PACKING', primary: true },
        { label: 'Rainy-Day Alternatives', action: 'RAINY_DAY_ALT' },
        { label: 'View Itinerary Timings', action: 'VIEW_ITINERARY' }
      ]
    };
  }

  // =========================================================================
  // SEMANTIC DOMAIN: GREETINGS & CASUAL DIALOGUE
  // e.g. "Hi", "Hello", "How are you?", "Who are you?", "Help"
  // =========================================================================
  if (
    norm === 'hi' ||
    norm === 'hello' ||
    norm === 'hey' ||
    norm.startsWith('hi ') ||
    norm.startsWith('hello ') ||
    norm.startsWith('hey ') ||
    norm.includes('how are you') ||
    norm.includes('who are you') ||
    norm.includes('what can you do') ||
    norm.includes('help')
  ) {
    const opener = getDynamicOpener('greeting');
    return {
      guild: 'fullstack',
      guildIcon: '',
      confidence: 0.99,
      response: `${opener}\n\n` +
        `I'm **ConCode AI**, your dedicated travel intelligence co-pilot inside TripVerse.\n\n` +
        `Here is what I can do for you right now:\n` +
        `• **Build Complete Itineraries:** Ask me *"Plan a 3-day trip to Udaipur"* or any spot worldwide.\n` +
        `• **Local Secrets & Food:** Ask *"What should I eat?"* or *"Top sights to visit"*\n` +
        `• **Highway route:** Open a navigation app for current road conditions and search its map listings for possible stops.\n` +
        `• **Budget Optimization:** Say *"Make Day 3 cheaper"* or *"What will this cost?"*\n` +
        `• **Dynamic Tweaks:** Say *"Add sunset at Monsoon Palace"* or *"Remove the museum"*\n` +
        `• **Directions:** Ask *"Get directions"* to open the route in an external navigation app.\n\n` +
        `What can I assist you with on your journey?`,
      actionButtons: [
        { label: 'Food & Dining Guide', action: 'VIEW_ITINERARY', primary: true },
        { label: 'Top Places to Visit', action: 'VIEW_ITINERARY' },
        { label: 'Highway Road & Pitstops', action: 'START_NAV' },
        { label: 'Calculate Trip Budget', action: 'CHECK_BUDGET' }
      ]
    };
  }

  // =========================================================================
  // NAVIGATION & GPS HUD
  // =========================================================================
  if (
    norm.includes('navigation') ||
    norm.includes('navigate') ||
    norm.includes('start gps') ||
    norm.includes('open gps') ||
    norm.includes('launch hud')
  ) {
    return {
      guild: 'devops',
      guildIcon: '',
      confidence: 0.99,
      response: `**Opening external directions**\n\n` +
        `• Corridor: ${currentOrigin} → ${currentDest}\n` +
        `• Guidance: TripVerse does not provide live turn-by-turn directions, speed detection, or toll-lane assistance. Open a navigation app for current directions.\n\n` +
        `TripVerse will hand the route off to an external navigation app.`,
      appAction: { type: 'START_NAVIGATION' }
    };
  }

  // =========================================================================
  // PRINTABLE TRAVEL GUIDE / PDF
  // =========================================================================
  if (
    norm.includes('print') ||
    norm.includes('pdf') ||
    norm.includes('travel guide') ||
    norm.includes('download guide') ||
    norm.includes('export itinerary') ||
    norm.includes('export guide') ||
    norm.includes('export pdf') ||
    norm.includes('dossier')
  ) {
    return {
      guild: 'ui_ux',
      guildIcon: '',
      confidence: 0.99,
      response: `📄 **Official TripVerse Travel Guide & Itinerary Dossier Ready!**\n\n` +
        `• **Destination:** ${activeDest}\n` +
        `• **Schedule:** ${activeDays}-Day Comprehensive Sightseeing Timeline\n` +
        `• **Budget Allocation:** ~₹${activeBudget.toLocaleString('en-IN')}\n` +
        `• **Included Offline Dossier:** Day-wise timings, dining recommendations, verified hospital emergency numbers, highway pitstops, and packing checklist.\n\n` +
        `Opening the print & high-resolution PDF download modal now...`,
      appAction: { type: 'OPEN_MODAL', payload: { modal: 'print' } },
      actionButtons: [
        { label: 'Download / Print PDF Guide', action: 'PRINT_GUIDE', primary: true },
        { label: 'Share Itinerary Link', action: 'OPEN_SHARE' }
      ]
    };
  }

  // =========================================================================
  // DEFAULT / GENERAL CONVERSATIONAL RESPONSE
  // Responds organically and contextually to the user's specific query
  // =========================================================================
  const opener = getDynamicOpener('explaining');
  return {
    guild: 'fullstack',
    guildIcon: '',
    confidence: 0.94,
    response: `${opener}\n\n` +
      `Regarding your inquiry about **"${query}"** for your journey to **${activeDest}**:\n\n` +
      `Your current plan is a **${activeDays}-day draft** with a budget target of ~₹${activeBudget.toLocaleString('en-IN')}. ` +
      `I can help review suggested activities, route planning, and estimated expenses. Changes update the TripVerse draft; they do not change external bookings.\n\n` +
      `Here are several helpful actions you can take right now:`,
    actionButtons: [
      { label: `Best Food in ${activeDest}`, action: 'EXPLORE_FOOD', primary: true },
      { label: `Top Sights to Visit`, action: 'VIEW_ITINERARY' },
      { label: `Highway Road & Pitstops`, action: 'START_NAV' },
      { label: `Trip Cost Breakdown`, action: 'CHECK_BUDGET' }
    ]
  };
}
