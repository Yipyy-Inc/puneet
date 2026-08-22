-- ============================================================================
-- A report card is a row the owner can read.
--
-- ── WHAT WAS MISSING ──────────────────────────────────────────────────────
--
-- Report cards had two of their three layers already:
--
--   * The CONFIG is real. Templates, branding, auto-send channels and the
--     facility's custom questions live in `facility_settings.report_cards`
--     (`src/lib/settings/domains.ts`), written by the settings screen.
--   * The AI SUMMARY is real, and it is BILLED. `/api/ai/report-card-summary`
--     is an Anthropic call metered through `recordAiUsage`.
--
-- The card itself was `useState` in a 1,967-line component. No table, no
-- endpoint. A facility filled in the form, paid for the prose, and the card
-- existed until the tab was refreshed.
--
-- ── THE PART THAT WAS WORSE THAN NOT PERSISTING ───────────────────────────
--
-- "Sending" pushed onto an in-memory array:
--
--     sendReportCardEmail(d) -> record("email", d) -> outbox.push({...})
--
-- and the screen then said "Report card sent to {owner} — Delivered via
-- email, SMS." Nothing left the browser. `bun run check:success-claims` did
-- not catch it, because `sendReportCardNotifications()` returns a non-empty
-- array of channel labels and therefore LOOKS like something that could
-- perform the act. A simulated sender passes a guard that a missing sender
-- would have failed.
--
-- ── AND THE OWNER COULD NOT HAVE SEEN IT ANYWAY ───────────────────────────
--
-- The two ends of this journey do not speak the same language, which is why
-- persisting the facility's shape unchanged would still have shown the owner
-- nothing:
--
--   the facility WRITES  `input`     — mood, energy, appetite, potty, friends
--                        `generated` — todaysVibe, friendsAndFun, careMetrics,
--                                      closingNote  (the prose that was paid for)
--   the customer READS   activities[], meals[], pottyBreaks[], staffNotes
--                                    — arrays the form has never collected
--
-- So the canonical shape here is the FACILITY's, because it is the one the
-- product actually produces, and `/customer/report-cards` is changed to render
-- the prose. The structured arrays are not re-collected in a report-card form:
-- `care_log_entries` and `daycare_attendance` are real tables that already
-- record feedings, medications and potty breaks, and that is where a future
-- structured section should read from. Collecting them twice would create a
-- second record of the same day that drifts from the first.
--
-- One name is settled on the way past: the facility module called boarding
-- "hotel" while the shared enum called it "boarding". `boarding` wins — it is
-- what `boarding_stays` and `boarding_send_updates` already call it, and
-- "hotel" was a UI label that leaked into a type.
--
-- ── WHO MAY SEND ONE ──────────────────────────────────────────────────────
--
-- The permission catalogue deliberately separates `daycare_send_updates` from
-- `boarding_send_updates` — a daycare attendant is not thereby a boarding
-- attendant. The INSERT policy therefore gates on the CARD'S OWN service
-- rather than accepting either permission for any card, so that distinction
-- survives contact with this table instead of being flattened into
-- "can send updates".
--
-- ── THE OWNER WRITES, BUT NOT TO THE CARD ─────────────────────────────────
--
-- A customer marks a card viewed, favourites it, replies to it and rates it.
-- Those are four writes to a row whose other columns are the facility's
-- record of what happened that day. There is no column-level RLS in Postgres,
-- so an UPDATE policy permissive enough for the reply is permissive enough to
-- rewrite the staff notes.
--
-- No UPDATE policy for a customer exists. The four writes go through
-- SECURITY DEFINER functions that touch only their own columns — the same
-- answer `loyalty_badge_awards` reached from the other direction.
-- ============================================================================

-- ── Photos live in Storage, not in the row ──────────────────────────────────
--
-- The form currently holds `URL.createObjectURL(file)` — blob URLs, scoped to
-- the document that made them. They die on refresh and mean nothing to anyone
-- else, so persisting those strings would store garbage that renders as a
-- broken image for the one person the card is for.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-card-photos',
  'report-card-photos',
  false,
  10485760,  -- 10 MB, matching the CHECK on report_card_photos.size_bytes.
  array['image/png', 'image/jpeg', 'image/heic', 'image/webp']
)
on conflict (id) do nothing;

-- ── The card ────────────────────────────────────────────────────────────────

