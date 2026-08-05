-- ============================================================================
-- SCAFFOLDING — verifies the Clerk third-party auth chain end to end.
--
-- Purely additive: no existing table, policy, column or row is touched. It
-- exists to prove that a table policed by auth.jwt()->>'sub' answers a Clerk
-- session token correctly, before the real migration touches the RLS layer.
--
-- Paired with src/app/test-clerk-supabase/. Together they demonstrate the
-- contrast that isolates the remaining work:
--
--   profiles          auth.uid()            → 22P02, the uuid cast fails
--   clerk_tpa_check   auth.jwt()->>'sub'    → insert + read back succeed
--
-- Drop both when specs/001-clerk-third-party-auth lands:
--   drop table public.clerk_tpa_check;
-- ============================================================================

create table public.clerk_tpa_check (
  id         bigint primary key generated always as identity,
  label      text        not null,
  -- The Clerk pattern: a TEXT user id defaulted from the session token's `sub`
  -- claim, rather than a uuid FK into auth.users. This is what the real tables
  -- migrate toward.
  user_id    text        not null default auth.jwt()->>'sub',
  created_at timestamptz not null default now()
);

alter table public.clerk_tpa_check enable row level security;

create policy "clerk users read their own rows"
on public.clerk_tpa_check
for select
to authenticated
using ((select auth.jwt()->>'sub') = user_id);

create policy "clerk users insert their own rows"
on public.clerk_tpa_check
for insert
to authenticated
with check ((select auth.jwt()->>'sub') = user_id);

grant select, insert on public.clerk_tpa_check to authenticated;
