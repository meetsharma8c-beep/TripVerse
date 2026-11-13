-- =====================================================================
-- TripVerse High-Performance Edge Cache & AI Vector Engine
-- =====================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tnetveqpyddodlczklxn/sql/new
-- =====================================================================

-- 1. Enable pgvector extension for AI semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create high-speed API edge cache table
CREATE TABLE IF NOT EXISTS public.cached_external_apis (
    endpoint_key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Fast B-Tree index for instant lookups & background expiration cleanups
CREATE INDEX IF NOT EXISTS idx_cached_api_expiry ON public.cached_external_apis(expires_at);

-- RLS setup for cached_external_apis
ALTER TABLE public.cached_external_apis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read cached apis" ON public.cached_external_apis;
CREATE POLICY "Public read cached apis" ON public.cached_external_apis
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert or update cached apis" ON public.cached_external_apis;
CREATE POLICY "Public insert or update cached apis" ON public.cached_external_apis
    FOR ALL USING (true)
    WITH CHECK (true);

GRANT ALL ON public.cached_external_apis TO anon, authenticated, service_role;

-- 3. Create AI Itinerary Cache table
CREATE TABLE IF NOT EXISTS public.ai_itinerary_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_signature TEXT UNIQUE NOT NULL,
    destination TEXT NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 3,
    traveler_type TEXT DEFAULT 'solo',
    itinerary_payload JSONB NOT NULL,
    hit_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast index on signature for O(1) hash lookups
CREATE INDEX IF NOT EXISTS idx_ai_cache_signature ON public.ai_itinerary_cache(prompt_signature);
CREATE INDEX IF NOT EXISTS idx_ai_cache_destination ON public.ai_itinerary_cache(LOWER(destination));

-- RLS setup for ai_itinerary_cache
ALTER TABLE public.ai_itinerary_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read ai itinerary cache" ON public.ai_itinerary_cache;
CREATE POLICY "Public read ai itinerary cache" ON public.ai_itinerary_cache
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public write ai itinerary cache" ON public.ai_itinerary_cache;
CREATE POLICY "Public write ai itinerary cache" ON public.ai_itinerary_cache
    FOR ALL USING (true)
    WITH CHECK (true);

GRANT ALL ON public.ai_itinerary_cache TO anon, authenticated, service_role;

-- 4. Atomic Helper Function: Get or Increment Hit Count
CREATE OR REPLACE FUNCTION public.get_cached_itinerary(p_signature TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_payload JSONB;
BEGIN
  UPDATE public.ai_itinerary_cache
  SET hit_count = hit_count + 1,
      last_accessed_at = NOW()
  WHERE prompt_signature = p_signature
  RETURNING itinerary_payload INTO v_payload;
  
  RETURN v_payload;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cached_itinerary(TEXT) TO anon, authenticated, service_role;

-- 5. Helper Function: Cleanup Expired API Caches
CREATE OR REPLACE FUNCTION public.clean_expired_api_cache()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.cached_external_apis
  WHERE expires_at < NOW();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clean_expired_api_cache() TO anon, authenticated, service_role;
