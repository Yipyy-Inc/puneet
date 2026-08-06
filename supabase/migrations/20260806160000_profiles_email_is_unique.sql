-- ============================================================================
-- One email address, one identity.
--
-- WHAT WENT WRONG (2026-08-06). houssemsina123@gmail.com held TWO profiles:
--
--   user_3HVlmtt…  created 2026-08-05 22:08   (Development Clerk instance)
--   user_3HXXALre…  created 2026-08-06 11:21   (Production Clerk instance)
--
-- Both were written by the sync webhook, neither by hand. The production
-- webhook secret reached Vercel *after* the Development instance had already
-- been pointed at the live site, so for a window on 2026-08-05 dev-instance
-- events verified successfully against the production database.
--
-- That window is closed. This index is here because the shape that allowed it
-- is not: two Clerk instances share one Supabase project (ADR 0003 records the
-- one-project decision), each instance has its own user namespace, and until
-- now nothing in the database said an address may only have one identity.
--
-- WHY THIS IS WORTH A CONSTRAINT AND NOT A CONVENTION. A duplicate is not
-- cosmetic. Grants hang off `profiles.id` — facility_memberships.profile_id,
-- clients.profile_id, is_platform_admin. Two rows for one human means the
-- answer to "what may this person do" depends on which instance minted their
-- token. They sign in on Tuesday and it works, on Wednesday it does not, and
-- nothing on screen explains the difference. That is the failure this prevents.
--
-- LOWER(), not the raw column, for the same reason link_client_record() already
-- matches with lower(): addresses are case-insensitive in practice, and a
-- constraint that Foo@x.com can defeat is not a constraint.
--
-- THIS INDEX IS HALF A FIX. On its own it converts a silent duplicate into a
-- silent lockout: the webhook upserts on `id`, so a new Clerk id carrying a
-- known address becomes an INSERT, the insert raises 23505, the route 500s,
-- Svix retries on a fixed schedule forever, and the person owns a Clerk account
-- with no profile — refused by every portal gate with nothing explaining why.
-- src/app/api/webhooks/clerk/route.ts handles 23505 explicitly so that cannot
-- happen. Do not apply this migration without that handler in place.
-- ============================================================================

-- Fail with the rows named, rather than with `duplicate key value violates
-- unique constraint`, which tells you a duplicate exists but not which one.
do $$
declare
  v_dupes text;
begin
  select string_agg(
           format('%s — %s profiles: %s', d.address, d.n, d.ids),
           E'\n  '
         )
    into v_dupes
    from (
      select lower(p.email)                            as address,
             count(*)                                  as n,
             string_agg(p.id, ', ' order by p.created_at) as ids
        from public.profiles p
       group by lower(p.email)
      having count(*) > 1
    ) d;

  if v_dupes is not null then
    raise exception E'Refusing to add the unique index: profiles already holds duplicate addresses.\n  %\n\nResolve these first — keep the identity the live Clerk instance knows, and check facility_memberships / clients.profile_id / is_platform_admin before deleting the other.', v_dupes;
  end if;
end $$;

create unique index profiles_email_lower_key on public.profiles (lower(email));

comment on index public.profiles_email_lower_key is
  'One identity per address. See 20260806160000 — two Clerk instances share this project, so without this a person can hold two profiles with different grants.';
