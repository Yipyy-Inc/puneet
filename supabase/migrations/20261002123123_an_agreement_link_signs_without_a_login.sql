-- ============================================================================
-- An agreement link signs without a login, and a booking waits for it.
--
-- The booking wizard's Confirm (the client's mock, 2026-10-01): staff may
-- create a booking for a client who has not signed the facility's agreements
-- yet — "Pending · awaiting agreements" — and send them a link by email or
-- text. The client signs on their phone, with no account, and the booking
-- confirms itself when the last agreement it waits for is signed.
--
-- ── 1. CONSENT IS RECORDED, NOT ONLY TICKED ────────────────────────────────
--
-- The signing panel's "I have read and agree" box lived in the browser alone.
-- `consented_at` is when the signer ticked it, stamped by whoever records the
-- signature; the append-only trigger now freezes it with everything else.
--
-- ── 2. THE LINK IS A HASHED TOKEN ──────────────────────────────────────────
--
-- `waiver_signing_links` holds sha256 of the token and never the token, as
-- `review_requests` does (20260829090000) and for its reasons: a leaked backup
-- must not let somebody sign as somebody else's client. The token is minted
-- by POST /api/waivers/signing-link and travels only in the message.
--
-- Two anon-callable definer functions are its whole surface, each taking the
-- token as an argument and answering null (or refusing) alike for an expired,
-- unknown or used-up token, so a guesser learns nothing:
--
--   agreement_link_by_token(token)       the page: the facility, the client's
--                                        first name, the agreements and which
--                                        are signed
--   sign_agreement_by_token(token, …)    one signature, with consent
--
-- The text signed is read from `waivers` here, never from the caller, and
-- hashed here — the same rule as /api/waivers/[id]/sign.
--
-- ── 3. A BOOKING THAT WAITS FOR AGREEMENTS CONFIRMS ITSELF ────────────────
--
-- A booking made `pending` with `details.awaitingAgreements` is confirmed by a
-- trigger on `waiver_signatures` once nothing applicable to its service is
-- unsigned. Only the status changes — through the integrity trigger's own
-- system path (`yipyy.presence_sync`, status-only), so a customer signing from
-- the portal does not trip "you may only cancel this booking".
--
-- SQL A1-A10 in agreement-links.sql.
-- ============================================================================

-- ── 1. Consent ──────────────────────────────────────────────────────────────

alter table public.waiver_signatures add column consented_at timestamptz;

comment on column public.waiver_signatures.consented_at is
  'When the signer confirmed they had read and agreed to the text (the signing panel''s consent box). Null on signatures recorded before 2026-10-02.';

create or replace function private.waiver_signature_is_append_only()
returns trigger
language plpgsql
as $function$
begin
  if old.revoked_at is not null then
    raise exception
      'That signature is already revoked. A signature is superseded by a new one, not edited.'
      using errcode = '42501';
  end if;

  if new.revoked_at is null then
    raise exception
      'waiver_signatures is append-only. The only change a signature accepts is being revoked.'
      using errcode = '42501';
  end if;

  if new.id                     is distinct from old.id
     or new.facility_id         is distinct from old.facility_id
     or new.waiver_id           is distinct from old.waiver_id
     or new.client_id           is distinct from old.client_id
     or new.pet_id              is distinct from old.pet_id
     or new.waiver_name         is distinct from old.waiver_name
     or new.waiver_version      is distinct from old.waiver_version
     or new.waiver_text         is distinct from old.waiver_text
     or new.waiver_hash         is distinct from old.waiver_hash
     or new.signature_name      is distinct from old.signature_name
     or new.signature_data      is distinct from old.signature_data
     or new.witness_name        is distinct from old.witness_name
     or new.witness_signature_data is distinct from old.witness_signature_data
     or new.ip_address          is distinct from old.ip_address
     or new.user_agent          is distinct from old.user_agent
     or new.signed_at           is distinct from old.signed_at
     or new.signed_by           is distinct from old.signed_by
     or new.expires_at          is distinct from old.expires_at
     or new.created_at          is distinct from old.created_at
     or new.consented_at        is distinct from old.consented_at
  then
    raise exception
      'A signature records what a person agreed to and cannot be edited. Only revoking it is allowed.'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

-- ── What is applicable, and what is left to sign ────────────────────────────
--
-- The booking wizard's rule (use-booking-waivers.ts): an active waiver that
-- needs a signature applies to a service when it names none, names
-- "general", or names that service; it is signed when the client holds a
-- signature of it that is neither revoked nor expired.