create table if not exists public.report_cards (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities(id) on delete cascade,
  pet_id        uuid not null references public.pets(id) on delete cascade,

  -- Who it is FOR. Derivable from the pet today, denormalised on purpose: it
  -- is the predicate the customer's RLS arm matches on, and a pet changing
  -- hands must not retroactively hand somebody else's card to the new owner.
  client_id     uuid not null references public.clients(id) on delete cascade,

  -- Nullable: a daycare day does not always have a booking row behind it, and
  -- refusing a card in that case would make the feature unavailable exactly
  -- where it is used most.
  booking_id    uuid references public.bookings(id) on delete set null,

  service_type  text not null
                  check (service_type in ('daycare', 'boarding', 'grooming', 'training')),
  visit_date    date not null,
  theme         text,

  -- The staff's answers, and the prose generated from them. jsonb because the
  -- facility's custom questions are defined in its own settings document, so
  -- the set of keys is per-facility and cannot be columns here.
  input         jsonb not null default '{}'::jsonb,
  generated     jsonb not null default '{}'::jsonb,

  delivery_status text not null default 'pending'
                  check (delivery_status in ('pending', 'scheduled', 'sent')),
  scheduled_for timestamptz,
  sent_at       timestamptz,

  -- ── The owner's side of the card ──────────────────────────────────────
  -- Written only by the functions at the foot of this migration.
  viewed_at     timestamptz,
  favourite     boolean not null default false,
  reply_message text,
  replied_at    timestamptz,
  rating_stars  integer check (rating_stars between 1 and 5),
  rating_comment text,
  rating_submitted_at timestamptz,

  -- TEXT, not uuid: `profiles.id` is the auth subject and has been text since
  -- 20260805223248 (`clerk_identity_is_text`), which WorkOS kept. Every other
  -- authorship column in this schema is text for the same reason — see
  -- `care_log_entries.recorded_by`.
  created_by    text references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- `sent` without a timestamp is a card nobody can order or audit, and a
  -- timestamp without `sent` is a card that claims delivery it never recorded.
  constraint report_cards_sent_has_timestamp
    check ((delivery_status = 'sent') = (sent_at is not null)),
  constraint report_cards_scheduled_has_time
    check (delivery_status <> 'scheduled' or scheduled_for is not null)
);

create index if not exists report_cards_facility_date_idx
  on public.report_cards (facility_id, visit_date desc);
create index if not exists report_cards_pet_idx
  on public.report_cards (pet_id, visit_date desc);
create index if not exists report_cards_client_idx
  on public.report_cards (client_id, visit_date desc);

comment on table public.report_cards is
  'One report card per pet per visit. `input` is the staff''s answers, `generated` the prose built from them. The owner''s columns (viewed_at, favourite, reply_message, rating_*) are written only by the SECURITY DEFINER functions in this migration — no customer UPDATE policy exists.';

-- ── The photos ──────────────────────────────────────────────────────────────

create table if not exists public.report_card_photos (
  id             uuid primary key default gen_random_uuid(),
  report_card_id uuid not null references public.report_cards(id) on delete cascade,
  facility_id    uuid not null references public.facilities(id) on delete cascade,

  -- 'before'/'after' carry the grooming pairing; 'moment' is the ordinary
  -- daycare snapshot that pairs with nothing.
  kind           text not null default 'moment'
                   check (kind in ('moment', 'before', 'after')),
  caption        text,
  -- Not `position`: legal as a column name, but it is also a Postgres function,
  -- and the reader has to know that to be sure which one they are looking at.
  sort_order     integer not null default 0,

  -- Unique because two rows pointing at one object means deleting either one
  -- orphans or destroys the other's file. Same reasoning as grooming_photos.
  storage_path   text not null unique,
  content_type   text not null
                   check (content_type in ('image/png', 'image/jpeg', 'image/heic', 'image/webp')),
  size_bytes     integer not null check (size_bytes > 0 and size_bytes <= 10485760),

  created_at     timestamptz not null default now()
);

create index if not exists report_card_photos_card_idx
  on public.report_card_photos (report_card_id, sort_order);

comment on table public.report_card_photos is
  'Photos attached to a report card. The bytes are in the private `report-card-photos` bucket under <facility_id>/<report_card_id>/<file>; this row is the record of them.';

-- ── ROW-LEVEL SECURITY ──────────────────────────────────────────────────────
--
-- Read: staff who may view pet records, or the owner whose card it is.
-- Write: staff holding the send permission FOR THAT SERVICE.

