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

export default async function handler(req, res) {
  // CORS & Security headers
  applyCorsHeaders(req, res, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const clientIp = getClientIp(req);

  const concodeUrl = configuredConcodeUrl();
  const apiKey = (process.env.CONCODE_API_KEY || '').trim();

  // Health probe support (GET /api/chat or POST { action: 'health' })
  if (req.method === 'GET' || req.body?.action === 'health') {
    if (!concodeUrl) {
      return res.status(503).json({ ok: false, status: 'offline', error: 'CONCODE_NOT_CONFIGURED' });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    const start = Date.now();
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
      return res.status(200).json({
        ok: pingRes.ok,
        status: pingRes.ok ? 'online' : 'error',
        latencyMs: Date.now() - start,
        details: pingData
      });
    } catch (err) {
      clearTimeout(timeout);
      return res.status(200).json({
        ok: false,
        status: 'unreachable',
        error: err?.message || 'HEALTH_CHECK_FAILED'
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

  if (!concodeUrl) return res.status(503).json({ ok: false, error: 'CONCODE_NOT_CONFIGURED' });

  const mode = ['text', 'itinerary', 'budget', 'safety'].includes(req.body?.mode)
    ? req.body.mode
    : 'text';
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
        trip_context: buildTravelContext(req.body?.tripContext, req.body?.sessionState),
        session_id: sessionId,
        mode,
        system_prompt: CONCODE_MASTER_PROMPT
      }),
      signal: controller.signal
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || (typeof data.reply !== 'string' && !data.response && !data.itinerary)) {
      return res.status(502).json({ ok: false, error: 'CONCODE_UPSTREAM_ERROR', details: data });
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
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error?.name === 'AbortError' ? 'CONCODE_TIMEOUT' : 'CONCODE_UNREACHABLE'
    });
  } finally {
    clearTimeout(timeout);
  }
}
