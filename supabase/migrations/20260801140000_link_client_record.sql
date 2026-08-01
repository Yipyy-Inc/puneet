-- ============================================================================
-- Attach a newly-verified account to the client record a facility already has.
--
-- Facilities create client records for people who have never logged in — that
-- is the normal case, and it is why clients.profile_id is nullable. When that
-- person later signs up with the same address, the two must become one thing,
-- or they get an empty portal while their history sits next to it.
--
-- SECURITY DEFINER because the caller cannot see the row yet: before the link
-- exists, `clients_read` does not match them. It only ever claims a record
-- whose email matches the caller's OWN verified address and which nobody has
-- claimed, so it cannot be used to attach to someone else's account.
--
-- Deliberately does NOT create a client record when there is no match.
-- Whether signing up should itself create a customer relationship — and with
-- which facility — is a product decision, not something to infer here.
-- ============================================================================

create or replace function public.link_client_record()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email   text;
  v_client  uuid;
begin
  if v_user_id is null then
    return null;
  end if;

  -- The address from the auth record, not from an argument: a caller-supplied
  -- email would let anyone claim any unclaimed client record.
  select u.email into v_email from auth.users u where u.id = v_user_id;
  if v_email is null then
    return null;
  end if;

  -- Already linked — idempotent, so this is safe to call on every sign-in.
  select c.id into v_client
    from public.clients c
   where c.profile_id = v_user_id
   limit 1;
  if v_client is not null then
    return v_client;
  end if;

  update public.clients c
     set profile_id = v_user_id
   where lower(c.email) = lower(v_email)
     and c.profile_id is null
  returning c.id into v_client;

  return v_client;
end;
$$;

grant execute on function public.link_client_record() to authenticated;
revoke execute on function public.link_client_record() from anon, public;
