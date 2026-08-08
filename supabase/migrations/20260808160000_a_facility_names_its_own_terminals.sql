-- ============================================================================
-- Clover, phase 4: telling one terminal from another.
--
-- ── WHY A TABLE AT ALL ────────────────────────────────────────────────────
--
-- A facility can have several terminals, and Clover gives us nothing to tell
-- them apart. The real Flex 4 on the test merchant comes back as:
--
--   name: null          model: "Clover_C406"        productName: "Flex 4"
--   serial: "C046UG51931348"
--
-- Three of them would be three identical "Flex 4"s, distinguishable only by a
-- fourteen-character serial. Nobody standing at a counter picks a terminal from
-- that, and picking the wrong one sends a customer's card request to a device in
-- another room.
--
-- So the facility names them: "Front desk", "Grooming room", "Boarding".
--
-- ── CLOVER OWNS WHAT EXISTS; THIS ONLY DECORATES ──────────────────────────
--
-- This table is NOT the list of terminals. The list is whatever
-- /v3/merchants/{mid}/devices returns, because a device bought, activated or
-- returned at Clover changes there and nowhere else. A row here is a LABEL for a
-- serial, and a serial with no row is still a perfectly usable terminal — it
-- just shows as its model until somebody names it.
--
-- The alternative — treating this as the inventory — means a facility that buys
-- a second Flex cannot use it until somebody remembers to add a row, and a
-- returned one lingers forever. Both are the kind of drift that ends with a
-- payment sent to a device that is not there.
--
-- ── ONE DEFAULT, ENFORCED ─────────────────────────────────────────────────
--
-- The counter should not choose every time. A default per facility means the
-- ordinary case is one press, and the picker exists for the exception. "One
-- default" is a partial unique index rather than a convention, because two rows
-- claiming it is a coin flip about where somebody's card is charged.
-- ============================================================================

create table if not exists public.facility_terminals (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references public.facilities(id) on delete cascade,

  -- The SERIAL, which is what REST Pay Display addresses a device by — the
  -- header is called X-Clover-Device-Id and the device's `id` is refused.
  -- Storing the id instead would be storing the value that does not work.
  serial       text not null check (length(trim(serial)) > 0),

  -- What the staff call it. The whole reason this table exists.
  label        text not null check (length(trim(label)) between 1 and 60),

  -- Multi-location facilities put a terminal in a room. Nullable: a
  -- single-location facility has nothing to say here.
  location_id  uuid references public.locations(id) on delete set null,

  is_default   boolean not null default false,

  -- Not "is it plugged in" — that is deviceState(), which costs a round trip to
  -- the hardware. This is a facility retiring a terminal they no longer use, so
  -- it stops appearing in the picker without losing the payments it took.
  is_active    boolean not null default true,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint facility_terminals_serial_unique unique (facility_id, serial)
);

comment on table public.facility_terminals is
  'Names for a facility''s card terminals. Clover owns which devices exist; this only labels them.';
comment on column public.facility_terminals.serial is
  'The device SERIAL — what X-Clover-Device-Id actually wants. Not the device id.';

-- One default per facility, or none. Partial so that unset is unconstrained.
create unique index if not exists facility_terminals_one_default
  on public.facility_terminals (facility_id)
  where is_default;

create index if not exists facility_terminals_facility
  on public.facility_terminals (facility_id)
  where is_active;

-- ── Who may read and change them ──────────────────────────────────────────
--
-- Reading is anyone who can see the facility's bookings: a terminal's label is
-- not sensitive and the picker needs it. Changing is `manage_settings`, because
-- renaming a terminal is a settings act and pointing "Front desk" at the wrong
-- serial sends real card requests to the wrong room.

alter table public.facility_terminals enable row level security;

revoke all on public.facility_terminals from anon;

drop policy if exists facility_terminals_read on public.facility_terminals;
create policy facility_terminals_read on public.facility_terminals
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_bookings')
  );

drop policy if exists facility_terminals_write on public.facility_terminals;
create policy facility_terminals_write on public.facility_terminals
  for all to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'manage_settings')
  )
  with check (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'manage_settings')
  );

create trigger facility_terminals_touch
  before update on public.facility_terminals
  for each row execute function private.set_updated_at();

-- ── Making one the default ────────────────────────────────────────────────
--
-- A function rather than two statements from the app, because "clear the old
-- default, set the new one" is exactly the pair that leaves a facility with
-- none if the second half fails — and the partial unique index would refuse the
-- naive order anyway.

create or replace function public.set_default_terminal(p_terminal_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_facility uuid;
begin
  select facility_id into v_facility
    from public.facility_terminals
   where id = p_terminal_id;

  if v_facility is null then
    raise exception 'No such terminal.' using errcode = '42704';
  end if;

  -- Cleared first: the unique index refuses two defaults, so the other order
  -- fails on its own constraint.
  update public.facility_terminals
     set is_default = false
   where facility_id = v_facility
     and is_default
     and id <> p_terminal_id;

  update public.facility_terminals
     set is_default = true
   where id = p_terminal_id;
end;
$$;

comment on function public.set_default_terminal(uuid) is
  'SECURITY INVOKER: the RLS policy decides, so this is not a way around manage_settings.';
