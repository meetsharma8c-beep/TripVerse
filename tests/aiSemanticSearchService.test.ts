import { describe, it, expect } from 'vitest';
import {
  generateSemanticEmbedding,
  computeCosineSimilarity,
  searchSimilarItineraries,
  getPersonalizedTripRecommendations
} from '../src/services/aiSemanticSearchService';

describe('AI pgvector Semantic Search & Recommendation Engine', () => {
  it('generates a 384-dimensional normalized unit vector', () => {
    const vec = generateSemanticEmbedding('tropical beach resort bali luxury vacation');
    expect(vec).toBeDefined();
    expect(vec.length).toBe(384);

    // Verify L2 norm equals approximately 1.0
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    expect(norm).toBeCloseTo(1.0, 2);
  });

  it('computes high cosine similarity between related travel concepts', () => {
    const beachVec1 = generateSemanticEmbedding('peaceful beach vacation tropical island');
    const beachVec2 = generateSemanticEmbedding('ocean resort beach relaxation');
    const mountainVec = generateSemanticEmbedding('himalayan mountain hiking trekking snow');

    const beachSimilarity = computeCosineSimilarity(beachVec1, beachVec2);
    const crossSimilarity = computeCosineSimilarity(beachVec1, mountainVec);

    expect(beachSimilarity).toBeGreaterThan(crossSimilarity);
    expect(beachSimilarity).toBeGreaterThan(0.5);
  });

  it('handles empty query gracefully with fallback unit vector', () => {
    const emptyVec = generateSemanticEmbedding('');
    expect(emptyVec.length).toBe(384);
    expect(emptyVec[0]).toBe(1.0);
  });

  it('handles personalized recommendations without throwing', async () => {
    const results = await getPersonalizedTripRecommendations(['beach', 'luxury'], 'Maldives', 'couple');
    expect(Array.isArray(results)).toBe(true);
  });

  it('handles searchSimilarItineraries gracefully', async () => {
    const results = await searchSimilarItineraries({
      query: 'romantic mountain getaway',
      destination: 'Switzerland',
      limit: 3
    });
    expect(Array.isArray(results)).toBe(true);
  });
});
