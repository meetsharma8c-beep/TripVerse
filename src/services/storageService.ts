import { Trip, UserProfile, TripPhotoMemory, TripReview, ExpenseItem, PackingItem } from '../types/trip';
import { DEFAULT_USER_PROFILE } from '../data/initialTrips';
import { getCurrentUser, getSavedAccounts, toUserProfile } from './authService';
import { calibrateTripWithLiveMarket } from './liveMarketPricingService';
import { saveTripsToOfflineDb } from './offlineDbService';
import {
  saveTripToSupabase,
  loadTripsFromSupabase,
  deleteTripFromSupabase,
  saveAllUserTripsToSupabase,
  saveProfileToSupabase,
  loadProfileFromSupabase,
  savePassportToSupabase,
  loadPassportFromSupabase,
  saveSavedPlaceToSupabase,
  deleteSavedPlaceFromSupabase,
  loadSavedPlacesFromSupabase,
  saveUserSavedItemsToSupabase,
  saveUserActiveTripToSupabase,
  loadUserActiveTripFromSupabase,
  isPlaceholderDiscoveryTrip,
  isTripDeletedInCloud,
  canonicalizeAccountEmail,
} from './supabaseSyncService';

/**
 * Detect if current context is an unauthenticated guest session
 */
export function isGuestSession(userId?: string | null): boolean {
  const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
  return !uid;
}

/**
 * Return appropriate storage tier:
 * - Guest mode: sessionStorage (strictly ephemeral — browser discards on tab/window close or exit)
 * - Authenticated mode: localStorage (persistent offline-first cache + Supabase sync)
 */
export function getStorage(isGuest?: boolean): Storage | null {
  if (typeof window === 'undefined') return null;
  const guest = isGuest !== undefined ? isGuest : isGuestSession();
  try {
    return guest ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Read item from appropriate storage tier (sessionStorage for guest, localStorage for authenticated)
 */
export function getStorageItem(key: string, userId?: string | null): string | null {
  const isGuest = isGuestSession(userId) || key.includes('_guest');
  const storage = getStorage(isGuest);
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safe write to appropriate storage tier with quota management
 */
export function safeStorageSet(key: string, value: string, userId?: string | null): boolean {
  const isGuest = isGuestSession(userId) || key.includes('_guest');
  const storage = getStorage(isGuest);
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch (e: any) {
    const isQuotaError = 
      e?.name === 'QuotaExceededError' || 
      e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
      e?.code === 22 || 
      e?.code === 1014;

    if (isQuotaError) {
      console.warn(`[TripVerse] Storage quota reached while writing "${key}". Pruning non-critical caches...`);
      try {
        const pruneKeys = ['tripverse_cached_weather', 'tripverse_temp_log', 'tripverse_offline_queue'];
        for (const k of pruneKeys) {
          storage.removeItem(k);
        }
        storage.setItem(key, value);
        return true;
      } catch {
        console.error('[TripVerse] Storage quota exceeded permanently.');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tripverse_storage_quota_warning', {
            detail: { key, message: 'Device storage is nearly full. Trips remain saved, but large images may not persist offline.' }
          }));
        }
        return false;
      }
    }
    console.error(`[TripVerse] Storage write error for "${key}":`, e);
    return false;
  }
}

/**
 * Remove item from appropriate storage tier
 */
export function removeStorageItem(key: string, userId?: string | null): void {
  const isGuest = isGuestSession(userId) || key.includes('_guest');
  const storage = getStorage(isGuest);
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {}
}

/**
 * Generate user-scoped storage key or fallback to guest
 */
export function getUserStorageKey(prefix: string, userId?: string | null): string {
  const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
  return uid ? `${prefix}_u_${uid}` : `${prefix}_guest`;
}

export function safeLocalStorageSet(key: string, value: string): boolean {
  const isGuest = key.includes('_guest') || isGuestSession();
  return safeStorageSet(key, value, isGuest ? null : undefined);
}

