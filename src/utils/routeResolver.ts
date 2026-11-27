import { Trip, Destination } from '../types/trip';
import { POPULAR_DESTINATIONS } from '../data/destinations';
import { synthesizeDestination } from './destinationImages';

/**
 * Validates that a user-entered location or search query looks like a plausible place name
 * (contains at least 2 Unicode letters and is not pure punctuation, digits, or emojis).
 */
export function isValidPlaceQuery(raw: string): boolean {
  const trimmed = (raw || '').trim();
  if (trimmed.length < 2 || trimmed.length > 120) return false;
  // Require at least 2 letters (supports Latin + international scripts)
  const letters = trimmed.match(/\p{L}/gu);
  if (!letters || letters.length < 2) return false;
  // Reject URL/code/HTML injection symbols or placeholder "does not exist" slugs
  if (/[<>{}[\]\\|`~^]/.test(trimmed)) return false;
  if (/(?:does[- ]not[- ]exist|undefined|null|nan)/i.test(trimmed)) return false;
  return true;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value.replace(/%[0-9a-fA-F]{0,2}/g, '').trim();
  }
}

function formatSlugToTitle(slug: string): string {
  return safeDecodeURIComponent(slug)
    .replace(/^dest-/i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export type TripDetailSubTab =
  | 'itinerary'
  | 'hub'
  | 'packing'
  | 'expenses'
  | 'gems'
  | 'deals'
  | 'route'
  | 'breakstops'
  | 'budget'
  | 'safety';

const VALID_TRIP_SUB_TABS = new Set<TripDetailSubTab>([
  'itinerary',
  'hub',
  'packing',
  'expenses',
  'gems',
  'deals',
  'route',
  'breakstops',
  'budget',
  'safety',
]);

export function parseTripSubTab(raw: string | null | undefined): TripDetailSubTab | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().toLowerCase() as TripDetailSubTab;
  return VALID_TRIP_SUB_TABS.has(cleaned) ? cleaned : undefined;
}

export interface ResolvedRoute {
  tab: string;
  dest: Destination | null;
  tripId: string | null;
  pendingTripId?: string | null;
  subTab?: TripDetailSubTab;
  sharedTripId?: string | null;
  openBooking: boolean;
  openPlanner: boolean;
  openCollab?: boolean;
  openPro?: boolean;
  openResetPassword?: boolean;
  routeNotice?: string;
}

/**
 * Browser Route & Deep Link URL Resolver
 * Resolves pathnames, search params, and hash fragments into initial app state.
 */
export function resolveRouteFromBrowser(loadedTrips: Trip[]): ResolvedRoute {
  if (typeof window === 'undefined') {
    return { tab: 'home', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }
  const pathname = (window.location.pathname || '/').toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const requestedSubTab = parseTripSubTab(searchParams.get('sub'));
  const rawHash = (window.location.hash || '').toLowerCase().replace('#', '');

  // 1. Direct pathname routing (/destination/:slug, /trip/:id, /itinerary/:id, /booking, /explore, /mytrips, /saved, /profile, /planner)
  if (pathname.startsWith('/destination/')) {
    const slug = pathname.slice('/destination/'.length).replace(/\/+$/, '').trim();
    if (slug) {
      const match = POPULAR_DESTINATIONS.find(d =>
        d.id.toLowerCase() === slug ||
        d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug ||
        d.name.toLowerCase() === slug
      );
      if (match) {
        return { tab: 'explore', dest: match, tripId: null, openBooking: false, openPlanner: false };
      }
      const readableTitle = formatSlugToTitle(slug);
      if (isValidPlaceQuery(readableTitle)) {
        const dynamicDest = synthesizeDestination(readableTitle);
        return { tab: 'explore', dest: dynamicDest, tripId: null, openBooking: false, openPlanner: false };
      }
      return {
        tab: 'explore',
        dest: null,
        tripId: null,
        openBooking: false,
        openPlanner: false,
        routeNotice: 'That destination link could not be found. Browse curated destinations below.'
      };
    }
    return { tab: 'explore', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }

  if (pathname.startsWith('/share/')) {
    const rawShareId = (window.location.pathname || '').slice('/share/'.length).replace(/\/+$/, '').trim();
    const shareId = safeDecodeURIComponent(rawShareId);
    if (shareId.length >= 8) {
      return {
        tab: 'shared-trip',
        dest: null,
        tripId: null,
        sharedTripId: shareId,
        openBooking: false,
        openPlanner: false
      };
    }
    return {
      tab: 'explore',
      dest: null,
      tripId: null,
      openBooking: false,
      openPlanner: false,
      routeNotice: 'That shared trip link is invalid. Explore curated destinations below.'
    };
  }

  if (pathname.startsWith('/trip/') || pathname.startsWith('/itinerary/')) {
    const rawPathname = window.location.pathname || '/';
    const rawSegment = rawPathname.replace(/^\/(?:trip|itinerary)\//i, '').replace(/\/+$/, '').trim();
    const tripId = safeDecodeURIComponent(rawSegment);
    const found = loadedTrips.find(t => t.id.toLowerCase() === tripId.toLowerCase());
    if (found) {
      return {
        tab: 'trip-detail',
        dest: null,
        tripId: found.id,
        subTab: requestedSubTab,
        openBooking: false,
        openPlanner: false
      };
    }
    return {
      tab: 'trips',
      dest: null,
      tripId: null,
      pendingTripId: tripId || null,
      subTab: requestedSubTab,
      openBooking: false,
      openPlanner: false,
      routeNotice: tripId
        ? `Trip "${tripId}" was not found in your saved portfolio. Showing your trips instead.`
        : undefined
    };
  }

  if (pathname.startsWith('/place/')) {
    const slug = pathname.slice('/place/'.length).replace(/\/+$/, '').trim();
    const readableTitle = formatSlugToTitle(slug);
    if (isValidPlaceQuery(readableTitle)) {
      const match = POPULAR_DESTINATIONS.find(
        d => d.id.toLowerCase() === slug || d.name.toLowerCase() === readableTitle.toLowerCase()
      );
      return {
        tab: 'explore',
        dest: match || synthesizeDestination(readableTitle),
        tripId: null,
        openBooking: false,
        openPlanner: false
      };
    }
    return {
      tab: 'explore',
      dest: null,
      tripId: null,
      openBooking: false,
      openPlanner: false,
      routeNotice: 'That place link could not be found. Explore verified destinations below.'
    };
  }

  if (pathname.startsWith('/booking')) {
    const bookingTripId = pathname.replace('/booking/', '').replace('/booking', '').trim();
    const found = (bookingTripId ? loadedTrips.find(t => t.id.toLowerCase() === bookingTripId) : null) || loadedTrips[0];
    if (found) {
      return { tab: 'trip-detail', dest: null, tripId: found.id, openBooking: true, openPlanner: false };
    }
    return { tab: 'trips', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }

  if (
    pathname === '/explore' ||
    pathname === '/explore/' ||
    pathname === '/destinations' ||
    pathname === '/destinations/' ||
    pathname === '/destination'
  ) {
    return { tab: 'explore', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }
  if (pathname === '/mytrips' || pathname === '/trips') {
    return { tab: 'trips', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }
  if (pathname === '/saved') {
    return { tab: 'saved', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }
  if (pathname === '/profile') {
    return { tab: 'profile', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }
  if (pathname === '/planner' || pathname === '/ai-trip-planner' || pathname === '/road-trip-planner' || pathname === '/about') {
    return { tab: 'home', dest: null, tripId: null, openBooking: false, openPlanner: pathname === '/planner' };
  }
  if (pathname === '/reset-password' || pathname === '/reset-password/' || pathname.startsWith('/reset-password')) {
    return { tab: 'home', dest: null, tripId: null, openBooking: false, openPlanner: false, openResetPassword: true };
  }

  // 2. Query parameters fallback (?tripId=..., ?action=..., ?collab=..., ?tab=..., ?type=recovery, ?mode=resetPassword)
  const modeParam = (searchParams.get('mode') || searchParams.get('type') || '').toLowerCase();
  if (
    modeParam === 'resetpassword' ||
    modeParam === 'recovery' ||
    rawHash.includes('type=recovery') ||
    rawHash.includes('mode=resetpassword') ||
    rawHash === 'reset-password'
  ) {
    return { tab: 'home', dest: null, tripId: null, openBooking: false, openPlanner: false, openResetPassword: true };
  }

  const tripIdParam = searchParams.get('tripId') || searchParams.get('trip');
  const actionParam = searchParams.get('action');
  const collabParam = searchParams.get('collab');
  const tabParam = searchParams.get('tab');

  if (collabParam) {
    const targetTrip = (tripIdParam ? loadedTrips.find(t => t.id === tripIdParam) : null)
      || loadedTrips.find(t => t.collaboration?.inviteCode === collabParam)
      || loadedTrips[0];
    if (targetTrip) {
      return { tab: 'trip-detail', dest: null, tripId: targetTrip.id, openBooking: false, openPlanner: false, openCollab: true };
    }
  }

  if (tripIdParam) {
    const found = loadedTrips.find(t => t.id === tripIdParam);
    if (found) {
      return {
        tab: 'trip-detail',
        dest: null,
        tripId: found.id,
        subTab: requestedSubTab,
        openBooking: actionParam === 'book',
        openPlanner: false,
        openCollab: false
      };
    }
  }
  if (actionParam === 'pro' || actionParam === 'subscription') {
    return { tab: 'profile', dest: null, tripId: null, openBooking: false, openPlanner: false, openPro: true };
  }
  if (actionParam === 'plan') {
    return { tab: 'home', dest: null, tripId: null, openBooking: false, openPlanner: true };
  }
  if (actionParam === 'book') {
    return { tab: 'trip-detail', dest: null, tripId: null, openBooking: true, openPlanner: false };
  }
  if (tabParam && ['home', 'explore', 'trips', 'saved', 'profile'].includes(tabParam)) {
    return { tab: tabParam, dest: null, tripId: null, openBooking: false, openPlanner: false };
  }

  // 3. Hash fallback (#explore, #mytrips, #saved, #profile, #trip-...)
  if (rawHash.startsWith('trip-') && rawHash.length > 5) {
    const hashTripId = rawHash.replace('trip-', '');
    const found = loadedTrips.find(t => t.id === hashTripId);
    if (found) {
      return { tab: 'trip-detail', dest: null, tripId: found.id, openBooking: false, openPlanner: false };
    }
  }
  if (rawHash === 'mytrips') return { tab: 'trips', dest: null, tripId: null, openBooking: false, openPlanner: false };
  if (rawHash === 'destinations' || rawHash === 'destination') {
    return { tab: 'explore', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }

  if (['home', 'explore', 'trips', 'saved', 'profile', 'trip-detail'].includes(rawHash)) {
    return { tab: rawHash, dest: null, tripId: null, openBooking: false, openPlanner: false };
  }

  return { tab: 'home', dest: null, tripId: null, openBooking: false, openPlanner: false };
}

/**
 * Builds a single multi-waypoint Google Maps Directions URL connecting all stops
 * of a trip day in chronological order (origin -> waypoints -> destination).
 * Caps waypoints at 9 per Google Maps URL specification.
 */
export function buildGoogleMapsDayRouteUrl(
  activities: Array<{ title?: string; location?: string; coordinates?: { lat: number; lng: number } }>,
  destination?: string
): string | null {
  if (!Array.isArray(activities) || activities.length === 0) return null;

  const destSuffix = (destination || '').trim();
  const formatStop = (act: { title?: string; location?: string; coordinates?: { lat: number; lng: number } }): string => {
    if (act.coordinates && Number.isFinite(act.coordinates.lat) && Number.isFinite(act.coordinates.lng)) {
      return `${act.coordinates.lat.toFixed(5)},${act.coordinates.lng.toFixed(5)}`;
    }
    const label = (act.location || act.title || '').trim();
    if (!label) return destSuffix;
    return destSuffix && !label.toLowerCase().includes(destSuffix.toLowerCase().split(',')[0])
      ? `${label}, ${destSuffix}`
      : label;
  };

  const stops = activities.map(formatStop).filter(Boolean);
  if (stops.length === 0) return null;

  if (stops.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stops[0])}`;
  }

  const origin = stops[0];
  const dest = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1).slice(0, 9);

  const params = new URLSearchParams({
    api: '1',
    origin,
    destination: dest,
    travelmode: 'driving'
  });
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.join('|'));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