create or replace function private.agreement_applies(
  p_services text[],
  p_service  text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(cardinality(p_services), 0) = 0
      or 'general' = any (p_services)
      or (p_service is not null and p_service = any (p_services));
$$;

create or replace function private.unsigned_agreement_count(
  p_client_id   uuid,
  p_facility_id uuid,
  p_service     text
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from public.waivers w
   where w.facility_id = p_facility_id
     and w.active
     and w.requires_signature
     and private.agreement_applies(w.services, p_service)
     and not exists (
       select 1
         from public.waiver_signatures s
        where s.client_id = p_client_id
          and s.waiver_id = w.id
          and s.revoked_at is null
          and (s.expires_at is null or s.expires_at > now())
     );
$$;

revoke all on function private.agreement_applies(text[], text) from public, anon;
revoke all on function private.unsigned_agreement_count(uuid, uuid, text) from public, anon;

-- ── 2. The links ────────────────────────────────────────────────────────────

create table public.waiver_signing_links (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references public.facilities(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  token_hash   bytea not null unique,
  -- The agreements to sign: these ids, or every one applicable to `service`.
  waiver_ids   uuid[] not null default '{}',
  service      text,
  booking_id   uuid references public.bookings(id) on delete set null,
  channel      text not null check (channel in ('email', 'sms')),
  sent_to      text not null default '',
  created_by   text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  constraint waiver_signing_links_expiry check (expires_at > created_at)
);

comment on table public.waiver_signing_links is
  'A link a client signs the facility''s agreements from without an account (the booking wizard, 2026-10-02). token_hash is sha256 of the token; the token itself is never stored.';

create index waiver_signing_links_client on public.waiver_signing_links (client_id);

alter table public.waiver_signing_links enable row level security;

-- Staff who may see a client's documents see the links sent to them; staff
-- who may edit clients send them. Nobody edits or deletes one: a link expires.
create policy waiver_signing_links_read on public.waiver_signing_links
  for select to authenticated
  using (private.has_permission(facility_id, 'view_client_documents'));

create policy waiver_signing_links_insert on public.waiver_signing_links
  for insert to authenticated
  with check (
    private.has_permission(facility_id, 'edit_clients')
    and exists (
      select 1 from public.clients c
       where c.id = client_id and c.facility_id = waiver_signing_links.facility_id
    )
  );

revoke all on public.waiver_signing_links from public, anon;
grant select, insert on public.waiver_signing_links to authenticated;

create or replace function private.hash_agreement_token(p_token text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select extensions.digest(p_token, 'sha256');
$$;

revoke all on function private.hash_agreement_token(text) from public, anon;

-- The agreements a link covers, as rows of `waivers`.
create or replace function private.agreements_of_link(
  p_link public.waiver_signing_links
)
returns setof public.waivers
language sql
stable
security definer
set search_path = ''
as $$
  select w.*
    from public.waivers w
   where w.facility_id = p_link.facility_id
     and w.active
     and w.requires_signature
     and (
       (cardinality(p_link.waiver_ids) > 0 and w.id = any (p_link.waiver_ids))
       or (cardinality(p_link.waiver_ids) = 0
           and private.agreement_applies(w.services, p_link.service))
     );
$$;

revoke all on function private.agreements_of_link(public.waiver_signing_links) from public, anon;

create or replace function public.agreement_link_by_token(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_link public.waiver_signing_links;
  v      jsonb;
begin
  if p_token is null or length(p_token) < 16 then
    return null;
  end if;

  select * into v_link
    from public.waiver_signing_links l
   where l.token_hash = private.hash_agreement_token(p_token)
     and l.expires_at > now();
  if not found then
    return null;
  end if;

  select jsonb_build_object(
      'facilityName',    f.name,
      'facilitySlug',    f.slug,
      'locale',          coalesce(c.preferred_language, 'en'),
      'clientFirstName', split_part(c.name, ' ', 1),
      'expiresAt',       v_link.expires_at,
      'agreements', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id',       w.id,
                 'name',     w.name,
                 'body',     w.body,
                 'blocks',   w.blocks,
                 'version',  w.version,
                 'requiresDigitalSignature', w.requires_digital_signature,
                 'requiresWitness', w.requires_witness,
                 'signed', exists (
                   select 1 from public.waiver_signatures s
                    where s.client_id = v_link.client_id
                      and s.waiver_id = w.id
                      and s.revoked_at is null
                      and (s.expires_at is null or s.expires_at > now()))
               ) order by w.name)
          from private.agreements_of_link(v_link) w), '[]'::jsonb)
    )
    into v
    from public.facilities f
    join public.clients c on c.id = v_link.client_id
   where f.id = v_link.facility_id;

  return v;
end;
$fn$;

comment on function public.agreement_link_by_token(text) is
  'The agreement-signing page, by link token: the facility, the client''s first name, and each agreement with whether it is signed. Null for every kind of failure.';

revoke all on function public.agreement_link_by_token(text) from public;
grant execute on function public.agreement_link_by_token(text) to anon, authenticated;

create or replace function public.sign_agreement_by_token(
  p_token                  text,
  p_waiver_id              uuid,
  p_signature_name         text,
  p_signature_data         text default null,
  p_witness_name           text default null,
  p_witness_signature_data text default null,
  p_consent                boolean default false,
  p_ip_address             text default null,
  p_user_agent             text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_link    public.waiver_signing_links;
  v_waiver  public.waivers;
  v_text    text;
  v_left    integer;
begin
  if p_token is null or length(p_token) < 16 then
    raise exception 'That link is not valid.' using errcode = '42501';
  end if;

  select * into v_link
    from public.waiver_signing_links l
   where l.token_hash = private.hash_agreement_token(p_token)
     and l.expires_at > now();
  if not found then
    raise exception 'That link is not valid.' using errcode = '42501';
  end if;

  select * into v_waiver
    from private.agreements_of_link(v_link) w
   where w.id = p_waiver_id;
  if not found then
    raise exception 'That agreement is not on this link.' using errcode = '42501';
  end if;

  if not coalesce(p_consent, false) then
    raise exception 'Confirm you have read and agree to it first.'
      using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_signature_name, '')), '') is null then
    raise exception 'A signature needs the name of the person agreeing.'
      using errcode = '22023';
  end if;
  if v_waiver.requires_digital_signature
     and nullif(btrim(coalesce(p_signature_data, '')), '') is null then
    raise exception 'This agreement needs a drawn signature.'
      using errcode = '22023';
  end if;
  if v_waiver.requires_witness
     and nullif(btrim(coalesce(p_witness_name, '')), '') is null then
    raise exception 'This agreement has to be witnessed.'
      using errcode = '22023';
  end if;

  v_text := btrim(coalesce(v_waiver.body, ''));
  if v_text = '' then
    raise exception 'That agreement has no text to sign.' using errcode = '22023';
  end if;

  -- Signed already, and still valid: nothing to add.
  if not exists (
    select 1 from public.waiver_signatures s
     where s.client_id = v_link.client_id
       and s.waiver_id = v_waiver.id
       and s.revoked_at is null
       and (s.expires_at is null or s.expires_at > now())
  ) then
    insert into public.waiver_signatures (
      facility_id, waiver_id, client_id, pet_id,
      waiver_name, waiver_version, waiver_text, waiver_hash,
      signature_name, signature_data, witness_name, witness_signature_data,
      ip_address, user_agent, signed_by, expires_at, consented_at
    ) values (
      v_link.facility_id, v_waiver.id, v_link.client_id, null,
      v_waiver.name, v_waiver.version, v_text,
      encode(extensions.digest(v_text, 'sha256'), 'hex'),
      left(btrim(p_signature_name), 200),
      nullif(p_signature_data, ''),
      nullif(left(btrim(coalesce(p_witness_name, '')), 200), ''),
      nullif(p_witness_signature_data, ''),
      left(p_ip_address, 100), left(p_user_agent, 500),
      -- Who signed is the person the link was sent to; there is no login.
      null,
      case when v_waiver.expiry_days is null then null
           else now() + make_interval(days => v_waiver.expiry_days) end,
      now()
    );
  end if;

  select count(*) into v_left
    from private.agreements_of_link(v_link) w
   where not exists (
     select 1 from public.waiver_signatures s
      where s.client_id = v_link.client_id
        and s.waiver_id = w.id
        and s.revoked_at is null
        and (s.expires_at is null or s.expires_at > now()));

  return jsonb_build_object('signed', true, 'remaining', v_left);
