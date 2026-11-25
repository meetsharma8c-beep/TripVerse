import { getSupabaseClient, getStoredSupabaseConfig } from './supabase';
import { getStoredFirebaseConfig } from './firebase';
import { getActiveSession, getCurrentUser } from './authService';
import { resolveApiUrl } from './deviceService';
import { Trip, UserProfile, ExpenseItem, TripReview, TripPhotoMemory, PackingItem } from '../types/trip';
import { getActiveCurrency } from './currencyService';
import { DisruptionAlert, RefundGuidance } from '../types/replanning';
import { toDeterministicUuid } from '../utils/uuid';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * CLOUD ACCOUNT SYNCHRONIZATION SERVICE (FIRESTORE VAULT + SUPABASE)
 * ═══════════════════════════════════════════════════════════════════════
 * Synchronizes user trips, itineraries, expenses, saved places, profile,
 * and digital passport across all devices (Web, iOS, Android) under the
 * user's canonical account identity (normalized email address).
 *
 * Uses Firebase Cloud Firestore (`tripverse-56261` `/users/{vaultUid}`)
 * as the always-on primary cloud store so devices stay 100% in sync even
 * if the user signed in via different providers (Google GIS on Desktop vs
 * Firebase Google / Email OTP on iPhone/Android) or when Supabase is paused.
 */

const VAULT_SESSION_CACHE_KEY = 'tripverse_cloud_vault_session_v2';
const DELETED_TRIPS_LOCAL_PREFIX = 'tripverse_deleted_trip_ids_u_';

interface VaultSession {
  canonicalKey: string;
  localId: string;
  idToken: string;
  expiresAt: number;
}

interface CloudVaultSnapshot {
  trips: Trip[];
  deletedTripIds: string[];
  profile: UserProfile | null;
  savedItemIds: string[] | null;
  visitedStates: string[] | null;
  activeTripId: string | null;
  reviewsByTripId: Record<string, TripReview>;
  photosByTripId: Record<string, TripPhotoMemory[]>;
  packingByTripId: Record<string, PackingItem[]>;
}

let memoryVaultSession: VaultSession | null = null;
const inflightVaultAuth = new Map<string, Promise<VaultSession | null>>();
const cloudDeletedTripIdsByAccount = new Map<string, Set<string>>();

export function isPlaceholderDiscoveryTrip(trip?: Partial<Trip> | null): boolean {
  if (!trip) return true;
  if (trip.id === 'discovery-co-pilot') return true;
  if (trip.name === 'TripVerse Discovery' || trip.destination === 'Explore Destinations') return true;
  return false;
}

/**
 * Normalizes an email address into a canonical cross-device account key.
 * Gmail dot-aliases (e.g. meet.sharma8c@gmail.com vs meetsharma8c@gmail.com)
 * resolve to the exact same canonical account key.
 */
export function canonicalizeAccountEmail(rawEmail?: string | null): string {
  const clean = (rawEmail || '').trim().toLowerCase();
  if (!clean || !clean.includes('@')) return clean;
  const [localPart, domain] = clean.split('@');
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const stripped = localPart.split('+')[0].replace(/\./g, '');
    return `${stripped}@gmail.com`;
  }
  return `${localPart}@${domain}`;
}

export function resolveCanonicalAccountKey(fallbackUserId?: string | null, profileMeta?: Partial<UserProfile>): string {
  const activeUser = getCurrentUser();
  const rawEmail = profileMeta?.email || activeUser?.email || '';
  const canonicalEmail = canonicalizeAccountEmail(rawEmail);
  if (canonicalEmail && canonicalEmail.includes('@')) {
    return `email:${canonicalEmail}`;
  }
  const cleanFallback = (fallbackUserId || activeUser?.uid || '').trim().toLowerCase();
  return cleanFallback ? `uid:${cleanFallback}` : '';
}

