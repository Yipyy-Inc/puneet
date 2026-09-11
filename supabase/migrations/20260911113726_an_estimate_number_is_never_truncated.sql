-- ============================================================================
-- An estimate number is padded, never truncated.
--
-- 20260911113556 built the number as `lpad(seq, minDigits)`. Postgres's lpad
-- TRUNCATES a string longer than the width: with a facility prefix of "EK-" and
-- three digits, estimate 10003 was numbered "EK-100" — and so was 10004, 10005
-- and every one after, until the unique number the customer quotes on the phone
-- named a dozen quotes. Caught by supabase/tests/estimates.sql (E2) before any
-- facility wrote one. Width is now a minimum, as `minDigits` says.
-- ============================================================================

create or replace function private.estimate_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_settings jsonb;
  v_prefix text;
  v_digits int;
  v_floor int;
begin
  -- A client's estimate belongs to the client's facility, whatever was sent.
  if new.client_id is not null then
    select facility_id into new.facility_id
      from public.clients where id = new.client_id;
    if new.facility_id is null then
      raise exception 'no such client' using errcode = '23503';
    end if;
  end if;

  if cardinality(new.pet_ids) > 0 then
    if new.client_id is null then
      raise exception 'A guest estimate names no pets on file.' using errcode = '23514';
    end if;
    if exists (
      select 1 from unnest(new.pet_ids) as p(id)
       where not exists (
         select 1 from public.pets x where x.id = p.id and x.client_id = new.client_id
       )
    ) then
      raise exception 'Every pet on an estimate must be the client''s.' using errcode = '23514';
    end if;
  end if;

  -- One number at a time per facility.
  perform pg_advisory_xact_lock(hashtext('estimates:' || new.facility_id::text));

  select value into v_settings
    from public.facility_settings
   where facility_id = new.facility_id and domain = 'estimate_settings';
  v_prefix := coalesce(nullif(v_settings->>'estimateNumberPrefix', ''), 'E');
  v_digits := greatest(1, least(12, coalesce((v_settings->>'minDigits')::int, 5)));
  -- The default prefix has always started at E10001; a facility's own prefix
  -- starts its own sequence at 1.
  v_floor := case when v_prefix = 'E' then 10000 else 0 end;

  select greatest(coalesce(max(seq), 0), v_floor) + 1 into new.seq
    from public.estimates where facility_id = new.facility_id;
  -- Padded to AT LEAST the width. lpad alone truncates a longer number.
  new.estimate_number := v_prefix ||
    case when length(new.seq::text) >= v_digits then new.seq::text
         else lpad(new.seq::text, v_digits, '0') end;

  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$fn$;

revoke all on function private.estimate_before_insert() from public, anon;