/**
 * Strip highway pitstops (breakStops) and convert any highway rest-break activities
 * on Train or Flight trips so rail/air travelers never see highway driving pitstops.
 */
export function sanitizeNonRoadTripPitstops(trip: Trip): { trip: Trip; modified: boolean } {
  if (!trip) return { trip, modified: false };
  const isTrain = trip.transportMode === 'train' || /\brail transit\b/i.test(trip.aiRationale || '');
  const isFlight = trip.transportMode === 'flight' || /\bflight transit\b/i.test(trip.aiRationale || '');
  if (!isTrain && !isFlight) {
    return { trip, modified: false };
  }

  let modified = false;
  const resolvedMode = isFlight ? 'flight' : 'train';
  if (trip.transportMode !== resolvedMode) {
    modified = true;
  }
  if (Array.isArray(trip.breakStops) && trip.breakStops.length > 0) {
    modified = true;
  }
  if (trip.routeDetails?.source === 'geoapify_routing' || trip.routeDetails?.encodedPolyline) {
    modified = true;
  }
  const hasRoadOnlyPacking = Array.isArray(trip.packingList) &&
    trip.packingList.some(item => item.id === 'doc-2' || item.id === 'doc-5' || item.id === 'ess-2');
  if (hasRoadOnlyPacking) {
    modified = true;
  }

  const destCoords = trip.destinationDetails?.coordinates;
  const originCoords = trip.originCoordinates;
  const cleanedItinerary = (trip.itinerary || []).map((day, idx) => {
    const isFirstDay = day.dayNumber === 1 || idx === 0;
    const cleanedActivities = (day.activities || []).map((act) => {
      if (act.type === 'breakstop' || act.id === 'act-1-bs' || act.id?.endsWith('-bs')) {
        modified = true;
        return {
          ...act,
          id: isFirstDay ? 'act-1-rail-arr' : `act-${day.dayNumber}-rail-ret`,
          type: 'arrival' as const,
          source: undefined,
          mapUrl: undefined,
          title: isFirstDay
            ? isFlight
              ? `Arrival at ${trip.destination} Airport & Hotel Transfer`
              : `Arrival at ${trip.destination} Railway Junction & Hotel Transfer`
            : isFlight
              ? `Return Flight Transit to ${trip.origin}`
              : `Return Rail Journey to ${trip.origin}`,
          location: isFirstDay
            ? isFlight
              ? `${trip.destination} Airport Terminal`
              : `${trip.destination} Railway Station`
            : isFlight
              ? `${trip.origin} Airport Terminal`
              : `${trip.origin} Railway Junction`,
          description: isFirstDay
            ? isFlight
              ? `Flight arrival at ${trip.destination} Airport and local transfer to your hotel.`
              : `Train arrival at ${trip.destination} Railway Junction and local cab/auto transfer to your hotel.`
            : isFlight
              ? `Scheduled return flight transit back to ${trip.origin}.`
              : `Direct return rail journey back to ${trip.origin}.`,
          coordinates: (isFirstDay ? destCoords : originCoords) || act.coordinates,
          tag: isFirstDay
            ? isFlight
              ? 'Airport Arrival'
              : 'Station Arrival'
            : isFlight
              ? 'Flight Transit'
              : 'Rail Transit'
        };
      }
      return act;
    });
    return {
      ...day,
      activities: cleanedActivities
    };
  });

  if (!modified) {
    return { trip, modified: false };
  }

  return {
    modified: true,
    trip: {
      ...trip,
      transportMode: resolvedMode,
      breakStops: [],
      routeDetails: trip.routeDetails
        ? {
            ...trip.routeDetails,
            source: 'estimate',
            encodedPolyline: undefined
          }
        : undefined,
      packingList: hasRoadOnlyPacking ? undefined : trip.packingList,
      itinerary: cleanedItinerary
    }
  };
}