function getLocalDeletedTripIds(accountKey: string): Set<string> {
  const set = cloudDeletedTripIdsByAccount.get(accountKey) || new Set<string>();
  if (typeof localStorage !== 'undefined' && accountKey) {
    try {
      const raw = localStorage.getItem(`${DELETED_TRIPS_LOCAL_PREFIX}${accountKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => {
            if (typeof id === 'string' && id) set.add(id);
          });
        }
      }
    } catch {
      // Ignore storage errors
    }
  }
  cloudDeletedTripIdsByAccount.set(accountKey, set);
  return set;
}

function recordLocalDeletedTripId(accountKey: string, tripId: string): void {
  if (!accountKey || !tripId) return;
  const set = getLocalDeletedTripIds(accountKey);
  set.add(tripId);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`${DELETED_TRIPS_LOCAL_PREFIX}${accountKey}`, JSON.stringify(Array.from(set)));
    } catch {
      // Ignore storage errors
    }
  }
}

export function isTripDeletedInCloud(tripId: string, userId?: string | null): boolean {
  if (!tripId) return false;
  const accountKey = resolveCanonicalAccountKey(userId);
  if (!accountKey) return false;
  return getLocalDeletedTripIds(accountKey).has(tripId);
}

function isLiveSupabaseConfigured(): boolean {
  const cfg = getStoredSupabaseConfig();
  if (!cfg?.url) return false;
  // Skip known hibernated/decommissioned project hostname to avoid DNS ENOTFOUND latency
  if (cfg.url.includes('bqxefvytfjkssrfkvxct.supabase.co')) return false;
  return true;
}

function isVitestEnv(): boolean {
  const procEnv = (globalThis as any).process?.env;
  return Boolean(procEnv && (procEnv.VITEST || procEnv.NODE_ENV === 'test'));
}

async function resolveCallerIdentityJwt(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
    }
  } catch {}

  const active = getActiveSession();
  if (active?.token && !active.token.startsWith('session-')) {
    return active.token;
  }
  return null;
}

/**
 * One-time seamless migration from legacy client-derived v1 vault to hardened server-HMAC v2 vault.
 * Copies existing Firestore fields to the hardened vault, then permanently deletes the v1 doc & account.
 */
async function migrateAndPurgeLegacyV1Vault(
  canonicalKey: string,
  newSession: VaultSession,
  fbConfig: { apiKey: string; projectId: string }
): Promise<void> {
  const migKey = `tripverse_vault_v2_migrated_${canonicalKey}`;
  if (typeof localStorage !== 'undefined' && localStorage.getItem(migKey) === '1') {
    return;
  }

  try {
    // Check if new v2 vault already has a document
    const newDocUrl = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/(default)/documents/users/${newSession.localId}`;
    const checkRes = await fetch(newDocUrl, {
      headers: { Authorization: `Bearer ${newSession.idToken}` }
    });
    const newDocExists = checkRes.ok;

    // Authenticate one final time to legacy v1 vault if it exists
    const emailHash = toDeterministicUuid(`tv_vault_acct:${canonicalKey}`).replace(/-/g, '');
    const pwdHash = toDeterministicUuid(`tv_vault_secret:${canonicalKey}`).replace(/-/g, '');
    const legacyEmail = `tv_${emailHash}@vault.tripverse.app`;
    const legacyPassword = `TvVault#${pwdHash}!`;

    const legacyAuthRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${fbConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: legacyEmail, password: legacyPassword, returnSecureToken: true })
      }
    );

    if (legacyAuthRes.ok) {
      const legacyAuth = await legacyAuthRes.json();
      if (legacyAuth?.idToken && legacyAuth?.localId && legacyAuth.localId !== newSession.localId) {
        const legacyDocUrl = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/(default)/documents/users/${legacyAuth.localId}`;
        const legacyDocRes = await fetch(legacyDocUrl, {
          headers: { Authorization: `Bearer ${legacyAuth.idToken}` }
        });

        if (legacyDocRes.ok) {
          const legacyDoc = await legacyDocRes.json();
          if (!newDocExists && legacyDoc?.fields) {
            await fetch(newDocUrl, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${newSession.idToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ fields: legacyDoc.fields })
            });
          }
          // Permanently delete legacy v1 Firestore document
          await fetch(legacyDocUrl, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${legacyAuth.idToken}` }
          }).catch(() => {});
        }

        // Permanently delete legacy v1 shadow Firebase Auth account
        await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${fbConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: legacyAuth.idToken })
        }).catch(() => {});
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(migKey, '1');
      localStorage.removeItem('tripverse_cloud_vault_session_v1');
    }
  } catch {
    // Non-fatal migration check
  }
}

