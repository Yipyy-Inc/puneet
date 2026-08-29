-- ============================================================================
-- One dog needs grooming every three weeks. The facility default is four.
--
-- `clientServicePreferences` in src/data/rebook-reminders.ts held exactly this
-- and held it nowhere: a hand-written array keyed by fixture client ids, edited
-- into a `useState` on the client file, gone on reload. The screen has offered
-- it since it was built.
--
-- -- WHY service IS NULLABLE --------------------------------------------------
--
-- The screen asks two different questions with two different keys:
--
--   "groom THIS dog every 3 weeks"      per client AND service
--   "stop rebook reminders for them"    per client, every service
--
-- A row with `service is null` is the second one. The alternative -- a sentinel
-- like '*', or a second table -- either invents a service name that is not a
-- service or splits one concept across two places the pipeline has to join
-- twice. `nulls not distinct` on the unique index is what makes the null key
-- behave like a key, and it is why this needs Postgres 15 or later (we are on
-- 17.6).
--
-- -- IT IS NOT A SUPPRESSION ------------------------------------------------
--
-- `message_suppressions` is the customer's own decision, keyed by ADDRESS, and
-- it stops every marketing message from every source. This is the FACILITY's
-- note about one client -- "she books when she books, do not chase her" -- and
-- it stops rebook reminders only. Conflating them would either over-apply a
-- staff note to a customer's whole relationship, or let a rebook reminder reach
-- somebody who unsubscribed. Both checks run; neither replaces the other.
-- ============================================================================

create table if not exists public.client_rebook_preferences (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,

  -- NULL = every service. See the header.
  service text check (service is null or btrim(service) <> ''),

  -- NULL = use the facility's interval for this service.
  frequency_days smallint
    check (frequency_days is null or frequency_days between 1 and 3650),

  reminders_enabled boolean not null default true,

  -- Why somebody set it. A frequency nobody can explain gets "corrected" back.
  reason text,

  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.client_rebook_preferences is
  'Per-client overrides of the facility rebook interval, and the facility''s note that one client should not be chased. service IS NULL means every service.';

create unique index if not exists client_rebook_preferences_unique
  on public.client_rebook_preferences (facility_id, client_id, service)
  nulls not distinct;

create index if not exists client_rebook_preferences_client_idx
  on public.client_rebook_preferences (client_id);

alter table public.client_rebook_preferences enable row level security;

drop policy if exists client_rebook_preferences_read on public.client_rebook_preferences;
create policy client_rebook_preferences_read on public.client_rebook_preferences
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

-- `edit_clients`, not `marketing_manage_automations`. This lives on the client
-- file and is a fact about that client -- the receptionist who takes the phone
-- call is who hears "actually he needs doing every three weeks".
drop policy if exists client_rebook_preferences_write on public.client_rebook_preferences;
create policy client_rebook_preferences_write on public.client_rebook_preferences
  for all using (
    private.has_permission(facility_id, 'edit_clients')
  ) with check (
    private.has_permission(facility_id, 'edit_clients')
  );

grant select, insert, update, delete on public.client_rebook_preferences to authenticated;
revoke all on public.client_rebook_preferences from public, anon;

do $$
begin
  if has_table_privilege('anon', 'public.client_rebook_preferences', 'select') then
    raise exception 'anon can read client rebook preferences';
  end if;
  if has_table_privilege('anon', 'public.client_rebook_preferences', 'insert') then
    raise exception 'anon can write client rebook preferences';
  end if;
end $$;