/**
 * Load trips strictly for the specified user account or guest session.
 * NO MOCK DATA: returns empty array [] if no trips exist.
 * - Guest trips are read from ephemeral sessionStorage
 * - User trips are read from persistent localStorage
 */
export function loadTrips(userId?: string | null): Trip[] {
  try {
    const activeUser = getCurrentUser();
    const uid = userId !== undefined ? userId : activeUser?.uid;
    const key = getUserStorageKey('tripverse_trips', uid);
    const raw = getStorageItem(key, uid);

    let trips: Trip[] = raw ? JSON.parse(raw) : [];
    const originalCount = Array.isArray(trips) ? trips.length : 0;

    // 1. Purge any accidental DISCOVERY_FALLBACK_TRIP ('discovery-co-pilot') or cloud-deleted tombstones
    trips = (Array.isArray(trips) ? trips : []).filter(
      (t) => t && t.id && !isPlaceholderDiscoveryTrip(t) && !isTripDeletedInCloud(t.id, uid)
    );
    let wasModified = trips.length !== originalCount;

    // 2. Consolidate any trips stored under alternate UIDs for the same email account on this device
    // (e.g. if the user previously signed in via Google GIS vs Firebase Google vs Email OTP)
    if (uid && typeof window !== 'undefined' && window.localStorage) {
      const targetEmail = canonicalizeAccountEmail(
        activeUser?.uid === uid
          ? activeUser?.email
          : getSavedAccounts().find((u) => u.uid === uid)?.email
      );
      if (targetEmail) {
        const matchingUids = new Set<string>([
          uid,
          ...getSavedAccounts()
            .filter((u) => canonicalizeAccountEmail(u.email) === targetEmail)
            .map((u) => u.uid),
        ]);
        const existingIds = new Set(trips.map((t) => t.id));
        for (const altUid of matchingUids) {
          if (!altUid || altUid === uid) continue;
          const altKey = getUserStorageKey('tripverse_trips', altUid);
          const altRaw = getStorageItem(altKey, altUid);
          if (!altRaw) continue;
          try {
            const altList: Trip[] = JSON.parse(altRaw);
            for (const altTrip of Array.isArray(altList) ? altList : []) {
              if (
                altTrip &&
                altTrip.id &&
                !existingIds.has(altTrip.id) &&
                !isPlaceholderDiscoveryTrip(altTrip) &&
                !isTripDeletedInCloud(altTrip.id, uid)
              ) {
                trips.push({ ...altTrip, userId: uid, isUserCreated: true });
                existingIds.add(altTrip.id);
                wasModified = true;
              }
            }
          } catch {
            // Ignore malformed alternate key
          }
        }
      }
    }

    let pitstopsSanitized = false;
    trips = trips.map(t => {
      const { trip: clean, modified } = sanitizeNonRoadTripPitstops(t);
      if (modified) {
        wasModified = true;
        pitstopsSanitized = true;
      }
      return clean;
    });

    if (wasModified) {
      safeStorageSet(key, JSON.stringify(trips), uid);
      if (pitstopsSanitized && uid) {
        saveAllUserTripsToSupabase(uid, trips).catch(() => {});
      }
    }

    return trips.map(trip => {
      const isLegacyPricing = !trip.estimatedTotal || 
        trip.estimatedTotal === Math.round(trip.totalBudget * 0.94) ||
        !trip.budgetBreakdown?.transportation;
      const calibrated = isLegacyPricing ? calibrateTripWithLiveMarket(trip) : trip;

      return {
        ...calibrated,
        bestTransportDeal: undefined,
        transportDeals: []
      };
    });
  } catch (e) {
    console.error('Error loading trips from storage', e);
    return [];
  }
}

/**
 * Save all trips for the specified user account (sessionStorage for guest, localStorage + Cloud Vault for user)
 */