export async function getFirestoreVaultSession(
  fallbackUserId?: string | null,
  profileMeta?: Partial<UserProfile>
): Promise<VaultSession | null> {
  if (isVitestEnv()) return null;
  const fbConfig = getStoredFirebaseConfig();
  if (!fbConfig?.apiKey || !fbConfig?.projectId) return null;

  const canonicalKey = resolveCanonicalAccountKey(fallbackUserId, profileMeta);
  if (!canonicalKey) return null;

  const now = Date.now();
  if (
    memoryVaultSession &&
    memoryVaultSession.canonicalKey === canonicalKey &&
    memoryVaultSession.expiresAt > now + 60_000
  ) {
    return memoryVaultSession;
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const cachedRaw = localStorage.getItem(VAULT_SESSION_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as VaultSession;
        if (
          cached &&
          cached.canonicalKey === canonicalKey &&
          cached.idToken &&
          cached.localId &&
          cached.expiresAt > now + 60_000
        ) {
          memoryVaultSession = cached;
          return cached;
        }
      }
    } catch {
      // Ignore corrupt cache
    }
  }

  const existingInflight = inflightVaultAuth.get(canonicalKey);
  if (existingInflight) return existingInflight;

  const authPromise = (async (): Promise<VaultSession | null> => {
    try {
      const callerJwt = await resolveCallerIdentityJwt();
      if (!callerJwt) return null;

      const mintRes = await fetch(resolveApiUrl('/api/auth-activity'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${callerJwt}`
        },
        body: JSON.stringify({ event: 'mint_vault_session' })
      });

      if (!mintRes.ok) return null;
      const minted = await mintRes.json();
      if (!minted?.success || !minted?.idToken || !minted?.localId) return null;

      const session: VaultSession = {
        canonicalKey: minted.canonicalKey || canonicalKey,
        localId: minted.localId,
        idToken: minted.idToken,
        expiresAt: Number(minted.expiresAt) || Date.now() + 3600 * 1000
      };

      await migrateAndPurgeLegacyV1Vault(session.canonicalKey, session, fbConfig);

      memoryVaultSession = session;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(VAULT_SESSION_CACHE_KEY, JSON.stringify(session));
        } catch {
          // Ignore storage quota
        }
      }
      return session;
    } catch {
      return null;
    } finally {
      inflightVaultAuth.delete(canonicalKey);
    }
  })();

  inflightVaultAuth.set(canonicalKey, authPromise);
  return authPromise;
}

/**
 * Permanently deletes a user's Firestore cloud vault document and shadow Auth record
 * (Apple App Store Guideline 5.1.1(v) & Google Play Data Deletion compliance).
 */
export async function deleteCloudVaultForAccount(
  userId?: string | null,
  email?: string | null
): Promise<void> {
  if (isVitestEnv()) return;
  const fbConfig = getStoredFirebaseConfig();
  if (!fbConfig?.apiKey || !fbConfig?.projectId) return;

  try {
    const session = await getFirestoreVaultSession(userId, email ? { email } : undefined);
    if (session) {
      const docUrl = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/(default)/documents/users/${session.localId}`;
      await fetch(docUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.idToken}` }
      }).catch(() => {});

      await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${fbConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: session.idToken })
      }).catch(() => {});
    }
  } catch {} finally {
    memoryVaultSession = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(VAULT_SESSION_CACHE_KEY);
    }
  }
}

function safeJsonParse<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function fetchFirestoreVaultSnapshot(
  userId?: string | null,
  profileMeta?: Partial<UserProfile>
): Promise<{ session: VaultSession; snapshot: CloudVaultSnapshot; rawFields: Record<string, any> } | null> {
  const fbConfig = getStoredFirebaseConfig();
  if (!fbConfig?.apiKey || !fbConfig?.projectId) return null;

  const session = await getFirestoreVaultSession(userId, profileMeta);
  if (!session) return null;

  const docUrl = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/(default)/documents/users/${session.localId}?key=${fbConfig.apiKey}`;
  try {
    const res = await fetch(docUrl, {
      headers: { Authorization: `Bearer ${session.idToken}` },
    });

    if (res.status === 404) {
      return {
        session,
        rawFields: {},
        snapshot: {
          trips: [],
          deletedTripIds: Array.from(getLocalDeletedTripIds(session.canonicalKey)),
          profile: null,
          savedItemIds: null,
          visitedStates: null,
          activeTripId: null,
          reviewsByTripId: {},
          photosByTripId: {},
          packingByTripId: {},
        },
      };
    }

    if (!res.ok) return null;
    const doc = await res.json();
    const f = doc?.fields || {};

    const deletedFromCloud = safeJsonParse<string[]>(f.deletedTripIdsJson?.stringValue, []);
    const deletedSet = getLocalDeletedTripIds(session.canonicalKey);
    deletedFromCloud.forEach((id) => {
      if (typeof id === 'string' && id) deletedSet.add(id);
    });
    if (typeof localStorage !== 'undefined' && deletedSet.size > 0) {
      try {
        localStorage.setItem(
          `${DELETED_TRIPS_LOCAL_PREFIX}${session.canonicalKey}`,
          JSON.stringify(Array.from(deletedSet))
        );
      } catch {}
    }

    const rawTrips = safeJsonParse<Trip[]>(f.tripsJson?.stringValue, []);
    const cleanTrips = (Array.isArray(rawTrips) ? rawTrips : []).filter(
      (t) => t && t.id && !isPlaceholderDiscoveryTrip(t) && !deletedSet.has(t.id)
    );

    return {
      session,
      rawFields: f,
      snapshot: {
        trips: cleanTrips,
        deletedTripIds: Array.from(deletedSet),
        profile: f.profileJson?.stringValue ? safeJsonParse<UserProfile | null>(f.profileJson.stringValue, null) : null,
        savedItemIds: f.savedItemsJson?.stringValue ? safeJsonParse<string[] | null>(f.savedItemsJson.stringValue, null) : null,
        visitedStates: f.passportJson?.stringValue ? safeJsonParse<string[] | null>(f.passportJson.stringValue, null) : null,
        activeTripId: f.activeTripId?.stringValue || null,
        reviewsByTripId: safeJsonParse<Record<string, TripReview>>(f.reviewsJson?.stringValue, {}),
        photosByTripId: safeJsonParse<Record<string, TripPhotoMemory[]>>(f.photosJson?.stringValue, {}),
        packingByTripId: safeJsonParse<Record<string, PackingItem[]>>(f.packingJson?.stringValue, {}),
      },
    };
  } catch {
    return null;
  }
}

async function patchFirestoreVaultFields(
  session: VaultSession,
  existingRawFields: Record<string, any>,
  updatedFields: Record<string, { stringValue: string }>
): Promise<boolean> {
  const fbConfig = getStoredFirebaseConfig();
  if (!fbConfig?.apiKey || !fbConfig?.projectId) return false;

  const docUrl = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/(default)/documents/users/${session.localId}?key=${fbConfig.apiKey}`;
  try {
    const mergedFields = {
      ...existingRawFields,
      ...updatedFields,
      canonicalAccount: { stringValue: session.canonicalKey },
      updatedAt: { stringValue: new Date().toISOString() },
    };
    const res = await fetch(docUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.idToken}`,
      },
      body: JSON.stringify({ fields: mergedFields }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function compactTripForCloud(trip: Trip): Trip {
  return {
    ...trip,
    isUserCreated: true,
    bestTransportDeal: undefined,
    transportDeals: [],
  };
}

function unionMergeTrips(cloudTrips: Trip[], incomingTrips: Trip[], deletedIds: Set<string>): Trip[] {
  const byId = new Map<string, Trip>();

  // 1. Seed with existing cloud trips
  for (const ct of cloudTrips) {
    if (!ct?.id || isPlaceholderDiscoveryTrip(ct) || deletedIds.has(ct.id)) continue;
    byId.set(ct.id, compactTripForCloud(ct));
  }

  // 2. Overlay incoming local trips (newer or richer local version wins for same ID)
  for (const lt of incomingTrips) {
    if (!lt?.id || isPlaceholderDiscoveryTrip(lt) || deletedIds.has(lt.id)) continue;
    const existing = byId.get(lt.id);
    if (!existing) {
      byId.set(lt.id, compactTripForCloud(lt));
    } else {
      byId.set(
        lt.id,
        compactTripForCloud({
          ...existing,
          ...lt,
          itinerary: (lt.itinerary && lt.itinerary.length > 0) ? lt.itinerary : existing.itinerary,
          expenses: (lt.expenses && lt.expenses.length > 0) ? lt.expenses : existing.expenses,
        })
      );
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

export async function resolveCloudUserId(
  fallbackUserId: string,
  profileMeta?: Partial<UserProfile>
): Promise<string> {
  const canonicalKey = resolveCanonicalAccountKey(fallbackUserId, profileMeta);
  return toDeterministicUuid(canonicalKey || fallbackUserId);
}

// 1. TRIPS
export async function saveTripToSupabase(userId: string, trip: Trip): Promise<boolean> {
  if (!trip || isPlaceholderDiscoveryTrip(trip)) return false;

  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const deletedSet = new Set(vault.snapshot.deletedTripIds);
    deletedSet.delete(trip.id);
    const mergedTrips = unionMergeTrips(vault.snapshot.trips, [trip], deletedSet);
    const ok = await patchFirestoreVaultFields(vault.session, vault.rawFields, {
      tripsJson: { stringValue: JSON.stringify(mergedTrips) },
      deletedTripIdsJson: { stringValue: JSON.stringify(Array.from(deletedSet)) },
    });
    if (ok) return true;
  }

  if (!isLiveSupabaseConfigured()) return false;
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = await resolveCloudUserId(userId);
    const { error } = await supabase.from('trips').upsert({
      id: trip.id,
      user_id: cleanUserId,
      name: trip.name,
      origin: trip.origin,
      destination: trip.destination,
      duration_days: trip.durationDays,
      travelers_count: trip.travelersCount,
      traveler_type: trip.travelerType,
      total_budget: trip.totalBudget,
      budget_per_person: trip.budgetPerPerson,
      transport_mode: trip.transportMode,
      accommodation_type: trip.accommodationType,
      food_preference: trip.foodPreference,
      status: trip.status,
      route_type: trip.routeType || 'fastest',
      estimated_total: trip.estimatedTotal,
      budget_breakdown: trip.budgetBreakdown,
      is_user_created: true,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function loadTripsFromSupabase(userId: string): Promise<Trip[] | null> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    return vault.snapshot.trips;
  }

  if (!isLiveSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const cleanUserId = await resolveCloudUserId(userId);
    const { data: tripsData, error: tripsErr } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', cleanUserId)
      .order('created_at', { ascending: false });

    if (tripsErr || !tripsData) return null;
    return tripsData
      .filter((t) => t && !isPlaceholderDiscoveryTrip(t))
      .map((t) => ({
        id: t.id,
        userId: t.user_id,
        name: t.name,
        origin: t.origin,
        destination: t.destination,
        durationDays: t.duration_days,
        travelersCount: t.travelers_count,
        travelerType: t.traveler_type,
        totalBudget: Number(t.total_budget),
        budgetPerPerson: Number(t.budget_per_person),
        preferences: t.preferences || [],
        transportMode: t.transport_mode,
        accommodationType: t.accommodation_type,
        foodPreference: t.food_preference,
        priorities: t.priorities || [],
        status: t.status,
        isUserCreated: true,
        createdAt: t.created_at,
        breakStops: t.break_stops || [],
        budgetBreakdown: t.budget_breakdown || {
          transportation: 0,
          accommodation: 0,
          food: 0,
          activities: 0,
          miscellaneous: 0,
        },
        estimatedTotal: Number(t.estimated_total || 0),
        routeType: t.route_type,
        itinerary: [],
        expenses: [],
      }));
  } catch {
    return null;
  }
}

export async function deleteTripFromSupabase(userId: string, tripId: string): Promise<boolean> {
  const accountKey = resolveCanonicalAccountKey(userId);
  if (accountKey && tripId) {
    recordLocalDeletedTripId(accountKey, tripId);
  }

  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const deletedSet = new Set(vault.snapshot.deletedTripIds);
    deletedSet.add(tripId);
    const remaining = vault.snapshot.trips.filter((t) => t.id !== tripId && !isPlaceholderDiscoveryTrip(t));
    const ok = await patchFirestoreVaultFields(vault.session, vault.rawFields, {
      tripsJson: { stringValue: JSON.stringify(remaining) },
      deletedTripIdsJson: { stringValue: JSON.stringify(Array.from(deletedSet)) },
    });
    if (ok) return true;
  }

  if (!isLiveSupabaseConfigured()) return false;
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const cleanUserId = await resolveCloudUserId(userId);
    const { error } = await supabase.from('trips').delete().eq('id', tripId).eq('user_id', cleanUserId);
    return !error;
  } catch {
    return false;
  }
}

// 2. EXPENSES
export async function saveExpenseToSupabase(userId: string, expense: ExpenseItem): Promise<boolean> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const updatedTrips = vault.snapshot.trips.map((t) => {
      if (t.id !== expense.tripId) return t;
      const list = Array.isArray(t.expenses) ? [...t.expenses] : [];
      const idx = list.findIndex((e) => e.id === expense.id);
      if (idx >= 0) list[idx] = expense;
      else list.push(expense);
      return { ...t, expenses: list };
    });
    return patchFirestoreVaultFields(vault.session, vault.rawFields, {
      tripsJson: { stringValue: JSON.stringify(updatedTrips) },
    });
  }
  return false;
}

export async function deleteExpenseFromSupabase(userId: string, expenseId: string): Promise<boolean> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const updatedTrips = vault.snapshot.trips.map((t) => ({
      ...t,
      expenses: (t.expenses || []).filter((e) => e.id !== expenseId),
    }));
    return patchFirestoreVaultFields(vault.session, vault.rawFields, {
      tripsJson: { stringValue: JSON.stringify(updatedTrips) },
    });
  }
  return false;
}

// 3. SAVED PLACES / BOOKMARKS
export async function saveSavedPlaceToSupabase(userId: string, placeId: string): Promise<boolean> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const next = Array.from(new Set([...(vault.snapshot.savedItemIds || []), placeId]));
    return patchFirestoreVaultFields(vault.session, vault.rawFields, {
      savedItemsJson: { stringValue: JSON.stringify(next) },
    });
  }
  return false;
}

