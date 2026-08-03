-- ============================================================================
-- The grooming waitlist — who is waiting, and what they will accept.
--
-- ── DECISION 1: THE LEGACY FIELD PAIRS DO NOT COME ACROSS ──────────────────
--
-- `data/grooming-waitlist.ts` carries FOUR pairs where an old flat field sits
-- beside a newer structured one, each documented as "legacy … new entries
-- should use …":
--
--   date                  ↔ expectedDate      (4-way discriminated union)
--   preferredTimeWindow   ↔ expectedTime      (3-way union)
--   preferredStylistName  ↔ preferredStylistIds
--   notes                 ↔ comment
--
-- The obvious move is to carry both into the schema and let old rows keep the
-- old shape. It is wrong here, for a reason worth stating plainly: THERE IS NO
-- LEGACY DATA. This database has never held a waitlist row. The "legacy"
-- entries exist only in a mock fixture this table replaces — wl-01…wl-07, seven
-- objects written by hand. Reproducing a compatibility seam for data that does
-- not exist would bake a fixture's authoring history into a fresh schema, and
-- every future reader would have to be told that the legacy columns were always
-- empty.
--
-- So the table stores ONE shape, the structured one, and the mapper emits only
-- that. The TypeScript type keeps its optional legacy fields — other, non-
-- Postgres callers still construct entries — but nothing read from here will
-- ever populate them.
--
-- THIS IS A BEHAVIOUR CHANGE FOR ONE CASE, and it is the reason the decision
-- deserved a paragraph rather than a shrug. The old 3-way `preferredTimeWindow`
-- read "afternoon" as everything from 12:00 onward; the structured `period`
-- splits afternoon (12:00–17:00) from evening (17:00+). An entry that would
-- have been written as legacy-afternoon and matched to a 17:30 slot no longer
-- does. Every mock entry that used it is being replaced by this migration's
-- seed, so nothing in flight changes meaning — but a facility that thinks in
-- "PM" now has to say afternoon OR evening, and that is a real difference the
-- next person should not have to rediscover from the matcher.
--
-- ── DECISION 2: THE UNIONS BECOME A DISCRIMINANT PLUS CHECKED COLUMNS ──────
--
-- `expectedDate` is a 4-way union, `expectedTime` a 3-way. Two ways to store
-- them: a jsonb blob that mirrors the TypeScript, or a `_kind` column with the
-- per-kind fields beside it and a CHECK making the wrong combinations
-- impossible.
--
-- jsonb was refused. It would accept `{"kind":"range"}` with no dates, or
-- `{"kind":"specific-date","date":"not-a-date"}`, and the first thing to notice
-- would be the matcher silently skipping the entry — a client who is waiting
-- and never gets offered anything. The columns below cannot hold those states:
-- `grooming_waitlist_date_shape` asserts exactly which fields are non-null for
-- each kind, so the discriminant and the payload cannot disagree.
--
-- It also makes the data queryable. "Who is waiting for a Tuesday" is an
-- index-able predicate on a smallint[], not a jsonb walk.
--
-- ── DECISION 3: THE ANCHOR DATE IS DERIVED, NEVER SUPPLIED ─────────────────
--
-- The calendar paints a per-day waitlist count and needs ONE date per entry,
-- while the matcher needs the whole preference. That is not the same fact twice
-- — it is a rule plus the first date the rule admits — so `anchor_date` stays,
-- computed by trigger:
--
--   specific-date → the date          range       → the start date
--   day-of-week   → the next matching day (0–6 out) from today
--   asap          → today
--
-- The dialog computes this in the browser today (GroomingWaitlistDialog, "the
-- facility-side waitlist tab uses the legacy `date` for sort/index"), which
-- means it is computed in the CLIENT's timezone and frozen at the instant the
-- form was submitted. Here it is the facility's timezone and the database's
-- clock. It is not accepted from a caller: a supplied anchor that disagreed
-- with the preference would put a client on a day the matcher will never offer.
--
-- ── DECISION 4: THE OFFER DEADLINE IS THE SERVER'S ─────────────────────────
--
-- `offered_until` decides whether a client still holds a slot (Table 96: four
-- hours to confirm, then it passes to the next person). A caller-supplied
-- deadline is a caller-supplied entitlement — send `offered_until` far enough
-- out and the slot never passes on. So the caller sends a WINDOW, and the
-- trigger stamps both timestamps from `clock_timestamp()`.
--
-- ── PERMISSIONS ────────────────────────────────────────────────────────────
--
--   read   `view_bookings`, or platform admin — the same key the bookings it
--          feeds already use. A waitlist entry is a booking that has not
--          happened yet, not a catalogue item.
--   write  `edit_bookings`, for the same reason.
--   NO DELETE POLICY. `removed` is a status, and the screens already treat it
--          as one (the provider filters removed entries out of `entries`).
--          Somebody who asked to be called deserves to still be in the record
--          when they ask why nobody called; hard deletion is service_role's.
--   NOT clients. The only two callers that create entries are staff screens —
--          the facility booking modal and the new-appointment dialog. A
--          customer-portal read policy would be a guess at a screen that does
--          not exist.
-- ============================================================================

create table public.grooming_waitlist_entries (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,

  legacy_id   text,

  -- Nullable on purpose: a walk-in who phones in is not yet a client, and the
  -- mock's own shape says so ("undefined for new walk-ins"). `on delete set
  -- null` keeps the entry when a client record is removed — the queue is still
  -- a record that somebody asked.
  client_id   uuid references public.clients (id) on delete set null,
  pet_id      uuid references public.pets (id) on delete set null,

  -- Snapshotted, and not only for the walk-in case: the queue has to render
  -- when the client record is gone, and a phone number typed onto the waitlist
  -- is the one that was given for THIS callback.
  pet_name    text not null check (length(trim(pet_name)) > 0),
  pet_breed   text not null default '',
  owner_name  text not null check (length(trim(owner_name)) > 0),
  owner_phone text not null default '',
  owner_email text,

  -- `on delete set null` + a snapshotted name, same as grooming_appointments:
  -- retiring a service must not erase what somebody is waiting for.
  service_id   uuid references public.grooming_services (id) on delete set null,
  service_name text not null check (length(trim(service_name)) > 0),

  -- Derived — see Decision 3. Not accepted from callers.
  anchor_date date not null default current_date,

  expected_date_kind text not null
    check (expected_date_kind in ('asap', 'specific-date', 'day-of-week', 'range')),
  expected_date         date,
  expected_days_of_week smallint[],
  expected_start_date   date,
  expected_end_date     date,

  -- Days the client explicitly cannot do (Table 96). '{}' rather than null:
  -- "no exclusions" and "not set" are the same thing, one representation.
  excluded_dates date[] not null default '{}',

  expected_time_kind text not null default 'anytime'
    check (expected_time_kind in ('anytime', 'period', 'exact-time')),
  expected_period text check (expected_period in ('morning', 'afternoon', 'evening')),
  expected_time   time,

  -- EMPTY MEANS ANYONE — the mock's rule, kept. Real staff ids, not the mock's
  -- `stylist-002` strings: the client-side stylist remap already exists
  -- (`stylistIdForStaff`), and storing a display id would leave the table
  -- unable to say whether a preferred groomer still works here.
  preferred_staff_ids uuid[] not null default '{}',

  valid_until date,
  postal_code text,

  source text not null default 'manual'
    check (source in ('manual', 'calendar-plus', 'moved-from-appointment',
                      'online-booking', 'intake-form')),
  comment text,

  status text not null default 'waiting'
    check (status in ('waiting', 'offered', 'confirmed', 'expired', 'removed')),

  -- How long the client gets to confirm once a slot is offered. Stored so the
  -- deadline can be recomputed and audited, and so a facility that wants a
  -- 2-hour window is a value change rather than a code change.
  offer_window_minutes integer not null default 240
    check (offer_window_minutes > 0),
  offered_at    timestamptz,
  offered_until timestamptz,
  offered_slot  text,

  added_at   timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint grooming_waitlist_legacy_key unique (facility_id, legacy_id),

  -- Decision 2. Each kind names exactly the columns it uses, and forbids the
  -- rest — a `range` entry cannot smuggle in a `specific-date`.
  constraint grooming_waitlist_date_shape check (
    case expected_date_kind
      when 'asap' then
        expected_date is null and expected_days_of_week is null
        and expected_start_date is null and expected_end_date is null
      when 'specific-date' then
        expected_date is not null and expected_days_of_week is null
        and expected_start_date is null and expected_end_date is null
      when 'day-of-week' then
        expected_date is null and expected_days_of_week is not null
        and array_length(expected_days_of_week, 1) > 0
        and expected_start_date is null and expected_end_date is null
      when 'range' then
        expected_date is null and expected_days_of_week is null
        and expected_start_date is not null and expected_end_date is not null
        and expected_end_date >= expected_start_date
    end
  ),

  -- 0=Sunday … 6=Saturday, the JS convention the matcher reads with getDay().
  constraint grooming_waitlist_dow_domain check (
    expected_days_of_week is null
    or expected_days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]
  ),

  constraint grooming_waitlist_time_shape check (
    case expected_time_kind
      when 'anytime'    then expected_period is null and expected_time is null
      when 'period'     then expected_period is not null and expected_time is null
      when 'exact-time' then expected_period is null and expected_time is not null
    end
  ),

  -- An offer that is live must have a deadline. Deliberately one-way, not an
  -- iff: an entry that lapsed keeps `offered_at`/`offered_until` as the record
  -- of what it was offered and when — that is the history the panel shows.
  constraint grooming_waitlist_offer_shape check (
    status <> 'offered' or (offered_at is not null and offered_until is not null)
  )
);

create index grooming_waitlist_facility_idx
  on public.grooming_waitlist_entries (facility_id, anchor_date);
-- The matcher only ever considers `waiting`, and that is a small slice of a
-- table that accumulates confirmed/expired rows forever.
create index grooming_waitlist_waiting_idx
  on public.grooming_waitlist_entries (facility_id, added_at)
  where status = 'waiting';

comment on table public.grooming_waitlist_entries is
  'Grooming waitlist. Stores ONLY the structured preference shape — see Decision 1 in 20260806100000 for why the mock''s legacy field pairs were not carried across.';

-- ── Derived columns ─────────────────────────────────────────────────────────

create or replace function private.grooming_waitlist_derive()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_tz    text;
  v_today date;
  v_probe date;
  i       integer;
begin
  -- Recompute only when the preference itself moved. On any other edit — a
  -- status change, a corrected phone number — the anchor is carried over
  -- rather than left alone: this is a BEFORE trigger, so an untouched
  -- `new.anchor_date` is whatever the caller sent, and the anchor is not
  -- theirs to set (Decision 3).
  if tg_op = 'UPDATE'
     and new.expected_date_kind is not distinct from old.expected_date_kind
     and new.expected_date       is not distinct from old.expected_date
     and new.expected_start_date is not distinct from old.expected_start_date
     and new.expected_days_of_week is not distinct from old.expected_days_of_week
  then
    new.anchor_date := old.anchor_date;
    return new;
  end if;

  select timezone into v_tz from public.facilities where id = new.facility_id;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;

  -- Every branch coalesces to today, and that is not defensiveness — it is
  -- about WHICH ERROR the caller sees. A BEFORE trigger runs ahead of the CHECK
  -- constraints, so a malformed `range` with no start date would set a null
  -- anchor and fail with "null value in column anchor_date", burying the actual
  -- problem. Falling back keeps the row alive just long enough for
  -- `grooming_waitlist_date_shape` to reject it by name.
  if new.expected_date_kind = 'specific-date' then
    new.anchor_date := coalesce(new.expected_date, v_today);
  elsif new.expected_date_kind = 'range' then
    -- The first date the client asked for, even if it has passed: the entry
    -- says what it says, and clamping it to today would quietly move somebody
    -- forward in a queue the calendar orders by this column.
    new.anchor_date := coalesce(new.expected_start_date, v_today);
  elsif new.expected_date_kind = 'day-of-week' then
    new.anchor_date := v_today;
    for i in 0..6 loop
      v_probe := v_today + i;
      if extract(dow from v_probe)::smallint = any (new.expected_days_of_week) then
        new.anchor_date := v_probe;
        exit;
      end if;
    end loop;
  else
    new.anchor_date := v_today;
  end if;

  return new;
end;
$$;

create trigger grooming_waitlist_derive
  before insert or update on public.grooming_waitlist_entries
  for each row execute function private.grooming_waitlist_derive();

-- ── The offer clock ─────────────────────────────────────────────────────────

create or replace function private.grooming_waitlist_offer_stamp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    -- A brand-new entry is not an offer. Nothing to stamp, and nothing a
    -- caller can pre-stamp.
    if new.status <> 'offered' then
      new.offered_at := null;
      new.offered_until := null;
    else
      new.offered_at := clock_timestamp();
      new.offered_until :=
        new.offered_at + make_interval(mins => new.offer_window_minutes);
    end if;
    return new;
  end if;

  if new.status = 'offered' and old.status is distinct from 'offered' then
    -- Wall-clock, not now(): the countdown a client is racing is real time,
    -- and a batch that offers three slots must not date them all to the
    -- instant the transaction opened. Same reasoning as
    -- grooming_stations.status_changed_at (20260805180000).
    new.offered_at := clock_timestamp();
    new.offered_until :=
      new.offered_at + make_interval(mins => new.offer_window_minutes);
  elsif new.status = 'waiting' and old.status is distinct from 'waiting' then
    -- Re-queued. The previous offer is over and its slot text would otherwise
    -- keep rendering against a client who no longer holds it.
    new.offered_at := null;
    new.offered_until := null;
    new.offered_slot := null;
  else
    -- Carried over explicitly, for the same reason as the anchor: an untouched
    -- BEFORE-trigger column is the caller's value, and the deadline is not
    -- theirs to move (Decision 4).
    new.offered_at := old.offered_at;
    new.offered_until := old.offered_until;
  end if;

  return new;
end;
$$;

create trigger grooming_waitlist_offer_stamp
  before insert or update on public.grooming_waitlist_entries
  for each row execute function private.grooming_waitlist_offer_stamp();

create trigger grooming_waitlist_touch
  before update on public.grooming_waitlist_entries
  for each row execute function private.set_updated_at();

-- ── Cross-facility integrity ────────────────────────────────────────────────
--
-- Every FK on this table only says the row EXISTS. Without this, a facility
-- could park an entry against another facility's client, pet, service or
-- groomer and read their names back off the join — the same hole
-- `grooming_station_same_facility` closes for stations.

create or replace function private.grooming_waitlist_same_facility()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_other uuid;
  v_bad   integer;
begin
  if new.client_id is not null then
    select facility_id into v_other from public.clients where id = new.client_id;
    if v_other is distinct from new.facility_id then
      raise exception 'That client belongs to a different facility.'
        using errcode = '42501';
    end if;
  end if;

  if new.pet_id is not null then
    select facility_id into v_other from public.pets where id = new.pet_id;
    if v_other is distinct from new.facility_id then
      raise exception 'That pet belongs to a different facility.'
        using errcode = '42501';
    end if;
  end if;

  if new.service_id is not null then
    select facility_id into v_other
      from public.grooming_services where id = new.service_id;
    if v_other is distinct from new.facility_id then
      raise exception 'That service belongs to a different facility.'
        using errcode = '42501';
    end if;
  end if;

  if array_length(new.preferred_staff_ids, 1) > 0 then
    select count(*) into v_bad
      from unnest(new.preferred_staff_ids) as wanted (id)
      left join public.staff s on s.id = wanted.id
     where s.id is null or s.facility_id is distinct from new.facility_id;
    if v_bad > 0 then
      raise exception 'A preferred groomer does not work at this facility.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger grooming_waitlist_same_facility
  before insert or update on public.grooming_waitlist_entries
  for each row execute function private.grooming_waitlist_same_facility();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.grooming_waitlist_entries enable row level security;

create policy grooming_waitlist_read on public.grooming_waitlist_entries
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_bookings')
  );

create policy grooming_waitlist_insert on public.grooming_waitlist_entries
  for insert to authenticated
  with check (private.has_permission(facility_id, 'edit_bookings'));

create policy grooming_waitlist_update on public.grooming_waitlist_entries
  for update to authenticated
  using (private.has_permission(facility_id, 'edit_bookings'))
  with check (private.has_permission(facility_id, 'edit_bookings'));

-- No delete policy. See the header: removal is a status.