export function saveTrips(trips: Trip[], userId?: string | null, options?: { skipCloudSync?: boolean }): void {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const cleanTrips = (Array.isArray(trips) ? trips : [])
      .filter((t) => t && t.id && !isPlaceholderDiscoveryTrip(t) && !isTripDeletedInCloud(t.id, uid))
      .map((t) => sanitizeNonRoadTripPitstops(t).trip);
    const key = getUserStorageKey('tripverse_trips', uid);
    safeStorageSet(key, JSON.stringify(cleanTrips), uid);
    // Mirror to IndexedDB asynchronously for large offline itineraries beyond the 5MB localStorage limit
    saveTripsToOfflineDb(uid, cleanTrips).catch(() => {});
    if (uid && !options?.skipCloudSync) {
      // Sync to Cloud Vault (Firestore + Supabase)
      saveAllUserTripsToSupabase(uid, cleanTrips).catch(() => {});
    }
  } catch (e) {
    console.error('Error saving trips to storage', e);
  }
}

/**
 * Get single trip by ID for the specified user account
 */
export function getTripById(id: string, userId?: string | null): Trip | undefined {
  const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
  const trips = loadTrips(uid);
  return trips.find(t => t.id === id);
}

/**
 * Save or update a single trip under the specified user account (Cloud Vault + cache)
 */
export function saveOrUpdateTrip(trip: Trip, userId?: string | null): void {
  if (!trip || isPlaceholderDiscoveryTrip(trip)) return;
  const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
  if (uid && !trip.userId) {
    trip.userId = uid;
    trip.isUserCreated = true;
  }
  const trips = loadTrips(uid);
  const index = trips.findIndex(t => t.id === trip.id);
  if (index >= 0) {
    trips[index] = trip;
  } else {
    trips.unshift(trip);
  }
  saveTrips(trips, uid);
  setActiveTripId(trip.id, uid);
  if (uid) {
    saveTripToSupabase(uid, trip).catch(() => {});
  }
}

/**
 * Delete a trip for the specified user account (Supabase + cache)
 */
export function deleteTrip(id: string, userId?: string | null): void {
  const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
  const trips = loadTrips(uid).filter(t => t.id !== id);
  saveTrips(trips, uid);

  // If the deleted trip was the active trip, reset active trip cleanly
  const key = getUserStorageKey('tripverse_active_trip_id', uid);
  const currentActiveId = getStorageItem(key, uid);
  if (currentActiveId === id) {
    const nextActiveId = trips[0]?.id || '';
    safeStorageSet(key, nextActiveId, uid);
    if (uid) {
      saveUserActiveTripToSupabase(uid, nextActiveId).catch(() => {});
    }
  }

  if (uid) {
    deleteTripFromSupabase(uid, id).catch(() => {});
  }
}

/**
 * Get active trip ID for the specified user account.
 * Returns empty string if no trip exists, ensuring zombie IDs are sanitized.
 */
export function getActiveTripId(userId?: string | null): string {
  const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
  const key = getUserStorageKey('tripverse_active_trip_id', uid);
  const stored = getStorageItem(key, uid);
  const trips = loadTrips(uid);

  // Verify stored ID actually exists in the user's trips
  if (stored && trips.some(t => t.id === stored)) {
    return stored;
  }

  const fallbackId = trips[0]?.id || '';
  if (stored !== fallbackId) {
    safeStorageSet(key, fallbackId, uid);
  }
  return fallbackId;
}

/**
 * Set active trip ID for the specified user account
 */
export function setActiveTripId(id: string, userId?: string | null): void {
  const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
  const key = getUserStorageKey('tripverse_active_trip_id', uid);
  safeStorageSet(key, id, uid);
  if (uid) {
    saveUserActiveTripToSupabase(uid, id).catch(() => {});
  }
}

/**
 * Load user profile for the specified user account
 * - Guest profile: read from ephemeral sessionStorage
 * - User profile: read from persistent localStorage
 */