export async function deleteSavedPlaceFromSupabase(userId: string, placeId: string): Promise<boolean> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const next = (vault.snapshot.savedItemIds || []).filter((id) => id !== placeId);
    return patchFirestoreVaultFields(vault.session, vault.rawFields, {
      savedItemsJson: { stringValue: JSON.stringify(next) },
    });
  }
  return false;
}

export async function loadSavedPlacesFromSupabase(userId: string): Promise<string[] | null> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    return vault.snapshot.savedItemIds;
  }
  return null;
}

// 4. USER PROFILE
export async function saveProfileToSupabase(userId: string, profile: UserProfile): Promise<boolean> {
  const vault = await fetchFirestoreVaultSnapshot(userId, profile);
  if (vault) {
    const normalizedProfile: UserProfile = {
      ...profile,
      preferredCurrency: profile.preferredCurrency || getActiveCurrency(),
    };
    return patchFirestoreVaultFields(vault.session, vault.rawFields, {
      profileJson: { stringValue: JSON.stringify(normalizedProfile) },
    });
  }
  return false;
}

export async function loadProfileFromSupabase(userId: string): Promise<UserProfile | null> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    return vault.snapshot.profile;
  }
  return null;
}

// 5. DIGITAL PASSPORT
export async function savePassportToSupabase(userId: string, visitedStates: string[]): Promise<boolean> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const combined = Array.from(new Set([...(vault.snapshot.visitedStates || []), ...visitedStates]));
    return patchFirestoreVaultFields(vault.session, vault.rawFields, {
      passportJson: { stringValue: JSON.stringify(combined) },
    });
  }
  return false;
}

