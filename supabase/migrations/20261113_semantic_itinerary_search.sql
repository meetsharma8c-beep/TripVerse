-- =====================================================================
-- TripVerse AI pgvector Semantic Search & Recommendation Engine
-- =====================================================================

-- 1. Ensure pgvector extension exists
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to public.ai_itinerary_cache if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ai_itinerary_cache'
          AND column_name = 'embedding'
    ) THEN
        ALTER TABLE public.ai_itinerary_cache ADD COLUMN embedding vector(384);
    END IF;
END $$;

-- 3. Create index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_ai_cache_embedding ON public.ai_itinerary_cache USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. Cosine similarity semantic search function
CREATE OR REPLACE FUNCTION public.match_cached_itineraries(
    query_embedding vector(384),
    match_threshold float DEFAULT 0.3,
    match_count int DEFAULT 5,
    filter_destination text DEFAULT NULL,
    filter_traveler_type text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    prompt_signature text,
    destination text,
    duration_days int,
    traveler_type text,
    itinerary_payload jsonb,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.prompt_signature,
        c.destination,
        c.duration_days,
        c.traveler_type,
        c.itinerary_payload,
        1 - (c.embedding <=> query_embedding) AS similarity
    FROM public.ai_itinerary_cache c
    WHERE c.embedding IS NOT NULL
      AND (filter_destination IS NULL OR LOWER(c.destination) LIKE '%' || LOWER(filter_destination) || '%')
      AND (filter_traveler_type IS NULL OR c.traveler_type = filter_traveler_type)
      AND (1 - (c.embedding <=> query_embedding)) >= match_threshold
    ORDER BY c.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_cached_itineraries TO anon, authenticated, service_role;