export function loadUserProfile(userId?: string | null): UserProfile {
  const authUser = getCurrentUser();
  if (authUser && (!userId || userId === authUser.uid)) {
    return toUserProfile(authUser);
  }

  // If explicitly requesting guest profile or if unauthenticated:
  if (userId === null || (!userId && !authUser)) {
    try {
      const raw = getStorageItem('tripverse_user_profile_guest', null);
      if (!raw) {
        return { ...DEFAULT_USER_PROFILE };
      }
      const parsed: UserProfile = JSON.parse(raw);
      const isPrivateData = 
        Boolean(parsed.email) ||
        Boolean(parsed.phoneNumber) ||
        (Boolean(parsed.avatar) && parsed.avatar !== '/default-avatar.svg' && !parsed.avatar.startsWith('/avatars/')) ||
        (Boolean(parsed.name) && parsed.name !== 'Traveler Explorer' && parsed.name !== 'Guest Explorer');

      if (isPrivateData) {
        removeStorageItem('tripverse_user_profile_guest', null);
        return { ...DEFAULT_USER_PROFILE };
      }
      return parsed;
    } catch {
      return { ...DEFAULT_USER_PROFILE };
    }
  }

  try {
    const uid = userId !== undefined ? userId : authUser?.uid;
    const key = getUserStorageKey('tripverse_user_profile', uid);
    const raw = getStorageItem(key, uid);
    if (!raw) {
      return { ...DEFAULT_USER_PROFILE };
    }
    const parsed: UserProfile = JSON.parse(raw);
    return parsed;
  } catch {
    return { ...DEFAULT_USER_PROFILE };
  }
}

/**
 * Save user profile for the specified user account (Supabase + cache)
 */
export function saveUserProfile(profile: UserProfile, userId?: string | null): void {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const key = getUserStorageKey('tripverse_user_profile', uid);
    safeStorageSet(key, JSON.stringify(profile), uid);
    if (uid) {
      saveProfileToSupabase(uid, profile).catch(() => {});
    }
  } catch (e) {
    console.error('Error saving user profile', e);
  }
}

/**
 * Load saved items (bookmarks) for the specified user account.
 * NO MOCK DATA: returns [] if no items bookmarked.
 */
export function loadSavedItemIds(userId?: string | null): string[] {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const key = getUserStorageKey('tripverse_saved_items', uid);
    const raw = getStorageItem(key, uid);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save saved items (bookmarks) for the specified user account (Supabase + cache)
 */
export function saveSavedItemIds(items: string[], userId?: string | null): void {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const key = getUserStorageKey('tripverse_saved_items', uid);
    safeStorageSet(key, JSON.stringify(items), uid);
    if (uid) {
      saveUserSavedItemsToSupabase(uid, items).catch(() => {});
    }
  } catch (e) {
    console.error('Error saving saved items', e);
  }
}

/**
 * Toggle saved item (bookmark) for the specified user account
 */
export function toggleSavedItemId(id: string, userId?: string | null): string[] {
  const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
  const items = loadSavedItemIds(uid);
  const index = items.indexOf(id);
  let updated: string[];
  if (index >= 0) {
    updated = items.filter(x => x !== id);
    if (uid) deleteSavedPlaceFromSupabase(uid, id).catch(() => {});
  } else {
    updated = [...items, id];
    if (uid) saveSavedPlaceToSupabase(uid, id).catch(() => {});
  }
  saveSavedItemIds(updated, uid);
  return updated;
}

/**
 * Load digital passport visited states for the specified user account.
 * NO MOCK DATA: returns empty array [] by default.
 */
export function loadUserVisitedStates(userId?: string | null): string[] {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const key = getUserStorageKey('tripverse_visited_states', uid);
    const raw = getStorageItem(key, uid);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 3 && parsed[0] === 'RJ' && parsed[1] === 'GJ' && parsed[2] === 'HP') {
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  return [];
}

