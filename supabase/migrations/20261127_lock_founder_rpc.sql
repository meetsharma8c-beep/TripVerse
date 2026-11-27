-- =====================================================================
-- TripVerse Security Hardening: Lock Down User Enumeration Views & RPC
-- =====================================================================
-- Revokes public/anon/authenticated direct browser access to auth.users
-- so ONLY the server-verified VIP Founder endpoint (`service_role`) can
-- read the registered user roster.
-- =====================================================================

DROP VIEW IF EXISTS public.realtime_users;

REVOKE ALL ON FUNCTION public.get_all_registered_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_all_registered_users() FROM anon;
REVOKE ALL ON FUNCTION public.get_all_registered_users() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_registered_users() TO service_role;
