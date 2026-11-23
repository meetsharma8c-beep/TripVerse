/**
 * Public Shareable Trip Service (sharedTripService.ts)
 * Publishes sanitized, read-only snapshots of TripVerse itineraries to Firestore
 * `/shared_trips/{shareId}` so anyone opening `https://trip-verse.com/share/{shareId}`
 * can view the full itinerary without signing in and clone it into their own portfolio.
 *
 * Security: Strips private userId, personal expenses, private reviews, and photos before publishing.
 */

import { Trip } from '../types/trip';
import { getStoredFirebaseConfig } from './firebase';
import { getFirestoreVaultSession } from './supabaseSyncService';

export interface SharedTripDocument {
  shareId: string;
  ownerUid: string;
  ownerName: string;
  tripName: string;
  destination: string;
  trip: Trip;
  createdAt: string;
  updatedAt: string;
  source: 'firestore' | 'local';
}

const LOCAL_SHARED_PREFIX = 'tripverse_shared_trip_v1_';
const SHARE_ID_MAP_KEY = 'tripverse_trip_share_ids_v1';

/**
 * Generates an unguessable 16-character URL-safe shareId (compliant with >= 12 char rule).
 */
export function generateShareId(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'tvs_';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(14);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i++) {
      result += alphabet[bytes[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < 14; i++) {
      result += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  return result;
}

/**
 * Produces a strictly sanitized public snapshot of a Trip (zero PII, zero personal expenses, zero private photos/reviews).
 */
export function sanitizeTripForPublicShare(trip: Trip): Trip {
  const sanitized: Trip = {
    ...trip,
    id: `shared-${trip.id}`,
    userId: undefined,
    expenses: [],
    photos: [],
    review: undefined,
    collaboration: undefined,
    itinerary: (trip.itinerary || []).map((day) => ({
      ...day,
      activities: (day.activities || []).map((act) => ({
        ...act,
        completed: false,
      })),
    })),
  };
  return sanitized;
}

function getCachedShareIdForTrip(tripId: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SHARE_ID_MAP_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return typeof map[tripId] === 'string' && map[tripId].length >= 12 ? map[tripId] : null;
  } catch {
    return null;
  }
}

function saveShareIdForTrip(tripId: string, shareId: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(SHARE_ID_MAP_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[tripId] = shareId;
    localStorage.setItem(SHARE_ID_MAP_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function buildPublicShareUrl(shareId: string): string {
  if (typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
    return `${window.location.origin}/share/${encodeURIComponent(shareId)}`;
  }
  return `https://trip-verse.com/share/${encodeURIComponent(shareId)}`;
}

/**
 * Publishes a sanitized trip snapshot to Firestore `/shared_trips/{shareId}`.
 * Reuses the existing shareId for the same trip so links stay stable when updated.
 */
export async function publishSharedTrip(
  trip: Trip,
  ownerInfo?: { uid?: string | null; displayName?: string | null; email?: string | null }
): Promise<{
  shareId: string;
  shareUrl: string;
  isCloudSynced: boolean;
}> {
  const shareId = getCachedShareIdForTrip(trip.id) || generateShareId();
  const sanitizedTrip = sanitizeTripForPublicShare(trip);
  const now = new Date().toISOString();
  let originalCreatedAt = now;
  if (typeof localStorage !== 'undefined') {
    try {
      const existingRaw = localStorage.getItem(`${LOCAL_SHARED_PREFIX}${shareId}`);
      if (existingRaw) {
        const existing = JSON.parse(existingRaw) as Partial<SharedTripDocument>;
        if (existing?.createdAt && typeof existing.createdAt === 'string') {
          originalCreatedAt = existing.createdAt;
        }
      }
    } catch {
      // ignore
    }
  }
  const safeOwnerName = (ownerInfo?.displayName || 'TripVerse Traveler')
    .replace(/@.*$/, '')
    .trim()
    .slice(0, 80) || 'TripVerse Traveler';

  const tripSnapshotJson = JSON.stringify(sanitizedTrip);

  // Always cache locally so immediate preview works even offline
  if (typeof localStorage !== 'undefined') {
    try {
      const localRecord: SharedTripDocument = {
        shareId,
        ownerUid: ownerInfo?.uid || 'local',
        ownerName: safeOwnerName,
        tripName: (trip.name || `Trip to ${trip.destination}`).slice(0, 160),
        destination: (trip.destination || 'Destination').slice(0, 160),
        trip: sanitizedTrip,
        createdAt: originalCreatedAt,
        updatedAt: now,
        source: 'local',
      };
      localStorage.setItem(`${LOCAL_SHARED_PREFIX}${shareId}`, JSON.stringify(localRecord));
      saveShareIdForTrip(trip.id, shareId);
    } catch {
      // Ignore storage quota
    }
  }

  let isCloudSynced = false;
  const fbConfig = getStoredFirebaseConfig();
  if (fbConfig?.apiKey && fbConfig?.projectId && tripSnapshotJson.length <= 345_000) {
    try {
      const session = await getFirestoreVaultSession(ownerInfo?.uid, {
        name: safeOwnerName,
        email: ownerInfo?.email || undefined,
      });

      if (session?.idToken && session?.localId) {
        const docUrl = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/(default)/documents/shared_trips/${encodeURIComponent(shareId)}?key=${fbConfig.apiKey}`;
        const res = await fetch(docUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.idToken}`,
          },
          body: JSON.stringify({
            fields: {
              ownerUid: { stringValue: session.localId },
              ownerName: { stringValue: safeOwnerName },
              tripName: { stringValue: (trip.name || `Trip to ${trip.destination}`).slice(0, 160) },
              destination: { stringValue: (trip.destination || 'Destination').slice(0, 160) },
              tripSnapshotJson: { stringValue: tripSnapshotJson },
              createdAt: { stringValue: originalCreatedAt },
              updatedAt: { stringValue: now },
            },
          }),
        });
        if (res.ok) {
          isCloudSynced = true;
          saveShareIdForTrip(trip.id, shareId);
        }
      }
    } catch {
      // Fall back cleanly to local share record
    }
  }

  return {
    shareId,
    shareUrl: buildPublicShareUrl(shareId),
    isCloudSynced,
  };
}

/**
 * Fetches a public shared trip from Firestore `/shared_trips/{shareId}` with zero auth required.
 */
export async function fetchSharedTrip(shareId: string): Promise<SharedTripDocument | null> {
  const cleanId = (shareId || '').trim();
  if (cleanId.length < 8 || cleanId.length > 80) return null;

  const fbConfig = getStoredFirebaseConfig();
  if (fbConfig?.apiKey && fbConfig?.projectId) {
    try {
      const docUrl = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/(default)/documents/shared_trips/${encodeURIComponent(cleanId)}?key=${fbConfig.apiKey}`;
      const res = await fetch(docUrl);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const fields = data?.fields;
        const snapshotRaw = fields?.tripSnapshotJson?.stringValue;
        if (snapshotRaw) {
          const parsedTrip = JSON.parse(snapshotRaw) as Trip;
          return {
            shareId: cleanId,
            ownerUid: fields?.ownerUid?.stringValue || 'public',
            ownerName: fields?.ownerName?.stringValue || 'TripVerse Traveler',
            tripName: fields?.tripName?.stringValue || parsedTrip.name || 'Shared Trip',
            destination: fields?.destination?.stringValue || parsedTrip.destination || 'Destination',
            trip: parsedTrip,
            createdAt: fields?.createdAt?.stringValue || new Date().toISOString(),
            updatedAt: fields?.updatedAt?.stringValue || new Date().toISOString(),
            source: 'firestore',
          };
        }
      }
    } catch {
      // Fall back to local cache
    }
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${LOCAL_SHARED_PREFIX}${cleanId}`);
      if (raw) {
        return JSON.parse(raw) as SharedTripDocument;
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Clones a shared public trip into a fresh owned Trip ready to save in the visitor's portfolio.
 */
export function cloneSharedTripForUser(shared: SharedTripDocument, userId?: string): Trip {
  const now = new Date().toISOString();
  const base = shared.trip;
  return {
    ...base,
    id: `trip-${Date.now()}`,
    userId: userId || undefined,
    status: 'draft',
    createdAt: now,
    expenses: [],
    photos: [],
    review: undefined,
    aiRationale: `Cloned from ${shared.ownerName}'s shared TripVerse itinerary (${shared.shareId}).`,
  };
}