/**
 * Save digital passport visited states for the specified user account (Supabase + cache)
 */
export function saveUserVisitedStates(visitedStates: string[], userId?: string | null): void {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const key = getUserStorageKey('tripverse_visited_states', uid);
    safeStorageSet(key, JSON.stringify(visitedStates), uid);
    window.dispatchEvent(new CustomEvent('tripverse_visited_states_change', { detail: visitedStates }));
    if (uid) {
      savePassportToSupabase(uid, visitedStates).catch(() => {});
    }
  } catch (e) {
    console.error('Error saving visited states', e);
  }
}

/**
 * Load expenses for a trip under the specified user account
 */
export function loadTripExpenses(tripId: string, userId?: string | null): ExpenseItem[] {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const key = getUserStorageKey(`tripverse_expenses_${tripId}`, uid);
    const raw = getStorageItem(key, uid);
    if (raw) return JSON.parse(raw);

    const trip = getTripById(tripId, uid);
    return trip?.expenses || [];
  } catch {
    return [];
  }
}

/**
 * Save expenses for a trip under the specified user account (Supabase + cache)
 */
export function saveTripExpenses(tripId: string, expenses: ExpenseItem[], userId?: string | null): void {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const key = getUserStorageKey(`tripverse_expenses_${tripId}`, uid);
    safeStorageSet(key, JSON.stringify(expenses), uid);

    // Update the trip object so it syncs atomically (including expense deletions) to cloud
    const trip = getTripById(tripId, uid);
    if (trip) {
      saveOrUpdateTrip({
        ...trip,
        expenses
      }, uid);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('tripverse_trip_expenses_changed', {
          detail: { tripId, expenses }
        })
      );
    }
  } catch (e) {
    console.error('Error saving trip expenses', e);
  }
}

/**
 * Load packing list for a trip under the specified user account
 */
export function loadTripPacking(tripId: string, userId?: string | null): PackingItem[] | null {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const key = getUserStorageKey(`tripverse_packing_${tripId}`, uid);
    const raw = getStorageItem(key, uid);
    if (raw) return JSON.parse(raw);

    const trip = getTripById(tripId, uid);
    return trip?.packingList || null;
  } catch {
    return null;
  }
}

/**
 * Save packing list for a trip under the specified user account
 */
export function saveTripPacking(tripId: string, items: PackingItem[], userId?: string | null): void {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const key = getUserStorageKey(`tripverse_packing_${tripId}`, uid);
    safeStorageSet(key, JSON.stringify(items), uid);

    const trip = getTripById(tripId, uid);
    if (trip) {
      saveOrUpdateTrip({
        ...trip,
        packingList: items
      }, uid);
    }
  } catch (e) {
    console.error('Error saving trip packing list', e);
  }
}

/**
 * Load photo memories for a trip under the specified user account
 */
export function loadTripPhotos(tripId: string, userId?: string | null): TripPhotoMemory[] {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const key = getUserStorageKey(`tripverse_memories_${tripId}`, uid);
    const raw = getStorageItem(key, uid);
    if (raw) return JSON.parse(raw);
    const trip = getTripById(tripId, uid);
    return trip?.photos || [];
  } catch {
    return [];
  }
}

/**
 * Save a photo memory for a trip under the specified user account
 */
export function saveTripPhoto(photo: TripPhotoMemory, userId?: string | null): void {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const existing = loadTripPhotos(photo.tripId, uid);
    const updated = [photo, ...existing.filter(p => p.id !== photo.id)];
    const key = getUserStorageKey(`tripverse_memories_${photo.tripId}`, uid);
    safeStorageSet(key, JSON.stringify(updated), uid);

    const trip = getTripById(photo.tripId, uid);
    if (trip) {
      saveOrUpdateTrip({
        ...trip,
        photos: updated
      }, uid);
    }
  } catch (e) {
    console.error('Error saving photo memory', e);
  }
}

