import { Trip, Destination } from '../types/trip';
import { POPULAR_DESTINATIONS } from '../data/destinations';
import { synthesizeDestination } from './destinationImages';

function formatSlugToTitle(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/^dest-/i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export interface ResolvedRoute {
  tab: string;
  dest: Destination | null;
  tripId: string | null;
  openBooking: boolean;
  openPlanner: boolean;
  openCollab?: boolean;
  openPro?: boolean;
  openResetPassword?: boolean;
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
      if (readableTitle.length >= 2) {
        const dynamicDest = synthesizeDestination(readableTitle);
        return { tab: 'explore', dest: dynamicDest, tripId: null, openBooking: false, openPlanner: false };
      }
    }
    return { tab: 'explore', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }

  if (pathname.startsWith('/trip/') || pathname.startsWith('/itinerary/')) {
    const tripId = pathname.replace('/trip/', '').replace('/itinerary/', '').trim();
    const found = loadedTrips.find(t => t.id.toLowerCase() === tripId);
    if (found) {
      return { tab: 'trip-detail', dest: null, tripId: found.id, openBooking: false, openPlanner: false };
    }
    return { tab: 'trips', dest: null, tripId: null, openBooking: false, openPlanner: false };
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
  if (pathname === '/planner') {
    return { tab: 'home', dest: null, tripId: null, openBooking: false, openPlanner: true };
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
      return { tab: 'trip-detail', dest: null, tripId: found.id, openBooking: actionParam === 'book', openPlanner: false, openCollab: false };
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