export async function loadPassportFromSupabase(userId: string): Promise<string[] | null> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    return vault.snapshot.visitedStates;
  }
  return null;
}

// 6. EMERGENCY EVENTS & REPLANNING
export async function saveEmergencyEventToSupabase(
  _userId: string,
  _disruption: DisruptionAlert,
  _plan?: {
    revisedSummary?: string;
    alternativeTransport?: any;
    budgetImpact?: number;
    timeImpact?: string;
    refundGuidance?: RefundGuidance;
    actionSteps?: string[];
  }
): Promise<boolean> {
  return true;
}

// 7. BATCH AND COMPATIBILITY HELPERS
export async function saveAllUserTripsToSupabase(userId: string, trips: Trip[]): Promise<boolean> {
  const validTrips = (Array.isArray(trips) ? trips : []).filter((t) => t && !isPlaceholderDiscoveryTrip(t));
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const deletedSet = new Set(vault.snapshot.deletedTripIds);
    const mergedTrips = unionMergeTrips(vault.snapshot.trips, validTrips, deletedSet);
    return patchFirestoreVaultFields(vault.session, vault.rawFields, {
      tripsJson: { stringValue: JSON.stringify(mergedTrips) },
      deletedTripIdsJson: { stringValue: JSON.stringify(Array.from(deletedSet)) },
    });
  }
  return false;
}

