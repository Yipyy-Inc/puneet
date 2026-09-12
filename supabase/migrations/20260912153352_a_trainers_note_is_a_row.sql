-- ============================================================================
-- A trainer's note is a row, not a cache entry.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- Every trainer note — the profile's Notes tab, "Add note" on the quick
-- actions, the notes a completed session writes, and the "active alert" that
-- the calendar card and the pre-session briefing surface — was read from the
-- `trainerNotes` fixture in src/data/training.ts and written with
-- `queryClient.setQueryData`. A note survived until the tab was reloaded, and
-- a real pet whose ref matched a fixture pet showed that pet's notes.
--
-- ── WHY NOT public.notes ──────────────────────────────────────────────────
--
-- `notes` is the facility's general note on a pet, client or booking. A
-- trainer's note carries what that table has no columns for — a category of
-- its own (progress, concern, achievement), the enrollment and session it was
-- written in, and an ALERT with a lifecycle: raised, then lifted with a
-- reason the audit trail keeps. Widening `notes` for one module would put
-- training's vocabulary on every pet note in the product.
--
-- ── WHO MAY DO WHAT ───────────────────────────────────────────────────────
--
--   read   view_pet_records — the same arm as report cards
--          and the pet's OWNER, for a note that is not private
--   write  training_log_progress — the permission training's report cards
--          and progress already use
--
-- The facility and the owner come from the pet, by trigger, never from the
-- caller. A pet changing hands must not hand the new owner old notes, so
-- client_id is stamped once, at insert, like report_cards.client_id.
-- ============================================================================

create table if not exists public.training_notes (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities(id) on delete cascade,
  pet_id        uuid not null references public.pets(id) on delete cascade,
  client_id     uuid references public.clients(id) on delete cascade,
  enrollment_id uuid references public.training_series_enrollments(id) on delete set null,
  session_id    uuid references public.training_series_sessions(id) on delete set null,
  class_name    text,

  category      text not null
                  check (category in ('behavior', 'progress', 'concern', 'achievement', 'general')),
  body          text not null check (length(btrim(body)) between 1 and 5000),
  is_private    boolean not null default true,

  -- The alert. Lifted, never deleted: the reason is the audit trail.
  is_active_alert     boolean not null default false,
  deactivated_at      timestamptz,
  deactivation_reason text,
  deactivated_by_name text,
  constraint training_notes_lifted_with_a_reason check (
    (deactivated_at is null) = (deactivation_reason is null)
    and (deactivation_reason is null or length(btrim(deactivation_reason)) > 0)
  ),

  is_pinned     boolean not null default false,
  pinned_at     timestamptz,

  author_name   text,
  created_by    text default (auth.jwt()->>'sub'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.training_notes is
  'A trainer''s note on a pet: category, the enrollment/session it came from, and an alert with a lift reason. facility_id and client_id come from the pet by trigger. Replaces the trainerNotes fixture (2026-09-12).';

create index if not exists training_notes_facility_idx
  on public.training_notes (facility_id, created_at desc);
create index if not exists training_notes_pet_idx
  on public.training_notes (pet_id, created_at desc);

-- One pinned note per pet — the Overview card shows exactly one.
create unique index if not exists training_notes_one_pin_per_pet
  on public.training_notes (pet_id) where is_pinned;

-- ── The facility and the owner come from the pet ──────────────────────────

create or replace function private.training_note_from_pet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_client   uuid;
begin
  select p.facility_id, p.client_id into v_facility, v_client
    from public.pets p where p.id = new.pet_id;
  if v_facility is null then
    raise exception 'training_notes: no such pet' using errcode = '23503';
  end if;
  new.facility_id := v_facility;
  if tg_op = 'INSERT' then
    new.client_id := v_client;
  else
    -- Neither moves after insert.
    new.client_id := old.client_id;
    new.pet_id := old.pet_id;
    new.facility_id := old.facility_id;
  end if;
  new.updated_at := now();
  return new;
end;
$fn$;

revoke all on function private.training_note_from_pet() from public;
revoke all on function private.training_note_from_pet() from anon;

drop trigger if exists training_notes_from_pet on public.training_notes;
create trigger training_notes_from_pet
  before insert or update on public.training_notes
  for each row execute function private.training_note_from_pet();

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table public.training_notes enable row level security;

revoke all on public.training_notes from anon;
grant select, insert, update, delete on public.training_notes to authenticated;
grant all on public.training_notes to service_role;

drop policy if exists training_notes_read on public.training_notes;
create policy training_notes_read on public.training_notes
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_pet_records')
    or (not is_private and client_id in (select private.own_client_ids()))
  );

drop policy if exists training_notes_insert on public.training_notes;
create policy training_notes_insert on public.training_notes
  for insert with check (
    private.has_permission(facility_id, 'training_log_progress')
  );

drop policy if exists training_notes_update on public.training_notes;
create policy training_notes_update on public.training_notes
  for update
  using (private.has_permission(facility_id, 'training_log_progress'))
  with check (private.has_permission(facility_id, 'training_log_progress'));

drop policy if exists training_notes_delete on public.training_notes;
create policy training_notes_delete on public.training_notes
  for delete using (
    private.has_permission(facility_id, 'training_log_progress')
  );

-- ── A revoke is not verified by having been written ───────────────────────

do $check$
begin
  if has_table_privilege('anon', 'public.training_notes', 'select') then
    raise exception 'anon can still read training_notes';
  end if;
  if has_function_privilege('anon', 'private.training_note_from_pet()', 'execute') then
    raise exception 'anon can still execute private.training_note_from_pet()';
  end if;
end;
$check$;