-- ONE implementation of "may this caller send a card of this kind", because
-- four copies of the CASE across the card, photo and storage policies is four
-- places for the daycare/boarding distinction to be lost one at a time.
create or replace function private.may_send_report_card(
  p_facility_id  uuid,
  p_service_type text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_service_type
    when 'daycare'  then private.has_permission(p_facility_id, 'daycare_send_updates')
    when 'boarding' then private.has_permission(p_facility_id, 'boarding_send_updates')
    when 'grooming' then private.has_permission(p_facility_id, 'grooming_upload_photos')
    when 'training' then private.has_permission(p_facility_id, 'training_log_progress')
    else false
  end;
$$;

comment on function private.may_send_report_card(uuid, text) is
  'Whether the caller may create, amend or attach photos to a report card for this service at this facility. The service-specific permission, not a flattened "can send updates".';

-- Needed because this is called from inside RLS policies, which are evaluated
-- with the querying role's privileges — the same reason
-- `private.has_permission` grants execute to `authenticated`. Without it every
-- policy touching this function raises rather than denying.
grant execute on function private.may_send_report_card(uuid, text) to authenticated, service_role;

alter table public.report_cards enable row level security;

drop policy if exists report_cards_read on public.report_cards;
create policy report_cards_read on public.report_cards
  for select using (
    private.is_platform_admin()
    or client_id in (select private.own_client_ids())
    or private.has_permission(facility_id, 'view_pet_records')
  );

drop policy if exists report_cards_insert on public.report_cards;
create policy report_cards_insert on public.report_cards
  for insert with check (
    private.may_send_report_card(facility_id, service_type)
  );

-- Staff may correct and send a card they can create. The customer's own
-- columns are NOT reachable this way — a customer matches none of these arms.
drop policy if exists report_cards_update on public.report_cards;
create policy report_cards_update on public.report_cards
  for update using (
    private.may_send_report_card(facility_id, service_type)
  );

alter table public.report_card_photos enable row level security;

-- The predicate is RESTATED rather than left to the nested RLS on
-- `report_cards`. Postgres would apply that policy to the subquery, so the
-- short version is not wrong — but it makes "who can see a photo" readable
-- only by going and reading another policy, and the two would then drift
-- silently. The card's own read policy is the shape this mirrors.
drop policy if exists report_card_photos_read on public.report_card_photos;
create policy report_card_photos_read on public.report_card_photos
  for select using (
    private.is_platform_admin()
    or report_card_id in (
      select c.id from public.report_cards c
       where c.client_id in (select private.own_client_ids())
          or private.has_permission(c.facility_id, 'view_pet_records')
    )
  );

-- Attaching a photo to a card is part of authoring it, so it takes the same
-- permission authoring it takes — not the weaker `view_pet_records`, which
-- would let anyone who can READ a pet's records add pictures to a card.
drop policy if exists report_card_photos_insert on public.report_card_photos;
create policy report_card_photos_insert on public.report_card_photos
  for insert with check (
    report_card_id in (
      select c.id from public.report_cards c
       where private.may_send_report_card(c.facility_id, c.service_type)
    )
  );

drop policy if exists report_card_photos_delete on public.report_card_photos;
create policy report_card_photos_delete on public.report_card_photos
  for delete using (
    report_card_id in (
      select c.id from public.report_cards c
       where private.may_send_report_card(c.facility_id, c.service_type)
    )
  );

-- ── Storage policies ────────────────────────────────────────────────────────
--
-- The path is <facility_id>/<report_card_id>/<file>, and every predicate
-- matches the first SEGMENT as text.
--
-- The segment is compared against a subquery over `public.facilities`, and the
-- comparison is written as `in (select f.id::text …)` rather than the more
-- natural `exists (select 1 … where f.id::text = (storage.foldername(name))[1])`
-- for the reason 20260806180000 documents at length: `public.facilities` has a
-- column called `name`, so an unqualified `name` inside that subquery binds to
-- the FACILITY's name instead of the object's, and the policy silently denies
-- everything without raising. Keeping the segment outside the subquery removes
-- the shadowing rather than working around it.
--
-- Unlike the grooming bucket, this one HAS a customer arm. A grooming photo has
-- no reader who is its subject; a report card is a thing SENT TO ITS OWNER, and
-- an owner who cannot load the photos has been sent an empty card.

drop policy if exists report_card_object_read on storage.objects;
create policy report_card_object_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'report-card-photos'
    and (
      (storage.foldername(name))[1] in (
        select f.id::text from public.facilities f
         where private.has_permission(f.id, 'view_pet_records')
      )
      or (storage.foldername(name))[2] in (
        select c.id::text from public.report_cards c
         where c.client_id in (select private.own_client_ids())
      )
    )
  );

-- Writing is matched on the CARD segment, not the facility one, so the upload
-- takes the same service-specific permission the card itself took. That makes
-- the card a precondition of its photos — draft the card, then upload — which
-- also means there is no such thing as an orphaned object here.
drop policy if exists report_card_object_insert on storage.objects;
create policy report_card_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'report-card-photos'
    and (storage.foldername(name))[2] in (
      select c.id::text from public.report_cards c
       where private.may_send_report_card(c.facility_id, c.service_type)
    )
  );

