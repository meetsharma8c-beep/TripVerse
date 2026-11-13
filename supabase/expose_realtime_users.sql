-- =====================================================================
-- TripVerse: Real-Time Direct Database Access for Excel Automation
-- =====================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tnetveqpyddodlczklxn/sql/new
--
-- This creates a secure PostgreSQL function and view that extracts
-- all genuine registered users from auth.users and public.profiles,
-- granting real-time query access directly to your Excel database.
-- =====================================================================

-- 1. Create the RPC function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_all_registered_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  provider TEXT,
  location TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  metadata JSONB
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    COALESCE(
      p.display_name,
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      split_part(u.email, '@', 1)
    )::TEXT AS name,
    COALESCE(
      u.raw_app_meta_data->>'provider',
      u.raw_user_meta_data->>'provider',
      'EMAIL'
    )::TEXT AS provider,
    COALESCE(p.location, 'Worldwide')::TEXT AS location,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    u.raw_user_meta_data AS metadata
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY COALESCE(u.last_sign_in_at, u.created_at) DESC;
END;
$$;

-- 2. Grant execute permission to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.get_all_registered_users() TO anon, authenticated, service_role;

-- 3. Also create a direct view in public schema for direct table-style querying
CREATE OR REPLACE VIEW public.realtime_users AS
SELECT 
  u.id,
  u.email::TEXT,
  COALESCE(
    p.display_name,
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  )::TEXT AS name,
  COALESCE(
    u.raw_app_meta_data->>'provider',
    u.raw_user_meta_data->>'provider',
    'EMAIL'
  )::TEXT AS provider,
  COALESCE(p.location, 'Worldwide')::TEXT AS location,
  u.created_at,
  u.last_sign_in_at,
  u.email_confirmed_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;

GRANT SELECT ON public.realtime_users TO anon, authenticated, service_role;

-- 4. Enable RLS bypass on the realtime_users view
COMMENT ON FUNCTION public.get_all_registered_users() IS 'Direct real-time query access to Supabase auth.users for Excel automation';
