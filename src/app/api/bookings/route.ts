import { NextResponse, after, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getViewer } from "@/lib/auth/viewer";
import {
  allocateDeposit,
  expandBookingParts,
  MAX_BOOKING_PARTS,
} from "@/lib/bookings/booking-parts";
import { facilityTaxConfig, taxToAddCents } from "@/lib/payments/booking-tax";
import type { Json } from "@/types/database";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  BOOKING_SELECT,
  bookingToRow,
  rowToBooking,
} from "@/lib/api/mappers/booking";
import {
  activeFacilityIdForStaff,
  facilityContextForClient,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { staffForStylist } from "@/lib/api/stylist-staff";
import type { NewBooking } from "@/types/booking";

// ============================================================================
// Bookings.
//
// A Route Handler rather than a browser query, deliberately — see the note in
// lib/supabase/client.ts. Business reads and writes go through the server
// client so RLS evaluates against the session cookie, and so the domain
// invariants RLS cannot express (capacity, ledger balance, handover) have
// somewhere to live.
//
// RLS is what keeps you out: staff read their facilities' bookings, a customer
// their own. It is not what picks the facility — for someone in two
// facilities, or a platform admin, RLS admits them all — so the GET list is
// also narrowed to the facility on screen (`activeFacilityIdForStaff`, null
// for a customer). The POST below is authorised by the `bookings_insert`
// policy, not by this file.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 401 rather than an empty list. An unauthenticated caller getting `[]` is
  // indistinguishable from a facility with no bookings, and that ambiguity is
  // exactly how "the data disappeared" bugs start.
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .match(inFacility(scope))
    .order("start_at", { ascending: false });

  const clientRef = searchParams.get("clientRef");
  if (clientRef) {
    query = query.eq("clients.ref", Number(clientRef));
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Where the pet actually is ────────────────────────────────────────────
  //
  // A SECOND QUERY, not an embed. `booking_presence` (20260806960000) is a
  // UNION over three tables and carries no foreign key of its own, so PostgREST
  // has no relationship to follow. Merged here instead, which is also cheaper
  // than the join it would have written.
  //
  // A booking with no row is `unknown`, and that is the honest answer for
  // training and custom services — they have no attendance table at all — and
  // for a boarding booking whose kennel has not been assigned yet.
  const bookings = data.map(rowToBooking);
  // Only the bookings in this list: the view has no facility_id, so an
  // unfiltered read returns presence for every booking RLS lets the caller
  // see — every facility's, for a platform admin.
  //
  // In BATCHES. `.in()` is a query-string filter, and one with every id of a
  // facility holding hundreds of bookings is a URL PostgREST refuses — which
  // the first version of this did, silently, and every booking read `unknown`
  // (caught by booking-presence.spec against the e2e tenant's 400+ rows).
  const ids = (data as unknown as { id: string }[]).map((row) => row.id);
  const presenceRows: unknown[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const { data: batch, error: presenceError } = await supabase
      .from("booking_presence")
      .select("booking_id, presence, arrived_at, departed_at")
      .in("booking_id", ids.slice(i, i + 150));
    if (presenceError) {
      return NextResponse.json(
        { error: presenceError.message },
        { status: 500 },
      );
    }
    presenceRows.push(...(batch ?? []));
  }

  const presenceById = new Map(
    (
      presenceRows as {
        booking_id: string;
        presence: string;
        arrived_at: string | null;
        departed_at: string | null;
      }[]
    ).map((row) => [row.booking_id, row]),
  );

  return NextResponse.json(
    bookings.map((booking, index) => {
      const row = presenceById.get(
        (data[index] as unknown as { id: string }).id,
      );
      return {
        ...booking,
        presence: row?.presence ?? "unknown",
        arrivedAt: row?.arrived_at ?? null,
        departedAt: row?.departed_at ?? null,
      };
    }),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json()) as NewBooking;
  const supabase = await createServerClient();

  if (
    input.parts !== undefined &&
    (!Array.isArray(input.parts) || input.parts.length > MAX_BOOKING_PARTS)
  ) {
    return NextResponse.json(
      {
        error: `A request can make between 1 and ${MAX_BOOKING_PARTS} bookings.`,
      },
      { status: 422 },
    );
  }

  // The client arrives as the app's numeric ref; the row needs the uuid.
  // Resolved through RLS, so a caller who cannot see a client cannot book for
  // them — the lookup simply returns nothing.
  //
  // Resolved BEFORE the facility, which is the other way round from how this
  // read: a customer has no membership, so their client row is what says which
  // facility the booking is at.
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("ref", input.clientId)
    .maybeSingle();

  if (!client) {
    return NextResponse.json(
      { error: `No client ${input.clientId} you can book for.` },
      { status: 422 },
    );
  }

  // ── WHICH FACILITY, AND WHY IT DEPENDS ON WHO IS ASKING ─────────────────
  //
  // Staff: their membership, as everywhere else.
  //
  // A CUSTOMER: the facility of the client row above. Not a fallback and not a
  // convenience — getFacilityContext() answers the DEMO facility for a caller
  // with no membership (its own comment says so), so a pet owner booking
  // through this route would have had their booking stamped against a business
  // they have never heard of. Walking CUJ-20 on 2026-08-19 is what surfaced
  // that; a silent wrong-facility write is worse than a refusal.
  //
  // The facility comes from a PARENT ROW already scoped by RLS, which is the
  // second of the two sources check:facility-from-session allows. Nothing here
  // reads a facility from the request — `input.facilityId` exists on the type
  // and is ignored, as it always has been.
  const viewer = await getViewer().catch(() => null);
  const facility =
    viewer && viewer.memberships.length > 0
      ? await getFacilityContext()
      : await facilityContextForClient(client.id);

  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  // Pets are resolved and checked BEFORE the booking is written.
  //
  // booking_pets refuses a pet that does not belong to the booking's client
  // (20260802120000), and there is no DELETE policy on bookings — by design,
  // a booking is cancelled, not erased. So a rejection discovered after the
  // insert cannot be tidied up: it would leave a booking with no animals on
  // it and no way to withdraw it. Checking first is what keeps that row from
  // existing at all.
  //
  // ONE REQUEST, SEVERAL BOOKINGS. A request carrying `parts` means one
  // booking per part — each daycare day, each boarding room — because the
  // database holds one attendance and one room per booking. Every part's pets
  // are checked here, before anything is written, exactly as a single
  // booking's are.
  const planned = expandBookingParts(input, { id: crypto.randomUUID() });
  const refsOf = (booking: NewBooking) =>
    (Array.isArray(booking.petId) ? booking.petId : [booking.petId]).filter(
      (ref): ref is number => ref != null,
    );
  const wanted = [...new Set(planned.flatMap(refsOf))];

  // RLS-scoped, so a caller who cannot see a pet gets nothing back for it and
  // the count check below is what turns that into a refusal.
  const { data: pets } = wanted.length
    ? await supabase.from("pets").select("id, client_id, ref").in("ref", wanted)
    : { data: [] };

  const resolved = pets ?? [];
  if (resolved.length !== wanted.length) {
    return NextResponse.json(
      { error: "One or more of those pets could not be found." },
      { status: 422 },
    );
  }
  if (resolved.some((p) => p.client_id !== client.id)) {
    // The attack the database also refuses: attaching somebody else's animal
    // to your own booking, which the facility would read as consent to hand
    // that animal over.
    return NextResponse.json(
      { error: "Those pets are not registered to this client." },
      { status: 403 },
    );
  }

  // ── THE GROOMER ─────────────────────────────────────────────────────────
  //
  // A groom is booked WITH somebody, and the board, the calendar's stylist
  // columns and a groomer's own queue all read that from
  // `bookings.assigned_staff_id`. The modal sent the chosen stylist as
  // `stylistPreference` and nothing resolved it, so every groom booked in the
  // app landed in nobody's column. The stylist id is the profile's (its
  // legacy id, or its uuid); the staff row behind it is what the column
  // holds (`staffForStylist`).
  const stylist =
    input.service === "grooming" && input.stylistPreference
      ? await staffForStylist(
          supabase,
          facility.facilityId,
          input.stylistPreference,
        )
      : null;

  // ── THE DEPOSIT IS A PAYMENT, NOT A NOTE ────────────────────────────────
  //
  // The form sent `initialDeposit` and it landed in `details` with a
  // `collectedAt`, and a toast said "Deposit applied". No payment row was
  // written, so the booking owed its full price and the cash in the drawer
  // had no record. It is taken off the booking here and recorded below.
  const petIdByRef = new Map(resolved.map((p) => [p.ref, p.id]));
  const items = planned.map(({ initialDeposit: _deposit, ...booking }) => {
    const row = bookingToRow(booking, {
      facilityId: facility.facilityId,
      clientRowId: client.id,
      locationId: facility.locationId,
      timeZone: facility.timeZone,
    });
    if (stylist) {
      row.assigned_staff_id = stylist.staffId;
      row.assigned_staff_name ??= stylist.name;
    }
    return {
      booking: row,
      petIds: refsOf(booking).map((ref) => petIdByRef.get(ref)),
      grooming: groomingFor(booking),
      boarding: boardingFor(booking),
    };
  });

  // THE BOOKING, ITS PETS AND — PER MODULE — ITS APPOINTMENT OR ITS KENNEL,
  // IN ONE TRANSACTION.
  //
  // This used to be three sequential writes from here, and a grooming booking
  // got only the first two: `grooming_appointments` is what the board reads,
  // nothing wrote it, and so a groom booked in this app was invisible to the
  // person who had to do it. The appointments route has no POST at all — every
  // row in that table arrived through a backfill migration.
  //
  // Sequential writes were also why the pet check above has to happen first:
  // `bookings` has no DELETE policy, so a refusal on write two left a booking
  // that could not be withdrawn. create_booking (20260806560000) is SECURITY
  // INVOKER, so RLS still judges every insert as this caller, and a refusal
  // anywhere rolls back the lot. The pre-check stays because it produces a far
  // better message than a constraint name — but it is no longer the thing
  // standing between us and an orphan row.
  //
  // SEVERAL BOOKINGS ARE ONE TRANSACTION TOO. `create_bookings`
  // (20260911234642) runs each item through create_booking, so a kennel taken
  // on the third night takes the first two nights' bookings down with it
  // instead of leaving them behind.
  const { data: createdRows, error } = await supabase.rpc("create_bookings", {
    p_items: items as unknown as Json,
  });

  if (error) {
    // 403 for a policy refusal, because "you may not do this" is not a bug in
    // the request body and should not read as one in the client. 422 for the
    // RPC's own rejections — an unknown service or add-on is a bad request,
    // not a server fault and not a permission problem.
    //
    // 23P01 is the exclusion constraint on `boarding_stays`: the kennel is
    // taken for those dates. That is a CONFLICT, not a malformed request and
    // not a server fault — and the raw message names a constraint, so it is
    // replaced with the sentence the person at the desk actually needs.
    const denied = error.code === "42501";
    const occupied = error.code === "23P01";
    const badRequest = error.code === "23503" || error.code === "22023";

    if (occupied) {
      return NextResponse.json(
        {
          error:
            "That room is already booked for those dates. Pick another room or another date.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: denied ? "Not allowed to create bookings." : error.message },
      { status: denied ? 403 : badRequest ? 422 : 500 },
    );
  }

  const created = [...(createdRows ?? [])].sort(
    (a, b) => a.item_index - b.item_index,
  );
  if (created.length !== items.length) {
    return NextResponse.json(
      { error: "The booking could not be created." },
      { status: 500 },
    );
  }

  const { data: full } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", created[0].booking_id)
    .single();

  // ── THE DEPOSIT ─────────────────────────────────────────────────────────
  //
  // Staff only, and only the tenders that need no device: cash and
  // e-transfer. A card deposit needs the card or the terminal, which is the
  // booking page's checkout, after the booking exists.
  //
  // Recorded AFTER the bookings, and outside their transaction, because a
  // refused payment must not un-make a booking somebody is standing at the
  // desk for. So a refusal is reported, not hidden: `depositProblem` says
  // what was not recorded, and the booking page can take it.
  const deposit = input.initialDeposit;
  const isStaff = Boolean(viewer && viewer.memberships.length > 0);
  let depositRecorded = 0;
  let depositProblem: string | undefined;
  if (
    isStaff &&
    deposit &&
    deposit.amount > 0 &&
    (DEPOSIT_TENDERS as readonly string[]).includes(deposit.method)
  ) {
    const outcome = await recordDeposit(supabase, {
      sessionFacilityId: facility.facilityId,
      clientId: client.id,
      method: deposit.method,
      amount: deposit.amount,
      bookings: created.map((c, i) => ({
        id: c.booking_id,
        totalCost: planned[i].totalCost,
      })),
    });
    depositRecorded = outcome.recorded;
    depositProblem = outcome.problem;
  }

  // ── AUTOMATIONS ─────────────────────────────────────────────────────────
  //
  // Recorded here rather than in a trigger on `bookings`. A trigger would catch
  // more writes, but an AFTER INSERT trigger that raises FAILS THE BOOKING —
  // and `booking-write-integrity` is one of the 22 gate specs precisely because
  // a production 500 was once found on this path. A confirmation email is not
  // worth that risk. A trigger also cannot tell a real booking from
  // `scripts/apply-operational-seed.ts`, which would mail every seeded client.
  //
  // This is the only caller of `create_bookings`, and enrolments through
  // `enroll_in_training_series` are the only other way into `create_booking`,
  // so the coverage is the same.
  //
  // The emit is idempotent on `dedupe_key`, and BEST EFFORT: a booking that
  // succeeded must not be reported as failed because its confirmation could
  // not be queued.
  //
  // One event per booking made, so a three-day request is three confirmations
  // if the facility has a rule that sends them — each for its own day.
  for (const made of created) {
    let eventId: number | null = null;
    try {
      const { data: emitted, error: emitError } = await supabase.rpc(
        "emit_automation_event",
        {
          p_facility_id: facility.facilityId,
          p_kind: "booking_created",
          p_dedupe_key: `booking_created:${made.booking_id}`,
          p_client_id: client.id,
          p_booking_id: made.booking_id,
          ...(facility.locationId
            ? { p_location_id: facility.locationId }
            : {}),
        },
      );
      if (emitError) {
        console.warn("[automations] emit failed:", emitError.message);
      }
      // NULL means the event already existed — a retried request, not a
      // failure. Nothing to dispatch either way, because whoever created it
      // dispatches it.
      eventId = (emitted as number | null) ?? null;
    } catch (emitFailure) {
      console.warn("[automations] emit threw:", emitFailure);
    }

    // `after()` runs once the response is on its way, so the customer waits
    // for the booking and not for Resend. The row in `automation_events` is
    // the durable part: if this process dies before the callback runs, the
    // event is still unclaimed and the tick picks it up.
    if (eventId !== null) {
      const id = eventId;
      after(async () => {
        const { dispatchEvent } = await import("@/lib/messaging/dispatch");
        const result = await dispatchEvent(id);
        if (result.problems.length > 0) {
          console.warn("[automations] dispatch problems:", result.problems);
        }
      });
    }
  }

  // The FIRST booking, as this route has always answered — every caller reads
  // `.id` — plus the refs of all of them when there were several, and what
  // happened to the deposit.
  return NextResponse.json(
    full
      ? {
          ...rowToBooking(full),
          ...(created.length > 1
            ? { groupRefs: created.map((c) => c.booking_ref) }
            : {}),
          ...(depositRecorded > 0 ? { depositRecorded } : {}),
          ...(depositProblem ? { depositProblem } : {}),
        }
      : null,
    { status: 201 },
  );
}

/** Tenders a deposit can be recorded in without a card or a device present. */
const DEPOSIT_TENDERS = ["cash", "e_transfer"] as const;

/**
 * The grooming payload carries CHOICES, not money: which service, which
 * add-ons, which station. The RPC reads the prices from the catalogue, because
 * a price in a request body is a suggestion.
 */
function groomingFor(booking: NewBooking) {
  return booking.service === "grooming"
    ? {
        serviceId: booking.serviceType ?? null,
        addOnIds: booking.groomingAddOns ?? [],
        stationId: booking.stationAssignment ?? null,
        durationOverrideMin: booking.groomingDurationOverrideMin ?? null,
      }
    : null;
}

/**
 * Boarding is the mirror image of grooming here: a groom must name its
 * service, a stay need not name a room. Kennels are routinely assigned on the
 * ops board after the booking exists, so an absent room is a real state rather
 * than an incomplete request.
 *
 * `unitAssignment` had nowhere to land until 20260804161002: every boarding row
 * then had `details->>'unitAssignment'` = null, because the room was React
 * state and no table held it.
 */
function boardingFor(booking: NewBooking) {
  return booking.service === "boarding" && booking.unitAssignment
    ? { roomId: booking.unitAssignment }
    : null;
}

/**
 * The deposit, into the ledger: spread over the bookings in order, none past
 * its own price (`allocateDeposit`), each share with the facility's tax on
 * top — a booking's balance is the pre-tax supply, and the tax is recorded on
 * the payment, as every other tender does since 2026-09-11.
 */
async function recordDeposit(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  deposit: {
    /** From getFacilityContext(), never from the request. */
    sessionFacilityId: string;
    clientId: string;
    method: string;
    amount: number;
    bookings: { id: string; totalCost: number }[];
  },
): Promise<{ recorded: number; problem?: string }> {
  const { shares, left } = allocateDeposit(
    deposit.amount,
    deposit.bookings.map((b) => b.totalCost),
  );
  // More than the bookings cost stays on the first: the money was taken, and
  // an overpaid booking is visible where a dropped payment is not.
  if (left > 0 && shares.length > 0) shares[0] += left;

  const taxConfig = await facilityTaxConfig(
    supabase as unknown as SupabaseClient,
    deposit.sessionFacilityId,
  );
  let recorded = 0;
  for (const [i, share] of shares.entries()) {
    if (share <= 0) continue;
    const tax = taxToAddCents(taxConfig, Math.round(share * 100)) / 100;
    const total = Math.round((share + tax) * 100) / 100;
    const { error } = await supabase.rpc("record_payment", {
      p_facility_id: deposit.sessionFacilityId,
      p_method: deposit.method,
      p_subtotal: share,
      p_tax: tax,
      p_tip: 0,
      p_amount_charged: total,
      p_grand_total: total,
      p_booking_id: deposit.bookings[i].id,
      p_client_id: deposit.clientId,
      p_cash_received: deposit.method === "cash" ? total : null,
      p_receipt_channels: [],
      p_credit_note: "",
    } as never);
    if (error) {
      return {
        recorded,
        problem:
          error.code === "42501"
            ? "You are not allowed to take payments, so the deposit was not recorded."
            : error.message,
      };
    }
    recorded += share;
  }
  return { recorded: Math.round(recorded * 100) / 100 };
}