drop policy if exists report_card_object_delete on storage.objects;
create policy report_card_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'report-card-photos'
    and (storage.foldername(name))[2] in (
      select c.id::text from public.report_cards c
       where private.may_send_report_card(c.facility_id, c.service_type)
    )
  );

-- ── The owner's four writes ─────────────────────────────────────────────────
--
-- Each touches only its own columns and refuses a card that is not the
-- caller's. They are the reason no customer UPDATE policy exists.

create or replace function public.mark_report_card_viewed(p_card_id uuid)
returns public.report_cards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.report_cards;
begin
  -- `viewed_at` is first-view, not last-view: it answers "has the owner seen
  -- this", which a facility chases up. Overwriting it on every open would
  -- erase the only thing it is asked.
  update public.report_cards
     set viewed_at  = coalesce(viewed_at, now()),
         updated_at = now()
   where id = p_card_id
     and client_id in (select private.own_client_ids())
     and delivery_status = 'sent'
  returning * into v_card;

  if v_card.id is null then
    raise exception 'That report card is not yours to read.' using errcode = '42501';
  end if;

  return v_card;
end;
$$;

comment on function public.mark_report_card_viewed(uuid) is
  'Record the first time the owner opened a sent card. Raises 42501 for a card belonging to someone else.';

create or replace function public.set_report_card_favourite(
  p_card_id   uuid,
  p_favourite boolean
)
returns public.report_cards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.report_cards;
begin
  update public.report_cards
     set favourite  = p_favourite,
         updated_at = now()
   where id = p_card_id
     and client_id in (select private.own_client_ids())
     and delivery_status = 'sent'
  returning * into v_card;

  if v_card.id is null then
    raise exception 'That report card is not yours to keep.' using errcode = '42501';
  end if;

  return v_card;
end;
$$;

comment on function public.set_report_card_favourite(uuid, boolean) is
  'Favourite or unfavourite a sent card the caller owns.';

create or replace function public.reply_to_report_card(
  p_card_id uuid,
  p_message text
)
returns public.report_cards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.report_cards;
begin
  if coalesce(btrim(p_message), '') = '' then
    raise exception 'A reply cannot be empty.' using errcode = '22023';
  end if;

  update public.report_cards
     set reply_message = p_message,
         replied_at    = now(),
         updated_at    = now()
   where id = p_card_id
     and client_id in (select private.own_client_ids())
     and delivery_status = 'sent'
  returning * into v_card;

  if v_card.id is null then
    raise exception 'That report card is not yours to reply to.' using errcode = '42501';
  end if;

  return v_card;
end;
$$;

comment on function public.reply_to_report_card(uuid, text) is
  'Record the owner''s reply to a sent card they own.';

create or replace function public.rate_report_card(
  p_card_id uuid,
  p_stars   integer,
  p_comment text default null
)
returns public.report_cards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.report_cards;
begin
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'A rating is between 1 and 5 stars.' using errcode = '22023';
  end if;

  -- Rated once. A card whose rating can be revised is a card whose reported
  -- satisfaction depends on when it was read, and the facility's reputation
  -- screens average these.
  update public.report_cards
     set rating_stars        = p_stars,
         rating_comment      = p_comment,
         rating_submitted_at = now(),
         updated_at          = now()
   where id = p_card_id
     and client_id in (select private.own_client_ids())
     and delivery_status = 'sent'
     and rating_submitted_at is null
  returning * into v_card;

  if v_card.id is null then
    raise exception 'That report card is not yours to rate, or you have already rated it.'
      using errcode = '42501';
  end if;

  return v_card;
end;
$$;

comment on function public.rate_report_card(uuid, integer, text) is
  'Record the owner''s star rating once. Raises 42501 on a second attempt.';

revoke all on function public.mark_report_card_viewed(uuid) from public;
revoke all on function public.set_report_card_favourite(uuid, boolean) from public;
revoke all on function public.reply_to_report_card(uuid, text) from public;
revoke all on function public.rate_report_card(uuid, integer, text) from public;

grant execute on function public.mark_report_card_viewed(uuid) to authenticated, service_role;
grant execute on function public.set_report_card_favourite(uuid, boolean) to authenticated, service_role;
grant execute on function public.reply_to_report_card(uuid, text) to authenticated, service_role;
grant execute on function public.rate_report_card(uuid, integer, text) to authenticated, service_role;
