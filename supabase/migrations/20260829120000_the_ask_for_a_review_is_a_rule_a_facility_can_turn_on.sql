-- ============================================================================
-- The ask for a review is a rule, a template and a tag catalogue.
--
-- ── NO NEW TRIGGER KIND ───────────────────────────────────────────────────
--
-- `check_out` already exists and is one of the nineteen values on both
-- `automation_rules.trigger` and `automation_events.kind`, kept in step with
-- `automationTriggerEnum` by `bun run check:automation-triggers`. The visit is
-- derived from the event at scheduling time, so nothing here widens either
-- CHECK.
--
-- ── THE RULE SHIPS DISABLED ───────────────────────────────────────────────
--
-- `enabled = false`, like every other seeded rule (20260828152928). A facility
-- that installs an update must not start messaging its customers because of
-- it. What the seed buys is DISCOVERABILITY: the rule appears on the
-- Automations screen with its delay and its copy already filled in, so turning
-- it on is a toggle rather than a form.
--
-- ── AND IT IS NOT TRANSACTIONAL ───────────────────────────────────────────
--
-- `is_transactional = false`, which is what subjects it to marketing-scope
-- suppressions, to quiet hours and to the velocity cap. A review request is a
-- favour being asked, not a receipt for something the customer just did, and
-- treating it as transactional would let it through every consent check that
-- exists. This is the single most consequential column in the file.
--
-- ── THE TAGS ARE THE HALF THAT MAKES ANALYTICS POSSIBLE ───────────────────
--
-- "2 stars, session felt rushed" is prose a manager has to read. The same
-- answer as a tag is countable, per staff member and per service, which is what
-- turns the Performance screen's long-empty "Praise" column into a real
-- number. The improvement tags matter more than the positive ones for exactly
-- that reason.
--
-- Seeded per service with a stable `seed_key`, so re-running adds nothing and a
-- facility's own edits survive. Retire one with `is_active = false` — never a
-- delete, because `review_response_tags` is `on delete restrict` and a tag a
-- client picked is part of the record of what they said.
-- ============================================================================

-- ── The copy ──────────────────────────────────────────────────────────────
--
-- Four templates: the ask and the nudge, each in both channels. The nudge is
-- separate rather than a re-send of the ask because it says a different thing —
-- "you rated us, would you post it" is not "how did we do".
--
-- `{{survey_link}}` is a NEW variable. It is rendered by the reputation
-- scheduler, which mints a token per request; the generic dispatcher has no
-- token to put there, so a rule pointed at these templates by hand would refuse
-- to send on `UNRESOLVED_TAG` rather than mail somebody a broken link. That
-- refusal is the designed behaviour and not a gap.

