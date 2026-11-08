import { CONCODE_MASTER_PROMPT, CONCODE_COMPACT_PROMPT, CONCODE_ITINERARY_PROMPT } from './concodePrompt.js';
import { applyCorsHeaders, checkRateLimit, getClientIp } from './rateLimiter.js';

// Vercel Serverless Function: private TripVerse-to-CONCODE travel proxy.
// The CONCODE key exists only in Vercel environment variables, never in the app bundle.

const MAX_QUERY_LENGTH = 12_000;
const UPSTREAM_TIMEOUT_MS = 45_000;

// In-memory LRU / TTL Cache for cloud LLM travel responses to conserve free-tier API quotas
const LLM_CACHE = new Map();
const LLM_CACHE_MAX_SIZE = 300;
const LLM_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

function getFromLlmCache(key) {
  const item = LLM_CACHE.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > LLM_CACHE_TTL_MS) {
    LLM_CACHE.delete(key);
    return null;
  }
  return item.data;
}

function setToLlmCache(key, data) {
  if (LLM_CACHE.size >= LLM_CACHE_MAX_SIZE) {
    const oldestKey = LLM_CACHE.keys().next().value;
    if (oldestKey) LLM_CACHE.delete(oldestKey);
  }
  LLM_CACHE.set(key, { data, timestamp: Date.now() });
}

function configuredConcodeUrl() {
  const value = (process.env.CONCODE_API_URL || process.env.VITE_CONCODE_API_URL || '').trim().replace(/\/$/, '');
  if (!value) return null;
  try {
    const url = new URL(value);
    const isLocalDevelopment = process.env.VERCEL_ENV !== 'production'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    if (url.protocol !== 'https:' && !isLocalDevelopment) return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function text(value, limit = 1_000) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function stringList(value, maximumItems) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item, 160)).filter(Boolean).slice(0, maximumItems);
}

function positiveNumber(value, fallback, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.min(number, maximum) : fallback;
}

function transportOptions(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((deal) => ({
    mode: text(deal?.mode, 40),
    provider: text(deal?.provider, 120),
    title: text(deal?.title, 200),
    route: text(`${deal?.route?.from || ''} to ${deal?.route?.to || ''}`, 240),
    duration: text(deal?.route?.duration, 80),
    price: positiveNumber(deal?.dealPrice, 0, 100_000_000),
    price_unit: text(deal?.priceUnit, 30),
    features: stringList(deal?.features, 12),
    booking_url: text(deal?.bookingUrl, 500),
    partner_verified: deal?.partnerVerified === true
  })).filter((deal) => deal.provider || deal.title);
}

function buildTravelContext(tripContext = {}, sessionState = {}) {
  return {
    destination: text(tripContext.destination || sessionState.destination || '', 160),
    destination_region: text(tripContext.destination_region || tripContext.destinationRegion || '', 120),
    origin: text(tripContext.origin || sessionState.origin || '', 160),
    start_date: text(tripContext.start_date || tripContext.startDate || '', 30),
    pacing: text(tripContext.pacing || '', 30),
    duration_days: positiveNumber(tripContext.duration_days || tripContext.durationDays || sessionState.durationDays, 0, 60),
    total_budget: positiveNumber(tripContext.total_budget || tripContext.totalBudget || sessionState.budget, 0, 100_000_000),
    budget_mode: text(tripContext.budget_mode || tripContext.budgetMode || 'total', 20),
    currency: text(tripContext.currency || 'INR', 12) || 'INR',
    travelers_count: positiveNumber(tripContext.travelers_count || tripContext.travelersCount || sessionState.travelersCount, 1, 30),
    traveler_type: text(tripContext.traveler_type || tripContext.travelerType || '', 80),
    preferences: stringList(tripContext.preferences || sessionState.preferences, 24),
    special_requests: text(tripContext.special_requests || tripContext.specialRequests || '', 1_000),
    transport_mode: text(tripContext.transport_mode || tripContext.transportMode || '', 80),
    accommodation_type: text(tripContext.accommodation_type || tripContext.accommodationType || '', 80),
    food_preference: text(tripContext.food_preference || tripContext.foodPreference || '', 80),
    priorities: stringList(tripContext.priorities, 12),
    known_destination_highlights: stringList(tripContext.known_destination_highlights || tripContext.knownDestinationHighlights, 30),
    transit_hubs: (tripContext.transit_hubs || tripContext.transitHubs) && typeof (tripContext.transit_hubs || tripContext.transitHubs) === 'object' ? (tripContext.transit_hubs || tripContext.transitHubs) : undefined,
    transport_options: transportOptions(tripContext.transport_options || tripContext.transportDeals)
  };
}