/**
 * Delete a photo memory for a trip under the specified user account
 */
export function deleteTripPhoto(tripId: string, photoId: string, userId?: string | null): void {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const existing = loadTripPhotos(tripId, uid);
    const updated = existing.filter(p => p.id !== photoId);
    const key = getUserStorageKey(`tripverse_memories_${tripId}`, uid);
    safeStorageSet(key, JSON.stringify(updated), uid);

    const trip = getTripById(tripId, uid);
    if (trip) {
      saveOrUpdateTrip({
        ...trip,
        photos: updated
      }, uid);
    }
  } catch (e) {
    console.error('Error deleting photo memory', e);
  }
}

/**
 * Save trip review under the specified user account
 */
export function saveTripReview(tripId: string, review: TripReview, userId?: string | null): void {
  try {
    const uid = userId !== undefined ? userId : getCurrentUser()?.uid;
    const trip = getTripById(tripId, uid);
    if (trip) {
      saveOrUpdateTrip({
        ...trip,
        review
      }, uid);
    }
  } catch (e) {
    console.error('Error saving trip review', e);
  }
}

/**
 * Reset guest session storage across both sessionStorage and legacy localStorage
 */
export function resetGuestStorage(): void {
  try {
    const guestKeys = [
      'tripverse_trips_guest',
      'tripverse_trips_v1',
      'tripverse_user_profile_guest',
      'tripverse_user_profile_v1',
      'tripverse_visited_states_guest',
      'tripverse_visited_states',
      'tripverse_saved_items_guest',
      'tripverse_saved_items_v1',
      'tripverse_active_trip_id_guest',
      'tripverse_active_trip_id_v1',
      'tripverse_chat_guest',
      'tripverse_concode_chat_history_v2',
      'tripverse_notifications_read_guest',
      'tripverse_notifications_read_v1',
      'tripverse_concode_session_guest',
      'tripverse_concode_session'
    ];

    if (typeof sessionStorage !== 'undefined') {
      for (const k of guestKeys) {
        sessionStorage.removeItem(k);
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && (k.endsWith('_guest') || k.startsWith('tripverse_expenses_') || k.startsWith('tripverse_packing_') || k.startsWith('tripverse_memories_'))) {
          sessionStorage.removeItem(k);
        }
      }
    }

    if (typeof localStorage !== 'undefined') {
      for (const k of guestKeys) {
        localStorage.removeItem(k);
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.endsWith('_guest') || (k.startsWith('tripverse_') && k.includes('_guest')))) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch (e) {
    console.error('Error resetting guest storage', e);
  }
}

/**
 * Purge legacy persistent guest records from localStorage.
 * Ensures strict Option 2: Guest data must NEVER survive tab close or application exit.
 */
export function purgePersistentGuestStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const legacyKeys: string[] = [
      'tripverse_trips_guest',
      'tripverse_trips_v1',
      'tripverse_user_profile_guest',
      'tripverse_user_profile_v1',
      'tripverse_visited_states_guest',
      'tripverse_visited_states',
      'tripverse_saved_items_guest',
      'tripverse_saved_items_v1',
      'tripverse_active_trip_id_guest',
      'tripverse_active_trip_id_v1',
      'tripverse_chat_guest',
      'tripverse_concode_chat_history_v2',
      'tripverse_notifications_read_guest',
      'tripverse_notifications_read_v1',
      'tripverse_concode_session_guest',
      'tripverse_concode_session'
    ];

    for (const key of legacyKeys) {
      localStorage.removeItem(key);
    }

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.endsWith('_guest') || (k.startsWith('tripverse_') && k.includes('_guest')))) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    console.warn('[TripVerse] Notice during guest cache purge:', e);
  }
}

// Self-executing initialization in browser environment
if (typeof window !== 'undefined') {
  purgePersistentGuestStorage();
}

