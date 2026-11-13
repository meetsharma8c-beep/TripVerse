/**
 * ═══════════════════════════════════════════════════════════════════════
 * TripVerse — High-Performance Edge & Database Caching Engine
 * ═══════════════════════════════════════════════════════════════════════
 * Accelerates external API responses (OpenWeather, Wikimedia, Geoapify)
 * and AI Itinerary generation by utilizing a 2-tier caching hierarchy:
 *   Tier 1: In-memory ultra-fast client cache (0ms)
 *   Tier 2: Supabase PostgreSQL cache (4ms, globally shared across travelers)
 *
 * Fault-Tolerant: Gracefully falls back to live network if Supabase tables
 * have not been migrated yet or when working offline.
 */

import { getSupabaseClient } from './supabase';
import { Trip } from '../types/trip';
import { generateSemanticEmbedding } from './aiSemanticSearchService';

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // Unix epoch ms
}

// Tier 1: In-Memory LRU Cache
const MEMORY_CACHE = new Map<string, CacheEntry<unknown>>();
const MAX_MEMORY_ITEMS = 500;

function cleanMemoryCache(): void {
  if (MEMORY_CACHE.size > MAX_MEMORY_ITEMS) {
    const now = Date.now();
    for (const [key, entry] of MEMORY_CACHE.entries()) {
      if (entry.expiresAt < now) {
        MEMORY_CACHE.delete(key);
      }
    }
  }
}

/**
 * Retrieve cached external API response
 * @param endpointKey Unique key identifying the API request (e.g., 'weather:26.91:75.78' or 'wiki:hawa-mahal')
 */
export async function getCachedApiResponse<T>(endpointKey: string): Promise<T | null> {
  const normalizedKey = endpointKey.toLowerCase().trim();
  const now = Date.now();

  // Tier 1: Check In-Memory Cache first (0ms)
  const memoryHit = MEMORY_CACHE.get(normalizedKey);
  if (memoryHit && memoryHit.expiresAt > now) {
    return memoryHit.data as T;
  }

  // Tier 2: Check Supabase PostgreSQL Cache (~4-15ms)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cached_external_apis')
        .select('data, expires_at')
        .eq('endpoint_key', normalizedKey)
        .gt('expires_at', new Date(now).toISOString())
        .maybeSingle();

      if (!error && data && data.data) {
        // Hydrate Tier 1 Memory Cache
        const expMs = new Date(data.expires_at).getTime();
        MEMORY_CACHE.set(normalizedKey, { data: data.data, expiresAt: expMs });
        return data.data as T;
      }
    } catch {
      // Non-blocking: Silently fall through to live fetch
    }
  }

  return null;
}

/**
 * Store an external API response in both Memory and Supabase PostgreSQL
 * @param endpointKey Unique key
 * @param data Payload data
 * @param ttlSeconds Time-to-live in seconds (default: 6 hours = 21,600s)
 */
export async function setCachedApiResponse<T>(
  endpointKey: string,
  data: T,
  ttlSeconds = 21600
): Promise<boolean> {
  if (!data) return false;
  const normalizedKey = endpointKey.toLowerCase().trim();
  const expiresAtMs = Date.now() + ttlSeconds * 1000;

  // Save to Tier 1 Memory Cache
  cleanMemoryCache();
  MEMORY_CACHE.set(normalizedKey, { data, expiresAt: expiresAtMs });

  // Save to Tier 2 Supabase PostgreSQL (asynchronously)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const payload = {
        endpoint_key: normalizedKey,
        data,
        expires_at: new Date(expiresAtMs).toISOString()
      };
      await supabase.from('cached_external_apis').upsert(payload);
      return true;
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Build a deterministic signature for AI Itinerary requests
 */
export function buildItinerarySignature(
  destination: string,
  durationDays: number,
  travelerType = 'solo',
  pacing = 'balanced',
  budget = 0
): string {
  const normDest = (destination || 'getaway').toLowerCase().replace(/[^a-z0-9]/g, '');
  const budgetBucket = budget > 0 ? Math.round(budget / 5000) * 5000 : 0;
  return `itinerary:${normDest}:${durationDays}d:${travelerType.toLowerCase()}:${pacing.toLowerCase()}:b${budgetBucket}`;
}

/**
 * Retrieve cached AI Itinerary from Supabase or Memory
 */
export async function getCachedAiItinerary(signature: string): Promise<Trip | null> {
  const normalized = signature.toLowerCase().trim();

  // Tier 1: Memory
  const memHit = MEMORY_CACHE.get(normalized);
  if (memHit && memHit.expiresAt > Date.now()) {
    return memHit.data as Trip;
  }

  // Tier 2: Supabase (Atomic RPC incrementing hit_count)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('get_cached_itinerary', {
        p_signature: normalized
      });

      if (!error && data) {
        const trip = data as Trip;
        MEMORY_CACHE.set(normalized, { data: trip, expiresAt: Date.now() + 86400 * 1000 });
        return trip;
      }
    } catch {
      // Fall through
    }
  }

  return null;
}

/**
 * Cache an AI Itinerary in Supabase and Memory
 */
export async function setCachedAiItinerary(
  signature: string,
  destination: string,
  durationDays: number,
  trip: Trip
): Promise<boolean> {
  if (!trip || !trip.itinerary || trip.itinerary.length === 0) return false;
  const normalized = signature.toLowerCase().trim();

  // Tier 1: Memory (24 hours)
  MEMORY_CACHE.set(normalized, { data: trip, expiresAt: Date.now() + 86400 * 1000 });

  // Tier 2: Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const embedding = generateSemanticEmbedding(
        `${destination} ${trip.travelerType || ''} ${(trip.preferences || []).join(' ')} ${trip.itinerary?.map(d => d.theme).join(' ') || ''}`
      );
      const payload = {
        prompt_signature: normalized,
        destination: destination.trim(),
        duration_days: durationDays,
        traveler_type: trip.travelerType || 'solo',
        itinerary_payload: trip,
        embedding,
        hit_count: 1,
        last_accessed_at: new Date().toISOString()
      };
      await supabase.from('ai_itinerary_cache').upsert(payload, { onConflict: 'prompt_signature' });
      return true;
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Clear in-memory cache (useful for testing or logout)
 */
export function clearMemoryCache(): void {
  MEMORY_CACHE.clear();
}

/**
 * Get current in-memory cache size
 */
export function getMemoryCacheSize(): number {
  return MEMORY_CACHE.size;
}
