-- The module a facility is sold was called "VOIP", described as "Voice over IP
-- phone system integration". Both name the plumbing rather than the thing: a
-- facility buys a phone number, routing, voicemail and recordings, and has no
-- relationship with a voice-over-IP anything. Seeded that way by
-- 20260807540000 and never revisited.
--
-- The slug stays 'voip'. It is an identifier that facility_modules rows point
-- at and that the fixture in src/data/modules.ts mirrors; renaming it would be
-- a data migration to no reader's benefit, because no screen renders a slug.
-- scripts/check-vendor-strings.ts skips id/slug lines for the same reason.
--
-- Paired with that gate, which fails if a carrier or plumbing name reaches a
-- facility-reachable surface again. This row is the one it found that lived in
-- the database rather than in the code — fixing only the fixture would have
-- turned the gate green while every facility still read "VOIP" on the screen
-- that actually matters.

update public.modules
set name = 'Calling',
    description = 'Your own business number, call routing, voicemail and call recordings',
    updated_at = now()
where slug = 'voip';