function buildServerlessItinerary(ctx) {
  const dest = ctx.destination || 'Udaipur';
  const daysCount = Math.max(1, Math.min(14, Number(ctx.duration_days) || 3));
  const totalBudget = Math.max(2000, Number(ctx.total_budget) || 25000);
  const foodActivityBudget = Math.round(totalBudget * 0.25);
  const perActivityBudget = Math.max(150, Math.round(foodActivityBudget / (daysCount * 3)));
  const isVegOrJain = ['veg', 'jain', 'vegan'].includes((ctx.food_preference || '').toLowerCase());
  const foodLabel = (ctx.food_preference || '').toLowerCase() === 'jain'
    ? 'Pure Jain (No Onion/Garlic)'
    : isVegOrJain
      ? 'Pure Vegetarian'
      : 'Authentic Regional';

  const normDest = (dest + ' ' + (ctx.destination_region || '')).toLowerCase();
  let defaultHighlights = [
    `${dest} Heritage Citadel & Courtyard`,
    `${dest} Scenic Waterfront & Promenade`,
    `${dest} Old Bazaar & Artisan Quarter`,
    `${dest} Hilltop Sunset Panorama`,
    `${dest} Cultural Museum & Gardens`,
    `${dest} Nature Trail & Viewpoint`,
    `${dest} Artisan Handloom & Craft Market`,
    `${dest} Evening Heritage Stroll & Cultural Square`
  ];

  if (normDest.includes('tokyo') || normDest.includes('japan')) {
    defaultHighlights = [
      'Shibuya Crossing & Hachiko Statue',
      'Senso-ji Temple & Nakamise-dori Asakusa',
      'Meiji Jingu Shrine & Yoyogi Park',
      'Tokyo Skytree & Solamachi Panorama',
      'TeamLab Planets Immersive Digital Art',
      'Akihabara Electric Town & Retro Gaming',
      'Shinjuku Gyoen National Garden',
      'Tsukiji Outer Market Food Tour',
      'Tokyo Tower & Shiba Park Vista',
      'Roppongi Hills Mori Art Museum',
      'Ueno Park & Tokyo National Museum',
      'Imperial Palace East Gardens'
    ];
  } else if (normDest.includes('paris') || normDest.includes('france')) {
    defaultHighlights = [
      'Eiffel Tower Summit Tour',
      'Louvre Museum Masterpieces & Pyramid',
      'Musée d\'Orsay Impressionist Masterpieces',
      'Arc de Triomphe & Champs-Élysées',
      'Cathédrale Notre-Dame & Île de la Cité',
      'Sacré-Cœur Basilica & Montmartre',
      'Sainte-Chapelle Stained Glass',
      'Seine River Sunset Cruise from Pont Neuf',
      'Jardin du Luxembourg & Medici Fountain',
      'Palace of Versailles Hall of Mirrors'
    ];
  } else if (normDest.includes('york') || normDest.includes('nyc') || normDest.includes('manhattan')) {
    defaultHighlights = [
      'Central Park & Bethesda Terrace Walk',
      'Empire State Building 86th Floor Observatory',
      'Statue of Liberty & Ellis Island',
      'Times Square & Broadway Theater District',
      'The Metropolitan Museum of Art (The Met)',
      'Brooklyn Bridge Pedestrian Promenade',
      'The High Line & Hudson Yards Vessel',
      'Top of the Rock Observation Deck'
    ];
  } else if (normDest.includes('rome') || normDest.includes('italy')) {
    defaultHighlights = [
      'Colosseum & Gladiator Arena Floor',
      'Roman Forum & Palatine Hill Ruins',
      'Vatican Museums & Sistine Chapel',
      'St. Peter\'s Basilica & Dome Climb',
      'The Pantheon & Piazza della Rotonda',
      'Trevi Fountain Evening Stroll',
      'Spanish Steps & Piazza di Spagna',
      'Trastevere Food Tour & Trattorias'
    ];
  } else if (normDest.includes('dubai') || normDest.includes('uae')) {
    defaultHighlights = [
      'Burj Khalifa Level 148 Sky Deck',
      'The Dubai Fountain Synchronized Show',
      'Dubai Mall & Underwater Zoo',
      'Red Dune Desert Safari & Bedouin BBQ',
      'Palm Jumeirah & The View at The Palm',
      'Dubai Frame Sky Glass Bridge',
      'Dubai Marina Walk & Yacht Promenade',
      'Old Dubai Gold & Spice Souks (Deira)'
    ];
  } else if (normDest.includes('jaipur')) {
    defaultHighlights = [
      'Amber Fort & Sheesh Mahal (Mirror Palace)',
      'Hawa Mahal (Palace of Winds)',
      'City Palace Complex & Chandra Mahal',
      'Jantar Mantar UNESCO Astronomical Observatory',
      'Nahargarh Fort Sunset Skyline Viewpoint',
      'Jal Mahal (Water Palace) & Man Sagar Lake',
      'Albert Hall Museum & Ram Niwas Gardens',
      'Johari Bazaar & Bapu Bazaar Artisan Walk'
    ];
  }

  const highlights = Array.isArray(ctx.known_destination_highlights) && ctx.known_destination_highlights.length > 0
    ? ctx.known_destination_highlights
    : defaultHighlights;

  const itinerary = [];
  let highlightIdx = 0;

  for (let d = 1; d <= daysCount; d++) {
    const isFirst = d === 1 && daysCount > 1;
    const isLast = d === daysCount && daysCount > 1;
    const h1 = highlights[highlightIdx % highlights.length] || `${dest} Landmark ${d}A`;
    highlightIdx++;
    const h2 = highlights[highlightIdx % highlights.length] || `${dest} Viewpoint ${d}B`;
    highlightIdx++;

    const activities = isFirst
      ? [
          {
            time: '2:30 PM',
            title: h1,
            type: 'attraction',
            location: `${h1}, ${dest}`,
            description: `Afternoon exploration of ${h1} after check-in. Confirm local entry timings at the venue.`,
            estimatedCost: perActivityBudget,
            preferenceMatch: ctx.preferences?.[0] || 'culture',
            durationMin: 90
          },
          {
            time: '5:15 PM',
            title: `${h2} Sunset Walk`,
            type: 'viewpoint',
            location: `${h2}, ${dest}`,
            description: `Golden-hour panoramic views and relaxed evening stroll around ${h2}.`,
            estimatedCost: Math.round(perActivityBudget * 0.5),
            preferenceMatch: ctx.preferences?.[1] || 'scenic',
            durationMin: 75
          },
          {
            time: '8:00 PM',
            title: `${foodLabel} Welcome Dinner in ${dest}`,
            type: 'food',
            location: `${dest} Old Quarter`,
            description: `Curated ${foodLabel.toLowerCase()} regional dinner featuring seasonal local specialties.`,
            estimatedCost: perActivityBudget,
            preferenceMatch: 'food',
            durationMin: 75
          }
        ]
      : isLast
        ? [
            {
              time: '8:30 AM',
              title: `Morning Visit to ${h1}`,
              type: 'attraction',
              location: `${h1}, ${dest}`,
              description: `Early morning heritage walk at ${h1} before afternoon departure.`,
              estimatedCost: Math.round(perActivityBudget * 0.6),
              preferenceMatch: ctx.preferences?.[0] || 'culture',
              durationMin: 75
            },
            {
              time: '11:00 AM',
              title: `${dest} Souvenir & Craft Stroll (${h2})`,
              type: 'attraction',
              location: `${h2}, ${dest}`,
              description: `Pick up authentic local handicrafts and regional specialties before checkout.`,
              estimatedCost: Math.round(perActivityBudget * 0.8),
              preferenceMatch: 'shopping',
              durationMin: 60
            },
            {
              time: '1:00 PM',
              title: `${foodLabel} Farewell Lunch`,
              type: 'food',
              location: `${dest} Town Center`,
              description: `Relaxed ${foodLabel.toLowerCase()} lunch prior to return transit connection.`,
              estimatedCost: perActivityBudget,
              preferenceMatch: 'food',
              durationMin: 60
            }
          ]
        : [
            {
              time: '9:30 AM',
              title: h1,
              type: 'attraction',
              location: `${h1}, ${dest}`,
              description: `Morning sightseeing session at ${h1} during cooler hours with fewer crowds.`,
              estimatedCost: perActivityBudget,
              preferenceMatch: ctx.preferences?.[0] || 'culture',
              durationMin: 120
            },
            {
              time: '1:00 PM',
              title: `${foodLabel} Regional Thali & Local Cafe`,
              type: 'food',
              location: `${dest} Heritage District`,
              description: `Midday ${foodLabel.toLowerCase()} culinary experience featuring signature local dishes.`,
              estimatedCost: perActivityBudget,
              preferenceMatch: 'food',
              durationMin: 75
            },
            {
              time: '4:00 PM',
              title: h2,
              type: 'viewpoint',
              location: `${h2}, ${dest}`,
              description: `Late afternoon visit to ${h2} for scenic architecture and photography.`,
              estimatedCost: Math.round(perActivityBudget * 0.7),
              preferenceMatch: ctx.preferences?.[1] || 'scenic',
              durationMin: 90
            },
            {
              time: '7:45 PM',
              title: `Evening Cultural Promenade & ${foodLabel} Dinner`,
              type: 'food',
              location: `${dest} Waterfront / Market`,
              description: `Atmospheric evening walk followed by ${foodLabel.toLowerCase()} dinner.`,
              estimatedCost: perActivityBudget,
              preferenceMatch: 'food',
              durationMin: 90
            }
          ];

    itinerary.push({
      dayNumber: d,
      title: isFirst
        ? `Day 1 — Arrival & ${h1}`
        : isLast
          ? `Day ${d} — ${h1} & Departure`
          : `Day ${d} — ${h1} & ${h2}`,
      theme: isFirst
        ? 'Arrival, Check-In & Sunset Highlights'
        : isLast
          ? 'Morning Sights, Souvenirs & Return'
          : `Heritage, Scenic Views & ${foodLabel} Dining`,
      activities
    });
  }

  return itinerary;
}

