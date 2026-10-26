import { CONCODE_MASTER_PROMPT } from './concodePrompt.js';
import { applyCorsHeaders, checkRateLimit, getClientIp } from './rateLimiter.js';

// Vercel Serverless Function: private TripVerse-to-CONCODE travel proxy.
// The CONCODE key exists only in Vercel environment variables, never in the app bundle.

const MAX_QUERY_LENGTH = 12_000;
const UPSTREAM_TIMEOUT_MS = 45_000;

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
    destination_region: text(tripContext.destinationRegion || '', 120),
    origin: text(tripContext.origin || '', 160),
    start_date: text(tripContext.startDate || '', 30),
    pacing: text(tripContext.pacing || '', 30),
    duration_days: positiveNumber(tripContext.durationDays || sessionState.durationDays, 0, 60),
    total_budget: positiveNumber(tripContext.totalBudget || sessionState.budget, 0, 100_000_000),
    budget_mode: text(tripContext.budgetMode || 'total', 20),
    currency: text(tripContext.currency || 'INR', 12) || 'INR',
    travelers_count: positiveNumber(tripContext.travelersCount || sessionState.travelersCount, 1, 30),
    traveler_type: text(tripContext.travelerType || '', 80),
    preferences: stringList(tripContext.preferences || sessionState.preferences, 24),
    special_requests: text(tripContext.specialRequests || '', 1_000),
    transport_mode: text(tripContext.transportMode || '', 80),
    accommodation_type: text(tripContext.accommodationType || '', 80),
    food_preference: text(tripContext.foodPreference || '', 80),
    priorities: stringList(tripContext.priorities, 12),
    known_destination_highlights: stringList(tripContext.knownDestinationHighlights, 30),
    transit_hubs: tripContext.transitHubs && typeof tripContext.transitHubs === 'object' ? tripContext.transitHubs : undefined,
    transport_options: transportOptions(tripContext.transportDeals)
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

  const highlights = Array.isArray(ctx.known_destination_highlights) && ctx.known_destination_highlights.length > 0
    ? ctx.known_destination_highlights
    : [
        `${dest} Heritage Citadel & Courtyard`,
        `${dest} Scenic Waterfront & Promenade`,
        `${dest} Old Bazaar & Artisan Quarter`,
        `${dest} Hilltop Sunset Panorama`,
        `${dest} Cultural Museum & Gardens`,
        `${dest} Historic Temple & Stepwell`,
        `${dest} Nature Trail & Viewpoint`,
        `${dest} Craft Village & Local Market`
      ];

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
    buffer: Math.round(budget * 0.07),
    total: budget,
    isEstimate: true,
    currencySymbol: '₹'
  };

  if (mode === 'itinerary') {
    return {
      ok: true,
      reply: JSON.stringify({ itinerary }),
      mode: 'itinerary',
      isEstimate: true,
      guild: 'ai_ml',
      itinerary,
      structuredItinerary: { days: itinerary },
      budgetBreakdown
    };
  }

  const transitHubNote = ctx.transit_hubs?.guidance
    ? `\n• **Transit Hub Guidance:** ${ctx.transit_hubs.guidance}`
    : '';

  const replyText =
    `**ConCode Travel Intelligence — ${days}-Day ${dest} Plan (${travelers} Traveler${travelers > 1 ? 's' : ''} • ₹${budget.toLocaleString('en-IN')} Target)**\n\n` +
    `Here is your tailored travel guidance for **${origin} → ${dest}** regarding *"${query.slice(0, 140)}"*:\n\n` +
    `• **Key Sights & Pacing:** ${itinerary.map((d) => `Day ${d.dayNumber}: ${d.title.replace(/^Day\s+\d+\s*[—-]\s*/i, '')}`).join(' | ')}\n` +
    `• **Dietary Profile:** ${foodPref.toUpperCase()} dining preferences applied across all meal stops.\n` +
    `• **Estimated Budget Allocation:** Transit ~₹${budgetBreakdown.transport.toLocaleString('en-IN')} • Stays ~₹${budgetBreakdown.stays.toLocaleString('en-IN')} • Food ~₹${budgetBreakdown.food.toLocaleString('en-IN')} • Sights & Buffer ~₹${(budgetBreakdown.activities + budgetBreakdown.buffer).toLocaleString('en-IN')}` +
    `${transitHubNote}\n\n` +
    `*Note: All fares, timings, and budgets are planning estimates. Verify live availability on official booking portals before departure.*`;

  return {
    ok: true,
    reply: replyText,
    mode,
    isEstimate: true,
    guild: mode === 'budget' ? 'database' : mode === 'safety' ? 'security' : 'ai_ml',
    itinerary,
    structuredItinerary: {
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
    },
    budgetBreakdown
  };
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
        gpu: 'ConCode Serverless Engine',
        latencyMs: Date.now() - start
      });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_500);
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
        gpu: 'ConCode Serverless Engine',
        latencyMs: Date.now() - start
      });
    } catch {
      clearTimeout(timeout);
      return res.status(200).json({
        ok: true,
        status: 'online',
        gpu: 'ConCode Serverless Engine',
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
  const travelContext = buildTravelContext(req.body?.tripContext, req.body?.sessionState);

  if (!concodeUrl) {
    return res.status(200).json(buildServerlessFallbackResponse(query, travelContext, mode));
  }

  const sessionId = text(req.body?.sessionState?.sessionId, 128) || undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

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
      reply: replyText,
      sessionId: data.session_id || data.sessionId,
      mode: data.mode || mode,
      isEstimate: data.is_estimate !== false,
      guild: data.guild || 'ai_ml',
      itinerary,
      structuredItinerary: structuredItinerary || (Array.isArray(itinerary) ? { days: itinerary } : undefined),
      budgetBreakdown: data.budget_breakdown || data.budgetBreakdown,
      actionButtons: data.action_buttons || data.actionButtons,
      modificationBadge: data.modification_badge || data.modificationBadge
    });
  } catch {
    return res.status(200).json(buildServerlessFallbackResponse(query, travelContext, mode));
  } finally {
    clearTimeout(timeout);
  }
}
