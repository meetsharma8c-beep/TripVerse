// Vercel Serverless Function: Real-Time Live Market Pricing (Amadeus Flight Offers & Hotel Offers)
// Keeps AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET strictly server-side.
// Never fabricates live quotes: returns `isLiveMarket: false` transparently if credentials aren't set.

import { applyCorsHeaders, applyRateLimitHeaders, checkDistributedRateLimit, getClientIp } from './rateLimiter.js';

const CARRIER_NAMES = {
  '6E': 'IndiGo',
  AI: 'Air India',
  IX: 'Air India Express',
  QP: 'Akasa Air',
  SG: 'SpiceJet',
  UK: 'Air India (Vistara)',
  EK: 'Emirates',
  EY: 'Etihad Airways',
  QR: 'Qatar Airways',
  SQ: 'Singapore Airlines',
  TG: 'Thai Airways',
  BA: 'British Airways',
  AF: 'Air France',
  LH: 'Lufthansa',
  LX: 'SWISS',
  KL: 'KLM',
  JL: 'Japan Airlines',
  NH: 'ANA',
  UA: 'United Airlines',
  DL: 'Delta Air Lines',
  AA: 'American Airlines',
  TK: 'Turkish Airlines',
  GA: 'Garuda Indonesia',
  QF: 'Qantas',
};

let cachedToken = null;
let cachedTokenExpiresAt = 0;

const QUOTE_CACHE = new Map();
const QUOTE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min TTL
const QUOTE_CACHE_MAX = 150;

function getAmadeusBaseUrl() {
  const env = String(process.env.AMADEUS_ENV || 'test').trim().toLowerCase();
  return env === 'production' || env === 'prod'
    ? 'https://api.amadeus.com'
    : 'https://test.api.amadeus.com';
}