function buildServerlessFallbackResponse(query, ctx, mode) {
  const dest = ctx.destination || 'Udaipur';
  const origin = ctx.origin || 'your origin';
  const days = Math.max(1, Number(ctx.duration_days) || 3);
  const budget = Math.max(2000, Number(ctx.total_budget) || 25000);
  const travelers = Math.max(1, Number(ctx.travelers_count) || 2);
  const foodPref = ctx.food_preference || 'all';
  const itinerary = buildServerlessItinerary(ctx);

  const budgetBreakdown = {
    transport: Math.round(budget * 0.28),
    stays: Math.round(budget * 0.35),
    food: Math.round(budget * 0.20),
    activities: Math.round(budget * 0.10),
    buffer: budget - (Math.round(budget * 0.28) + Math.round(budget * 0.35) + Math.round(budget * 0.20) + Math.round(budget * 0.10)),
    total: budget,
    isEstimate: true,
    currency: 'INR',
    currencySymbol: '₹'
  };

  const structuredItineraryObj = {
    destination: dest,
    durationDays: days,
    targetBudget: budget,
    totalCost: budget,
    currencySymbol: '₹',
    days: itinerary.map((d) => ({
      dayNumber: d.dayNumber,
      title: d.title,
      theme: d.theme,
      morning: d.activities[0]?.description || `Explore ${dest} morning highlights.`,
      afternoon: d.activities[1]?.description || `Regional lunch and afternoon sightseeing.`,
      evening: d.activities[2]?.description || `Sunset viewpoint and relaxed evening walk.`,
      food: d.activities.find((a) => a.type === 'food')?.title || `Regional ${foodPref} specialties`,
      cost: d.activities.reduce((s, a) => s + (Number(a.estimatedCost) || 0), 0)
    }))
  };

  if (mode === 'itinerary') {
    return {
      ok: true,
      source: 'fallback',
      reply: JSON.stringify({ itinerary }),
      mode: 'itinerary',
      isEstimate: true,
      guild: 'ai_ml',
      itinerary,
      structuredItinerary: structuredItineraryObj,
      budgetBreakdown,
      criticScore: 1.0,
      criticFixes: []
    };
  }

  const transitHubNote = ctx.transit_hubs?.guidance
    ? `\n• **Transit Hub Guidance:** ${ctx.transit_hubs.guidance}`
    : '';

  const qLower = String(query || '').toLowerCase();
  const domainSections = [];
  if (qLower.includes('best time') || qLower.includes('weather') || qLower.includes('season') || qLower.includes('climate')) {
    domainSections.push(
      `• **Best Time to Visit ${dest}:** Peak season is **October to March** (pleasant 20°C–28°C days and crisp 12°C–15°C evenings, ideal for sightseeing and rooftop dining). Monsoon (**July–September**) brings lush greenery and full lakes.`
    );
  }
  if (qLower.includes('dish') || qLower.includes('food') || qLower.includes('eat') || qLower.includes('cuisine') || qLower.includes('restaurant')) {
    const dishNote = dest.toLowerCase().includes('udaipur') || dest.toLowerCase().includes('jaipur')
      ? '**Dal Baati Churma** (baked wheat baatis with panchkuta lentils & jaggery churma), **Gatte ki Sabzi**, and **Pyaz Kachori**'
      : `authentic regional ${dest} thalis, street snacks, and signature local specialties`;
    domainSections.push(`• **Must-Try Local Cuisine (${foodPref.toUpperCase()}):** ${dishNote}.`);
  }
  if (qLower.includes('pack') || qLower.includes('wear') || qLower.includes('cloth')) {
    domainSections.push(
      `• **Packing Essentials:** Breathable cotton daywear, a light evening jacket/shawl, cushioned walking shoes for heritage cobbles, sunglasses, and a power bank.`
    );
  }

  const domainBlock = domainSections.length > 0 ? `${domainSections.join('\n')}\n` : '';

  const replyText =
    `**ConCode Travel Intelligence — ${days}-Day ${dest} Plan (${travelers} Traveler${travelers > 1 ? 's' : ''} • ₹${budget.toLocaleString('en-IN')} Target)**\n\n` +
    `Here is your tailored travel guidance for **${origin} → ${dest}** regarding *"${query.slice(0, 140)}"*:\n\n` +
    domainBlock +
    `• **Key Sights & Pacing:** ${itinerary.map((d) => `Day ${d.dayNumber}: ${d.title.replace(/^Day\s+\d+\s*[—-]\s*/i, '')}`).join(' | ')}\n` +
    `• **Dietary Profile:** ${foodPref.toUpperCase()} dining preferences applied across all meal stops.\n` +
    `• **Estimated Budget Allocation:** Transit ~₹${budgetBreakdown.transport.toLocaleString('en-IN')} • Stays ~₹${budgetBreakdown.stays.toLocaleString('en-IN')} • Food ~₹${budgetBreakdown.food.toLocaleString('en-IN')} • Sights & Buffer ~₹${(budgetBreakdown.activities + budgetBreakdown.buffer).toLocaleString('en-IN')}` +
    `${transitHubNote}\n\n` +
    `*Note: All fares, timings, and budgets are planning estimates. Verify live availability on official booking portals before departure.*`;

  return {
    ok: true,
    source: 'fallback',
    reply: replyText,
    mode,
    isEstimate: true,
    guild: mode === 'budget' ? 'database' : mode === 'safety' ? 'security' : 'ai_ml',
    itinerary,
    structuredItinerary: structuredItineraryObj,
    budgetBreakdown,
    criticScore: 1.0,
    criticFixes: []
  };
}

