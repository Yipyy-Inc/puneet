-- The two templates a rebook reminder sends, installed lazily like the other
-- fourteen -- but by their OWN function rather than by appending to
-- `ensure_message_templates`.
--
-- That seeder is a single 14-row INSERT of E'' bodies with escaped newlines and
-- doubled apostrophes. Rewriting it wholesale to append two rows means retyping
-- all fourteen, and a slip inside one of them is a WORDING change that nothing
-- would catch: no test reads those strings, and the first person to notice
-- would be a customer. Additive is the cheaper risk.
--
-- Called from the lapsed-clients route, so the template exists by the time
-- anybody can press Send.
--
-- Every variable here resolves WITHOUT a booking. That matters more than usual:
-- an unresolved tag makes the queue refuse the message, so a rebook template
-- reaching for {{check_in_date}} would produce a reminder that silently never
-- sends.

create or replace function public.ensure_rebook_templates(p_facility_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  insert into public.message_templates
    (facility_id, key, name, channel, category, subject, body, is_system)
  values
    (p_facility_id, 'rebook_reminder', 'Rebook Reminder', 'email', 'reminder',
     'Time for {{pet_name}}''s next visit?',
     E'Hi {{customer_first_name|there}},\n\nIt has been a while since we last saw {{pet_name}}, and we would love to have them back.\n\nYou can book their next visit here: {{portal_link}}\n\nIf now is not the right time, just ignore this - and we hope to see you both soon.\n\n{{facility_name}}\n{{facility_phone}}',
     true),

    (p_facility_id, 'rebook_reminder_sms', 'Rebook Reminder (SMS)', 'sms', 'reminder',
     null,
     E'Hi {{customer_first_name|there}} - it has been a while since {{pet_name}}''s last visit to {{facility_name}}. Book again here: {{portal_link}}',
     true)
  on conflict (facility_id, key) where key is not null do nothing;
end;
$fn$;

comment on function public.ensure_rebook_templates(uuid) is
  'Installs the two rebook-reminder templates for one facility. Idempotent by (facility_id, key): restores a deleted one, never overwrites an edited one.';

revoke all on function public.ensure_rebook_templates(uuid) from public, anon, authenticated;
grant execute on function public.ensure_rebook_templates(uuid) to service_role;

do $$
begin
  if has_function_privilege('anon',
       'public.ensure_rebook_templates(uuid)', 'execute') then
    raise exception 'anon can seed templates';
  end if;
  -- It takes a facility id and runs as definer: a session must not be able to
  -- point it at somebody else's facility. Same shape as the other seeders.
  if has_function_privilege('authenticated',
       'public.ensure_rebook_templates(uuid)', 'execute') then
    raise exception 'a session can seed templates into any facility';
  end if;
end $$;
