-- ============================================================================
-- A BOOKING MADE FROM AN ESTIMATE TAKES NO AUTOMATIC FEE.
--
-- An estimate lists every charge the customer accepted, the facility's own
-- fees among them, and converting it writes those fees onto the booking as
-- lines at the amounts quoted (2026-10-01). Two things would still add a fee
-- to it — one the estimate left out, or one it already charged:
--
--   - the create path, which puts the facility's automatic fees on every
--     priced booking (applyBookingServiceCharges), and
--   - the till, which re-checks the fees charged at checkout or by care type
--     and writes any the bill does not carry.
--
-- `service_charges_included` is what tells both that this booking's charges
-- were stated, whole. A COLUMN, not a key in `details`, for the reason
-- `taxable` is one (20260921171524): enforce_booking_integrity passes a
-- customer's `details` through untouched, so a customer who wrote the key into
-- their own booking would switch the facility's fees off. The trigger pins
-- this column for them instead — false on their insert, unchanged on their
-- update — exactly as it pins `taxable`. Staff set it, and so does the server.
--
-- Two functions are changed WHERE THEY STAND, as 20260930184018 changed its
-- own: the definition is read, one passage replaced and the result run, and a
-- passage that is not there exactly once stops the migration.
--
--   1  enforce_booking_integrity   a customer's insert: false, whatever they
--                                  sent
--   2                              a customer's update: the value it had
--   3  create_booking              takes the key, which it would refuse as a
--                                  column it does not handle
--   4                              and writes it, which its fixed insert list
--   5                              would otherwise not — the booking and the
--                                  fact are one row, in one statement
-- ============================================================================

alter table public.bookings
  add column service_charges_included boolean not null default false;

comment on column public.bookings.service_charges_included is
  'True when every charge on this booking was stated by the estimate it was converted from, so no automatic fee is added to it — at creation or at the till. Staff and the server set it; enforce_booking_integrity pins it for anybody else.';

do $patch$
declare
  v_patch record;
  v_def   text;
  v_hits  integer;
begin
  for v_patch in
    select *
      from (values
        (1, 'private.enforce_booking_integrity()'::regprocedure,
$a$    new.assigned_staff_id   := null;
    new.assigned_staff_name := null;

    return new;
  end if;
$a$,
$b$    new.assigned_staff_id   := null;
    new.assigned_staff_name := null;

    -- Whether every charge was stated by an estimate, so that no automatic
    -- fee is added, is the facility's to say and never the payer's.
    new.service_charges_included := false;

    return new;
  end if;
$b$),

        (2, 'private.enforce_booking_integrity()'::regprocedure,
$a$  new.taxable             := old.taxable;
$a$,
$b$  new.taxable             := old.taxable;
  new.service_charges_included := old.service_charges_included;
$b$),

        (3, 'public.create_booking(jsonb, uuid[], jsonb, jsonb)'::regprocedure,
$a$    'form_override_reason'
  ];
$a$,
$b$    'form_override_reason', 'service_charges_included'
  ];
$b$),

        (4, 'public.create_booking(jsonb, uuid[], jsonb, jsonb)'::regprocedure,
$a$    special_requests, details, training_series_session_id
  )
$a$,
$b$    special_requests, details, training_series_session_id,
    service_charges_included
  )
$b$),

        (5, 'public.create_booking(jsonb, uuid[], jsonb, jsonb)'::regprocedure,
$a$    b.special_requests, coalesce(b.details, '{}'::jsonb), b.training_series_session_id
    from jsonb_populate_record(null::public.bookings, p_booking) b
$a$,
$b$    b.special_requests, coalesce(b.details, '{}'::jsonb), b.training_series_session_id,
    coalesce(b.service_charges_included, false)
    from jsonb_populate_record(null::public.bookings, p_booking) b
$b$)
      ) as p(step, fn, was, becomes)
     order by step
  loop
    v_def  := pg_get_functiondef(v_patch.fn);
    v_hits := (length(v_def) - length(replace(v_def, v_patch.was, '')))
              / length(v_patch.was);
    if v_hits <> 1 then
      raise exception 'Patching %: the passage is there % time(s), not once: %',
        v_patch.fn, v_hits, v_patch.was;
    end if;
    execute replace(v_def, v_patch.was, v_patch.becomes);
  end loop;
end
$patch$;
