-- `{{pet_name}}` resolves from the client's pets, and some clients have none.
-- Diana Prince, on the demo facility right now, has a completed daycare
-- booking and no pet record -- so her reminder would render with the tag still
-- in it, be refused at queue time, and appear as "skipped" with a reason
-- nobody could act on.
--
-- The fallback syntax exists for exactly this. `{{pet_name|your pet}}` resolves,
-- so the message goes out reading naturally instead of not going out at all.
--
-- Replaced rather than patched in place: no facility has these rows yet
-- (`ensure_rebook_templates` is called only from the lapsed route, which has
-- not shipped), so `on conflict do nothing` has nothing to leave alone.

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
     'Time for {{pet_name|your pet}}''s next visit?',
     E'Hi {{customer_first_name|there}},\n\nIt has been a while since we last saw {{pet_name|your pet}}, and we would love to have them back.\n\nYou can book their next visit here: {{portal_link}}\n\nIf now is not the right time, just ignore this - and we hope to see you both soon.\n\n{{facility_name}}\n{{facility_phone}}',
     true),

    (p_facility_id, 'rebook_reminder_sms', 'Rebook Reminder (SMS)', 'sms', 'reminder',
     null,
     E'Hi {{customer_first_name|there}} - it has been a while since {{pet_name|your pet}}''s last visit to {{facility_name}}. Book again here: {{portal_link}}',
     true)
  on conflict (facility_id, key) where key is not null do nothing;
end;
$fn$;

revoke all on function public.ensure_rebook_templates(uuid) from public, anon, authenticated;
grant execute on function public.ensure_rebook_templates(uuid) to service_role;
