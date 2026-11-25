import { Trip } from '../types/trip';
import { LiveMarketQuoteResult } from './liveMarketQuoteService';

const PRICE_WATCH_PREFIX = 'tripverse_price_watch_v1_';

export interface PriceWatchBaseline {
  tripId: string;
  origin: string;
  destination: string;
  baselineFlightGroupInr: number;
  baselineHotelNightlyInr: number;
  createdAt: string;
}

export interface PriceWatchComparison {
  isWatching: boolean;
  baseline: PriceWatchBaseline | null;
  currentFlightGroupInr: number;
  currentHotelNightlyInr: number;
  flightDeltaInr: number; // negative = price dropped!
  hotelNightlyDeltaInr: number; // negative = price dropped!
  totalTripDeltaInr: number; // negative = total trip cheaper now!
}

export interface DirectCheckoutLinks {
  googleFlightsUrl: string;
  skyscannerUrl: string;
  bookingHotelsUrl: string;
  makeMyTripRailsOrFlightsUrl: string;
}

function formatDateIso(dateInput?: string, offsetDays: number = 0): string {
  const base = dateInput ? new Date(dateInput) : new Date(Date.now() + 14 * 86400 * 1000);
  const valid = Number.isNaN(base.getTime()) ? new Date(Date.now() + 14 * 86400 * 1000) : new Date(base);
  valid.setDate(valid.getDate() + offsetDays);
  return valid.toISOString().slice(0, 10);
}

export function getSavedPriceWatch(tripId: string): PriceWatchBaseline | null {
  if (typeof localStorage === 'undefined' || !tripId) return null;
  try {
    const raw = localStorage.getItem(`${PRICE_WATCH_PREFIX}${tripId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PriceWatchBaseline;
    if (parsed && parsed.tripId === tripId) return parsed;
  } catch {}
  return null;
}

export function enableTripPriceWatch(
  trip: Trip,
  currentFlightGroupInr: number,
  currentHotelNightlyInr: number
): PriceWatchBaseline {
  const record: PriceWatchBaseline = {
    tripId: trip.id,
    origin: trip.origin || 'Mumbai',
    destination: trip.destination,
    baselineFlightGroupInr: Math.max(0, Math.round(currentFlightGroupInr)),
    baselineHotelNightlyInr: Math.max(0, Math.round(currentHotelNightlyInr)),
    createdAt: new Date().toISOString()
  };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`${PRICE_WATCH_PREFIX}${trip.id}`, JSON.stringify(record));
    } catch {}
  }
  return record;
}

export function disableTripPriceWatch(tripId: string): void {
  if (typeof localStorage === 'undefined' || !tripId) return;
  try {
    localStorage.removeItem(`${PRICE_WATCH_PREFIX}${tripId}`);
  } catch {}
}

export function evaluatePriceWatch(
  trip: Trip,
  liveQuotes: LiveMarketQuoteResult | null,
  fallbackFlightGroupInr: number,
  fallbackHotelNightlyInr: number
): PriceWatchComparison {
  const baseline = getSavedPriceWatch(trip.id);
  const currentFlightGroupInr = Math.round(
    liveQuotes?.flights?.bestOffer?.totalGroupAmount || fallbackFlightGroupInr || 0
  );
  const currentHotelNightlyInr = Math.round(
    liveQuotes?.hotels?.[0]?.nightlyRatePerRoom || fallbackHotelNightlyInr || 0
  );

  if (!baseline) {
    return {
      isWatching: false,
      baseline: null,
      currentFlightGroupInr,
      currentHotelNightlyInr,
      flightDeltaInr: 0,
      hotelNightlyDeltaInr: 0,
      totalTripDeltaInr: 0
    };
  }

  const nights = Math.max(1, (trip.durationDays || 3) - 1);
  const rooms = Math.max(1, Math.ceil((trip.travelersCount || 1) / 2));

  const flightDeltaInr =
    baseline.baselineFlightGroupInr > 0 && currentFlightGroupInr > 0
      ? currentFlightGroupInr - baseline.baselineFlightGroupInr
      : 0;
  const hotelNightlyDeltaInr =
    baseline.baselineHotelNightlyInr > 0 && currentHotelNightlyInr > 0
      ? currentHotelNightlyInr - baseline.baselineHotelNightlyInr
      : 0;
  const totalTripDeltaInr = flightDeltaInr + hotelNightlyDeltaInr * nights * rooms;

  return {
    isWatching: true,
    baseline,
    currentFlightGroupInr,
    currentHotelNightlyInr,
    flightDeltaInr,
    hotelNightlyDeltaInr,
    totalTripDeltaInr
  };
}

export function buildDirectCheckoutLinks(
  trip: Trip,
  originIata?: string,
  destIata?: string
): DirectCheckoutLinks {
  const origCity = (trip.origin || 'Mumbai').split(',')[0].trim();
  const destCity = (trip.destination || 'Goa').split(',')[0].trim();
  const pax = Math.max(1, trip.travelersCount || 1);
  const rooms = Math.max(1, Math.ceil(pax / 2));
  const checkIn = formatDateIso(trip.startDate, 0);
  const checkOut = formatDateIso(trip.startDate, Math.max(1, (trip.durationDays || 3) - 1));

  const affiliateId = (import.meta as any).env?.VITE_BOOKING_AFFILIATE_ID || '';
  const utm = 'utm_source=tripverse&utm_medium=price_watch';

  const flightQuery = encodeURIComponent(`Flights from ${origCity} to ${destCity} on ${checkIn} return ${checkOut} ${pax} adults`);
  const googleFlightsUrl = `https://www.google.com/travel/flights?q=${flightQuery}&${utm}`;

  const origSlug = (originIata || origCity).toLowerCase().replace(/[^a-z0-9]/g, '');
  const destSlug = (destIata || destCity).toLowerCase().replace(/[^a-z0-9]/g, '');
  const skyIn = checkIn.slice(2).replace(/-/g, '');
  const skyOut = checkOut.slice(2).replace(/-/g, '');
  const skyscannerUrl = `https://www.skyscanner.co.in/transport/flights/${origSlug}/${destSlug}/${skyIn}/${skyOut}/?adults=${pax}&${utm}`;

  const aidParam = affiliateId ? `&aid=${encodeURIComponent(affiliateId)}` : '';
  const bookingHotelsUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destCity)}&checkin=${checkIn}&checkout=${checkOut}&group_adults=${pax}&no_rooms=${rooms}${aidParam}&${utm}`;

  const makeMyTripRailsOrFlightsUrl =
    trip.transportMode === 'train'
      ? `https://www.makemytrip.com/railways/?${utm}`
      : `https://www.makemytrip.com/flights/?${utm}`;

  return {
    googleFlightsUrl,
    skyscannerUrl,
    bookingHotelsUrl,
    makeMyTripRailsOrFlightsUrl
  };
}