async function getAmadeusAccessToken(clientId, clientSecret) {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const baseUrl = getAmadeusBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_500);

  try {
    const res = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.access_token) return null;
    cachedToken = data.access_token;
    cachedTokenExpiresAt = Date.now() + (Number(data.expires_in) || 1700) * 1000;
    return cachedToken;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function formatIsoDuration(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}h` : '';
  const m = match[2] ? `${match[2]}m` : '';
  return [h, m].filter(Boolean).join(' ') || iso;
}

async function fetchAmadeusFlights(token, params) {
  const { originCode, destCode, departureDate, returnDate, adults, currencyCode } = params;
  if (!originCode || !destCode || originCode === destCode || !departureDate) return null;

  const baseUrl = getAmadeusBaseUrl();
  const qs = new URLSearchParams({
    originLocationCode: originCode,
    destinationLocationCode: destCode,
    departureDate,
    ...(returnDate ? { returnDate } : {}),
    adults: String(Math.max(1, Math.min(9, adults || 1))),
    currencyCode: currencyCode || 'INR',
    max: '6',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const res = await fetch(`${baseUrl}/v2/shopping/flight-offers?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const offers = Array.isArray(data?.data) ? data.data : [];
    if (offers.length === 0) return null;

    const parsed = offers
      .map((offer) => {
        const total = Number(offer?.price?.grandTotal || offer?.price?.total || 0);
        const curr = String(offer?.price?.currency || currencyCode || 'INR');
        const firstItin = offer?.itineraries?.[0];
        const firstSeg = firstItin?.segments?.[0];
        const carrierCode = String(firstSeg?.carrierCode || offer?.validatingAirlineCodes?.[0] || '');
        const stops = Math.max(0, (firstItin?.segments?.length || 1) - 1);
        return {
          totalGroupAmount: Math.round(total),
          perPersonAmount: Math.round(total / Math.max(1, adults || 1)),
          currency: curr,
          carrierCode,
          carrierName: CARRIER_NAMES[carrierCode] || carrierCode || 'Airline',
          stops,
          duration: formatIsoDuration(firstItin?.duration),
          departureAt: firstSeg?.departure?.at || '',
        };
      })
      .filter((o) => o.totalGroupAmount > 0)
      .sort((a, b) => a.totalGroupAmount - b.totalGroupAmount);

    if (parsed.length === 0) return null;
    const best = parsed[0];
    const median = parsed[Math.floor(parsed.length / 2)];
    return {
      bestOffer: best,
      medianGroupAmount: median.totalGroupAmount,
      sampleCount: parsed.length,
      offers: parsed.slice(0, 3),
    };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function fetchAmadeusHotels(token, params) {
  const { destCode, checkInDate, checkOutDate, adults, rooms, currencyCode } = params;
  if (!destCode || !checkInDate || !checkOutDate) return [];

  const baseUrl = getAmadeusBaseUrl();
  const controller1 = new AbortController();
  const timer1 = setTimeout(() => controller1.abort(), 4_000);
  let hotelIds = [];
  try {
    const listRes = await fetch(
      `${baseUrl}/v1/reference-data/locations/hotels/by-city?cityCode=${encodeURIComponent(destCode)}&radius=12&radiusUnit=KM&hotelSource=ALL`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller1.signal,
      }
    );
    clearTimeout(timer1);
    if (!listRes.ok) return [];
    const listJson = await listRes.json().catch(() => null);
    hotelIds = (Array.isArray(listJson?.data) ? listJson.data : [])
      .map((h) => h?.hotelId)
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    clearTimeout(timer1);
    return [];
  }

  if (hotelIds.length === 0) return [];

  const controller2 = new AbortController();
  const timer2 = setTimeout(() => controller2.abort(), 5_500);
  try {
    const qs = new URLSearchParams({
      hotelIds: hotelIds.join(','),
      adults: String(Math.max(1, Math.min(9, adults || 1))),
      roomQuantity: String(Math.max(1, Math.min(4, rooms || 1))),
      checkInDate,
      checkOutDate,
      currency: currencyCode || 'INR',
      bestRateOnly: 'true',
    });
    const offerRes = await fetch(`${baseUrl}/v3/shopping/hotel-offers?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller2.signal,
    });
    clearTimeout(timer2);
    if (!offerRes.ok) return [];
    const offerJson = await offerRes.json().catch(() => null);
    const items = Array.isArray(offerJson?.data) ? offerJson.data : [];

    const checkInMs = Date.parse(checkInDate);
    const checkOutMs = Date.parse(checkOutDate);
    const nights = Number.isFinite(checkInMs) && Number.isFinite(checkOutMs)
      ? Math.max(1, Math.round((checkOutMs - checkInMs) / 86_400_000))
      : 1;

    return items
      .map((entry) => {
        const offer = entry?.offers?.[0];
        const total = Number(offer?.price?.total || 0);
        if (!total || total <= 0) return null;
        return {
          hotelId: String(entry?.hotel?.hotelId || ''),
          name: String(entry?.hotel?.name || 'Verified Hotel'),
          rating: Number(entry?.hotel?.rating) || 4.2,
          totalStayAmount: Math.round(total),
          nightlyRatePerRoom: Math.round(total / Math.max(1, nights * Math.max(1, rooms || 1))),
          currency: String(offer?.price?.currency || currencyCode || 'INR'),
          roomCategory: String(offer?.room?.typeEstimated?.category || 'Standard Room'),
          available: entry?.available !== false,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.totalStayAmount - b.totalStayAmount)
      .slice(0, 5);
  } catch {
    clearTimeout(timer2);
    return [];
  }
}

export default async function handler(req, res) {
  applyCorsHeaders(req, res, 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=180, s-maxage=300');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });

  const clientIp = getClientIp(req);
  const rate = await checkDistributedRateLimit(`live-market:${clientIp}`, 30, 60 * 1000);
  applyRateLimitHeaders(res, rate);
  if (!rate.allowed) {
    return res.status(429).json({ ok: false, error: 'RATE_LIMIT_EXCEEDED' });
  }

  const originCode = String(req.query?.originCode || '').trim().toUpperCase();
  const destCode = String(req.query?.destCode || '').trim().toUpperCase();
  const departureDate = String(req.query?.departureDate || '').trim();
  const returnDate = String(req.query?.returnDate || '').trim();
  const adults = Math.max(1, Math.min(9, Number(req.query?.adults) || 2));
  const rooms = Math.max(1, Math.min(4, Number(req.query?.rooms) || Math.ceil(adults / 2)));
  const currencyCode = String(req.query?.currency || 'INR').trim().toUpperCase();
  const mode = String(req.query?.mode || 'flight').trim().toLowerCase();

  const clientId = (process.env.AMADEUS_CLIENT_ID || '').trim();
  const clientSecret = (process.env.AMADEUS_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    return res.status(200).json({
      ok: true,
      isLiveMarket: false,
      provider: 'seasonal_model_fallback',
      reason: 'AMADEUS_CREDENTIALS_NOT_CONFIGURED',
      flights: null,
      hotels: [],
      fetchedAt: new Date().toISOString(),
    });
  }

  const cacheKey = `${mode}|${originCode}|${destCode}|${departureDate}|${returnDate}|${adults}|${rooms}|${currencyCode}`;
  const cached = QUOTE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < QUOTE_CACHE_TTL_MS) {
    return res.status(200).json(cached.payload);
  }

  const token = await getAmadeusAccessToken(clientId, clientSecret);
  if (!token) {
    return res.status(200).json({
      ok: true,
      isLiveMarket: false,
      provider: 'seasonal_model_fallback',
      reason: 'AMADEUS_AUTH_FAILED',
      flights: null,
      hotels: [],
      fetchedAt: new Date().toISOString(),
    });
  }

  const shouldQueryFlights = mode === 'flight' && originCode.length === 3 && destCode.length === 3;
  const shouldQueryHotels = destCode.length === 3 && Boolean(departureDate) && Boolean(returnDate);

  const [flights, hotels] = await Promise.all([
    shouldQueryFlights
      ? fetchAmadeusFlights(token, { originCode, destCode, departureDate, returnDate, adults, currencyCode })
      : Promise.resolve(null),
    shouldQueryHotels
      ? fetchAmadeusHotels(token, { destCode, checkInDate: departureDate, checkOutDate: returnDate, adults, rooms, currencyCode })
      : Promise.resolve([]),
  ]);

  const isLiveMarket = Boolean(flights || (Array.isArray(hotels) && hotels.length > 0));
  const payload = {
    ok: true,
    isLiveMarket,
    provider: isLiveMarket ? 'amadeus_live' : 'seasonal_model_fallback',
    environment: getAmadeusBaseUrl().includes('test.') ? 'sandbox' : 'production',
    currency: currencyCode,
    flights,
    hotels,
    fetchedAt: new Date().toISOString(),
  };

  if (QUOTE_CACHE.size >= QUOTE_CACHE_MAX) {
    const oldest = QUOTE_CACHE.keys().next().value;
    if (oldest) QUOTE_CACHE.delete(oldest);
  }
  QUOTE_CACHE.set(cacheKey, { ts: Date.now(), payload });

  return res.status(200).json(payload);
}
