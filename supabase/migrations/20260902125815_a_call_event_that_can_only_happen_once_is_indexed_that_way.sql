-- ============================================================================
-- A retry does not carry the same clock, so the key must not depend on one.
--
-- 20260902123619 shipped `unique (provider_call_sid, type, occurred_at)` and
-- called it idempotency. It dedupes a carrier retry ONLY when the retry carries
-- a byte-identical timestamp. A carrier does not guarantee that, and a handler
-- that stamps its own `now()` guarantees the opposite: every retry gets a fresh
-- timestamp, the constraint never fires, and a second `completed` lands for the
-- same call — the exact double-count the event table exists to prevent.
--
-- Measured before writing this, on the shipped schema:
--
--   same call, same 'completed', one second apart  ->  ACCEPTED
--   events stored for one call                     ->  2
--
-- The SQL test passed because it retried with an IDENTICAL timestamp. It proved
-- the constraint holds under an assumption the real webhook cannot make, which
-- is a test agreeing with the code rather than with the world.
--
-- ── WHAT IS AND IS NOT COLLAPSED ──────────────────────────────────────────
--
-- The events that can happen only once per call are indexed on (sid, type),
-- independent of when anyone says they happened. A call is answered once and
-- ends once.
--
-- `ringing` is deliberately excluded: it repeats legitimately, once per device
-- in a ring group, and collapsing those would erase the fact that four phones
-- rang and nobody picked up — which is the thing a facility most wants to see.
--
-- `recording_ready` is excluded too, because one call can produce more than one
-- recording. Its duplicate protection is the unique
-- `call_recording.provider_recording_sid`, keyed on the thing that is actually
-- unique: the recording, not the call.
-- ============================================================================

create unique index if not exists call_event_once_per_call
  on public.call_event (provider_call_sid, type)
  where type in (
    'initiated', 'answered', 'completed',
    'no_answer', 'busy', 'failed', 'voicemail_left'
  );

comment on index public.call_event_once_per_call is
  'A call is answered once and ends once. Dedupes a carrier retry whatever timestamp it carries; the (sid, type, occurred_at) constraint alone could not.';