create or replace function public.ensure_review_templates(p_facility_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  insert into public.message_templates
    (facility_id, key, name, channel, category, subject, body, is_system)
  values
    (p_facility_id, 'review_request', 'Review Request', 'email', 'reminder',
     'How did we do, {{customer_first_name|there}}?',
     E'Hi {{customer_first_name|there}},\n\nThank you for bringing {{pet_name}} to {{facility_name}}. If you have a moment, we would love to know how it went - it takes about ten seconds.\n\n{{survey_link}}\n\nWhatever you say, it comes straight to us first.\n\n{{facility_name}}\n{{facility_phone}}',
     true),

    (p_facility_id, 'review_request_sms', 'Review Request (SMS)', 'sms', 'reminder',
     null,
     E'Thanks for visiting {{facility_name}} today. How did we do with {{pet_name}}? {{survey_link}}',
     true),

    (p_facility_id, 'review_nudge', 'Review Nudge', 'email', 'reminder',
     'Would you share that publicly?',
     E'Hi {{customer_first_name|there}},\n\nThank you again for the kind rating after {{pet_name}}''s visit. If you have thirty seconds, posting it publicly genuinely helps a small business like ours.\n\n{{survey_link}}\n\nAnd if you would rather not, that is completely fine - you have already helped.\n\n{{facility_name}}',
     true),

    (p_facility_id, 'review_nudge_sms', 'Review Nudge (SMS)', 'sms', 'reminder',
     null,
     E'Thanks again for rating {{facility_name}}. If you have a moment to post it publicly it really helps us: {{survey_link}}',
     true)
  on conflict (facility_id, key) where key is not null do nothing;
end;
$fn$;

comment on function public.ensure_review_templates(uuid) is
  'The four review-request templates Yipyy ships. Idempotent by (facility_id, key).';

revoke all on function public.ensure_review_templates(uuid) from public, anon;
grant execute on function public.ensure_review_templates(uuid) to authenticated, service_role;

-- ── The tag catalogue ─────────────────────────────────────────────────────
--
-- Straight from the spec's table. Improvement tags carry `severity` so a
-- manager sees which complaints are about an outcome and which are about the
-- animal's welfare; 'high' is currently only used to word the follow-up task,
-- because incidents do not exist as rows yet. Read the debt map before wiring
-- anything else to it.

create or replace function public.ensure_review_tags(p_facility_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  insert into public.review_tags
    (facility_id, seed_key, service_type, polarity, severity, labels, sort_order)
  values
    -- Grooming
    (p_facility_id, 'grooming_great_cut', 'grooming', 'positive', 'normal',
     '{"en":"Great cut","fr":"Superbe coupe"}'::jsonb, 1),
    (p_facility_id, 'grooming_gentle', 'grooming', 'positive', 'normal',
     '{"en":"Gentle handling","fr":"Manipulation douce"}'::jsonb, 2),
    (p_facility_id, 'grooming_clean_finish', 'grooming', 'positive', 'normal',
     '{"en":"Clean finish","fr":"Finition impeccable"}'::jsonb, 3),
    (p_facility_id, 'grooming_on_time', 'grooming', 'positive', 'normal',
     '{"en":"On time","fr":"À l''heure"}'::jsonb, 4),
    (p_facility_id, 'grooming_not_as_asked', 'grooming', 'improvement', 'normal',
     '{"en":"Cut not as asked","fr":"Coupe non conforme"}'::jsonb, 1),
    (p_facility_id, 'grooming_rushed', 'grooming', 'improvement', 'normal',
     '{"en":"Rushed","fr":"Trop rapide"}'::jsonb, 2),
    (p_facility_id, 'grooming_stressed', 'grooming', 'improvement', 'high',
     '{"en":"Pet seemed stressed","fr":"Animal stressé"}'::jsonb, 3),
    (p_facility_id, 'grooming_late', 'grooming', 'improvement', 'normal',
     '{"en":"Late","fr":"En retard"}'::jsonb, 4),

    -- Boarding
    (p_facility_id, 'boarding_happy', 'boarding', 'positive', 'normal',
     '{"en":"Came home happy","fr":"Rentré heureux"}'::jsonb, 1),
    (p_facility_id, 'boarding_updates', 'boarding', 'positive', 'normal',
     '{"en":"Great updates","fr":"Bonnes nouvelles"}'::jsonb, 2),
    (p_facility_id, 'boarding_clean', 'boarding', 'positive', 'normal',
     '{"en":"Clean facility","fr":"Établissement propre"}'::jsonb, 3),
    (p_facility_id, 'boarding_attentive', 'boarding', 'positive', 'normal',
     '{"en":"Attentive staff","fr":"Personnel attentionné"}'::jsonb, 4),
    (p_facility_id, 'boarding_few_updates', 'boarding', 'improvement', 'normal',
     '{"en":"Few updates","fr":"Peu de nouvelles"}'::jsonb, 1),
    (p_facility_id, 'boarding_unsettled', 'boarding', 'improvement', 'high',
     '{"en":"Pet seemed unsettled","fr":"Animal perturbé"}'::jsonb, 2),
    (p_facility_id, 'boarding_cleanliness', 'boarding', 'improvement', 'high',
     '{"en":"Cleanliness","fr":"Propreté"}'::jsonb, 3),
    (p_facility_id, 'boarding_checkout_delay', 'boarding', 'improvement', 'normal',
     '{"en":"Check-out delay","fr":"Départ retardé"}'::jsonb, 4),

    -- Daycare
    (p_facility_id, 'daycare_tired_happy', 'daycare', 'positive', 'normal',
     '{"en":"Tired & happy","fr":"Fatigué et content"}'::jsonb, 1),
    (p_facility_id, 'daycare_social', 'daycare', 'positive', 'normal',
     '{"en":"Good socialisation","fr":"Belle socialisation"}'::jsonb, 2),
    (p_facility_id, 'daycare_easy_dropoff', 'daycare', 'positive', 'normal',
     '{"en":"Easy drop-off","fr":"Dépôt facile"}'::jsonb, 3),
    (p_facility_id, 'daycare_little_info', 'daycare', 'improvement', 'normal',
     '{"en":"Little info at pick-up","fr":"Peu d''info au départ"}'::jsonb, 1),
    (p_facility_id, 'daycare_anxious', 'daycare', 'improvement', 'high',
     '{"en":"Pet seemed anxious","fr":"Animal anxieux"}'::jsonb, 2),
    (p_facility_id, 'daycare_queue', 'daycare', 'improvement', 'normal',
     '{"en":"Drop-off queue","fr":"File au dépôt"}'::jsonb, 3),

    -- Training
    (p_facility_id, 'training_progress', 'training', 'positive', 'normal',
     '{"en":"Clear progress","fr":"Progrès visibles"}'::jsonb, 1),
    (p_facility_id, 'training_patient', 'training', 'positive', 'normal',
     '{"en":"Patient trainer","fr":"Éducateur patient"}'::jsonb, 2),
    (p_facility_id, 'training_homework', 'training', 'positive', 'normal',
     '{"en":"Good homework","fr":"Bons exercices"}'::jsonb, 3),
    (p_facility_id, 'training_rushed', 'training', 'improvement', 'normal',
     '{"en":"Session felt rushed","fr":"Séance trop rapide"}'::jsonb, 1),
    (p_facility_id, 'training_one_on_one', 'training', 'improvement', 'normal',
     '{"en":"Not enough one-on-one","fr":"Pas assez d''individuel"}'::jsonb, 2),
    (p_facility_id, 'training_next_steps', 'training', 'improvement', 'normal',
     '{"en":"Unclear next steps","fr":"Suite peu claire"}'::jsonb, 3)
  on conflict (facility_id, seed_key) where seed_key is not null do nothing;
end;
$fn$;

comment on function public.ensure_review_tags(uuid) is
  'The shipped tag catalogue, per service and polarity. Idempotent by (facility_id, seed_key); retire a tag with is_active = false, never a delete.';

revoke all on function public.ensure_review_tags(uuid) from public, anon;
grant execute on function public.ensure_review_tags(uuid) to authenticated, service_role;

-- ── The rule ──────────────────────────────────────────────────────────────
--
-- Appended to the existing seeder rather than given its own, so a facility gets
-- it from the same call every other rule arrives on and nobody has to remember
-- a second one.

create or replace function public.ensure_review_automation(p_facility_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_email uuid;
  v_sms uuid;
begin
  perform public.ensure_review_templates(p_facility_id);
  perform public.ensure_review_tags(p_facility_id);

  select id into v_email from public.message_templates
   where facility_id = p_facility_id and key = 'review_request';
  select id into v_sms from public.message_templates
   where facility_id = p_facility_id and key = 'review_request_sms';

  insert into public.automation_rules
    (facility_id, seed_key, name, trigger,
     email_template_id, sms_template_id,
     offset_minutes, cooldown_days, is_transactional, created_by)
  values
    (p_facility_id, 'review_request', 'Review Request',
     'check_out', v_email, v_sms,
     -- An hour after the dog goes home. Long enough that the owner has left
     -- and looked at the pet; short enough that the visit is still the thing
     -- they were just doing.
     60,
     -- Not the same as the reputation cooldown, and deliberately so: this one
     -- is the outbox's cheap per-rule guard, and the eligibility function
     -- applies the facility's real window on top. Two weak checks in series
     -- beat one that has to be right.
     30,
     false, 'yipyy')
  on conflict (facility_id, seed_key) where seed_key is not null do nothing;
end;
$fn$;

comment on function public.ensure_review_automation(uuid) is
  'Seeds the review-request rule, its templates and the tag catalogue. Disabled on arrival, like every seeded rule.';

revoke all on function public.ensure_review_automation(uuid) from public, anon;
grant execute on function public.ensure_review_automation(uuid) to authenticated, service_role;

do $verify$
begin
  if has_function_privilege('anon', 'public.ensure_review_automation(uuid)', 'execute') then
    raise exception 'anon can seed automation rules';
  end if;
  if has_function_privilege('anon', 'public.ensure_review_tags(uuid)', 'execute') then
    raise exception 'anon can seed review tags';
  end if;
end;
$verify$;
