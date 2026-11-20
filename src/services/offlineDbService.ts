// src/services/offlineDbService.ts
// IndexedDB-backed offline persistence & timestamp-based conflict resolution for TripVerse.
// Supports large itineraries, passes, and photo journals beyond the 5MB localStorage quota,
// with automatic graceful fallback in non-browser / SSR environments.

import type { Trip } from '../types/trip';

const DB_NAME = 'tripverse_offline_db';
const DB_VERSION = 1;
const STORE_TRIPS = 'trips_by_user';
const STORE_KV = 'offline_kv';

interface StoredTripBucket {
  userId: string;
  trips: Trip[];
  updatedAt: number;
}

interface StoredKvEntry<T = unknown> {
  key: string;
  value: T;
  updatedAt: number;
}

// Graceful fallback store when IndexedDB is unavailable (Node/Vitest/restricted WebViews)
const memoryTripBuckets = new Map<string, StoredTripBucket>();
const memoryKv = new Map<string, StoredKvEntry>();

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_TRIPS)) {
        db.createObjectStore(STORE_TRIPS, { keyPath: 'userId' });
      }
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

function normalizeUserKey(userId?: string | null): string {
  const clean = (userId || '').trim();
  return clean || 'guest';
}

/**
 * Persist a user's full trip array into IndexedDB (with memory fallback).
 */
export async function saveTripsToOfflineDb(userId: string | null | undefined, trips: Trip[]): Promise<void> {
  const key = normalizeUserKey(userId);
  const record: StoredTripBucket = {
    userId: key,
    trips,
    updatedAt: Date.now()
  };

  memoryTripBuckets.set(key, record);

  if (!isIndexedDbAvailable()) return;

  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_TRIPS, 'readwrite');
      tx.objectStore(STORE_TRIPS).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Non-fatal: localStorage + memory fallback remain intact
  }
}

/**
 * Load a user's trips from IndexedDB (falling back to memory cache if unavailable).
 */
export async function loadTripsFromOfflineDb(userId?: string | null): Promise<Trip[] | null> {
  const key = normalizeUserKey(userId);

  if (!isIndexedDbAvailable()) {
    return memoryTripBuckets.get(key)?.trips ?? null;
  }

  try {
    const db = await openOfflineDb();
    const record = await new Promise<StoredTripBucket | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_TRIPS, 'readonly');
      const req = tx.objectStore(STORE_TRIPS).get(key);
      req.onsuccess = () => resolve(req.result as StoredTripBucket | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (record?.trips) {
      memoryTripBuckets.set(key, record);
      return record.trips;
    }
    return memoryTripBuckets.get(key)?.trips ?? null;
  } catch {
    return memoryTripBuckets.get(key)?.trips ?? null;
  }
}

/**
 * Persist arbitrary offline JSON blobs (e.g. cached boarding passes, photo metadata, offline maps).
 */
export async function saveOfflineKv<T>(key: string, value: T): Promise<void> {
  const entry: StoredKvEntry<T> = { key, value, updatedAt: Date.now() };
  memoryKv.set(key, entry);

  if (!isIndexedDbAvailable()) return;

  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_KV, 'readwrite');
      tx.objectStore(STORE_KV).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Non-fatal
  }
}

/**
 * Read arbitrary offline JSON blobs from IndexedDB.
 */
export async function loadOfflineKv<T>(key: string): Promise<T | null> {
  if (!isIndexedDbAvailable()) {
    return (memoryKv.get(key)?.value as T) ?? null;
  }

  try {
    const db = await openOfflineDb();
    const entry = await new Promise<StoredKvEntry<T> | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_KV, 'readonly');
      const req = tx.objectStore(STORE_KV).get(key);
      req.onsuccess = () => resolve(req.result as StoredKvEntry<T> | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (entry !== undefined) {
      memoryKv.set(key, entry);
      return entry.value;
    }
    return (memoryKv.get(key)?.value as T) ?? null;
  } catch {
    return (memoryKv.get(key)?.value as T) ?? null;
  }
}

function getTripTimestamp(trip: Trip): number {
  const candidate = (trip as Trip & { updatedAt?: string | number }).updatedAt ?? trip.createdAt;
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
  if (typeof candidate === 'string') {
    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * Deterministic Last-Write-Wins (LWW) conflict resolution when syncing offline edits
 * against remote cloud trips from Supabase.
 * - Preserves unique trips from both sides.
 * - For colliding trip IDs, keeps whichever copy has the newer timestamp (with local tie-break
 *   for in-progress offline edits if timestamps are equal).
 */
export function mergeTripsWithConflictResolution(localTrips: Trip[], remoteTrips: Trip[]): {
  merged: Trip[];
  resolvedConflicts: number;
  localWins: number;
  remoteWins: number;
} {
  const byId = new Map<string, Trip>();
  let resolvedConflicts = 0;
  let localWins = 0;
  let remoteWins = 0;

  for (const remote of remoteTrips || []) {
    if (!remote?.id) continue;
    byId.set(remote.id, remote);
  }

  for (const local of localTrips || []) {
    if (!local?.id) continue;
    const existingRemote = byId.get(local.id);
    if (!existingRemote) {
      byId.set(local.id, local);
      continue;
    }

    const localTs = getTripTimestamp(local);
    const remoteTs = getTripTimestamp(existingRemote);
    resolvedConflicts += 1;

    if (localTs >= remoteTs) {
      byId.set(local.id, local);
      localWins += 1;
    } else {
      byId.set(local.id, existingRemote);
      remoteWins += 1;
    }
  }

  const merged = Array.from(byId.values()).sort((a, b) => getTripTimestamp(b) - getTripTimestamp(a));
  return { merged, resolvedConflicts, localWins, remoteWins };
}
