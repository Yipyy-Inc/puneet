-- ============================================================================
-- What a care log entry could not record, and the floor screen needed it to.
--
-- ── THE SPLIT THIS CLOSES ─────────────────────────────────────────────────
--
-- `care_log_entries` (20260819140000) was built for the booking page's FEEDING
-- and MEDICATIONS panels, which record an outcome, a time and a note. The Daily
-- Care board records the same events with more on them: how a kennel was
-- cleaned and with what, how long an add-on ran and who delivered it, what an
-- enrichment session was and how the dog engaged, a health observation, why a
-- task was missed, how much water went in the bowl.
--
-- With nowhere to put any of that, the board kept its own store —
-- `src/data/care-log-store.ts`, a module-level array — so a meal logged at the
-- kennel and a meal logged on the booking page went to two different places,
-- and the kennel one did not survive a navigation.
--
-- ── ONE jsonb COLUMN, NOT NINE ────────────────────────────────────────────
--
-- These details are per-task-type and each is a small closed shape: a cleaning
-- log has no engagement level, an enrichment log has no products used. Nine
-- mostly-null columns would make the table's shape a list of every feature the
-- floor screen has ever had, and every new task type would be a migration.
--
-- The shapes are enforced in TypeScript at the route, the same arrangement
-- `facility_settings` uses for its twenty domains and for the same reason.
--
-- NOT NULL DEFAULT '{}' so every existing row reads as "no extra detail"
-- rather than null, and no caller has to distinguish the two.
--
-- ── PHOTOS ARE NOT IN HERE, DELIBERATELY ──────────────────────────────────
--
-- The board's "Add photo" button appends the string `mock://photo-1`. There is
-- no camera, no upload and no storage behind it — and a "photo required" gate
-- is satisfied by that string, so a task that demands photographic evidence is
-- signed off with a placeholder. That is a thing to delete, not a thing to
-- give a column to. When real photo capture exists it gets object storage and
-- its own table, not a base64 blob inside a journal row.
-- ============================================================================

alter table public.care_log_entries
  add column if not exists details jsonb not null default '{}'::jsonb;

comment on column public.care_log_entries.details is
  'Per-task-type extras (cleaning, addon, enrichment, health observation, missed reason, water volume). Shape enforced at the API. Never photos — see the header of 20260820180000.';

-- A cheap guard against the column becoming a dumping ground: an object, not an
-- array or a scalar. It says nothing about the keys, which are the API's
-- business, only that this is a bag of them.
alter table public.care_log_entries
  drop constraint if exists care_log_details_is_an_object;

alter table public.care_log_entries
  add constraint care_log_details_is_an_object
  check (jsonb_typeof(details) = 'object');