end;
$fn$;

comment on function public.sign_agreement_by_token(text, uuid, text, text, text, text, boolean, text, text) is
  'One agreement signed from a signing link, with consent. The text is read from waivers and hashed here. Refuses an unknown or expired link, an agreement not on it, and a signature without consent.';

revoke all on function public.sign_agreement_by_token(text, uuid, text, text, text, text, boolean, text, text) from public;
grant execute on function public.sign_agreement_by_token(text, uuid, text, text, text, text, boolean, text, text) to anon, authenticated;

-- ── 3. The booking that waits ───────────────────────────────────────────────

create or replace function private.confirm_bookings_awaiting_agreements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_booking record;
begin
  for v_booking in
    select b.id, b.service
      from public.bookings b
     where b.client_id = new.client_id
       and b.facility_id = new.facility_id
       and b.status = 'pending'
       and coalesce(b.details->>'awaitingAgreements', '') = 'true'
  loop
    if private.unsigned_agreement_count(new.client_id, new.facility_id, v_booking.service) = 0 then
      -- Status only, through the integrity trigger's system path.
      perform set_config('yipyy.presence_sync', 'on', true);
      update public.bookings
         set status = 'confirmed'
       where id = v_booking.id
         and status = 'pending';
      perform set_config('yipyy.presence_sync', '', true);
    end if;
  end loop;
  return new;
end;
$fn$;

revoke all on function private.confirm_bookings_awaiting_agreements() from public, anon;

create trigger waiver_signatures_confirm_bookings
  after insert on public.waiver_signatures
  for each row execute function private.confirm_bookings_awaiting_agreements();
