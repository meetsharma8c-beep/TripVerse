/**
 * Live Market Quotes Client Service (liveMarketQuoteService.ts)
 * Queries `/api/live-market-quotes` (Amadeus Flight Offers & Hotel Offers) and applies
 * real-time market fares & room rates to a Trip's budgetBreakdown and hotelOptions.
 * Never fabricates live quotes when Amadeus credentials are not configured on Vercel.
 */

import { Trip } from '../types/trip';
import { Hotel, buildHotelBookingUrl } from './hotelService';
import { resolveDestinationImage } from '../utils/destinationImages';
import { resolveApiUrl } from './deviceService';
import { resolveTransitContext } from './transportFeasibilityEngine';
import { convertToINR } from './currencyService';

export interface LiveFlightOfferQuote {
  totalGroupAmount: number;
  perPersonAmount: number;
  currency: string;
  carrierCode: string;
  carrierName: string;
  stops: number;
  duration: string;
  departureAt?: string;
}

export interface LiveHotelOfferQuote {
  hotelId: string;
  name: string;
  rating: number;
  totalStayAmount: number;
  nightlyRatePerRoom: number;
  currency: string;
  roomCategory: string;
  available: boolean;
  bookingLink?: string;
  image?: string;
}

export interface LiveMarketQuoteResult {
  isLiveMarket: boolean;
  provider: 'google_live_serpapi' | 'amadeus_live' | 'seasonal_model_fallback';
  environment?: 'sandbox' | 'production';
  reason?: string;
  currency: string;
  flights: {
    bestOffer: LiveFlightOfferQuote;
    medianGroupAmount: number;
    sampleCount: number;
    offers: LiveFlightOfferQuote[];
  } | null;
  hotels: LiveHotelOfferQuote[];
  fetchedAt: string;
}

const CITY_IATA_MAP: Record<string, string> = {
  vadodara: 'BDQ',
  baroda: 'BDQ',
  ahmedabad: 'AMD',
  mumbai: 'BOM',
  bombay: 'BOM',
  delhi: 'DEL',
  'new delhi': 'DEL',
  bengaluru: 'BLR',
  bangalore: 'BLR',
  hyderabad: 'HYD',
  chennai: 'MAA',
  kolkata: 'CCU',
  pune: 'PNQ',
  jaipur: 'JAI',
  udaipur: 'UDR',
  goa: 'GOI',
  kochi: 'COK',
  surat: 'STV',
  varanasi: 'VNS',
  amritsar: 'ATQ',
  srinagar: 'SXR',
  leh: 'IXL',
  agra: 'AGR',
  mathura: 'AGR',
  vrindavan: 'AGR',
  dubai: 'DXB',
  'abu dhabi': 'AUH',
  singapore: 'SIN',
  bangkok: 'BKK',
  bali: 'DPS',
  tokyo: 'TYO',
  osaka: 'OSA',
  kyoto: 'OSA',
  paris: 'PAR',
  london: 'LON',
  rome: 'ROM',
  'new york': 'NYC',
  'new jersey': 'EWR',
  newark: 'EWR',
  'los angeles': 'LAX',
  'san francisco': 'SFO',
  zurich: 'ZRH',
  amsterdam: 'AMS',
  sydney: 'SYD',
  toronto: 'YTO',
};

const CLIENT_QUOTE_CACHE = new Map<string, LiveMarketQuoteResult>();

export function resolveIataCodeForCity(cityName: string, fallbackAirportCode?: string): string {
  const clean = (cityName || '').split(',')[0].trim().toLowerCase();
  if (CITY_IATA_MAP[clean]) return CITY_IATA_MAP[clean];
  for (const [k, code] of Object.entries(CITY_IATA_MAP)) {
    if (clean.includes(k)) return code;
  }
  if (fallbackAirportCode && /^[A-Z]{3}$/i.test(fallbackAirportCode)) {
    return fallbackAirportCode.toUpperCase();
  }
  return '';
}