export const saveUserTripToSupabase = saveTripToSupabase;
export const deleteUserTripFromSupabase = deleteTripFromSupabase;
export const loadUserTripsFromSupabase = loadTripsFromSupabase;

export const saveUserProfileToSupabase = saveProfileToSupabase;
export const loadUserProfileFromSupabase = loadProfileFromSupabase;

export const saveUserPassportToSupabase = savePassportToSupabase;
export const loadUserPassportFromSupabase = loadPassportFromSupabase;

export async function saveUserSavedItemsToSupabase(userId: string, itemIds: string[]): Promise<boolean> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const combined = Array.from(new Set([...(vault.snapshot.savedItemIds || []), ...(itemIds || [])]));
    return patchFirestoreVaultFields(vault.session, vault.rawFields, {
      savedItemsJson: { stringValue: JSON.stringify(combined) },
    });
  }
  return false;
}

export const loadUserSavedItemsFromSupabase = loadSavedPlacesFromSupabase;

// 8. ACTIVE TRIP SELECTION PREFERENCE
export async function saveUserActiveTripToSupabase(userId: string, activeTripId: string): Promise<boolean> {
  if (!activeTripId || activeTripId === 'discovery-co-pilot') return false;
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    return patchFirestoreVaultFields(vault.session, vault.rawFields, {
      activeTripId: { stringValue: activeTripId },
    });
  }
  return false;
}

