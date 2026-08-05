-- ============================================================================
-- Remove the third-party-auth scaffolding.
--
-- public.clerk_tpa_check and src/app/test-clerk-supabase/ existed to prove one
-- thing before the real migration touched anything: that a table policed by
-- auth.jwt()->>'sub' answers a Clerk session token, while one policed by
-- auth.uid() raises 22P02 on the same token. That contrast isolated the
-- remaining work to the RLS layer and ruled out the token, the provider config
-- and the client wiring.
--
-- The real tables now do what this one was proving, so keeping it would leave a
-- table whose only purpose was to be different from the others.
-- ============================================================================

drop table if exists public.clerk_tpa_check;
