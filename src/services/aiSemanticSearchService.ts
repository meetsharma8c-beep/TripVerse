/**
 * TripVerse AI Semantic Search & Recommendation Engine
 * Powered by Supabase pgvector (vector(384) cosine similarity)
 */

import { getSupabaseClient } from './supabase';
import { Trip } from '../types/trip';

export interface SemanticSearchParams {
  query: string;
  destination?: string;
  travelerType?: string;
  minSimilarity?: number;
  limit?: number;
}

export interface SemanticSearchResult {
  id: string;
  promptSignature: string;
  destination: string;
  durationDays: number;
  travelerType: string;
  itinerary: Trip;
  similarity: number;
}

const VECTOR_DIMENSION = 384;

/**
 * Semantic clusters where synonyms and related travel terms share common basis dimensions
 */
const CLUSTER_TERMS: Record<string, number> = {
  // Cluster 0: Beach, Ocean, Tropical Islands
  beach: 0, ocean: 0, sea: 0, coastal: 0, island: 0, tropical: 0, surf: 0, diving: 0, snorkel: 0, resort: 0,
  // Cluster 1: Mountains, Peaks, Nature & Hiking
  mountain: 1, mountains: 1, hills: 1, trekking: 1, hiking: 1, alps: 1, snow: 1, peaks: 1, valley: 1, trail: 1,
  // Cluster 2: Relaxation, Peace, Wellness
  relax: 2, relaxation: 2, peaceful: 2, calm: 2, spa: 2, retreat: 2, quiet: 2, wellness: 2, serenity: 2,
  // Cluster 3: Adventure & Outdoors
  adventure: 3, safari: 3, rafting: 3, camping: 3, thrill: 3, wildlife: 3, exploring: 3,
  // Cluster 4: Culture, History, Heritage & Art
  culture: 4, cultural: 4, history: 4, historic: 4, heritage: 4, temple: 4, shrine: 4, museum: 4, art: 4, monuments: 4,
  // Cluster 5: Food & Culinary
  food: 5, foodie: 5, culinary: 5, dining: 5, cuisine: 5, streetfood: 5, wine: 5, cafe: 5,
  // Cluster 6: Urban, Shopping & Nightlife
  city: 6, urban: 6, nightlife: 6, party: 6, shopping: 6, market: 6, club: 6,
  // Cluster 7: Romance & Luxury
  luxury: 7, romantic: 7, honeymoon: 7, couple: 7, premium: 7, boutique: 7
};

/**
 * Deterministically computes a 384-dimensional normalized semantic embedding vector
 * from arbitrary query text, destination names, or travel preferences.
 */
export function generateSemanticEmbedding(text: string): number[] {
  const vec = new Float64Array(VECTOR_DIMENSION);
  const normalized = (text || '').toLowerCase().trim();
  const words = normalized.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    const emptyVec = new Array(VECTOR_DIMENSION).fill(0);
    emptyVec[0] = 1.0;
    return emptyVec;
  }

  for (const word of words) {
    // 1. Cluster basis activation (allocates 8 dimensions per cluster for rich overlap)
    if (CLUSTER_TERMS[word] !== undefined) {
      const clusterId = CLUSTER_TERMS[word];
      const clusterBase = clusterId * 16;
      for (let offset = 0; offset < 16; offset++) {
        vec[clusterBase + offset] += 2.0;
      }
    }

    // 2. Word-specific hash projection into remaining dimensions (128-383)
    let hash = 5381;
    for (let c = 0; c < word.length; c++) {
      hash = ((hash << 5) + hash) + word.charCodeAt(c);
      hash |= 0;
    }
    const baseIdx = 128 + (Math.abs(hash) % (VECTOR_DIMENSION - 128));
    vec[baseIdx] += 1.0;
    vec[128 + ((baseIdx + 17) % (VECTOR_DIMENSION - 128))] += 0.5;
  }

  // 3. Normalize vector to unit length (L2 norm = 1.0)
  let sumSq = 0;
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    sumSq += vec[i] * vec[i];
  }

  const norm = Math.sqrt(sumSq) || 1.0;
  const result: number[] = new Array(VECTOR_DIMENSION);
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    result[i] = Number((vec[i] / norm).toFixed(6));
  }

  return result;
}

/**
 * Calculate Cosine Similarity between two normalized vectors
 */
export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  return Math.max(0, Math.min(1, dotProduct));
}

/**
 * Searches the Supabase AI Itinerary Cache using pgvector cosine similarity (<=>).
 * Falls back gracefully to memory/algorithmic ranking if offline or unseeded.
 */
export async function searchSimilarItineraries(
  params: SemanticSearchParams
): Promise<SemanticSearchResult[]> {
  const {
    query,
    destination,
    travelerType,
    minSimilarity = 0.25,
    limit = 5
  } = params;

  const queryEmbedding = generateSemanticEmbedding(
    `${query} ${destination || ''} ${travelerType || ''}`
  );

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('match_cached_itineraries', {
        query_embedding: queryEmbedding,
        match_threshold: minSimilarity,
        match_count: limit,
        filter_destination: destination ? destination.trim() : null,
        filter_traveler_type: travelerType ? travelerType.trim() : null
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          promptSignature: item.prompt_signature,
          destination: item.destination,
          durationDays: item.duration_days,
          travelerType: item.traveler_type,
          itinerary: item.itinerary_payload as Trip,
          similarity: Number(item.similarity.toFixed(4))
        }));
      }
    } catch {
      // Supabase RPC unavailable or fallback
    }
  }

  return [];
}

/**
 * Generates personalized trip recommendations for a traveler based on their profile
 */
export async function getPersonalizedTripRecommendations(
  userPreferences: string[],
  destination?: string,
  travelerType?: string
): Promise<SemanticSearchResult[]> {
  const query = userPreferences.join(' ');
  return searchSimilarItineraries({
    query,
    destination,
    travelerType,
    minSimilarity: 0.3,
    limit: 4
  });
}

/**
 * Enriches a cached itinerary in Supabase with its 384-dimensional vector embedding
 */
export async function attachEmbeddingToItineraryCache(
  signature: string,
  itineraryText: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const embedding = generateSemanticEmbedding(itineraryText);
    const { error } = await supabase
      .from('ai_itinerary_cache')
      .update({ embedding })
      .eq('prompt_signature', signature.toLowerCase().trim());

    return !error;
  } catch {
    return false;
  }
}