export async function loadUserActiveTripFromSupabase(userId: string): Promise<string | null> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const id = vault.snapshot.activeTripId;
    return id && id !== 'discovery-co-pilot' ? id : null;
  }
  return null;
}

// 9. COLLABORATION SESSIONS
export async function saveCollaborationSessionToSupabase(_session: any): Promise<boolean> {
  return false;
}

export async function loadCollaborationSessionFromSupabase(_tripId: string): Promise<any | null> {
  return null;
}

// 10. TRIP REVIEWS
export async function saveReviewToSupabase(userId: string, tripId: string, review: TripReview): Promise<boolean> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const map = { ...vault.snapshot.reviewsByTripId, [tripId]: review };
    return patchFirestoreVaultFields(vault.session, vault.rawFields, {
      reviewsJson: { stringValue: JSON.stringify(map) },
    });
  }
  return false;
}

export async function loadReviewFromSupabase(userId: string, tripId: string): Promise<TripReview | null> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    return vault.snapshot.reviewsByTripId[tripId] || null;
  }
  return null;
}

// 11. TRIP PHOTOS
export async function savePhotoToSupabase(userId: string, photo: TripPhotoMemory): Promise<boolean> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const list = [...(vault.snapshot.photosByTripId[photo.tripId] || [])];
    const idx = list.findIndex((p) => p.id === photo.id);
    if (idx >= 0) list[idx] = photo;
    else list.unshift(photo);
    const map = { ...vault.snapshot.photosByTripId, [photo.tripId]: list };
    return patchFirestoreVaultFields(vault.session, vault.rawFields, {
      photosJson: { stringValue: JSON.stringify(map) },
    });
  }
  return false;
}

export async function loadPhotosFromSupabase(userId: string, tripId: string): Promise<TripPhotoMemory[] | null> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    return vault.snapshot.photosByTripId[tripId] || null;
  }
  return null;
}

export async function deletePhotoFromSupabase(userId: string, photoId: string): Promise<boolean> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const nextMap: Record<string, TripPhotoMemory[]> = {};
    for (const [tid, list] of Object.entries(vault.snapshot.photosByTripId)) {
      nextMap[tid] = (list || []).filter((p) => p.id !== photoId);
    }
    return patchFirestoreVaultFields(vault.session, vault.rawFields, {
      photosJson: { stringValue: JSON.stringify(nextMap) },
    });
  }
  return false;
}

// 12. PACKING LISTS
export async function savePackingToSupabase(userId: string, tripId: string, items: PackingItem[]): Promise<boolean> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    const map = { ...vault.snapshot.packingByTripId, [tripId]: items };
    return patchFirestoreVaultFields(vault.session, vault.rawFields, {
      packingJson: { stringValue: JSON.stringify(map) },
    });
  }
  return false;
}

export async function loadPackingFromSupabase(userId: string, tripId: string): Promise<PackingItem[] | null> {
  const vault = await fetchFirestoreVaultSnapshot(userId);
  if (vault) {
    return vault.snapshot.packingByTripId[tripId] || null;
  }
  return null;
}