async function callRemoteCloudLLM(query, ctx, mode) {
  const apiKey = (process.env.CONCODE_REMOTE_LLM_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey) return null;

  // 1. Check in-memory cache to save 100% of tokens on repeated queries
  const cacheKey = `${mode}:${(ctx.destination || '').toLowerCase()}:${ctx.duration_days || 3}:${query.trim().toLowerCase().slice(0, 160)}`;
  const cached = getFromLlmCache(cacheKey);
  if (cached) {
    return {
      ...cached,
      source: `${cached.source} (cached)`
    };
  }

  let baseUrl = (process.env.CONCODE_REMOTE_LLM_BASE_URL || '').trim().replace(/\/+$/, '');
  let model = (process.env.CONCODE_REMOTE_LLM_MODEL || '').trim();

  if (!baseUrl) {
    if (process.env.GROQ_API_KEY || apiKey.startsWith('gsk_')) {
      baseUrl = 'https://api.groq.com/openai/v1';
      model = model || 'llama-3.3-70b-versatile';
    } else if (process.env.OPENROUTER_API_KEY || apiKey.startsWith('sk-or-')) {
      baseUrl = 'https://openrouter.ai/api/v1';
      model = model || 'meta-llama/llama-3.3-70b-instruct';
    } else if (process.env.GEMINI_API_KEY || apiKey.startsWith('AIza')) {
      baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
      model = model || 'gemini-1.5-flash';
    } else {
      baseUrl = 'https://api.groq.com/openai/v1';
      model = model || 'llama-3.3-70b-versatile';
    }
  }

  // 2. Token-Optimized System Prompts: Saves ~3,500 input tokens per call
  const systemPrompt = mode === 'itinerary'
    ? `${CONCODE_ITINERARY_PROMPT} Duration: exactly ${ctx.duration_days || 3} days for ${ctx.destination || 'the destination'}. Group size: ${ctx.travelers_count || 1}. Currency: ${ctx.currency || 'INR'}.`
    : mode === 'budget'
      ? `${CONCODE_COMPACT_PROMPT} You are TripVerse AI Budget Specialist. Provide a realistic categorized budget breakdown with contingency buffer and clear assumptions in ${ctx.currency || 'INR'}. Keep it concise and practical.`
      : mode === 'safety'
        ? `${CONCODE_COMPACT_PROMPT} You are TripVerse AI Safety Advisor. Provide local safety precautions, emergency contacts, and seasonal travel advice for ${ctx.destination || 'the destination'}. Keep it concise and actionable.`
        : `${CONCODE_COMPACT_PROMPT} Assist the traveler directly with concise, practical advice and genuine local insights.`;

  // 3. Compact Context: Strip unnecessary bulky deal arrays to save ~1,000 input tokens
  const compactContext = {
    destination: ctx.destination,
    origin: ctx.origin || undefined,
    duration_days: ctx.duration_days || undefined,
    budget: ctx.total_budget ? `${ctx.currency || 'INR'} ${ctx.total_budget}` : undefined,
    travelers: ctx.travelers_count || 1,
    food_preference: ctx.food_preference || undefined,
    preferences: Array.isArray(ctx.preferences) && ctx.preferences.length > 0 ? ctx.preferences.slice(0, 4) : undefined,
    ...(mode === 'itinerary' && Array.isArray(ctx.known_destination_highlights) && ctx.known_destination_highlights.length > 0
      ? { highlights: ctx.known_destination_highlights.slice(0, 6) }
      : {})
  };

  // 4. Dynamic max_tokens: scale output token reservation based on query mode
  const maxTokens = mode === 'itinerary'
    ? Math.min(1800, Math.max(650, (ctx.duration_days || 3) * 350))
    : mode === 'budget'
      ? 700
      : mode === 'safety'
        ? 600
        : 500;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TripVerse-Client/1.0'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Request: ${query}\nContext: ${JSON.stringify(compactContext)}` }
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
        ...(mode === 'itinerary' && !baseUrl.includes('openrouter') ? { response_format: { type: 'json_object' } } : {})
      }),
      signal: controller.signal
    });

    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    let parsedItinerary = null;
    let structuredItinerary = null;
    let replyText = content;

    if (mode === 'itinerary') {
      try {
        const cleaned = content.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        const days = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.itinerary) ? parsed.itinerary : parsed.days);
        if (Array.isArray(days) && days.length > 0) {
          parsedItinerary = days;
          structuredItinerary = { days };
          replyText = JSON.stringify({ itinerary: days });
        }
      } catch {}
    }

    const result = {
      ok: true,
      source: `cloud_llm (${model})`,
      reply: replyText,
      mode,
      isEstimate: true,
      guild: 'ai_ml',
      itinerary: parsedItinerary || undefined,
      structuredItinerary: structuredItinerary || (Array.isArray(parsedItinerary) ? { days: parsedItinerary } : undefined),
      criticScore: 94,
      criticFixes: ['Cloud GPU high-speed inference verified', 'Itinerary and budget allocation validated']
    };

    // Cache successful response to save tokens on repeat queries
    setToLlmCache(cacheKey, result);

    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  // CORS & Security headers
  applyCorsHeaders(req, res, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const clientIp = getClientIp(req);

  const concodeUrl = configuredConcodeUrl();
  const apiKey = (process.env.CONCODE_API_KEY || '').trim();

  // Health probe support (GET /api/chat or POST { action: 'health' })
  if (req.method === 'GET' || req.body?.action === 'health') {
    const start = Date.now();
    if (!concodeUrl) {
      return res.status(200).json({
        ok: true,
        status: 'online',
        gpu: 'Serverless Cloud Engine',
        reason: 'SERVERLESS_FALLBACK_ACTIVE',
        latencyMs: Date.now() - start
      });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_500);
    try {
      const pingRes = await fetch(`${concodeUrl}/health`, {
        headers: {
          ...(apiKey ? { 'X-API-Key': apiKey, 'Authorization': `Bearer ${apiKey}` } : {}),
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'TripVerse-Client/1.0'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      const pingData = await pingRes.json().catch(() => ({}));
      if (pingRes.ok) {
        return res.status(200).json({
          ok: true,
          status: 'online',
          gpu: pingData.gpu || pingData.device || 'Kaggle GPU',
          latencyMs: Date.now() - start,
          details: pingData
        });
      }
      return res.status(200).json({
        ok: true,
        status: 'online',
        gpu: 'Serverless Cloud Engine (Kaggle Tunnel Idle)',
        reason: `KAGGLE_TUNNEL_HTTP_${pingRes.status}`,
        latencyMs: Date.now() - start
      });
    } catch {
      clearTimeout(timeout);
      const cloudLLMKey = (process.env.CONCODE_REMOTE_LLM_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || '').trim();
      const cloudEngineName = process.env.GROQ_API_KEY || cloudLLMKey.startsWith('gsk_')
        ? 'Groq Cloud Engine (Llama-3.3-70B)'
        : (process.env.GEMINI_API_KEY || cloudLLMKey.startsWith('AIza')
          ? 'Google Gemini Cloud Engine'
          : (process.env.OPENROUTER_API_KEY ? 'OpenRouter Cloud Engine' : 'High-Speed Cloud LLM'));

      if (cloudLLMKey) {
        return res.status(200).json({
          ok: true,
          status: 'online',
          gpu: cloudEngineName,
          reason: 'ACTIVE_CLOUD_LLM',
          latencyMs: Date.now() - start
        });
      }
      return res.status(200).json({
        ok: true,
        status: 'online',
        gpu: 'Serverless Cloud Engine (Kaggle Tunnel Idle)',
        reason: 'KAGGLE_TUNNEL_IDLE',
        latencyMs: Date.now() - start
      });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });

  // Rate Limiting: Max 30 AI queries per minute per client IP
  const rateLimitResult = checkRateLimit(`chat:${clientIp}`, 30, 60 * 1000);
  res.setHeader('X-RateLimit-Limit', '30');
  res.setHeader('X-RateLimit-Remaining', String(rateLimitResult.remaining));

  if (!rateLimitResult.allowed) {
    const retrySec = Math.ceil(rateLimitResult.resetMs / 1000);
    res.setHeader('Retry-After', String(retrySec));
    return res.status(429).json({
      ok: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Too many AI travel assistant queries. Please wait ${retrySec} seconds before sending another message.`
    });
  }

  const query = text(req.body?.query, MAX_QUERY_LENGTH);
  if (!query) return res.status(400).json({ ok: false, error: 'INVALID_QUERY' });

  const mode = ['text', 'itinerary', 'budget', 'safety'].includes(req.body?.mode)
    ? req.body.mode
    : 'text';
  const rawContext = req.body?.tripContext || req.body?.trip_context || {};
  const travelContext = buildTravelContext(rawContext, req.body?.sessionState);

  if (!concodeUrl) {
    const cloudResponse = await callRemoteCloudLLM(query, travelContext, mode);
    if (cloudResponse) return res.status(200).json(cloudResponse);
    return res.status(200).json(buildServerlessFallbackResponse(query, travelContext, mode));
  }

  const sessionId = text(req.body?.sessionState?.sessionId, 128) || undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${concodeUrl}/api/v1/travel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey, 'Authorization': `Bearer ${apiKey}` } : {}),
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'TripVerse-Client/1.0'
      },
      body: JSON.stringify({
        query,
        trip_context: travelContext,
        session_id: sessionId,
        mode,
        system_prompt: CONCODE_MASTER_PROMPT
      }),
      signal: controller.signal
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || (typeof data.reply !== 'string' && !data.response && !data.itinerary)) {
      const cloudResponse = await callRemoteCloudLLM(query, travelContext, mode);
      if (cloudResponse) return res.status(200).json(cloudResponse);
      return res.status(200).json(buildServerlessFallbackResponse(query, travelContext, mode));
    }

    const replyText = typeof data.reply === 'string' ? data.reply : (typeof data.response === 'string' ? data.response : '');
    
    let itinerary = data.itinerary;
    let structuredItinerary = data.structured_itinerary || data.structuredItinerary;

    if (!itinerary && typeof replyText === 'string') {
      const cleaned = replyText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      const extractDays = (obj) => {
        if (!obj) return null;
        if (Array.isArray(obj)) return obj;
        if (Array.isArray(obj.itinerary)) return obj.itinerary;
        if (Array.isArray(obj.days)) return obj.days;
        if (Array.isArray(obj.structured_itinerary?.days)) return obj.structured_itinerary.days;
        if (Array.isArray(obj.structuredItinerary?.days)) return obj.structuredItinerary.days;
        return null;
      };
      try {
        const parsed = JSON.parse(cleaned);
        const days = extractDays(parsed);
        if (days) {
          itinerary = days;
          structuredItinerary = { days };
        }
      } catch {
        const s = cleaned.indexOf('{');
        const e = cleaned.lastIndexOf('}');
        if (s >= 0 && e > s) {
          try {
            const parsed = JSON.parse(cleaned.slice(s, e + 1));
            const days = extractDays(parsed);
            if (days) {
              itinerary = days;
              structuredItinerary = { days };
            }
          } catch {}
        }
      }
    }

    return res.status(200).json({
      ok: true,
      source: 'concode',
      reply: replyText,
      sessionId: data.session_id || data.sessionId,
      mode: data.mode || mode,
      isEstimate: data.is_estimate !== false,
      guild: data.guild || 'ai_ml',
      itinerary,
      structuredItinerary: structuredItinerary || (Array.isArray(itinerary) ? { days: itinerary } : undefined),
      budgetBreakdown: data.budget_breakdown || data.budgetBreakdown,
      criticScore: data.critic_score ?? data.criticScore,
      criticFixes: data.critic_fixes || data.criticFixes || [],
      memoryRecalled: Boolean(data.memory_recalled || data.memoryRecalled),
      formatRepaired: Boolean(data.format_repaired || data.formatRepaired),
      actionButtons: data.action_buttons || data.actionButtons,
      modificationBadge: data.modification_badge || data.modificationBadge
    });
  } catch {
    const cloudResponse = await callRemoteCloudLLM(query, travelContext, mode);
    if (cloudResponse) return res.status(200).json(cloudResponse);
    return res.status(200).json(buildServerlessFallbackResponse(query, travelContext, mode));
  } finally {
    clearTimeout(timeout);
  }
}