function computeFutureIsoDates(startDate?: string, durationDays = 3): { departureDate: string; returnDate: string } {
  const now = new Date();
  let start = startDate ? new Date(startDate) : new Date(now.getTime() + 14 * 86_400_000);
  // Amadeus rejects past departure dates; ensure at least tomorrow
  const tomorrow = new Date(now.getTime() + 86_400_000);
  if (Number.isNaN(start.getTime()) || start < tomorrow) {
    start = new Date(now.getTime() + 14 * 86_400_000);
  }
  const end = new Date(start.getTime() + Math.max(1, durationDays - 1) * 86_400_000);
  return {
    departureDate: start.toISOString().slice(0, 10),
    returnDate: end.toISOString().slice(0, 10),
  };
}

export async function fetchLiveMarketQuotes(params: {
  origin: string;
  destination: string;
  startDate?: string;
  durationDays: number;
  travelersCount: number;
  transportMode?: string;
  currency?: string;
  originCoords?: { lat: number; lng: number };
  destCoords?: { lat: number; lng: number };
}): Promise<LiveMarketQuoteResult> {
  const originCtx = resolveTransitContext(params.origin || '', params.originCoords);
  const destCtx = resolveTransitContext(params.destination || '', params.destCoords);

  const originCode = resolveIataCodeForCity(params.origin, originCtx.primaryAirport?.code);
  const destCode = resolveIataCodeForCity(params.destination, destCtx.primaryAirport?.code);
  const { departureDate, returnDate } = computeFutureIsoDates(params.startDate, params.durationDays);
  const adults = Math.max(1, Math.min(9, params.travelersCount || 2));
  const rooms = Math.max(1, Math.ceil(adults / 2));
  const mode = params.transportMode || 'flight';
  const currency = 'INR'; // Internal TripVerse budget math is normalized in INR

  const cleanDestName = (params.destination || '').split(',')[0].trim();
  const cacheKey = `${mode}|${originCode}|${destCode}|${cleanDestName.toLowerCase()}|${departureDate}|${returnDate}|${adults}|${rooms}`;
  const cached = CLIENT_QUOTE_CACHE.get(cacheKey);
  if (cached) return cached;

  if ((!destCode && !cleanDestName) || typeof fetch === 'undefined') {
    return {
      isLiveMarket: false,
      provider: 'seasonal_model_fallback',
      reason: 'NO_DESTINATION',
      currency,
      flights: null,
      hotels: [],
      fetchedAt: new Date().toISOString(),
    };
  }

  const qs = new URLSearchParams({
    action: 'market_quotes',
    originCode,
    destCode,
    destination: cleanDestName,
    departureDate,
    returnDate,
    adults: String(adults),
    rooms: String(rooms),
    currency,
    mode,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7_000);

  try {
    const res = await fetch(`${resolveApiUrl('/api/transit-schedules')}?${qs.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        const result: LiveMarketQuoteResult = {
          isLiveMarket: Boolean(data.isLiveMarket),
          provider: data.isLiveMarket ? (data.provider || 'google_live_serpapi') : 'seasonal_model_fallback',
          environment: data.environment,
          reason: data.reason,
          currency: data.currency || currency,
          flights: data.flights || null,
          hotels: Array.isArray(data.hotels) ? data.hotels : [],
          fetchedAt: data.fetchedAt || new Date().toISOString(),
        };
        CLIENT_QUOTE_CACHE.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    clearTimeout(timer);
  }

  return {
    isLiveMarket: false,
    provider: 'seasonal_model_fallback',
    reason: 'NETWORK_UNAVAILABLE',
    currency,
    flights: null,
    hotels: [],
    fetchedAt: new Date().toISOString(),
  };
}

function normalizeToINR(amount: number, currency: string): number {
  const upper = (currency || 'INR').toUpperCase();
  if (upper === 'INR') return Math.round(amount);
  return Math.round(convertToINR(amount, upper as any));
}

/**
 * Re-calibrates a Trip's flight cost, hotel options, and budgetBreakdown directly
 * from real-time Amadeus live market quotes. Leaves trip untouched if `isLiveMarket` is false.
 */
export function applyLiveMarketQuotesToTrip(trip: Trip, quotes: LiveMarketQuoteResult): Trip {
  if (!quotes || !quotes.isLiveMarket) return trip;

  const updatedBreakdown = { ...trip.budgetBreakdown };
  let updatedSelectedHotel = trip.selectedHotel;
  let updatedHotelOptions = trip.hotelOptions;
  const notes: string[] = [];

  // 1. Apply real-time live flight fare when trip mode is flight
  if (trip.transportMode === 'flight' && quotes.flights?.bestOffer) {
    const best = quotes.flights.bestOffer;
    const liveFlightINR = normalizeToINR(best.totalGroupAmount, best.currency);
    if (liveFlightINR > 0) {
      updatedBreakdown.transportation = liveFlightINR;
      notes.push(`Live ${best.carrierName} fare (${best.stops === 0 ? 'nonstop' : `${best.stops}-stop`})`);
    }
  }

  // 2. Apply real-time live hotel availability & nightly rates
  if (quotes.hotels && quotes.hotels.length > 0) {
    const destCity = (trip.destination || 'Destination').split(',')[0].trim();
    const { departureDate, returnDate } = computeFutureIsoDates(trip.startDate, trip.durationDays);
    const fallbackImg = resolveDestinationImage(trip.destination || destCity);

    const mappedHotels: Hotel[] = quotes.hotels.map((h) => {
      const nightlyINR = normalizeToINR(h.nightlyRatePerRoom, h.currency);
      const tier: Hotel['tier'] =
        nightlyINR >= 8500 ? 'luxury' : nightlyINR >= 4500 ? 'boutique' : nightlyINR >= 2400 ? 'mid_range' : 'budget';
      const links = buildHotelBookingUrl(destCity, h.name, departureDate, returnDate, trip.travelersCount || 2);
      return {
        id: `amadeus-${h.hotelId}`,
        name: h.name,
        destination: destCity,
        tier,
        starRating: tier === 'luxury' ? 5 : tier === 'boutique' ? 4 : 3,
        userRating: Math.min(5, Math.max(3.5, Number(h.rating) || 4.3)),
        reviewCount: 0,
        nightlyRate: nightlyINR,
        currency: 'INR',
        image: h.image || fallbackImg,
        address: `${destCity} City Center`,
        neighborhood: `${destCity} Center`,
        amenities: ['Live Verified Rate', h.roomCategory || 'Standard Room', 'Wi-Fi'],
        roomType: h.roomCategory || 'Standard Room',
        bookingUrl: h.bookingLink || links.bookingDotCom,
        agodaUrl: links.agoda,
        googleHotelsUrl: links.googleHotels,
        bookingPartner: 'Booking.com',
        cancellationPolicy: 'Check live cancellation terms on booking partner',
        highlights: ['Live Market Inventory', `${h.roomCategory || 'Standard Room'} available`],
      };
    });

    // Pick the live hotel anchored to real remaining purchasing power after live transit fares
    const nights = Math.max(1, (trip.durationDays || 3) - 1);
    const rooms = Math.max(1, Math.ceil((trip.travelersCount || 2) / 2));
    const plannedOnGround = updatedBreakdown.food + updatedBreakdown.activities + updatedBreakdown.miscellaneous;
    const remainingForStay = Math.max(
      0,
      (trip.totalBudget || 0) - updatedBreakdown.transportation - Math.round(plannedOnGround * 0.65)
    );
    const effectiveStayBudget =
      trip.totalBudget > 0 && updatedBreakdown.transportation + (trip.budgetBreakdown.accommodation || 6000) + plannedOnGround > trip.totalBudget
        ? Math.min(trip.budgetBreakdown.accommodation || 6000, remainingForStay)
        : (trip.budgetBreakdown.accommodation || 6000);

    const targetNightly = Math.max(1200, Math.round(effectiveStayBudget / (nights * rooms)));
    const bestMatch = [...mappedHotels].sort(
      (a, b) => Math.abs(a.nightlyRate - targetNightly) - Math.abs(b.nightlyRate - targetNightly)
    )[0];

    if (bestMatch) {
      updatedSelectedHotel = bestMatch;
      updatedHotelOptions = mappedHotels;
      updatedBreakdown.accommodation = Math.round(bestMatch.nightlyRate * nights * rooms);
      notes.push(`Live stay rate at ${bestMatch.name}`);
    }
  }

  // 3. Rebalance on-ground spend (food, activities, buffer) if live market transit + stay surged above totalBudget
  const rawTotalBeforeRebalance =
    updatedBreakdown.transportation +
    updatedBreakdown.accommodation +
    updatedBreakdown.food +
    updatedBreakdown.activities +
    updatedBreakdown.miscellaneous;

  if (trip.totalBudget > 0 && rawTotalBeforeRebalance > trip.totalBudget) {
    const days = Math.max(1, trip.durationDays || 1);
    const pax = Math.max(1, trip.travelersCount || 1);
    const minFood = Math.min(updatedBreakdown.food, 400 * days * pax);
    const minAct = Math.min(updatedBreakdown.activities, 200 * days * pax);
    const minMisc = Math.min(updatedBreakdown.miscellaneous, Math.round(trip.totalBudget * 0.03));
    const fixedTransitAndStay = updatedBreakdown.transportation + updatedBreakdown.accommodation;
    const targetOnGround = Math.max(minFood + minAct + minMisc, trip.totalBudget - fixedTransitAndStay);
    const currentOnGround = updatedBreakdown.food + updatedBreakdown.activities + updatedBreakdown.miscellaneous;

    if (currentOnGround > 0 && targetOnGround < currentOnGround) {
      const slackAvail = Math.max(0, targetOnGround - (minFood + minAct + minMisc));
      const slackCurr = Math.max(
        1,
        (updatedBreakdown.food - minFood) +
          (updatedBreakdown.activities - minAct) +
          (updatedBreakdown.miscellaneous - minMisc)
      );
      updatedBreakdown.food = Math.round(minFood + ((updatedBreakdown.food - minFood) / slackCurr) * slackAvail);
      updatedBreakdown.activities = Math.round(minAct + ((updatedBreakdown.activities - minAct) / slackCurr) * slackAvail);
      updatedBreakdown.miscellaneous = Math.max(
        minMisc,
        targetOnGround - updatedBreakdown.food - updatedBreakdown.activities
      );
      notes.push('on-ground spend scaled to live market headroom');
    }

    if (trip.transportMode === 'flight' && updatedBreakdown.transportation > trip.totalBudget * 0.65) {
      const pct = Math.round((updatedBreakdown.transportation / trip.totalBudget) * 100);
      notes.push(`live airfare consumes ${pct}% of budget — consider rail/coach to free stay & dining headroom`);
    }
  }

  const newEstimatedTotal =
    updatedBreakdown.transportation +
    updatedBreakdown.accommodation +
    updatedBreakdown.food +
    updatedBreakdown.activities +
    updatedBreakdown.miscellaneous;

  const providerLabel = quotes.provider === 'google_live_serpapi' ? 'Live Google Flights & Hotels' : 'Live Market Feed';

  return {
    ...trip,
    selectedHotel: updatedSelectedHotel,
    hotelOptions: updatedHotelOptions,
    budgetBreakdown: updatedBreakdown,
    estimatedTotal: newEstimatedTotal,
    aiRationale: notes.length > 0
      ? `${trip.aiRationale ? `${trip.aiRationale} ` : ''}Live market calibrated via ${providerLabel} (${notes.join(' + ')}).`
      : trip.aiRationale,
  };
}