/**
 * Migrate guest-created trips into a newly authenticated user account
 */
export function migrateGuestCreatedTripsToUser(userId: string): Trip[] {
  try {
    const guestTrips = loadTrips(null);
    const userCreatedGuestTrips = guestTrips.filter(t => t.isUserCreated && !t.isSample);
    if (userCreatedGuestTrips.length === 0) {
      resetGuestStorage();
      return [];
    }

    const existingUserTrips = loadTrips(userId);
    const migrated = userCreatedGuestTrips.map(t => ({
      ...t,
      userId,
      isUserCreated: true
    }));

    const merged = [...migrated, ...existingUserTrips.filter(e => !migrated.some(m => m.id === e.id))];
    saveTrips(merged, userId);

    // Wipe ephemeral guest storage now that data is safe in user's account
    resetGuestStorage();

    return migrated;
  } catch (e) {
    console.warn('[Storage] Error migrating guest trips to user:', e);
    return [];
  }
}

/**
 * Comprehensive Cloud Data Loader:
 * Fetches strictly authenticated user data from Supabase PostgreSQL cloud backend.
 */
export async function loadUserDataFromCloudBackend(userId: string): Promise<{
  trips: Trip[];
  profile: UserProfile | null;
  visitedStates: string[];
  savedItemIds: string[];
  activeTripId: string | null;
}> {
  try {
    const [sbTrips, sbProfile, sbPassport, sbSaved, sbActive] = await Promise.all([
      loadTripsFromSupabase(userId),
      loadProfileFromSupabase(userId),
      loadPassportFromSupabase(userId),
      loadSavedPlacesFromSupabase(userId),
      loadUserActiveTripFromSupabase(userId)
    ]);

    return {
      trips: sbTrips || [],
      profile: sbProfile,
      visitedStates: sbPassport || [],
      savedItemIds: sbSaved || [],
      activeTripId: sbActive || (sbTrips && sbTrips[0]?.id) || null
    };
  } catch (err) {
    console.warn('[Storage] Supabase cloud fetch notice:', err);
    return {
      trips: [],
      profile: null,
      visitedStates: [],
      savedItemIds: [],
      activeTripId: null
    };
  }
}

// First-Time User Onboarding & Visit Flags (cross-version backwards-compatible)
const ONBOARDING_KEYS = [
  'tripverse_onboarding_completed_v1',
  'tripverse_onboarding_completed',
  'tripverse_has_visited',
  'tripverse_visited'
];

export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    // 1. Check all explicit onboarding completion and visit flags in localStorage and sessionStorage
    for (const key of ONBOARDING_KEYS) {
      if (window.localStorage.getItem(key) === 'true' || window.sessionStorage?.getItem(key) === 'true') {
        return true;
      }
    }

    // 2. Returning visitor check: If the user already has any existing app data, they are NOT visiting for the first time
    const returningUserIndicators = [
      'tripverse_trips',
      'tripverse_user_profile',
      'tripverse_saved_item_ids',
      'tripverse_active_trip_id',
      'tripverse_visited_states',
      'tripverse_currency',
      'tripverse_trips_guest',
      'tripverse_saved_places'
    ];
    for (const key of returningUserIndicators) {
      if (window.localStorage.getItem(key) || window.sessionStorage?.getItem(key)) {
        setOnboardingCompleted(true);
        return true;
      }
    }

    return false;
  } catch {
    return true; // Fail safe: never annoy users if storage is blocked or throws
  }
}

export function setOnboardingCompleted(completed: boolean = true): void {
  if (typeof window === 'undefined') return;
  try {
    for (const key of ONBOARDING_KEYS) {
      safeLocalStorageSet(key, completed ? 'true' : 'false');
      try {
        window.sessionStorage?.setItem(key, completed ? 'true' : 'false');
      } catch {}
    }
  } catch (e) {
    console.error('Error setting onboarding completed', e);
  }
}
